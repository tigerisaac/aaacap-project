// Minimal Telnyx TeXML builder covering the verbs Shield uses. Output matches the TwiML-style
// documents Telnyx accepts: camelCase attributes, arrays joined by spaces, and escaped text.
type Attributes = Record<string, string | number | boolean | readonly string[] | undefined>;

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  .replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');

export type SpeechAudio = { url: string; failoverUrl: string };
export type SpeechResolver = (text: string) => SpeechAudio | undefined;

class Element {
  private readonly children: Element[] = [];
  constructor(private readonly name: string, private readonly attributes: Attributes = {}, private readonly text?: string, private readonly speech?: SpeechResolver) {}
  protected add(name: string, attributes?: Attributes, text?: string) {
    const child = new Element(name, attributes, text, this.speech); this.children.push(child); return child;
  }
  render(): string {
    const attributes = Object.entries(this.attributes).filter(([, value]) => value !== undefined)
      .map(([key, value]) => ` ${key}="${escapeAttribute(Array.isArray(value) ? value.join(' ') : String(value))}"`).join('');
    const body = (this.text === undefined ? '' : escapeText(this.text)) + this.children.map(child => child.render()).join('');
    return body ? `<${this.name}${attributes}>${body}</${this.name}>` : `<${this.name}${attributes}/>`;
  }
  say(text: string) {
    const audio = this.speech?.(text);
    // Never continue past a failed disclosure or keypad instruction.
    return audio ? this.add('Play', { failoverUrl: audio.failoverUrl }, audio.url) : this.add('Say', {}, text);
  }
  play(value: Attributes | string) { return typeof value === 'string' ? this.add('Play', {}, value) : this.add('Play', value); }
  stream(attributes: Attributes) { return this.add('Stream', attributes); }
  transcription(attributes: Attributes) { return this.add('Transcription', attributes); }
  number(attributes: Attributes, phone: string) { return this.add('Number', attributes, phone); }
}

export class VoiceResponse extends Element {
  constructor(speech?: SpeechResolver) { super('Response', {}, undefined, speech); }
  hangup() { return this.add('Hangup'); }
  pause(attributes: { length: number }) { return this.add('Pause', attributes); }
  record(attributes: Attributes) { return this.add('Record', attributes); }
  gather(attributes: Attributes) { return this.add('Gather', attributes); }
  dial(attributes: Attributes) { return this.add('Dial', attributes); }
  start() { return this.add('Start'); }
  stop() { return this.add('Stop'); }
  toString() { return `<?xml version="1.0" encoding="UTF-8"?>${this.render()}`; }
}
