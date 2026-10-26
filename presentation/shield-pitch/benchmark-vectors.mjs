// Editable vector geometry for reliable PowerPoint-to-Google-Slides import.
// Native chart source and benchmark provenance remain in evidence-slides.mjs.
export const benchmarkData={
 masc:{categories:['Shield','RoBERTa','BERT-Large','BERT-Base','DistilBERT'],values:[99.79,99.32,98.83,98.12,96.97],min:95,max:100,step:1,digits:2,suffix:''},
 ftc:{categories:['Shield','RoboKA','HuBERT + BERT\nfusion','BERT (text)','WavLM (audio)'],values:[99.1,82.2,67.2,58.1,46.6],min:0,max:100,step:25,digits:1,suffix:'%'}
};
function rect(s,name,x,y,w,h,fill){return s.shapes.add({name,geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});}
function label(s,name,value,x,y,w,h,size,color,bold=false,alignment='center'){
 const a=s.shapes.add({name,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 a.text=value;a.text.style={fontSize:size,typeface:'Helvetica Neue',color,bold,alignment,insets:0,autoFit:'none',verticalAlignment:'top'};return a;
}
export function addBenchmarkVectors(slide,key){
 const d=benchmarkData[key];if(!d)throw new Error('Unknown benchmark');
 const left=130,right=1198,top=292,bottom=622,barWidth=120,centers=[230,442,654,866,1078];
 for(let v=d.min;v<=d.max;v+=d.step){
  const y=bottom-(v-d.min)/(d.max-d.min)*(bottom-top);
  rect(slide,`Benchmark grid ${v}`,left,y,right-left,v===d.min?1.5:1,v===d.min?'#AAB5C2':'#DCE1E7');
  label(slide,`Benchmark tick ${v}`,String(v),72,y-11,45,26,17,'#515E70',false,'right');
 }
 d.values.forEach((v,i)=>{
  if(v<d.min||v>d.max)throw new Error('Value outside axis range');
  const h=(v-d.min)/(d.max-d.min)*(bottom-top),y=bottom-h,x=centers[i]-barWidth/2;
  rect(slide,`Benchmark bar ${d.categories[i]} ${v}`,x,y,barWidth,h,i===0?'#002664':'#C7CFD8');
  label(slide,`Benchmark value ${i}`,v.toFixed(d.digits)+d.suffix,centers[i]-90,y-39,180,36,i===0?29:25,i===0?'#002664':'#515E70',true);
  label(slide,`Benchmark category ${i}`,d.categories[i],centers[i]-103,637,206,66,21,'#101E32');
 });
 return {bars:d.values.length,axis:[d.min,d.max],values:[...d.values]};
}
export async function upgradeBenchmarks({presentation}){
 const charts=await presentation.inspect({kind:'chart',maxChars:8000});
 const changes=[];
 for(const [key,slideId] of [['masc','sl/g1pq3a'],['ftc','sl/q1dq37']]){
  const slide=presentation.resolve(slideId);
  for(const sh of [...slide.shapes.items])if(sh.name?.startsWith('Benchmark '))sh.delete();
  // Canonical chart IDs were inspected before this focused migration.
  const original=key==='masc'?'ch/lsjqtsju':'ch/knm5sbax';
  if(charts.records.some(c=>c.id===original))presentation.delete(original);
  changes.push(addBenchmarkVectors(slide,key));
  for(const im of slide.images.items){
   if(Math.abs(im.position.left-194)<1&&Math.abs(im.position.width-72)<1)im.position={...im.position,top:key==='masc'?427.93:422.485};
   im.bringToFront();
  }
  const disclosure='EXPORT COMPATIBILITY: Benchmark bars, axes and labels are native editable vector shapes, preserving sharpness when imported into Google Slides. Values and axis ranges are unchanged. This is a visual chart; it does not have a linked Edit Data workbook. Original chart data is retained in the presentation source.';
  if(!slide.speakerNotes.text.includes('EXPORT COMPATIBILITY:'))slide.speakerNotes.text+='\n\n'+disclosure;
 }
 return changes;
}
