import {readFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import pg from 'pg';
const env=parse(await readFile('.env.shard.local'));
const client=new pg.Client({connectionString:env.DATABASE_URL,connectionTimeoutMillis:20000,statement_timeout:30000});
try{await client.connect();console.log((await client.query('SELECT current_database() database,current_user role')).rows);console.log((await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rowCount,'tabelas na base Navalha');}catch(e){console.log('Falha na verificação:',e.message,e.code);process.exitCode=1;}finally{await client.end();}
