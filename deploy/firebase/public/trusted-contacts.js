'use strict';
// Sessions stay in memory. No analytics, third-party scripts, URL tokens, or persistent browser storage.
const el = id => document.getElementById(id);
let challenge, accessToken, resendAt = 0, busy = false;
const errors = {
  invalid_phone: 'Enter a valid US or Canadian mobile number.', phone_code_incorrect: 'That code didn’t match. Check the text and try again.',
  phone_code_expired: 'That code expired or was already used. Request a new one.', phone_code_wait: 'Wait a minute before requesting another code.',
  phone_code_busy: 'Your code is being checked. Please wait.', phone_verification_unavailable: 'Phone sign-in isn’t available right now. Please try again later.',
  daily_limit_reached: 'The request limit was reached. Please try again tomorrow.', try_again_later: 'Please try again later.',
  texts_stopped: 'You stopped Shield texts. Reply START to Shield’s text number to resume.',
  trusted_contact_unavailable: 'This request is no longer available. Refresh to see current requests.',
  sign_in_required: 'Your session expired. Sign out and sign in again.', alert_channel_unavailable: 'That alert channel isn’t available right now.'
};
async function api(path, body) {
  const response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(errors[result.error?.code] || 'We couldn’t finish that. Please try again.');
  return result;
}
async function action(work) {
  if (busy) return;
  busy = true; el('error').textContent = ''; el('status').textContent = 'Please wait…';
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try { await work(); el('status').textContent = ''; }
  catch (error) { el('status').textContent = ''; el('error').textContent = error instanceof Error && !['TypeError', 'TimeoutError', 'AbortError'].includes(error.name) ? error.message : 'Your connection was interrupted. Please try again.'; }
  finally { busy = false; document.querySelectorAll('button').forEach(button => { button.disabled = button.dataset.unavailable === 'true'; }); tick(); }
}
async function requestCode() {
  const phone = el('phone').value;
  const result = await api('/auth/phone/start', { phone });
  challenge = result.challenge; resendAt = Date.now() + result.resendAfter * 1000;
  el('heading').textContent = 'Enter your code'; el('intro').textContent = `We texted it to ${phone}.`;
  el('phone-form').hidden = true; el('code-form').hidden = false; el('code').value = ''; el('code').focus();
}
el('phone-form').addEventListener('submit', event => { event.preventDefault(); action(requestCode); });
el('resend').addEventListener('click', () => action(requestCode));
el('change').addEventListener('click', () => { challenge = undefined; el('code-form').hidden = true; el('phone-form').hidden = false; el('error').textContent = ''; el('heading').textContent = 'Review your request'; el('intro').textContent = 'Sign in with the mobile number used for your invitation.'; el('phone').focus(); });
el('code-form').addEventListener('submit', event => {
  event.preventDefault(); action(async () => {
    const session = await api('/auth/phone/verify', { challenge, code: el('code').value.trim() });
    accessToken = session.accessToken; el('code').value = ''; challenge = undefined;
    el('code-form').hidden = true; el('account').hidden = false;
    await loadRequests(); el('heading').tabIndex = -1; el('heading').focus();
  });
});
const text = (tag, content) => { const node = document.createElement(tag); node.textContent = content; return node; };
async function loadRequests() {
  const result = await api('/api/contact-alerts');
  el('requests').replaceChildren();
  el('heading').textContent = result.requests.length === 1 ? `Alerts for ${result.requests[0].name}` : 'Caretaker requests';
  el('intro').hidden = true; el('about').hidden = result.requests.length === 0;
  if (result.textsStopped) el('requests').append(text('p', errors.texts_stopped));
  if (!result.requests.length) el('requests').append(text('p', 'No requests for this mobile number.'));
  if (result.inboxAvailable) {
    const inbox = document.createElement('article');
    inbox.append(text('h2', 'Recent protection alerts'));
    inbox.append(text('p', 'Open this page or Alerts for others in Shield to see saved alerts. Saved alerts alone do not send a notification or a text. Up to 50 recent alerts from the past 30 days are shown.'));
    if (!result.events?.length) inbox.append(text('p', 'No saved protection alerts.'));
    for (const event of result.events ?? []) {
      inbox.append(text('h3', event.name));
      inbox.append(text('p', 'Shield detected a possible scam request during a call. Check in with them.'));
      inbox.append(text('p', new Date(event.occurredAt).toLocaleString()));
    }
    el('requests').append(inbox);
  }
  for (const request of result.requests) {
    const card = document.createElement('article');
    if (result.requests.length > 1) card.append(text('h2', request.name));
    card.append(text('p', request.status === 'accepted' ? 'You’re a caretaker.' : 'Receive alerts when Shield intervenes during a call?'));
    if (request.ownerPaused) card.append(text('p', `${request.name} has paused these alerts.`));
    const label = document.createElement('label'), checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.checked = request.textAlerts && !result.textsStopped;
    checkbox.disabled = !result.textAvailable || result.textsStopped;
    label.append(checkbox, document.createTextNode('Text messages')); card.append(label);
    const inboxLabel = document.createElement('label'), inboxChoice = document.createElement('input');
    inboxChoice.type = 'checkbox'; inboxChoice.checked = request.inAppAlerts === true && result.inboxAvailable === true;
    inboxChoice.disabled = !result.inboxAvailable;
    if (result.inboxAvailable) {
      inboxLabel.append(inboxChoice, document.createTextNode('Save alerts to view in Shield')); card.append(inboxLabel);
      card.append(text('p', 'You need to open this page or Shield to see saved alerts.'));
    }
    const terms = text('p', 'Rates may apply. Reply STOP to stop texts.'); terms.className = 'detail'; card.append(terms);
    if (request.appAlerts) card.append(text('p', 'App notifications are also on. Manage them in Shield for iPhone.'));
    const save = text('button', request.status === 'accepted' ? 'Save alert choices' : 'Accept request');
    const noChannel = () => !(request.appAlerts && result.appAvailable) && !checkbox.checked && !inboxChoice.checked;
    save.dataset.unavailable = String(noChannel());
    save.disabled = save.dataset.unavailable === 'true';
    const changed = () => { save.dataset.unavailable = String(noChannel()); save.disabled = busy || save.dataset.unavailable === 'true'; };
    checkbox.addEventListener('change', changed); inboxChoice.addEventListener('change', changed);
    save.addEventListener('click', () => action(async () => {
      await api(`/api/contact-alerts/${request.id}`, { accept: true, textAlerts: checkbox.checked, appAlerts: request.appAlerts && result.appAvailable,
        ...(result.inboxAvailable ? { inAppAlerts: inboxChoice.checked } : {}) }); await loadRequests();
    }));
    const decline = text('button', request.status === 'accepted' ? 'Stop these alerts' : 'Decline request'); decline.className = 'secondary';
    decline.addEventListener('click', () => action(async () => {
      await api(`/api/contact-alerts/${request.id}`, { accept: false, textAlerts: false, appAlerts: false,
        ...(result.inboxAvailable ? { inAppAlerts: false } : {}) }); await loadRequests();
    }));
    const buttons = document.createElement('div'); buttons.className = 'buttons'; buttons.append(save, decline); card.append(buttons); el('requests').append(card);
  }
}
el('refresh').addEventListener('click', () => action(loadRequests));
el('logout').addEventListener('click', () => action(async () => {
  try { await api('/auth/logout', {}); } finally {
    accessToken = undefined; challenge = undefined; el('account').hidden = true; el('requests').replaceChildren(); el('phone-form').hidden = false; el('phone').value = ''; el('heading').textContent = 'Review your request'; el('intro').hidden = false; el('intro').textContent = 'Sign in with the mobile number used for your invitation.'; el('about').hidden = true; el('phone').focus();
  }
}));
function tick() { const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)); el('resend').textContent = remaining ? `Resend code in ${remaining}s` : 'Resend code'; el('resend').disabled = busy || remaining > 0; }
setInterval(tick, 1000);
