import assert from 'node:assert/strict';
const base=new URL(process.env.SMOKE_ORIGIN||'http://localhost:3000');
if(!['https:','http:'].includes(base.protocol)||base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw Error('SMOKE_ORIGIN must be an origin');
const origin=base.origin;
async function check(path,status,options={},validate=()=>{}){
 const r=await fetch(origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,status,path);await validate(r);console.log('PASS',options.method||'GET',path,status);
}
const post={method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'};
for(const path of ['/api/admin','/api/admin/control','/api/admin/audit','/api/admin/finance','/api/admin/manufacturing','/api/admin/shipping','/api/admin/wholesale'])await check(path,401,{},r=>assert.match(r.headers.get('cache-control')||'',/no-store/));
for(const path of ['/api/orders','/api/account','/api/account/security','/api/wholesale'])await check(path,503,post);
await check('/api/orders',403,{...post,headers:{...post.headers,origin:'https://invalid.example'}});
await check('/api/stripe/webhook',503,{method:'POST',body:'{}'});
await check('/api/catalog',200,{},async r=>{const data=await r.json();assert.equal(data.salesEnabled,false);assert.ok(Array.isArray(data.products));assert.ok(data.products.length>0);});
await check('/api/health',200,{},async r=>assert.equal((await r.json()).status,'ok'));
console.log('Informational-mode release checks passed; this is not commercial approval.');
