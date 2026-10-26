"""Reempacota o runtime Linux compilado para o ambiente Node da ShardCloud."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import copyfileobj
import hashlib
import json
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
if source.resolve() == target.resolve():
    raise ValueError('Origem e destino devem ser diferentes.')
with ZipFile(source) as original, ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=6) as output:
    for item in original.infolist():
        if not item.filename.startswith('runtime/'):
            continue
        if item.filename.startswith('runtime/node_modules/'):
            continue
        original_name = item.filename
        item.filename = item.filename[len('runtime/'):]
        # O formulário da hospedagem ignora diretórios ocultos no ZIP.
        if item.filename == '.next/' or item.filename.startswith('.next/'):
            item.filename = 'build' + item.filename[len('.next'):]
        if not item.filename:
            continue
        # A classe ZipInfo é reutilizada, preservando permissões Linux do runtime.
        with original.open(original_name) as incoming, output.open(item, 'w') as outgoing:
            copyfileobj(incoming, outgoing)
    output.writestr('start.js', """import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if (!existsSync('node_modules/next/package.json')) {
  const install=spawnSync('npm',['ci','--omit=dev','--no-audit','--no-fund'],{stdio:'inherit'});
  if(install.status!==0)process.exit(install.status||1);
}
await import('./scripts/start.mjs');
""")
    output.writestr('next.config.mjs', "export default {distDir:'build',poweredByHeader:false,serverExternalPackages:['pdfkit']};\n")
    output.writestr('.shardcloud', '\n'.join([
        'DISPLAY_NAME=navalha-gestao',
        'DESCRIPTION=Demonstracao ficticia de agenda e gestao para barbearias',
        'LANGUAGE=node', 'MAIN=start.js', 'MEMORY=512', 'VERSION=recommended',
        'SUBDOMAIN=navalha-gestao', 'CUSTOM_COMMAND=node start.js', ''
    ]))
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert not any(Path(n).name.startswith('.env') for n in archive.namelist())
    release=json.loads(archive.read('release.json'))
print('Pacote Node pronto:', target.name)
print('Release compilada:', release['sha'])
print('SHA256:', hashlib.file_digest(target.open('rb'), 'sha256').hexdigest())
