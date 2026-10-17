import { describe, expect, it } from 'vitest';
import { Tickets, adaptInitiation, browserRequest, routes } from '../../scripts/call-lab/metadata.mjs';
import { RunBudget, estimate, rehearsalLimits } from '../../scripts/call-lab/plan.mjs';

const initial = (ticket: string, connection = 'lab-only') => ({ event_type: 'call.initiated', payload: {
  direction: 'incoming', connection_id: connection, call_control_id: 'synthetic-call',
  custom_headers: [{ name: 'X-Shield-Lab-Ticket', value: ticket }]
} });
describe('isolated browser routing', () => {
  it('maps all 25 signed aliases to their fixed fictional routes', () => {
    const tickets = new Tickets();
    for (const route of routes) {
      const request = browserRequest(route.alias, tickets);
      expect(request.destinationNumber).toMatch(/\.invalid$/);
      const event = adaptInitiation(initial(request.customHeaders[0].value), tickets, 'lab-only', true);
      expect(event.payload.sip_headers[0].value).toBe(`<tel:${route.phone}>`);
    }
  });
  it('rejects arbitrary recipient addresses', () => {
    expect(() => new Tickets().issue('arbitrary-recipient')).toThrow('unknown_test_recipient');
  });
  it('requires a verified signature and the isolated connection', () => {
    const tickets = new Tickets(), event = initial(tickets.issue('person-01'));
    expect(() => adaptInitiation(event, tickets, 'lab-only', false)).toThrow('untrusted_lab_event');
    expect(() => adaptInitiation(event, tickets, 'another-connection', true)).toThrow('untrusted_lab_event');
  });
  it('rejects tampering, another run, expiry and replay onto another call', () => {
    let now = 1000;
    const tickets = new Tickets(() => now), ticket = tickets.issue('person-01');
    expect(() => tickets.read(ticket + 'x', 'first')).toThrow('invalid_test_ticket');
    expect(() => new Tickets().read(ticket, 'first')).toThrow('invalid_test_ticket');
    expect(tickets.read(ticket, 'first').alias).toBe('person-01');
    expect(tickets.read(ticket, 'first').alias).toBe('person-01'); // Provider retry is idempotent.
    expect(() => tickets.read(ticket, 'second')).toThrow('test_ticket_replayed');
    now += 120000;
    expect(() => tickets.read(ticket, 'first')).toThrow('expired_test_ticket');
  });
  it('rejects ambiguous or missing metadata', () => {
    const tickets = new Tickets(), event = initial(tickets.issue('person-01'));
    event.payload.custom_headers.push(event.payload.custom_headers[0]!);
    expect(() => adaptInitiation(event, tickets, 'lab-only', true)).toThrow('missing_test_ticket');
    event.payload.custom_headers = [];
    expect(() => adaptInitiation(event, tickets, 'lab-only', true)).toThrow('missing_test_ticket');
  });
});
describe('proposed run reservations', () => {
  it('prevents more than two simultaneous sessions', () => {
    const budget = new RunBudget(() => 1000, rehearsalLimits);
    expect(budget.reserve('a')).toEqual({ deadline: 121000, maxLegs: 4 });
    budget.reserve('b');
    expect(() => budget.reserve('c')).toThrow('concurrency_limit');
    budget.finish('a');
    budget.reserve('c');
  });
  it('never refunds a failed or uncertain attempt and prevents reusing its id', () => {
    const budget = new RunBudget(Date.now, rehearsalLimits);
    budget.reserve('a'); budget.finish('a');
    expect(() => budget.reserve('a')).toThrow('duplicate_session');
    for (let i = 1; i < 8; i++) { budget.reserve(String(i)); budget.finish(String(i)); }
    expect(() => budget.reserve('ninth')).toThrow('session_limit');
  });
  it('stops future starts and identifies the sessions needing cleanup', () => {
    const budget = new RunBudget(); budget.reserve('active');
    expect(budget.stop()).toEqual(['active']);
    expect(() => budget.reserve('new')).toThrow('run_stopped');
  });
  it('reserves only two sequential one-minute sessions for the paid proposal', () => {
    const budget = new RunBudget(() => 0);
    expect(budget.reserve('first').deadline).toBe(60000);
    expect(() => budget.reserve('overlap')).toThrow('concurrency_limit');
    budget.finish('first'); budget.reserve('second'); budget.finish('second');
    expect(() => budget.reserve('third')).toThrow('session_limit');
  });
  it('expires stale run permissions', () => {
    let now = 0; const budget = new RunBudget(() => now);
    now = 1800000;
    expect(() => budget.reserve('late')).toThrow('run_stopped');
  });
  it('counts every possible leg and distinguishes allowances from a dollar cap', () => {
    const plan = estimate();
    expect(plan.sessionMinutes).toBe(2); expect(plan.legMinutes).toBe(8);
    expect(plan.estimatedUSD).toBeCloseTo(0.133);
    expect(plan.estimatedUSD + plan.contingencyUSD).toBeCloseTo(0.25);
    expect(plan.numberPurchases).toBe(0);
    expect(plan.basis).toContain('not a provider-wide dollar ceiling');
  });
});
