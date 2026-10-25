# Operação local

O PostgreSQL usa Docker Compose e volume persistente. A aplicação e o worker executam no Node do Windows, ambos usando `.env`. Portas: aplicação 3000, PostgreSQL 5547, restritas a loopback.

## Parar e reiniciar

- Aplicação/worker: Ctrl+C nos terminais de execução. Reiniciar com `npm run dev` e `npm run worker`.
- Banco: `docker compose stop`; reiniciar com `docker compose up -d`.
- Não remover o volume para preservar dados. Seed não apaga registros.

## Configuração

`DATABASE_URL`: acesso PostgreSQL. `APP_URL`: URL local reservada para configuração futura. `LOCAL_DEMO_PASSWORD`: pode substituir a senha de demonstração. Nenhuma destas configurações transforma o login de demonstração em autenticação de produção.

## WhatsApp

Worker a cada 15 segundos: processa tarefas vencidas atomicamente e marca `simulated`, ou `cancelled` quando o atendimento está cancelado. Não há tráfego a provedor. Retentativas/leases/webhooks são requisitos futuros para integração real.

## Backup

Antes de usar dados reais, implementar rotina de dump, criptografia, retenção e ensaio de restauração em banco separado. Nenhum teste de recuperação operacional foi realizado nesta entrega. Não há autorização de deploy.
