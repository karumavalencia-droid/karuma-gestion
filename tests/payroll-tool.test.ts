import assert from 'node:assert/strict';import test from 'node:test';
import {runGetMyNomina} from '../lib/coach/payroll-tool';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://payroll-test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';
const user={name:'Test',email:'test@example.com',employeeId:'b0000001-0000-4000-8000-00000000000a',role:'sushi' as const};
test('latest, exact month, absence and database errors remain distinct and self-scoped',async()=>{
 const old=globalThis.fetch;const urls:URL[]=[];let result:unknown={id:'abc',nombre:'Nomina.pdf',periodo:'2026-08'};let fail=false;
 globalThis.fetch=async(input)=>{const url=new URL(String(input));urls.push(url);return new Response(JSON.stringify(url.pathname.endsWith('/staff')?[{id:user.employeeId}]:fail?{message:'unavailable'}:result),{status:fail?500:200,headers:{'content-type':'application/json'}});};
 try{
 const run=async(args:unknown)=>JSON.parse(await runGetMyNomina(args,user));
 assert.equal((await run({month:null,year:null})).periodo,'2026-08');let query=urls.at(-1)!;assert.equal(query.searchParams.get('employee_id'),'eq.'+user.employeeId);assert.match(query.searchParams.get('order')!,/^periodo.desc/);assert.equal(query.searchParams.get('periodo'),'not.is.null');
 await run({month:5,year:2026,employeeId:'another'});assert.equal(urls.at(-1)!.searchParams.get('periodo'),'eq.2026-05');assert.equal(urls.at(-1)!.searchParams.get('employee_id'),'eq.'+user.employeeId);
 result=null;assert.equal((await run({month:5,year:2026})).found,false);
 fail=true;const unavailable=await run({month:5,year:2026});assert.equal(unavailable.error,'payroll_unavailable');assert.equal(unavailable.found,undefined);
 const before=urls.length;for(const month of [NaN,Infinity,0,13,5.5])assert.equal((await run({month,year:2026})).error,'invalid_month');assert.equal(urls.length,before);
 }finally{globalThis.fetch=old;}
});
