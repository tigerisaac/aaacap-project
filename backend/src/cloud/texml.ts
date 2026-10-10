// Minimal Telnyx TeXML builder covering the verbs Shield uses. Output matches the TwiML-style
// documents Telnyx accepts: camelCase attributes, arrays joined by spaces, and escaped text.
type Attributes = Record<string, string | number | boolean | readonly string[] | undefined>;

const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  .replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');

class Element {
  private readonly children: Element[] = [];
  constructor(private readonly name: string, private readonly attributes: Attributes = {}, private readonly text?: string) {}
  protected add(name: string, attributes?: Attributes, text?: string) {
    const child = new Element(name, attributes, text); this.children.push(child); return child;
  }
  render(): string {
    const attributes = Object.entries(this.attributes).filter(([, value]) => value !== undefined)
      .map(([key, value]) => ` ${key}="${escapeAttribute(Array.isArray(value) ? value.join(' ') : String(value))}"`).join('');
    const body = (this.text === undefined ? '' : escapeText(this.text)) + this.children.map(child => child.render()).join('');
    return body ? `<${this.name}${attributes}>${body}</${this.name}>` : `<${this.name}${attributes}/>`;
  }
  say(text: string) { return this.add('Say', {}, text); }
  stream(attributes: Attributes) { return this.add('Stream', attributes); }
  transcription(attributes: Attributes) { return this.add('Transcription', attributes); }
  number(attributes: Attributes, phone: string) { return this.add('Number', attributes, phone); }
}

export class VoiceResponse extends Element {
  constructor() { super('Response'); }
  hangup() { return this.add('Hangup'); }
  pause(attributes: { length: number }) { return this.add('Pause', attributes); }
  play(attributes: Attributes) { return this.add('Play', attributes); }
  record(attributes: Attributes) { return this.add('Record', attributes); }
  gather(attributes: Attributes) { return this.add('Gather', attributes); }
  dial(attributes: Attributes) { return this.add('Dial', attributes); }
  start() { return this.add('Start'); }
  stop() { return this.add('Stop'); }
  toString() { return `<?xml version="1.0" encoding="UTF-8"?>${this.render()}`; }
}
