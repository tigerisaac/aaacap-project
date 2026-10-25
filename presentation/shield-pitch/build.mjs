// Reusable Artifact Session callback. Run batches with input.indices.
// Assets come from the existing Shield application and sample-app captures.
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url)).replace(/\/$/, '');
const colors = { bg:'#F2F3F4', ink:'#101E32', navy:'#002664', muted:'#515E70', teal:'#076C5C', red:'#B53742' };
function text(slide, name, value, x,y,w,h,size=28,color=colors.ink,font='Helvetica Neue',bold=false) {
  const s=slide.shapes.add({name,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  s.text=value;
  s.text.style={fontSize:size,typeface:font,color,bold,insets:0,autoFit:'none',verticalAlignment:'top'};
  return s;
}
function mark(slide){slide.images.add({path:root+'/ios/Shield/Resources/Assets.xcassets/ShieldMark.imageset/ShieldMark.png',alt:'Shield logo',fit:'contain',position:{left:1150,top:48,width:58,height:58}});}
function heading(slide,title){text(slide,'Title',title,72,60,1040,105,54,colors.ink,'Georgia');mark(slide);}
function foot(slide,value){ /* References and detailed qualifications live in speaker notes. */ }
function line(slide,x,y,w,color='#D5DBE2'){slide.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:1.5},fill:color,line:{fill:'none',width:0}});}
function note(slide,value){slide.speakerNotes.text=value;}
export async function build({presentation,input}) {
  for (const index of input.indices) {
    const s=input.replace || index===0 ? presentation.slides.getItem(index) : presentation.slides.add({width:1280,height:720});
    if(input.replace){
      for(const item of [...s.shapes.items,...s.images.items]) item.delete();
      const chartInspection=await presentation.inspect({kind:'chart',maxChars:20000});
      const chartIds=chartInspection.records.filter(r=>r.slideIndex===index).map(r=>r.id);
      if(chartIds.length) presentation.delete(chartIds);
    }
    s.background.fill=colors.bg;
    if(index===0){
      s.images.add({path:root+'/ios/Shield/Resources/Assets.xcassets/ShieldMark.imageset/ShieldMark.png',alt:'Shield app identity',fit:'contain',position:{left:76,top:70,width:88,height:88}});
      text(s,'Brand','Shield',72,205,670,128,108,colors.navy,'Georgia');
      text(s,'Purpose','A safer phone call\nfor Texas seniors',77,367,670,138,49,colors.ink,'Georgia');
      text(s,'Description','AI call screening with the recipient in control',78,554,670,60,25,colors.muted);
      s.images.add({path:root+'/presentation/shield-pitch/assets/home-light.png',alt:'Shield Home screen with synthetic sample data',fit:'contain',position:{left:855,top:55,width:280,height:609}});
      note(s,'Shield is an iPhone application and call-screening service designed to help older adults handle unknown calls. The image is an existing sample-app capture, not a real customer record. Unknown calls that reach Shield are screened; an offered call connects only after the recipient presses 1. Source: docs/ARCHITECTURE.md and docs/SCREENING.md. Visual reference: https://www.congressionalappchallenge.us/25-TX37/ and https://vimeo.com/1131555481.');
    }
    if(index===1){
      heading(s,'Financial fraud in Texas seniors');
      text(s,'Texas loss','$678.6M',68,198,760,150,120,colors.navy,'Georgia');
      text(s,'Loss definition','reported lost by Texans age 60+ in 2025',76,367,980,55,34);
      line(s,76,457,1128);
      text(s,'Complaint count','14,410',76,487,380,74,58,colors.ink,'Georgia');
      text(s,'Complaint label','complaints from Texans age 60+',78,571,505,44,23,colors.muted);
      text(s,'State rank','3rd',744,487,320,74,58,colors.ink,'Georgia');
      text(s,'Rank label','highest reported losses among states',746,571,460,44,23,colors.muted);
      foot(s,'FBI IC3, 2025 Annual Report, pp. 49–50. Reported internet-crime losses, not a phone-fraud-only total.');
      note(s,'Texas residents age 60 and over filed 14,410 IC3 complaints and reported $678,564,081 in losses in 2025. Texas ranked third in this age group by reported losses. The headline rounds the exact amount to $678.6 million. These are reported internet-crime figures, not all elder fraud and not a phone-only estimate. They establish the scale of financial harm; they do not estimate how much Shield could prevent. Source: https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf, printed pages 49 and 50, accessed October 25, 2026.');
    }
    if(index===2){
      heading(s,'The technology behind Shield');
      text(s,'Custom backend','Our custom\nAI backend',74,209,480,140,57,colors.navy,'Georgia');
      text(s,'Backend authorship','Built by our team in TypeScript',78,368,465,42,26,colors.muted);
      const capabilities=[['Screening policy','Scam assessment and evidence checks'],['Live conversations','Audio streaming and follow-up questions'],['Call safeguards','Recipient approval before connection']];
      capabilities.forEach(([name,detail],i)=>{
        const y=439+i*74;
        text(s,'Custom '+name,name,78,y,470,34,26,colors.ink,'Helvetica Neue',true);
        text(s,'Custom '+name+' detail',detail,78,y+35,470,35,22,colors.muted);
      });
      const stack=[
        {name:'apple',y:207,w:45,h:55,title:'iPhone app',detail:'Swift + SwiftUI'},
        {name:'telnyx',y:318,w:137,h:43,title:'Call routing',detail:'Telnyx Call Control'},
        {name:'openai',y:429,w:139,h:38,title:'Voice AI',detail:'GPT-6 Luna + GPT Live\nSoniox speech transcription'},
        {name:'google',y:566,w:133,h:45,title:'Cloud services',detail:'Cloud Run + Firebase\nFirestore + Authentication'}
      ];
      for(const row of stack){
        s.images.add({path:root+'/presentation/shield-pitch/assets/'+row.name+'.png',alt:row.name+' company logo',fit:'contain',position:{left:636+(140-row.w)/2,top:row.y+9,width:row.w,height:row.h}});
        text(s,row.title,row.title,816,row.y,390,39,29,colors.ink,'Georgia');
        text(s,row.title+' technologies',row.detail,816,row.y+44,390,65,23,colors.muted);
      }
      note(s,'Shield’s team developed the custom AI backend: the live WebSocket bridge, screening policy and decision orchestration, evidence checks, bounded clarification, call-control state machine and Firebase integration. This is custom application/backend engineering using OpenAI models, not a claim that the team trained a foundation model. Apple supplies the SwiftUI/iPhone platform. Telnyx Call Control routes and connects calls. The current hybrid screening bridge runs on Cloud Run: Soniox stt-rt-v5 transcribes speech, GPT-6 Luna assesses the screening policy, and GPT Live handles useful clarification. The custom bridge and backend are TypeScript. The visible list groups technologies by their role rather than listing unrelated development tools. Google Cloud and Firebase support hosting, backend functions, Firestore and Authentication. The recipient is fixed, screening timers are bounded and a failure never connects a call. Sources: docs/ARCHITECTURE.md; docs/HYBRID-SCREENING.md; package.json; backend/src/live/policy.ts; backend/src/live/session.ts. Connected-call protection is separate and opt-in. Logos identify technologies used, not endorsements or commercial partnerships. Apple logo: the navigation SVG at https://www.apple.com/ . Telnyx black logo: official download linked from https://telnyx.com/media-kit . OpenAI wordmark: https://commons.wikimedia.org/wiki/File:OpenAI_logo_2025_(wordmark).svg, attributed there to https://openai.com/brand/ . Google wordmark: https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png . The logos belong to their respective owners.');
    }
    if(index===3){
      heading(s,'Red teaming shaped the design');
      const rows=[['01','Challenge','Pair scam tactics with similar legitimate calls.'],['02','Document','Keep failures, versioned prompts and frozen run records.'],['03','Validate','Test fresh scripted and adaptive conversations.'],['04','Audit','Report scam stops and legitimate offers separately.']];
      rows.forEach((r,i)=>{let y=205+i*91;text(s,'Step '+i,r[0],76,y-4,80,55,37,colors.navy,'Georgia');text(s,'Action '+i,r[1],180,y,245,47,30,colors.ink,'Georgia');text(s,'Detail '+i,r[2],440,y+2,760,58,27);});
      line(s,76,581,1128);
      text(s,'Evidence statement','40 fresh scripted cases + 16 adaptive profiles',76,600,1100,44,28,colors.teal);
      foot(s,'v158, October 13. Each ran twice. Reused public benchmarks are regression checks, not unseen tests.');
      note(s,'Our red-team process probes impersonation, payment requests, outside-contact bait, ordinary callbacks, recordings and prompt injection using synthetic callers. Every run records policy and request hashes, planned identities, raw outcomes and failures. The v158 fresh scripted set had 40 cases repeated twice: 80/80 intended final outcomes, but 76/80 strict sequences. The four strict misses were early holds after refusal. The adaptive set had 16 profiles repeated twice, reaching 32/32 final outcomes. Question review still found pronoun reversals and awkward questions. Same-model simulation is not independent human realism. Public MASC feedback informed v158; repeated public sets are honestly described as regression checks. We do not tune on existing held-out probes. Main benchmark remains 24 cases. Sources: docs/SCREENING-PRODUCTION-CANDIDATE.md, sections Iteration and evaluation provenance, Results, Checks; docs/SCREENING.md.');
    }
    if(index===4){
      heading(s,'Benchmark performance');
      text(s,'Comparison scope','MASC F1 (%)   Selected published baselines\nZoomed scale: 95–100. Different evaluation methods.',76,155,1128,76,24,colors.muted);
      s.charts.add('bar',{
        position:{left:68,top:245,width:1140,height:410},
        categories:['Shield','RoBERTa','BERT-Large','BERT-Base','DistilBERT'],
        series:[{name:'F1',values:[99.79,99.32,98.83,98.12,96.97],fill:'#C7CFD8',points:[{idx:0,fill:colors.navy}],line:{fill:'none',width:0},dataLabelOverrides:[{idx:0,showValue:true,position:'outEnd',textStyle:{fontSize:29,bold:true,fill:colors.navy}}]}],
        hasLegend:false,barOptions:{direction:'column',grouping:'clustered',gapWidth:90},
        chartFill:colors.bg,plotAreaFill:colors.bg,chartLine:{fill:'none',width:0},plotAreaLine:{fill:'none',width:0},
        xAxis:{visible:true,textStyle:{fontSize:22,fill:colors.ink},line:{fill:'#AAB5C2',width:1},majorGridlines:null},
        yAxis:{visible:true,min:95,max:100,majorUnit:1,numberFormatCode:'0',textStyle:{fontSize:17,fill:colors.muted},line:{fill:'none',width:0},majorGridlines:{fill:'#DCE1E7',width:1}},
        dataLabels:{showValue:true,position:'outEnd',numberFormatCode:'0.00',textStyle:{fontSize:25,bold:true,fill:colors.muted}}
      });
      s.images.add({path:root+'/ios/Shield/Resources/Assets.xcassets/ShieldMark.imageset/ShieldMark.png',alt:'Shield logo centered on the navy Shield research-classifier bar',fit:'contain',position:{left:194,top:431,width:72,height:72}});
      foot(s,'Separate research classifier v3. Original labels. Test-informed development. These are text results, not live-call accuracy.');
      note(s,'The strongest defensible headline is near-perfect benchmark classification, not an industry-leading production accuracy claim. This is the separate MASC binary classifier v3, not deployed screening v158. On original labels: test split 958/960 correct, F1 0.9979209979, 480 true positives, 478 true negatives, two false positives, zero false negatives. The 960 trials repeat 320 unique conversations three times. Prior test outcomes informed v3 development, so this is benchmark-adapted evidence. The additional 1,280 dialogues are MASC’s published training split, unused in our development: 1,275 correct, 639 true positives, 636 true negatives, four false positives, one false negative, F1 0.9961028839. Both sets are synthetic and share a generator. Model pretraining exposure is unknown. Published MASC models report 96.97–99.92% F1 with different training/evaluation protocols, including results above ours, so these numbers do not establish a direct ranking. Sources: artifacts/masc-classifier/masc-v3-three-passes/summary.json; artifacts/masc-classifier/masc-train-v3/summary.json; docs/PUBLIC-SCAM-BENCHMARKS.md. Published context: https://supreme-lab.github.io/ai-in-the-loop/ ; dataset: https://huggingface.co/datasets/BothBosu/multi-agent-scam-conversation . Runs completed October 11, 2026.');
    }
    if(index===5){
      heading(s,'Screening harmful calls');
      text(s,'Scope','Policy v158 on the synthetic MASC text benchmark',76,177,1128,47,29,colors.muted);
      text(s,'Scam percentage','98.1%',72,270,1000,175,140,colors.navy,'Georgia');
      text(s,'Scam metric','157 of 160 harmful calls stopped',78,474,1100,58,40);
      text(s,'Remaining outcomes','The remaining three received follow-up questions',78,560,1120,58,28,colors.muted);
      foot(s,'October 13 regression run. Three harmful calls received questions. Synthetic text does not verify real-call reliability.');
      note(s,'Keep the two objectives equally visible. MASC v158 stops 157/160 harmful calls, comprising 155 blocks and two holds; three receive questions. No harmful MASC call was approved or saved. Among 80 ordinary calls: 69 offered, six saved unverified, three blocked and two questioned. Ads are separate: 40/40 blocked. The percentages are rounded to one decimal. The reused benchmark is a regression test, not an unseen independent validation. On the separate FTC/NC State unwanted-call set, v158 stopped 530/724 distinct recordings, saved 146 unverified, asked 47 questions and retained one timeout, with zero live approvals. Saves and questions are not counted as completed stops. This set contains no legitimate controls. v158 was deployed to the existing pilot on October 13, 2026, with owner approval, as recorded in docs/STATUS.md; that deployment does not transform text evaluation into real-call evidence. Sources: docs/SCREENING-PRODUCTION-CANDIDATE.md and docs/PUBLIC-SCAM-BENCHMARKS.md. Close by explaining that Shield combines conversational screening with a recipient-controlled connection, while real-call validation remains essential.');
    }
  }
  return {slides:presentation.slides.items.length};
}
