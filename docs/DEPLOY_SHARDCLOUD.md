# Publicação na ShardCloud

O Dockerfile principal permite build completo. A publicação com pouca RAM usa a esteira `.github/workflows/release.yml`: testa contra PostgreSQL efêmero, compila Next em Linux e produz ZIP com `Dockerfile.shard` e runtime pronto. Assim a ShardCloud não precisa compilar o frontend na inicialização.

## Ambiente

Use banco exclusivo e usuário restrito à aplicação. Não envie `.env`, backups ou credenciais no ZIP. Configure DATABASE_URL, BETTER_AUTH_SECRET, INITIAL_LOCAL_PASSWORD, APP_URL, BETTER_AUTH_URL e APP_ORIGINS pelo painel; as três URLs devem usar o domínio HTTPS público. Senha inicial >=16 caracteres, aleatória e exclusiva. Preserve BETTER_AUTH_SECRET entre releases, pois também protege os links pessoais armazenados.

DEMO_MODE=true e NEXT_PUBLIC_DEMO_MODE=true habilitam a demonstração; NEXT_PUBLIC_DEMO_MODE é definido durante o build. WHATSAPP_ENABLED=false. O modo de demonstração impede envios mesmo se a flag de WhatsApp for ativada. NODE_OPTIONS limita o heap; pool padrão de cinco conexões. O processo inicia migrações/seed aditivos, depois Next e worker, com término coordenado.

O pacote deve corresponder ao SHA do commit e ser conferido pelo SHA256SUMS. `/api/health` retorna prontidão PostgreSQL e release. Após publicar, verificar login, restrição da conta pública, agenda, exportação PDF, manifest/ícones e persistência após reinício. Não usar apenas status verde de build como prova de funcionamento.

## Situação desta implantação

Publicação autorizada pelo usuário. Banco `navalha_gestao_20261025` e role `navalha_app` criados no serviço PostgreSQL já reservado, mediante aprovação específica. O endpoint público da ShardCloud encerra a conexão ao usar a role customizada; roteamento em investigação. Não foi publicada uma versão com credencial administrativa compartilhada.

VPS e banco existentes recusam redução de RAM pelo painel. Nenhum desses redimensionamentos foi salvo. O Mega Eletron ativo deve permanecer preservado. Não fazer upgrade pago ou excluir recursos para obter capacidade.
