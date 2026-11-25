import pg from 'pg';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
if(!process.env.DATABASE_URL) throw Error('DATABASE_URL required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
 const files=(await readdir('db')).filter(x=>/^\d+\.sql$/.test(x)).sort();
 const {rows}=await pool.query('SELECT name,checksum FROM schema_migrations ORDER BY name');
 assert.deepEqual(rows.map(r=>r.name),files);
 for(const row of rows) assert.equal(row.checksum,createHash('sha256').update(await readFile('db/'+row.name)).digest('hex'));
 const products=await pool.query('SELECT count(*)::int AS n FROM products');
 assert.ok(products.rows[0].n>=3);
 console.log(`Verified ${files.length} migrations and product seed`);
} finally {await pool.end();}
