// Dependency-free helpers shared by the live bridge and the cloud functions that check transcripts.

/** Caller speech as model input: structural characters cannot imitate the application's message format. */
export const callerText = (transcript: string) => transcript.replace(/[{}[\]"\\`<>]/g, ' ');
const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const letters = (s: string) => normalize(s).replace(/ /g, '');
/** Fewest character edits that turn `quote` into some substring of `text` (semi-global alignment). */
function closestSubstringEdits(quote: string, text: string) {
  let previous = new Uint16Array(text.length + 1);
  for (let i = 1; i <= quote.length; i++) {
    const current = new Uint16Array(text.length + 1); current[0] = i;
    for (let j = 1; j <= text.length; j++) {
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (quote[i - 1] === text[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous.reduce((least, edits) => Math.min(least, edits), quote.length);
}
// Live transcription can merge or garble words ("booked fornaretomorrow"), so allow a few character
// edits. A quote still has to be essentially present in caller speech; invented evidence fails.
export function supportedQuote(quote: string, transcript: string) {
  const q = letters(quote);
  return q.length >= 6 && closestSubstringEdits(q, letters(transcript)) <= Math.floor(q.length * 0.2);
}

/** Models sometimes cite several fragments ("a" and "b", a ... b, a; b); any one that is really present grounds the decision. */
export function supportedEvidence(evidence: string, transcript: string) {
  const fragments = [evidence, ...Array.from(evidence.matchAll(/["“]([^"”]+)["”]/g), m => m[1]!), ...evidence.split(/\s*(?:\.\.\.|…|;|\|)\s*/)];
  return fragments.some(fragment => supportedQuote(fragment, transcript));
}
