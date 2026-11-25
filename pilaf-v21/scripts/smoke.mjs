import assert from 'node:assert/strict';
const base=process.env.SMOKE_ORIGIN||'http://localhost:3000';
for(const path of ['/','/shop','/about','/wholesale','/distributors','/cart','/account','/admin']){const r=await fetch(base+path);assert.equal(r.status,200,path);console.log('PASS',path);}
const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
const catalog=await fetch(base+'/api/catalog');assert.equal(catalog.status,200);const data=await catalog.json();assert.equal(data.salesEnabled,false);assert.ok(Array.isArray(data.products));
const denied=await fetch(base+'/api/orders',{method:'POST',headers:{origin:'https://invalid.example','content-type':'application/json'},body:'{}'});assert.equal(denied.status,403);console.log('PASS health, catalog and origin guard');
