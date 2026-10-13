// Content-free schema diagnostics. Never expose input values, Zod messages,
// unknown property names, or paths supplied by an untrusted argument object.
import {z} from 'zod';
const codes=new Set(['invalid_type','invalid_value','unrecognized_keys','too_big','too_small','invalid_format','not_multiple_of','invalid_union','invalid_key','invalid_element','custom']);
export function screeningArgumentIssues(schema,value){
  try {
    const result=schema.safeParse(value);if(result.success)return [];
    const fields=new Set(Object.keys(schema.shape)),seen=new Set(),out=[];
    for(const issue of result.error.issues){
      const field=fields.has(issue.path?.[0])?issue.path[0]:'$';
      const code=codes.has(issue.code)?issue.code:'invalid';
      const key=`${field}/${code}`;if(seen.has(key))continue;
      seen.add(key);out.push({field,code});if(out.length===12)break;
    }
    return out.length?out:[{field:'$',code:'invalid'}];
  }catch{return [{field:'$',code:'schema_check_failed'}];}
}

export function argumentConstraints(schema,issues){
  // These constraints come from the trusted tool schema, never rejected values.
  let properties;try{properties=z.toJSONSchema(schema).properties??{};}catch{return issues;}
  return issues.map(issue=>{
    const p=Object.hasOwn(properties,issue.field)?properties[issue.field]:{};
    return {...issue,
      ...(typeof p.type==='string'?{expectedType:p.type}:{}),
      ...(Array.isArray(p.enum)?{allowed:p.enum}:{}),
      ...(Number.isInteger(p.maxLength)?{maxLength:p.maxLength}:{}),
      ...(Number.isInteger(p.minLength)?{minLength:p.minLength}:{}),
    };
  });
}

export function observationCorrection(issues,schema,version=1){
  return {
    ...(issues.length?{invalidFields:version===2?argumentConstraints(schema,issues):issues}:{}),
    instruction:issues.length
      ? 'Correct the listed screen_call fields to match its schema, then submit the observations again using the same caller evidence. Do not change a correctly observed fact to force acceptance. Do not announce a decision.'
      : 'Recheck the observations and their quoted evidence against this caller transcript, then call screen_call with corrected fields. A rejected call adds no caller evidence. Do not announce a decision.',
  };
}
