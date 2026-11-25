import {db} from '../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){try{const {rows}=await db().query('SELECT s.id,p.slug,p.name,p.description,s.pack_size,s.price_cents,s.currency,s.stock FROM products p JOIN skus s ON s.product_id=p.id WHERE p.published AND s.published ORDER BY p.slug,s.pack_size');return Response.json({products:rows,salesEnabled:false})}catch{return Response.json({error:'Catalog temporarily unavailable'},{status:503})}}
