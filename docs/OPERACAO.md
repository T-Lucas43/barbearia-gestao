# Operação do Elares Barber

Atualizado em 26/10/2026. Desenvolvimento local e demonstração publicada são ambientes distintos. Não usar dados reais na demonstração.

## Desenvolvimento local

Node 22+, dependências instaladas e arquivo .env próprio. Aplicação em http://127.0.0.1:3000 e PostgreSQL em 127.0.0.1:5547.

Alternativa nativa, sem Docker:

1. Execute npm run db:local:install uma vez.
2. Em um terminal: npm run db:local.
3. Em outro: npm run db:seed e depois npm run dev.
4. Em outro: npm run worker.

O banco nativo persiste em %LOCALAPPDATA%\ElaresBarber\postgres18, fora do observador de desenvolvimento. Restrito a loopback e banco barber. Não iniciar simultaneamente o Compose na mesma porta. A alternativa Docker Compose continua disponível; seu volume e o banco nativo são armazenamentos diferentes.

A aplicação usa Webpack no desenvolvimento. O Turbopack apresentou recompilações repetidas neste Windows. Encerrar cada processo com Ctrl+C e usar os comandos acima para reiniciar. Não apagar diretório do banco nem volume Docker.

MAIL_TRANSPORT=capture grava mensagens de acesso somente em tmp/mailbox, ignorado pelo Git e sem rota HTTP. Não é um serviço de envio. O worker executa a cada 10 segundos; DEMO_MODE=true impede WhatsApp real.

Para criar a administração da plataforma exclusivamente no banco local: npx tsx scripts/bootstrap-local-admin.ts. O acesso aleatório fica apenas em output/acesso-plataforma-local.txt. O script não altera senha de conta existente. Acesse /administracao; o operador também pode usar /minha-conta sem pertencer a uma barbearia.

## Comercial e planos manuais

Em produção comercial, o seed cria somente o operador definido em INITIAL_ADMIN_EMAIL e INITIAL_LOCAL_PASSWORD; não cria barbearia fictícia. Conta existente não é promovida silenciosamente. Para promoção explícita de conta individual já existente, veja npm run platform:admin -- email.

O operador deve ativar segundo fator em /minha-conta antes de acessar a administração em produção. Publique planos somente após definir preços e limites. Essencial, Equipe e Escala começam como rascunhos sem preço. Não representam preços aprovados.

Fluxo: publicar plano → cadastro /comecar → confirmação de e-mail → assinatura pendente → conferir o recebimento fora do sistema → registrar confirmação, valor, referência e validade na administração. A operação é auditada e idempotente. Não existe cobrança automática. Vencimento, suspensão e cancelamento bloqueiam novas operações, preservando consulta, exportação e solicitação de renovação.

A aplicação comercial exige conexão PostgreSQL sem privilégios administrativos. A verificação de configuração não substitui revisar grants/ownership de outros bancos e comprovar isolamento da credencial de transporte. A exceção de credencial compartilhada foi autorizada apenas para demonstração.

Configurar SMTP 465/TLS ou 587/STARTTLS, remetente, SUPPORT_EMAIL, OPERATOR_LEGAL_NAME, REQUIRE_EMAIL_VERIFICATION=true e URLs HTTPS. O build comercial deve usar NEXT_PUBLIC_DEMO_MODE=false; o backend usa DEMO_MODE=false. Não expor o banco na rede local nem compartilhar arquivos .env.

O preflight bloqueia credencial administrativa em modo comercial. Ausência de SMTP, identidade, planos ou backup confirmado bloqueia o cadastro comercial, mantendo a administração disponível para concluir a preparação.

## Acesso e privacidade

Recuperação de senha com token de 30 minutos e revogação de sessões. Tokens são enviados no fragmento do link e removidos da barra pelo formulário. Não registrar corpos de autenticação no proxy. Confirmação de e-mail não abre sessão automaticamente.

Proprietário pode exportar dados de um cliente ou anonimizar identificação com confirmação explícita. Reservas futuras/atendimento em andamento precisam ser resolvidos antes. Valores, pagamentos, auditoria e textos livres permanecem; avaliar estes últimos ao tratar uma solicitação. O prazo cadastrado é referência de revisão, sem exclusão automática. Não há alegação de conformidade jurídica automática.

## Backup e recuperação

npm run backup gera dump PostgreSQL custom criptografado com AES-256-GCM. BACKUP_ENCRYPTION_KEY deve ter pelo menos 32 caracteres aleatórios e cópia protegida fora do servidor. Sem a chave, a cópia não é recuperável.

Instalar cliente PostgreSQL compatível e definir PG_BIN_DIR. O cliente local em tmp/pg-client/bin não acompanha o pacote de produção. O operador da hospedagem precisa disponibilizá-lo antes de habilitar a rotina.

npm run backup:verify -- caminho-do-arquivo restaura em uma base aleatória restore_check_* exclusivamente em PostgreSQL local, confere tabelas e remove apenas essa base temporária. Nunca restaura sobre a base principal. Pode usar RESTORE_TEST_DATABASE_URL para um PostgreSQL local descartável.

BACKUP_ENABLED=true habilita rotina no worker. O destino deve aceitar PUT HTTPS em BACKUP_UPLOAD_PREFIX, com BACKUP_UPLOAD_AUTH somente no cabeçalho. Não segue redirecionamentos. Sucesso significa resposta HTTP de recebimento, não prova de durabilidade do provedor. O adaptador não implementa autenticação S3 universal.

Retenção local entre 7 e 365 dias, preservando pelo menos as duas cópias mais recentes. Configurar também retenção, acesso e proteção no destino externo. O histórico privado da administração mostra última execução, falhas e verificações de configuração. Envio externo não foi homologado, pois o destino ainda não foi definido.

Ensaio local de criação e restauração concluído em 26/10/2026. Antes da liberação comercial, recuperar uma cópia externa em ambiente separado, conferir integridade/contagens e documentar tempo de recuperação. Guardar a chave separadamente e definir quem pode restaurar.

## Publicação e retorno

A última demonstração pública verificada corresponde à fonte 93f27830a18a64d771669712270c1ac815886d97. As alterações de tema e SaaS desta etapa exigem nova publicação e conferência do SHA e dos bundles. Veja DEPLOY_SHARDCLOUD.md.

Antes de atualizar: criar backup verificável, guardar pacote anterior e conferir migrações em cópia separada. Migrações aditivas não autorizam apagar dados. Em falha, interromper novas operações, preservar evidências e avaliar compatibilidade antes de voltar o código; não sobrescrever o banco de forma automática.
