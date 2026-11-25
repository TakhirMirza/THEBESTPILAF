import {db} from '../../../lib/db';
export async function POST(req:Request){
 if(process.env.WHOLESALE_ENABLED!=='true')return Response.json({error:'Wholesale inquiries are not open yet'},{status:503});
 if(req.headers.get('origin')!==process.env.APP_ORIGIN||req.headers.get('content-type')?.split(';')[0]!=='application/json')return Response.json({error:'Invalid request'},{status:403});
 try{const raw=await req.text();if(raw.length>12000)return Response.json({error:'Request too large'},{status:413});const b=JSON.parse(raw);const valid=(v:unknown,n:number)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
 if(!valid(b.company,200)||!valid(b.contact_name,200)||!valid(b.email,254)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(b.email)||!valid(b.message,4000)||!['supermarket','grocery','restaurant','distributor','other'].includes(b.category)||!Number.isInteger(b.estimated_units)||b.estimated_units<1||b.estimated_units>10000000)return Response.json({error:'Invalid inquiry'},{status:400});
 const r=await db().query('INSERT INTO wholesale_inquiries(company,email,message,category,contact_name,estimated_units) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[b.company.trim(),b.email.trim().toLowerCase(),b.message.trim(),b.category,b.contact_name.trim(),b.estimated_units]);return Response.json({id:r.rows[0].id},{status:201});
 }catch{return Response.json({error:'Unable to submit inquiry'},{status:503});}
}
