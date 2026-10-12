// Existing development/main/caution coverage. Keep original expectations, including historical policy differences.
// This adapter never changes or enlarges the 24-case main benchmark; silence needs voice/session checks.
export const sourceFiles=[
  'scripts/fixtures/live-screening-cases.mjs','scripts/fixtures/caution-cases.mjs',
  ...['care-identity','conversation-boundaries','existing-provider','family-handoff','family-trouble','lean-boundaries','manipulation','notice-boundaries','notice-followups','round1','round2','round3','round4','round5','solicitation'].map(n=>`scripts/fixtures/redteam/${n}.mjs`)
];
export const cases=[],stagedCases=[];
for(const source of sourceFiles){
  const {liveScreeningCases}=await import(new URL(`../../../${source}`,import.meta.url));
  for(const c of liveScreeningCases.filter(c=>c.text)){
    const turns=[c.text,...[c.followups??c.followup??[]].flat()];
    const caution=source.endsWith('/caution-cases.mjs');
    const mapped={name:`${source.split('/').at(-1).replace('.mjs','')}/${c.name}`,category:caution?'context':['scam','robocall'].includes(c.category)?'scam':c.category==='legit'?'legit':'unclear',originalCategory:c.category,focus:source,turns,accept:c.accept,caution,staged:turns.length>1};
    (mapped.staged?stagedCases:cases).push(mapped);
  }
}
