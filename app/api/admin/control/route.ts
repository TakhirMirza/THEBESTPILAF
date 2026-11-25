import {db} from '../../../../lib/db';
import {authorized} from '../../../../lib/admin';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){
 if(!await authorized(req,'owner'))return reply({error:'Unauthorized'},401);
 try{
 const result=await db().query(`SELECT
 (SELECT count(*) FROM orders WHERE status='pending') AS pending_orders,
 (SELECT count(*) FROM orders WHERE status='paid') AS paid_orders,
 (SELECT count(*) FROM production_batches WHERE status='hold') AS held_batches,
 (SELECT count(*) FROM production_batches WHERE status='recalled') AS recalled_batches,
 (SELECT count(DISTINCT order_id) FROM recall_affected_orders) AS affected_orders,
 (SELECT count(*) FROM email_outbox WHERE sent_at IS NULL AND failed_at IS NULL) AS pending_email,
 (SELECT count(*) FROM email_outbox WHERE failed_at IS NOT NULL) AS failed_email,
 (SELECT count(*) FROM finished_lots f JOIN production_batches b ON b.id=f.batch_id WHERE f.available>0 AND b.expires_on<=current_date) AS expired_lots`);
 return reply({metrics:result.rows[0],emailEnabled:process.env.EMAIL_ENABLED==='true',generatedAt:new Date().toISOString()});
 }catch{return reply({error:'Control center unavailable'},503)}
}
