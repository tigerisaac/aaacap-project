const WARNINGS: Record<string, string> = {
  code_or_password: 'the caller asked for a code or password',
  payment_or_transfer: 'the caller asked for a payment or money transfer',
  remote_access: 'the caller asked for access to your computer or phone',
  identity_numbers: 'the caller asked for account or identity numbers',
  secrecy: 'the caller asked you to keep the call secret',
  investment: 'the caller pitched an investment',
  call_another_number: 'the caller asked you to contact them on a number or address they gave',
  save_number: 'the caller asked you to save their number',
  open_link: 'the caller asked you to open a link or a website'
};
/** Fixed wording only: nothing the caller said is repeated to her. */
export function warningText(concern: string) {
  const reason = WARNINGS[concern] ?? 'the call matched a common scam';
  return `This is Shield. I ended this call because ${reason}. Banks, government offices and companies do not ask for this on a call. If you know the caller, call them back on a number you trust. Goodbye.`;
}

