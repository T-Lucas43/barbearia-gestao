// Cria apenas um banco isolado; não altera schemas ou contas de aplicações existentes.
import {readFile,writeFile,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parse} from 'dotenv';
import pg from 'pg';
const file='.env.shard.local';
let already=false;try{await access(file);already=true;}catch{}
if(already)throw Error('Ambiente Shard já existe. Reutilize os segredos salvos.');
const admin=parse(await readFile('.env.shard.admin.local'));
const client=new pg.Client({connectionString:admin.SHARD_ADMIN_DATABASE_URL,connectionTimeoutMillis:15000});
const role='navalha_app',database='navalha_gestao_20261025';
const password=randomBytes(32).toString('hex');
try{
 await client.connect();
 const exists=await client.query('SELECT 1 FROM pg_database WHERE datname=$1 UNION ALL SELECT 1 FROM pg_roles WHERE rolname=$2',[database,role]);
 if(exists.rowCount)throw Error('Nome de banco ou usuário já existe; não será modificado.');
 await client.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
 await client.query(`CREATE DATABASE ${database} OWNER ${role}`);
 await client.query(`REVOKE CONNECT ON DATABASE ${database} FROM PUBLIC`);
 await client.query(`GRANT CONNECT ON DATABASE ${database} TO ${role}`);
 const url=new URL(admin.SHARD_ADMIN_DATABASE_URL);url.username=role;url.password=password;url.pathname='/'+database;
 const values={DATABASE_URL:url.href,BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),INITIAL_LOCAL_PASSWORD:randomBytes(24).toString('base64url'),APP_URL:'https://navalha-gestao.shardweb.app',BETTER_AUTH_URL:'https://navalha-gestao.shardweb.app',APP_ORIGINS:'https://navalha-gestao.shardweb.app',DEMO_MODE:'true',NEXT_PUBLIC_DEMO_MODE:'true',WHATSAPP_ENABLED:'false',DATABASE_POOL_SIZE:'5',BACKUP_ENCRYPTION_KEY:randomBytes(48).toString('hex')};
 await writeFile(file,Object.entries(values).map(([key,value])=>key+'='+value).join('\n')+'\n',{flag:'wx'});
 console.log('Banco Navalha isolado criado. Ambiente protegido salvo localmente; nenhuma credencial foi impressa.');
}finally{await client.end();}
