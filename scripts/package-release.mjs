import {cp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
const target=resolve('release-package');
await mkdir(resolve(target,'runtime'),{recursive:true});
for(const name of ['node_modules','.next','public','lib','scripts','package.json','package-lock.json'])await cp(resolve(name),resolve(target,'runtime',name),{recursive:true,filter:source=>!source.includes(`${String.fromCharCode(47)}.next${String.fromCharCode(47)}cache`)});
await cp('Dockerfile.shard',resolve(target,'Dockerfile'));
await writeFile(resolve(target,'runtime','release.json'),JSON.stringify({sha:process.env.GITHUB_SHA||process.env.RELEASE_SHA||'local'}));
console.log('Pacote compilado preparado em release-package; não inclui arquivos de ambiente.');
