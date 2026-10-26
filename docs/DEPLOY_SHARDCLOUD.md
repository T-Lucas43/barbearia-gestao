# Publicação na ShardCloud

Demonstração publicada em https://navalha-gestao.shardweb.app/ em 26/10/2026.

## Implantação verificada

- Aplicação: `navalha-gestao`, ID `9668b057-f1f9-4f9d-a582-c7f5cb1dc30a`.
- Ambiente Node.js 22.17.1, porta 80, 512 MB reservados, 1 vCPU. Sem upgrade de plano ou exclusão de recursos.
- Fonte compilada: `3ef57773301c14cb52e21e37e667cfdeda92fa6f`, validada com typecheck, 18 testes e build no GitHub Actions.
- Pacote final: `navalha-node-tv.zip`, SHA256 `6c4c441bcd7fd50febb2d56a6acbb4b06d7c76c84832e2071e9557dcaae9cb67`.
- Banco separado: `navalha_gestao_20261025` no PostgreSQL já reservado. Tabelas e seed aditivos; clientes, serviços e movimentos de demonstração são fictícios.
- A conexão original do serviço PostgreSQL foi autorizada especificamente pelo usuário para esta demonstração. O parâmetro de conexão `options=-c role=navalha_app` mantém as consultas na role restrita. A credencial de transporte continua administrativa e deve ser substituída por conexão própria antes de usar dados reais.
- Segredos configurados somente no ambiente do servidor. O ZIP e o Git não incluem arquivos `.env`. A senha administrativa está somente em arquivo local ignorado, `output/acesso-administrativo.txt`.
- DEMO_MODE=true, NEXT_PUBLIC_DEMO_MODE=true e WHATSAPP_ENABLED=false. As duas contas de demonstração permitem testar lançamentos fictícios; nenhum envio real de WhatsApp foi feito.

A VPS e o banco existentes não permitiram redução de RAM pelo painel; nada foi redimensionado ou excluído. O Mega Eletron foi preservado. A Navalha utiliza os 512 MB que estavam livres. Não foi necessário criar outra imagem Docker: o limite de seis imagens já estava ocupado.

## Como preparar uma atualização

O Dockerfile principal compila Next em Linux. A esteira `.github/workflows/release.yml` valida tipos, integração com PostgreSQL e build, sem elevar permissões do token. O armazenamento de artifacts da conta GitHub estava cheio; o pacote foi gerado em Docker local.

1. Gerar o target `package` com `RELEASE_SHA` igual ao commit da fonte.
2. Extrair `/navalha-shard.zip` do container temporário, sem executar esse container.
3. Reempacotar com `scripts/package-shard-node.py origem.zip destino.zip`.
4. Enviar o ZIP pelo Commit da aplicação na ShardCloud e marcar reinício. Preservar todas as variáveis do servidor.
5. Conferir `/api/health`, SHA, login, permissões, PDF e persistência.

O formulário de upload remove diretórios ocultos e pastas `node_modules`, inclusive as dependências externas geradas pelo Turbopack dentro de `.next`. O empacotador usa `build` e `vendor`; `start.js` restaura os vínculos `node_modules` antes de iniciar. PostgreSQL, PDFKit, dependências aninhadas e fontes foram verificados nesse formato. As dependências normais são instaladas pela plataforma; a aplicação não é compilada na hospedagem.

Preserve BETTER_AUTH_SECRET entre releases, pois também protege os links pessoais armazenados. APP_URL, BETTER_AUTH_URL e APP_ORIGINS devem corresponder ao domínio HTTPS público. A senha inicial administrativa deve ser aleatória e ter pelo menos 16 caracteres; o seed não sobrescreve contas existentes.

## Verificação pública realizada

- HTTPS e `/api/health`: HTTP 200, PostgreSQL pronto, modo demo e SHA esperado.
- Login administrativo e de demonstração; acesso anônimo privado bloqueado (401), escrita da demonstração e origem externa bloqueadas (403).
- Relatório PDF A4 de dez páginas exportado pela conta pública; manifest, service worker e ícones retornaram 200.
- API de TV sem telefone ou financeiro; reserva pública fictícia sem consentimento de WhatsApp criada para QA.
- Reinício da aplicação: mesma sessão e reserva preservadas. Depois, apenas a reserva de QA foi cancelada, mantendo histórico.
- Layout público em 375 px sem overflow; X, toque fora e instruções de instalação conferidos.

Instalação em aparelho físico, pareamento de Smart TV e entrega real de WhatsApp ainda não foram homologados. A implantação é uma demonstração com dados fictícios.

