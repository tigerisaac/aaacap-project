import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WaitAcknowledgement } from '../src/live/acknowledgement.js';
import { ScreeningSession } from '../src/live/session.js';

const clip = Buffer.alloc(320, 10);
const waiting = { waitingSince: 0, callerLastAt: 0, assistantLastAt: 0, modelSpeaking: false };
describe('Local wait acknowledgement', () => {
  it('starts after one quiet second, emits 20ms frames once, and never repeats', () => {
    const observe=vi.fn(), ack=new WaitAcknowledgement(clip,observe);
    expect(ack.frame(999,waiting)).toBeUndefined();
    expect(ack.frame(1000,waiting)).toEqual(clip.subarray(0,160));
    expect(ack.frame(1020,waiting)).toEqual(clip.subarray(160));
    expect(ack.frame(5000,waiting)).toBeUndefined();
    expect(observe.mock.calls).toEqual([['acknowledgement_started'],['acknowledgement_finished']]);
  });
  it('stays silent for quick decisions, unheard callers, and active caller or model speech', () => {
    for(const state of [{...waiting,waitingSince:undefined},{...waiting,callerLastAt:undefined},
      {...waiting,callerLastAt:1500},{...waiting,assistantLastAt:1500},{...waiting,modelSpeaking:true}]) {
      expect(new WaitAcknowledgement(clip).frame(1500,state)).toBeUndefined();
    }
  });
  it('interrupts playback for caller speech, model speech, or completion, without restarting', () => {
    for(const state of [{...waiting,callerLastAt:1020},{...waiting,modelSpeaking:true},{...waiting,waitingSince:undefined}]) {
      const observe=vi.fn(), ack=new WaitAcknowledgement(clip,observe);
      expect(ack.frame(1000,waiting)).toBeDefined();
      expect(ack.frame(1020,state)).toBeUndefined();
      expect(ack.frame(5000,waiting)).toBeUndefined();
      expect(observe).toHaveBeenLastCalledWith('acknowledgement_interrupted');
    }
  });
  it('does not change model inputs, terminal decisions, or backend timeout when enabled', async () => {
    async function run(enabled:boolean,timeout:boolean) {
      let now=1000;
      const io={openai:vi.fn(),telnyx:vi.fn(),finish:vi.fn().mockResolvedValue(undefined),close:vi.fn(),
        acknowledgementAudio:enabled?Buffer.alloc(16000,10):undefined};
      const s=new ScreeningSession(io,()=>now);s.start();s.event({type:'session.started',session:{model:'gpt-live-1'}});
      s.event({type:'session.input_transcript.delta',delta:'This is a synthetic business about an account issue.'});
      s.event({type:'response.event',delegation_id:'d',event:{type:'response.created'}});
      now=2000;s.tick();
      if(timeout){now=21000;s.tick();}else{s.event({type:'response.event',delegation_id:'d',event:{type:'response.output_item.done',item:{
        type:'function_call',name:'screen_call',call_id:'c',arguments:JSON.stringify({action:'hold',reason:'unclear',purpose:'other',
          evidence:'an account issue',hasName:true,hasReason:true})}}});}
      await Promise.resolve();return io;
    }
    for(const timeout of [false,true]){
      const plain=await run(false,timeout),enabled=await run(true,timeout);
      expect(enabled.openai.mock.calls).toEqual(plain.openai.mock.calls);
      expect(enabled.finish.mock.calls).toEqual(plain.finish.mock.calls);
      expect(enabled.finish).toHaveBeenCalledTimes(1);
      expect(enabled.telnyx).toHaveBeenLastCalledWith({event:'clear'});
      expect(enabled.close).toHaveBeenCalledTimes(1);
    }
  });
  it('keeps the packaged recording short and verifies its telephone format and checksum', () => {
    const base=new URL('../src/live/ack-audio/',import.meta.url);
    const metadata=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
    const audio=readFileSync(new URL('one-moment.pcmu',base));
    expect(metadata).toMatchObject({text:'One moment, please.',voice:'Grace',format:'PCMU',sampleRate:8000});
    expect(audio.length/8).toBe(metadata.durationMs);
    expect(metadata.durationMs).toBeLessThan(1500);
    expect(createHash('sha256').update(audio).digest('hex')).toBe(metadata.sha256);
  });
});
