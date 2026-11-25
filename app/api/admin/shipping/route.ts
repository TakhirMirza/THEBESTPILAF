import {db} from '../../../../lib/db';
import {authorized} from '../../../../lib/admin';
export async function POST(req:Request){
 if(!await authorized(req,'shipping'))return Response.json({error:'Unauthorized'},{status:401});
 if(req.headers.get('origin')!==process.env.APP_ORIGIN||req.headers.get('content-type')?.split(';')[0]!=='application/json')return Response.json({error:'Invalid request'},{status:403});
 try{const b=await req.json();if(typeof b.id!=='string'||! /^[a-f0-9-]{36}$/i.test(b.id)||!['USPS','UPS','FedEx'].includes(b.carrier)||typeof b.tracking!=='string'||! /^[A-Za-z0-9-]{5,50}$/.test(b.tracking))return Response.json({error:'Invalid shipment'},{status:400});
 const r=await db().query("UPDATE orders SET status='shipped',shipping_service=$2,tracking_number=$3,shipped_at=now() WHERE id=$1 AND status='paid' AND shipping_address IS NOT NULL RETURNING id",[b.id,b.carrier,b.tracking]);return Response.json({ok:!!r.rowCount},{status:r.rowCount?200:409});}catch{return Response.json({error:'Shipment update failed'},{status:503});}
}
