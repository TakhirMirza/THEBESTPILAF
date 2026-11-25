import {randomBytes, scrypt, timingSafeEqual, createHash} from 'node:crypto';
import {cookies} from 'next/headers';
import {db} from './db';
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,(err,key)=>err?reject(err):resolve(key)));
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+(await derive(password,salt)).toString('hex');}
export async function verifyPassword(password:string,stored:string){const [salt,key]=stored.split(':');if(!salt||!key||!/^[a-f0-9]{128}$/.test(key))return false;return timingSafeEqual(await derive(password,salt),Buffer.from(key,'hex'));}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function currentCustomer(){const token=(await cookies()).get('pilaf_session')?.value;if(!token)return null;const r=await db().query('SELECT c.id,c.email FROM customers c JOIN customer_sessions s ON s.customer_id=c.id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)]);return r.rows[0]??null;}
export async function login(id:string){const token=randomBytes(32).toString('hex');await db().query("INSERT INTO customer_sessions VALUES($1,$2,now()+interval '7 days')",[digest(token),id]);(await cookies()).set('pilaf_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:604800});}
export async function logout(){const jar=await cookies();const token=jar.get('pilaf_session')?.value;if(token)await db().query('DELETE FROM customer_sessions WHERE token_hash=$1',[digest(token)]);jar.delete('pilaf_session');}
