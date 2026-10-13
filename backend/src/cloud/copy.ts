// Fixed history copy shown in the app. Reason codes come from screening, call control and monitoring.
import type { Extraction } from './message-check.js';

export const purposes: Record<Extraction['purpose'], string> = {
  appointment: 'Appointment reminder', delivery: 'Delivery update', prescription: 'Prescription notification',
  personal: 'Personal call', other: 'Unfamiliar caller', unknown: 'Unfamiliar caller'
};

export const reasonCopy: Record<string, { title: string; detail: string; action: string }> = {
  automated_notice: { title: 'Saved notice', detail: 'Shield preserved an incoming notice without connecting the call. The caller and their claims remain unverified.', action: 'Check independently using an app, card, statement or contact you already trust.' },
  scam: { title: 'Scam call stopped', detail: 'Shield detected a risky request and ended the call silently.', action: 'No action is needed.' },
  robocall: { title: 'Unwanted robocall stopped', detail: 'Shield detected an unwanted automated call and ended it silently.', action: 'No action is needed.' },
  voicemail_removed_scam: { title: 'Scam voicemail removed', detail: 'Shield judged this message to be a scam and removed it from your messages. It will be deleted after 7 days.', action: 'If you think this was a real message, restore it from this call.' },
  voicemail_removed_junk: { title: 'Junk voicemail removed', detail: 'Shield judged this message to be a robocall, a sales message or an empty recording and removed it. It will be deleted after 7 days.', action: 'If you think this was a real message, restore it from this call.' },
  blocked_caller: { title: 'Blocked caller tried again', detail: 'Shield stopped a scam from this number before, so it ended this call without screening it.', action: 'If this number belongs to someone you know, you can unblock it in Settings.' },
  monitor_intervened: { title: 'Shield ended a connected call', detail: 'During the call, Shield heard a request that matches common scams and ended the call with a warning.', action: 'If you know the caller, contact them using a number you already trust.' },
  solicitation: { title: 'Sales or solicitation call stopped', detail: 'Shield ended an unsolicited sales, survey, political or donation call silently.', action: 'No action is needed.' },
  silent_caller: { title: 'Silent call ended', detail: 'The caller did not respond. Shield ended the call automatically.', action: 'No action is needed.' },
  screening_timeout: { title: 'Screening ended', detail: 'Shield could not establish a clear reason for this call in time.', action: 'The call was not connected. Review any voicemail.' },
  screening: { title: 'Screening call', detail: 'The caller is being asked why they are calling.', action: 'No action is needed.' },
  routine: { title: 'Screened call', detail: 'The introduction did not contain a detected sensitive request. The caller’s identity is still unverified.', action: 'You decide whether to answer. Do not share secret codes or move money at a caller’s request.' },
  sensitive_issue: { title: 'Verify independently', detail: 'The caller described an account or money issue. Shield did not connect the incoming call.', action: 'Use a number from your card, statement, or saved institution list.' },
  family_emergency: { title: 'Check with someone you know', detail: 'The caller described a family emergency involving money. The incoming call was not connected.', action: 'Call your relative or a trusted person using a number you already know.' },
  prohibited_request: { title: 'Call held for review', detail: 'Screening detected a request for sensitive information, device access, money, or secrecy. The incoming call was not connected.', action: 'Contact the person or organization independently if you need to follow up.' },
  uncertain: { title: 'Not enough information', detail: 'Shield could not reliably understand the introduction. The caller was offered a message instead.', action: 'Review any voicemail before deciding what to do.' },
  screening_unavailable: { title: 'Screening unavailable', detail: 'Screening did not finish. The call was not automatically cleared.', action: 'Review any voicemail.' },
  known_missed: { title: 'Missed contact call', detail: 'The displayed number matched your saved list and was sent to voicemail. Caller ID is not proof of identity.', action: 'Review the message when convenient.' },
  quiet_hours: { title: 'Sent to voicemail overnight', detail: 'Shield screened this caller during your quiet hours and offered voicemail instead of ringing you.', action: 'Review any voicemail. You can change quiet hours in Settings.' },
  message_only: { title: 'Sent to voicemail', detail: 'Live call offers are paused or this phone has not completed a routing test.', action: 'Review the message or check your setup.' },
  busy_guard: { title: 'Sent to voicemail', detail: 'Another call offer was active or had just finished.', action: 'Review any voicemail.' },
  limit_reached: { title: 'Sent to voicemail', detail: 'The service reached its configured call-offer limit.', action: 'Review any voicemail. Your support contact can check service limits.' },
  capacity_exceeded: { title: 'Service limit reached', detail: 'The service reached its daily incoming-call limit and could not take another message.', action: 'Your support contact can review service limits. Follow up independently if needed.' },
  declined: { title: 'You chose a message', detail: 'The live offer was declined and the original caller was offered voicemail.', action: 'Review the message when convenient.' },
  no_acceptance: { title: 'Call not accepted', detail: 'The call was not connected because no valid acceptance was received.', action: 'Review any voicemail.' },
  abandoned: { title: 'Caller hung up', detail: 'The original caller left before the call was connected.', action: 'No action is needed.' },
  expired: { title: 'Call timed out', detail: 'The screening or call-offer deadline expired.', action: 'Review any available call history or message.' }
};
