import {db} from '../../../lib/db';
import {currentCustomer} from '../../../lib/customer';
import {cookies} from 'next/headers';
import {stripe,testEnabled} from '../../../lib/payment';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 if(!testEnabled())return reply({error:'Checkout is closed'},503);
 if(req.headers.get('origin')!==process.env.APP_ORIGIN||req.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({error:'Invalid request'},403);
 try{const customer=await currentCustomer();if(!customer)return reply({error:'Sign in first'},401);
 const b=await req.json();if(typeof b.key!=='string'||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(b.key))return reply({error:'Invalid key'},400);
 const shipping=Number(process.env.TEST_SHIPPING_CENTS);if(!Number.isSafeInteger(shipping)||shipping<0||shipping>100000)return reply({error:'Shipping not configured'},503);const taxMode=process.env.TEST_STRIPE_TAX==='true';
 const cart=(await cookies()).get('pilaf_cart')?.value;const c=await db().connect();let order:any;
 try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[customer.id]);
 const old=await c.query('SELECT * FROM orders WHERE checkout_key=$1 AND customer_id=$2',[b.key,customer.id]);order=old.rows[0];
 if(!order){if(!cart)throw Error('Empty basket');const pending=await c.query("SELECT id FROM orders WHERE customer_id=$1 AND status='pending'",[customer.id]);if(pending.rowCount)throw Error('Existing pending order');
 const items=(await c.query('SELECT s.id,s.stock,s.price_cents,s.published,p.published AS product_published,i.quantity FROM cart_items i JOIN skus s ON s.id=i.sku_id JOIN products p ON p.id=s.product_id WHERE i.cart_id=$1 ORDER BY s.id FOR UPDATE OF s,p',[cart])).rows;
 if(!items.length||items.some(i=>!i.published||!i.product_published||!i.price_cents||i.stock<i.quantity))throw Error('Unavailable basket');
 const total=items.reduce((sum,i)=>sum+i.price_cents*i.quantity,0);if(total<50||total>99999999)throw Error('Invalid total');
 order=(await c.query("INSERT INTO orders(customer_id,subtotal_cents,checkout_key,reservation_expires_at,shipping_cents,tax_mode) VALUES($1,$2,$3,now()+interval '2 hours',$4,$5) RETURNING *",[customer.id,total,b.key,shipping,taxMode])).rows[0];
 for(const i of items){await c.query('UPDATE skus SET stock=stock-$1 WHERE id=$2',[i.quantity,i.id]);await c.query('INSERT INTO order_items VALUES($1,$2,$3,$4)',[order.id,i.id,i.quantity,i.price_cents]);}}
 await c.query('COMMIT');}catch{await c.query('ROLLBACK');return reply({error:'Basket unavailable or pending order exists'},409);}finally{c.release();}
 if(order.status!=='pending')return reply({error:'Order is no longer pending'},409);
 if(order.checkout_url)return reply({url:order.checkout_url});
 const p=new URLSearchParams({mode:'payment',success_url:process.env.APP_ORIGIN+'/account',cancel_url:process.env.APP_ORIGIN+'/checkout',client_reference_id:order.id,'metadata[order_id]':order.id,'payment_method_types[0]':'card','line_items[0][price_data][currency]':'usd','line_items[0][price_data][product_data][name]':'THE BEST PILAF — test order','line_items[0][price_data][unit_amount]':String(order.subtotal_cents),'line_items[0][quantity]':'1',expires_at:String(Math.floor(new Date(order.reservation_expires_at).getTime()/1000))});
 p.set('shipping_address_collection[allowed_countries][0]','US');p.set('shipping_options[0][shipping_rate_data][type]','fixed_amount');p.set('shipping_options[0][shipping_rate_data][fixed_amount][amount]',String(order.shipping_cents));p.set('shipping_options[0][shipping_rate_data][fixed_amount][currency]','usd');p.set('shipping_options[0][shipping_rate_data][display_name]','Standard shipping (test)');p.set('automatic_tax[enabled]',String(order.tax_mode));p.set('line_items[0][price_data][tax_behavior]','exclusive');p.set('shipping_options[0][shipping_rate_data][tax_behavior]','exclusive');
 const session=await stripe('checkout/sessions',p,order.id);await db().query('UPDATE orders SET payment_reference=$1,checkout_url=$2 WHERE id=$3',[session.id,session.url,order.id]);return reply({url:session.url});
 }catch{return reply({error:'Checkout unavailable; retry with the same request'},503);}
}
