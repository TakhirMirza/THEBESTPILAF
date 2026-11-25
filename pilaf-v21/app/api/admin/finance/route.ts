import {db} from '../../../../lib/db';
import {authorized} from '../../../../lib/admin';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const categories=['labor','packaging','utilities','freight','rent','marketing','other'];
function date(v:unknown):v is string {return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
export async function GET(req:Request){
 if(!await authorized(req,'finance'))return reply({error:'Unauthorized'},401);
 const p=new URL(req.url).searchParams;const from=p.get('from'),to=p.get('to');
 if(!date(from)||!date(to)||from>to)return reply({error:'Invalid dates'},400);
 try{const c=await db().connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const queries={orders:`SELECT status,count(*)::text AS orders,sum(subtotal_cents)::text AS merchandise_cents,sum(shipping_cents)::text AS shipping_charged_cents,sum(tax_cents)::text AS tax_cents FROM orders WHERE created_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND created_at < ($2::date+1)::timestamp AT TIME ZONE 'UTC' GROUP BY status ORDER BY status`,states:`SELECT COALESCE(shipping_address->'address'->>'state','Unknown') AS state,count(*)::text AS orders,sum(subtotal_cents)::text AS merchandise_cents FROM orders WHERE status IN ('paid','shipped') AND created_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND created_at < ($2::date+1)::timestamp AT TIME ZONE 'UTC' GROUP BY 1 ORDER BY 1`,production:`SELECT b.lot_code,b.status,b.units,COALESCE(sum(i.cost_cents),0)::text AS material_cost_cents FROM production_batches b LEFT JOIN batch_inputs i ON i.batch_id=b.id WHERE b.produced_on BETWEEN $1::date AND $2::date GROUP BY b.id ORDER BY b.id`,expenses:`SELECT category,sum(amount_cents)::text AS amount_cents FROM finance_expenses WHERE incurred_on BETWEEN $1::date AND $2::date GROUP BY category ORDER BY category`,wholesale:`SELECT status,count(*)::text AS inquiries FROM wholesale_inquiries WHERE created_at >= $1::date::timestamp AT TIME ZONE 'UTC' AND created_at < ($2::date+1)::timestamp AT TIME ZONE 'UTC' GROUP BY status ORDER BY status`};
 const result:Record<string,unknown>={};for(const [key,sql] of Object.entries(queries))result[key]=(await c.query(sql,[from,to])).rows;await c.query('COMMIT');return reply({from,to,mode:'TEST DATA ONLY',...result});
 }catch{await c.query('ROLLBACK');return reply({error:'Report unavailable'},503)}finally{c.release()}}catch{return reply({error:'Database unavailable'},503)}
}
export async function POST(req:Request){if(!await authorized(req,'finance'))return reply({error:'Unauthorized'},401);if(!process.env.APP_ORIGIN||req.headers.get('origin')!==process.env.APP_ORIGIN||req.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({error:'Invalid origin or content type'},403);
 try{const b=await req.json();if(!date(b.incurred_on)||!categories.includes(b.category)||!Number.isSafeInteger(b.amount_cents)||b.amount_cents<1||b.amount_cents>100000000000||typeof b.description!=='string'||!b.description.trim()||b.description.length>500)return reply({error:'Invalid expense'},400);const r=await db().query('INSERT INTO finance_expenses(incurred_on,category,amount_cents,description) VALUES($1,$2,$3,$4) RETURNING id',[b.incurred_on,b.category,b.amount_cents,b.description.trim()]);return reply(r.rows[0],201)}catch{return reply({error:'Expense not confirmed; check database before retrying'},503)}
}
