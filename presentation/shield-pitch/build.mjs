// Live presentation callback: nine video slides, then three optional evidence slides.
import {fileURLToPath} from 'node:url';
import {readFileSync,existsSync} from 'node:fs';
import {buildEvidence} from './evidence-slides.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
const C={bg:'#F2F3F4',navy:'#002664',ink:'#101E32',muted:'#515E70',teal:'#076C5C'};
function text(s,name,value,x,y,w,h,size=28,color=C.ink,font='Helvetica Neue',bold=false){
 const shape=s.shapes.add({name,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 shape.text=value;shape.text.style={fontSize:size,typeface:font,color,bold,insets:0,autoFit:'none',verticalAlignment:'top'};return shape;
}
function image(s,file,alt,x,y,w,h){return s.images.add({path:root+'/'+file,alt,fit:'contain',position:{left:x,top:y,width:w,height:h}});}
const markFile='ios/Shield/Resources/Assets.xcassets/ShieldMark.imageset/ShieldMark.png';
const asset=n=>'presentation/shield-pitch/assets/'+n;
function heading(s,title){text(s,'Title',title,72,60,1040,110,54,C.ink,'Georgia');image(s,markFile,'Shield logo',1150,48,58,58);}
function notes(s,time,speaker,script,direction,source=''){s.speakerNotes.text=`VIDEO: ${time}. SPEAKER: ${speaker}.\n\nNARRATION: ${script}\n\nEDITING: ${direction}\n\nEVIDENCE: ${source}`;}
const common='Original Shield app artwork and synthetic sample-app captures. No new AI-generated visuals. Sample screens show design and workflow, not real customer outcomes.';
export async function build({presentation,input}){
 for(const index of input.indices){
  if(index>=9){
   const original={9:4,10:5,11:3}[index];
   await buildEvidence({presentation,input:{indices:[original],targets:{[original]:index},replace:true}});
   const slide=presentation.slides.getItem(index);
   slide.speakerNotes.text='OPTIONAL EVIDENCE CUTAWAY. Outside the nine-slide video sequence; use only within the existing technology or learning allocation, not as additional runtime.\n\n'+slide.speakerNotes.text;
   continue;
  }
  while(presentation.slides.items.length<=index)presentation.slides.add({width:1280,height:720});
  const s=presentation.slides.getItem(index);
  for(const item of [...s.shapes.items,...s.images.items])item.delete();
  const charts=(await presentation.inspect({kind:'chart',maxChars:20000})).records.filter(r=>r.slideIndex===index).map(r=>r.id);
  if(charts.length)presentation.delete(charts);
  s.background.fill=C.bg;
  if(index===0){
   image(s,markFile,'Shield logo',76,68,94,94);
   text(s,'App name','Shield',72,205,1000,140,112,C.navy,'Georgia');
   text(s,'Purpose','A safer phone call for older adults',78,378,1100,65,40,C.ink,'Georgia');
   ['Aarav\nKarumanchi','Ishaan\nSagar','Andrew\nChen','Isaac\nZhang'].forEach((name,i)=>text(s,'Team member '+i,name,78+i*292,540,270,100,31));
   notes(s,'0:00–0:08 (8 seconds)','AK, IS, AC, IZ','Aarav: “I’m Aarav Karumanchi.” Ishaan: “I’m Ishaan Sagar.” Andrew: “I’m Andrew Chen.” Isaac: “And I’m Isaac Zhang.”','Two seconds per member. Show each person on camera with their full name as a lower third, preserving Shield on screen. This card supplies the typography and exact spelling. Names provided by the owner.');
  }
  if(index===1){
   heading(s,'Convincing calls. Real consequences.');
   text(s,'Purpose sentence','Shield helps older adults\nscreen unknown calls\nbefore they answer.',76,198,760,218,51,C.navy,'Georgia');
   text(s,'Texas loss','$678.6M',76,475,620,101,76,C.navy,'Georgia');
   text(s,'Texas context','reported lost by Texans age 60+ in 2025',78,595,710,48,26,C.muted);
   image(s,asset('home-current.png'),'Shield Home with sample activity',906,181,225,488);
   notes(s,'0:08–0:21 (13 seconds)','AK','Convincing scam calls make it hard for older adults to know whom to trust. Shield helps older adults screen unknown calls before they answer.','Hold on the app and problem statement. The loss figure is supporting on-screen context; do not read every word. The figure covers reported internet crime, not phone fraud alone.','FBI IC3 2025 Annual Report, printed pages 49–50: Texas age 60+, $678,564,081 reported losses. https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf . PRODUCT.md and docs/SCREENING.md. '+common);
  }
  if(index===2){
   heading(s,'AAACAP');
   image(s,asset('aaacap-official.png'),'Official Area Agency on Aging of the Capital Area logo',76,237,330,190);
   text(s,'Agency quote','“This would be a valuable asset to the seniors that we care for.”',486,226,714,216,47,C.navy,'Georgia');
   text(s,'Quote attribution','Jennifer Scott',490,480,700,46,29);
   text(s,'Quote role','Director of Aging Services',490,528,700,40,25,C.muted);
   text(s,'Outreach context','Exploring free access for seniors',78,622,1100,42,27,C.muted);
   notes(s,'0:21–0:31 (10 seconds)','IS','AAACAP supports older adults and caregivers across the Capital Area. We discussed free access for seniors, and their director saw its value.','Let the quote carry the slide. Describe the outreach as partnership discussions; no signed partnership is claimed.','Quote and attribution supplied directly by the owner on October 25, 2026. The quote is from the team’s conversation, not represented as a quotation published on the agency website. Jennifer Scott’s role confirmed in the official staff directory: https://www.capcog.org/about/staff/ . Official logo downloaded unaltered from https://www.capcog.org/wp-content/uploads/2024/02/AAACAP-Color-2.png , linked on https://www.capcog.org/divisions/area-agency-on-aging/ .');
  }
  if(index===3){
   heading(s,'Protection you can understand');
   image(s,asset('calls-current.png'),'Sample call history showing screening outcomes',220,168,195,423);
   image(s,asset('messages-current.png'),'Sample saved messages inbox',864,168,195,423);
   text(s,'Feature 1','Screen unfamiliar calls',76,610,540,48,35,C.navy,'Georgia');
   text(s,'Feature 2','Review useful messages',720,610,500,48,35,C.navy,'Georgia');
   notes(s,'0:31–0:40 (9 seconds)','IS','Shield screens unfamiliar calls before offering them to you. Useful messages stay easy to review, so you can decide what to do next.','Preview two working feature areas with one short label each. Keep these as brief visual previews; save taps and playback for Isaac’s walkthrough. Screens are synthetic sample activity, not live-call evidence.','PRODUCT.md; ios/README.md, Calls and Messages. Sources: .impeccable/review/andrew-compare-2026-10-24/main/calls-light.png and messages-light.png. '+common);
  }
  if(index===4){
   heading(s,'The technology behind Shield');
   image(s,asset('apple.png'),'Apple platform logo',165,199,48,59);
   image(s,asset('openai.png'),'OpenAI logo',478,210,145,40);
   image(s,asset('google.png'),'Google logo',668,208,140,48);
   image(s,asset('telnyx.png'),'Telnyx logo',1008,211,143,45);
   const a=text(s,'Interface','iPhone app',76,301,250,52,37,C.ink,'Georgia');
   const b=text(s,'Processing','Our custom\nAI backend',450,287,385,88,35,C.navy,'Georgia');
   const c=text(s,'Calling','Calling service',944,301,268,52,35,C.ink,'Georgia');
   for(const [x,w] of [[350,60],[865,45]])s.shapes.add({name:'Flow arrow '+x,geometry:'connector',kind:'straight',position:{left:x,top:327,width:w,height:0},line:{fill:'#AAB5C2',width:2},tail:{type:'arrow',width:'sm',length:'sm'}});
   text(s,'Interface stack','Swift + SwiftUI',76,387,300,46,27,C.muted);
   text(s,'Backend stack','TypeScript\nCloud Run + Firebase\nOpenAI + Soniox',450,387,430,135,26,C.muted);
   text(s,'Calling stack','Telnyx Call Control\nRoutes and connects calls',944,387,275,114,25,C.muted);
   text(s,'Accessibility','Designed for readable controls',76,566,1090,54,37,C.navy,'Georgia');
   text(s,'Accessibility example','Large text and full-row tap targets',78,630,1110,42,27,C.muted);
   notes(s,'0:40–1:05 (25 seconds)','AC','We built the iPhone interface in SwiftUI and our custom AI backend in TypeScript. Cloud Run hosts screening, and Firebase stores call history and handles sign-in. Soniox transcribes speech, while OpenAI models assess risk and ask follow-up questions. Telnyx routes calls. We also made controls readable with larger text and full-row tap targets.','Follow the diagram from interface to processing to calling. It is a simplified integration diagram, not the direction of caller audio. Point to one visible accessibility choice. If using benchmark cutaways, fit them inside this 25-second allocation and shorten narration.','docs/ARCHITECTURE.md; docs/HYBRID-SCREENING.md; PRODUCT.md; docs/IOS-POLISH-AUDIT.md S55: full labeled switch rows tappable. Sources distinguish source/simulator verification from older-participant validation. Foundation models are external; the orchestration, screening policy, evidence checks and call-state handling are team-built. Company marks identify technologies, not endorsements. Logo provenance retained in reference-notes.txt.');
  }
  if(index===5){
   heading(s,'A message, made easy to review');
   text(s,'Demo step 1','Open a message.',76,243,720,65,47,C.navy,'Georgia');
   text(s,'Demo step 2','Read the summary.',76,351,720,65,47,C.navy,'Georgia');
   text(s,'Demo step 3','Listen when you choose.',76,459,740,65,47,C.navy,'Georgia');
   image(s,asset('message-current.png'),'Sample message playback screen',914,174,224,486);
   notes(s,'1:05–1:40 (35 seconds)','IZ','From Home, I open Messages and choose a saved message. Shield gives me a short summary, so I can understand the purpose before listening. I tap Listen to message, and I can pause or start over whenever I need.','Use a continuous screen recording: Home (0–5s), Messages (5–10s), select a prepared sample message (10–16s), read summary (16–22s), play/pause (22–29s), explain result (29–35s). Keep Sample app labeling visible. Use the implemented playback controls, not the sample-only Keep action. This slide is a visual opening/closing plate; the actual screen recording is still to be supplied.','ios/README.md; docs/IOS-POLISH-AUDIT.md S49. Existing screenshot is sample audio for pause/resume tests, not a customer’s voicemail. '+common);
  }
  if(index===6){
   heading(s,'How hard did we test Shield?');
   text(s,'Block volume','45,000+',72,193,1120,154,120,C.navy,'Georgia');
   text(s,'Metric definition','blocked outcomes in repeated robocall tests',78,369,1110,62,36);
   text(s,'Test scope','55,000+ transcript trials across historical policy versions',78,452,1110,48,26,C.muted);
   text(s,'Learning','We added evidence checks before treating\na caller as a recording.',78,558,1120,100,35,C.ink,'Georgia');
   notes(s,'1:40–1:48 (8 seconds)','AC','Over fifty-five thousand transcript trials taught us to require evidence before treating a caller as a recording.','Hold the large count while Andrew gives one concrete lesson. Do not call this 45,000 distinct calls or people protected. Do not call it a current accuracy or industry-leading result. The count communicates engineering effort.','testing-count-audit.json and audit-testing.py: 61 complete FTC result sets, exact file copies removed, identical serialized result rows removed across files; 55,684 retained test records, including 45,075 block outcomes, 62 holds, 1,169 questions/continues, 9,174 saved messages, 174 approvals, 16 failures, 14 no-decisions. This is a conservative archival count, excluding incomplete sets, and not all testing ever performed. Repeated source calls and historical policy versions remain separate test trials. Learning/change: docs/SCREENING-PRODUCTION-CANDIDATE.md, v158 recording-evidence correction followed ordinary caller routing misses. No new inference was run.');
  }
  if(index===7){
   heading(s,'Can Shield stop this scam?');
   text(s,'Test disclosure','Test call',78,198,650,50,30,C.teal);
   text(s,'Call cue','Listen to the caller.\nWatch Shield respond.',76,297,800,166,55,C.navy,'Georgia');
   image(s,markFile,'Shield identity for the controlled test-call segment',947,300,180,180);
   notes(s,'1:48–2:23 (35 seconds)','IS introduces and explains; IZ participates','Intro: “This is a controlled test call. Isaac will play a caller making a suspicious request.” Outcome: describe only the response and app result captured in the recording.','5 seconds context, 25 seconds uninterrupted test-call audio and footage, 5 seconds actual result. Keep “Test call” visible throughout. Replace this transition plate with supplied footage. Do not use the animated secretary clips as real-call evidence. No call is placed by this presentation task. Obtain the recording before choosing the outcome caption.','User’s production plan. Shield requires recipient press-1 approval to connect. This slide makes no claim about an unrecorded test outcome.');
  }
  if(index===8){
   heading(s,'In their own words');
   const manifest=root+'/artifacts/private/shield-video-review/selected/quotes.json';
   if(existsSync(manifest)){
    const selected=JSON.parse(readFileSync(manifest,'utf8'));
    text(s,'Feedback context','Why protection matters',78,151,1100,44,27,C.muted);
    selected.forEach((p,i)=>{
     const y=214+i*153;
     image(s,p.portrait,p.name+' interview still',76,y,108,108);
     text(s,'Participant '+i,p.name,276,y+108,900,34,22,C.muted);
     text(s,'Quotation '+i,'“'+p.quote+'”',276,y+8,900,126,34,C.navy,'Georgia');
    });
    notes(s,'2:23–2:44 (21 seconds)','Three interview participants',selected.map(p=>p.name+': “'+p.quote+'”').join('\n'),'Use artifacts/private/shield-video-review/selected/Shield-community-feedback-21s.mp4. Coach Jim gets 6.6 seconds, the Round Rock participant 8.4 seconds, and Joe Harris 6 seconds so the stronger statements fit the 21-second segment. Joe’s two excerpts come from the same answer in original order; the slide marks the omission with an ellipsis. Captions retain the spoken wording. These are personal experiences and reactions to the app concept, not hands-on usability validation. Location-based attribution retained at the owner’s request.',selected.map(p=>p.source+': '+(p.sourceRanges || p.start.toFixed(2)+'–'+p.end.toFixed(2)+' seconds.')).join('\n')+'\nThe unexpected bill is the participant’s recollection; no independent financial-loss verification is claimed. No synthesized speech or AI-generated imagery. Private recordings, transcripts and quote manifests are excluded from Git.');
   }else{
    text(s,'Senior voices','Community feedback',76,264,1100,122,76,C.navy,'Georgia');
    notes(s,'2:23–2:44 (21 seconds)','Three interview participants','Restore the private quote manifest to rebuild the approved testimonial slide.','Private source footage and quote text are deliberately excluded from the repository.','Owner-supplied interviews, October 25, 2026.');
   }
  }

 }
 return {slides:presentation.slides.items.length,videoBeats:9,durationSeconds:164,optionalEvidenceSlides:3};
}
