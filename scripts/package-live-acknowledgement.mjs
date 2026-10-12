import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const source='backend/src/live/ack-audio', destination='dist/live/ack-audio';
const metadata=JSON.parse(await readFile(`${source}/manifest.json`,'utf8'));
const audio=await readFile(`${source}/one-moment.pcmu`);
if(metadata.text!=='One moment, please.'||metadata.format!=='PCMU'||metadata.sampleRate!==8000
  ||audio.length<160||audio.length>16000||metadata.durationMs!==audio.length/8
  ||createHash('sha256').update(audio).digest('hex')!==metadata.sha256)throw new Error('acknowledgement_integrity_failed');
await mkdir(destination,{recursive:true});
for(const file of ['one-moment.pcmu','manifest.json'])await copyFile(`${source}/${file}`,`${destination}/${file}`);
console.log('Packaged the local wait acknowledgement.');
