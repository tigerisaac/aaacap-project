import {describe,expect,it} from 'vitest';
import {z} from 'zod';
// @ts-expect-error Offline evaluation helper is outside the backend build.
import {screeningArgumentIssues,observationCorrection} from '../../scripts/lib/screening-argument-issues.mjs';

describe('offline observation correction',()=>{
  const canary='UNTRUSTED_PRIVATE_CONTENT';
  const schema=z.object({identity:z.enum(['missing','name_or_role','personal_relationship']),context:z.enum(['missing','personal_caller'])}).strict().superRefine((value,ctx)=>{
    if(value.context==='personal_caller'&&value.identity!=='personal_relationship')for(const field of ['identity','context'])ctx.addIssue({code:'custom',path:[field],message:canary});
  });
  it('explains the conflicting pair without selecting which fact to change',()=>{
    const issues=screeningArgumentIssues(schema,{identity:'name_or_role',context:'personal_caller'});
    expect(issues).toEqual([{field:'identity',code:'custom'},{field:'context',code:'custom'}]);
    const feedback=observationCorrection(issues,schema,3);
    expect(feedback.jointConstraint.fields).toEqual(['identity','context']);
    expect(feedback.instruction).toContain('correct whichever is unsupported');
    expect(feedback.invalidFields[0].allowed).toEqual(['missing','name_or_role','personal_relationship']);
    expect(JSON.stringify(feedback)).not.toContain(canary);
  });
  it('preserves previous feedback versions and ordinary schema corrections',()=>{
    const issues=screeningArgumentIssues(schema,{identity:'name_or_role',context:'personal_caller'});
    for(const version of [1,2])expect(observationCorrection(issues,schema,version).jointConstraint).toBeUndefined();
    const invalid=screeningArgumentIssues(schema,{identity:canary,context:'missing',[canary]:canary});
    const feedback=observationCorrection(invalid,schema,3);
    expect(feedback.jointConstraint).toBeUndefined();
    expect(JSON.stringify(feedback)).not.toContain(canary);
    expect(feedback.invalidFields.some((i:{field:string})=>i.field==='$')).toBe(true);
    expect(observationCorrection([],schema,3).instruction).toContain('quoted evidence');
  });
  it('requires both fixed fields with custom errors before giving joint guidance',()=>{
    for(const issues of [[{field:'identity',code:'custom'}],[{field:'identity',code:'invalid_value'},{field:'context',code:'custom'}]])expect(observationCorrection(issues,schema,3).jointConstraint).toBeUndefined();
  });
});
