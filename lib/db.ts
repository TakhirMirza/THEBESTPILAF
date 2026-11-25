import {Pool} from 'pg';
let pool:Pool|undefined;
export function db(){if(!process.env.DATABASE_URL)throw new Error('Database not configured');return pool??=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:3000})}
