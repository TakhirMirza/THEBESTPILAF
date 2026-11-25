import {db} from './db';
import {createHash} from 'node:crypto';
export async function allowAttempt(scope:string,bucket:string,limit:number){
 const key=createHash('sha256').update(bucket).digest('hex');
 const r=await db().query(`INSERT INTO auth_attempts VALUES($1,$2,now(),1) ON CONFLICT(scope,bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start < now()-interval '15 minutes' THEN 1 ELSE LEAST(auth_attempts.attempts+1,1000000) END,window_start=CASE WHEN auth_attempts.window_start < now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`,[scope,key]);
 return Number(r.rows[0].attempts)<=limit;
}
