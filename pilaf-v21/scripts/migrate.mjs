import pg from 'pg';import {readdir,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
try{await c.query('SELECT pg_advisory_lock(781200)');await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL)');
const files=(await readdir('db')).filter(x=>/^\d+\.sql$/.test(x)).sort();
for(const name of files){const raw=await readFile('db/'+name,'utf8');const checksum=createHash('sha256').update(raw).digest('hex');const old=(await c.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name])).rows[0];if(old){if(old.checksum!==checksum)throw Error('Changed migration: '+name);continue;}const sql=raw.trim().replace(/^BEGIN\s*;/i,'').replace(/COMMIT\s*;\s*$/i,'');await c.query('BEGIN');try{await c.query(sql);await c.query('INSERT INTO schema_migrations VALUES($1,$2)',[name,checksum]);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}}
}finally{c.release();await pool.end();}
