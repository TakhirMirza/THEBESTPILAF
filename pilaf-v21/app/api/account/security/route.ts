import {randomBytes,createHash} from 'node:crypto';
import {db} from '../../../../lib/db';
import {hashPassword} from '../../../../lib/customer';
import {allowAttempt} from '../../../../lib/rate';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function POST(req:Request){
 if(process.env.ACCOUNTS_ENABLED!=='true'||process.env.EMAIL_ENABLED!=='true')return Response.json({error:'Unavailable'},{status:503});
 if(req.headers.get('origin')!==process.env.APP_ORIGIN||req.headers.get('content-type')?.split(';')[0]!=='application/json')return Response.json({error:'Invalid request'},{status:403});
 try{
 const b=await req.json(); const action=b.action;
 if(!await allowAttempt('security-global','all',200))return Response.json({error:'Try later'},{status:429});
 if(action==='request-reset'||action==='request-verify'){
 const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:'Invalid email'},{status:400});
 if(!await allowAttempt('security-email',email,5))return Response.json({ok:true});
 const purpose=action==='request-reset'?'reset':'verify';const token=randomBytes(32).toString('hex');
 const link=new URL('/account/security',process.env.APP_ORIGIN);link.hash=new URLSearchParams({token,purpose}).toString();
 const c=await db().connect();try{await c.query('BEGIN');const u=(await c.query('SELECT id,email,email_verified_at FROM customers WHERE email=$1 AND password_hash IS NOT NULL FOR UPDATE',[email])).rows[0];
 if(u&&(purpose==='reset'||!u.email_verified_at)){
 await c.query("INSERT INTO customer_action_tokens VALUES($1,$2,$3,now()+interval '30 minutes') ON CONFLICT(customer_id,purpose) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at",[digest(token),u.id,purpose]);
 await c.query('INSERT INTO email_outbox(dedupe_key,recipient,subject,body) VALUES($1,$2,$3,$4)',[digest(token),u.email,purpose==='reset'?'Reset your password':'Verify your email',`THE BEST PILAF\nOpen this link within 30 minutes: ${link}\nIf you did not request this, ignore this message.`]);}
 await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}return Response.json({ok:true});}
 if(action==='reset'||action==='verify'){
 if(typeof b.token!=='string'||! /^[a-f0-9]{64}$/.test(b.token)||action==='reset'&&(typeof b.password!=='string'||b.password.length<12||b.password.length>128))return Response.json({error:'Invalid input'},{status:400});
 const password=action==='reset'?await hashPassword(b.password):null;const c=await db().connect();try{await c.query('BEGIN');const t=(await c.query('DELETE FROM customer_action_tokens WHERE token_hash=$1 AND purpose=$2 AND expires_at>now() RETURNING customer_id',[digest(b.token),action])).rows[0];if(!t){await c.query('ROLLBACK');return Response.json({error:'Invalid or expired link'},{status:400});}
 if(action==='reset'){await c.query('UPDATE customers SET password_hash=$2 WHERE id=$1',[t.customer_id,password]);await c.query('DELETE FROM customer_sessions WHERE customer_id=$1',[t.customer_id]);}else await c.query('UPDATE customers SET email_verified_at=now() WHERE id=$1',[t.customer_id]);await c.query('COMMIT');return Response.json({ok:true});}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 return Response.json({error:'Invalid action'},{status:400});
 }catch{return Response.json({error:'Request unavailable'},{status:503});}
}
