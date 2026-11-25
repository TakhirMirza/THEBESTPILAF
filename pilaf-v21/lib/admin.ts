import {db} from './db';
import {verifyPassword} from './customer';
import {allowAttempt} from './rate';
export async function authorized(req:Request,role:string){
 try{
 const header=req.headers.get('authorization');if(!header?.startsWith('Basic ')||header.length>2048)return false;
 const raw=Buffer.from(header.slice(6),'base64').toString('utf8');const i=raw.indexOf(':');if(i<1)return false;
 const username=raw.slice(0,i),password=raw.slice(i+1);if(!/^[a-z0-9_.-]{1,64}$/.test(username)||password.length<24||password.length>128)return false;
 if(!await allowAttempt('admin-global','all',300)||!await allowAttempt('admin-user',username,60))return false;
 const r=await db().query('SELECT password_hash,role FROM admin_accounts WHERE username=$1 AND enabled',[username]);const a=r.rows[0];
 if(!a||!await verifyPassword(password,a.password_hash)||!(a.role==='owner'||a.role===role))return false;
 await db().query('INSERT INTO admin_audit(actor,route,method) VALUES($1,$2,$3)',[username,new URL(req.url).pathname,req.method]);return true;
 }catch{return false;}
}
