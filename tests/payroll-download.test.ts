import assert from 'node:assert/strict';
import test from 'node:test';
import {fetchPayrollPdf,PayrollDownloadError} from '../lib/payroll/download';

test('download validates status and PDF before saving, preserves filename and session',async()=>{
 const original=globalThis.fetch;let response=new Response('%PDF-1.7',{headers:{'content-type':'application/pdf','content-disposition':"attachment; filename*=UTF-8''Nomina_2026-05.pdf"}});let calls=0;
 globalThis.fetch=async (_url,options)=>{calls++;assert.equal(options?.credentials,'same-origin');assert.equal(options?.cache,'no-store');return response;};
 try{
 const file=await fetchPayrollPdf('/api/nominas/abc-def/download');assert.equal(file.filename,'Nomina_2026-05.pdf');assert.equal(await file.blob.text(),'%PDF-1.7');
 for(const status of [401,403,404,500]){response=new Response('{}',{status});await assert.rejects(fetchPayrollPdf('/api/nominas/abc-def/download'),(e:unknown)=>e instanceof PayrollDownloadError&&e.status===status);}
 response=new Response('<html>Login</html>',{headers:{'content-type':'text/html'}});await assert.rejects(fetchPayrollPdf('/api/nominas/abc-def/download'),PayrollDownloadError);
 response=new Response('',{headers:{'content-type':'application/pdf'}});await assert.rejects(fetchPayrollPdf('/api/nominas/abc-def/download'),PayrollDownloadError);
 const before=calls;await assert.rejects(fetchPayrollPdf('https://external.example/file'),PayrollDownloadError);assert.equal(calls,before);
 }finally{globalThis.fetch=original;}
});
