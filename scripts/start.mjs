import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const env={...process.env};
try{env.RELEASE_SHA=JSON.parse(await readFile(new URL('../release.json',import.meta.url),'utf8')).sha;}catch{}
if(!env.DATABASE_URL||!env.BETTER_AUTH_SECRET||!env.BETTER_AUTH_URL)throw Error('Configure DATABASE_URL, BETTER_AUTH_SECRET e BETTER_AUTH_URL.');
if(!env.INITIAL_LOCAL_PASSWORD||env.INITIAL_LOCAL_PASSWORD.length<16||env.INITIAL_LOCAL_PASSWORD==='demo-local-2026')throw Error('Configure INITIAL_LOCAL_PASSWORD com senha administrativa exclusiva.');
function run(args){return spawn(process.execPath,args,{env,stdio:'inherit'});}
const setup=run(['--import','tsx','scripts/seed.ts']);const setupCode=await new Promise(resolve=>setup.on('exit',resolve));if(setupCode!==0)process.exit(Number(setupCode)||1);
const server=run(['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',env.PORT||'3000']);
const worker=run(['--import','tsx','scripts/worker.ts']);
let closing=false;function close(code=0){if(closing)return;closing=true;server.kill('SIGTERM');worker.kill('SIGTERM');setTimeout(()=>process.exit(code),3000).unref();}
server.on('exit',code=>close(code||0));worker.on('exit',code=>close(code||1));process.on('SIGTERM',()=>close());process.on('SIGINT',()=>close());
