import {db} from '../../../../lib/db';
import {authorized} from '../../../../lib/admin';
export const dynamic='force-dynamic';
export async function GET(req:Request){if(!await authorized(req,'owner'))return Response.json({error:'Unauthorized'},{status:401});try{return Response.json({events:(await db().query('SELECT id,actor,route,method,created_at FROM admin_audit ORDER BY id DESC LIMIT 200')).rows},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Audit unavailable'},{status:503})}}
