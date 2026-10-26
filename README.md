# Navalha — gestão de barbearias

Aplicação mobile first em Next.js/TypeScript e PostgreSQL. Marca, clientes e movimentações da demonstração são fictícios.

## Executar localmente

Node 22+, npm e Docker Desktop:

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d
npm run db:seed
npm run dev
```

Em outro terminal: `npm run worker`. Os lembretes ficam simulados enquanto `WHATSAPP_ENABLED=false`; `DEMO_MODE=true` sempre impede envio real.

- Painel: http://127.0.0.1:3000
- Agendamento: http://127.0.0.1:3000/agendar/studio-da-navalha
- TV: http://127.0.0.1:3000/tv
- Contas locais: `dono@navalha.local`, `recepcao@navalha.local`, `rafael@navalha.local`; senha inicial local `demo-local-2026`.
- Conta pública de consulta: `demo@navalha.local` / `DemoNavalha2026!`, quando DEMO_MODE estiver ativo.
- PostgreSQL local: porta 5547, volume persistente `barber_data`.

O seed é aditivo e não apaga dados. Não execute `docker compose down -v` para preservar o volume. Produção exige segredo próprio de autenticação, URL HTTPS e senha inicial administrativa exclusiva com pelo menos 16 caracteres. As contas existentes nunca têm a senha substituída pelo seed.

## Funcionalidades

- Agenda em Lista, Dia por profissional, Semana e Mês; profissionais diferentes atendem simultaneamente. PostgreSQL impede sobreposição do mesmo profissional.
- Serviços e profissionais editáveis; preço/duração por profissional, jornadas, intervalos, bloqueios e regras de cancelamento.
- Reserva pública em quatro passos, escolha de qualquer profissional disponível e link pessoal para cancelar ou remarcar.
- Autenticação individual, proprietário, recepção e barbeiro; permissão e vínculo com a barbearia conferidos no servidor.
- Divisão contratada percentual (ex.: 60% barbeiro / 40% barbearia) ou valor fixo. Regra e preço ficam preservados no atendimento. Gorjeta é independente e pertence ao barbeiro.
- Recebimentos parciais/divididos, descontos, taxas, estornos vinculados ao recebimento original, despesas, repasses e adiantamentos. Caixa físico com abertura e fechamento.
- Relatórios por período e por barbeiro; exportação CSV e PDF estilizado com totais, divisão, movimentos e paginação.
- TV com quadro por barbeiro, atendimento atual e próximos; atualização a cada 15 segundos. Pareamento por dispositivo revogável, sem expor telefones ou financeiro.
- Fila persistente de WhatsApp com consentimento, leases, retentativas e conciliação de resultado incerto. Adaptador oficial e webhook assinados implementados; envio real depende das credenciais e modelos aprovados da Meta.
- Instalação PWA, ícones próprios e tela de indisponibilidade offline. Agenda, financeiro, sessões e links pessoais não ficam no cache offline.
- Demonstração com histórico fictício, dias futuros, pagamentos e despesas. Conta pública sem permissão de alteração.
- Menu mobile com botão de fechar, toque fora, Escape, controle de foco e fechamento ao trocar de seção.

## Verificar

Com banco e servidor locais ativos:

```powershell
npm run typecheck
npm test
npm run build
```

Os testes usam dados fictícios e limpam somente os registros que criaram. Não executar a suíte contra uma base real. `npm run backup` produz arquivo AES-GCM; `npm run backup:verify -- caminho` restaura apenas em uma base temporária. A chave deve ficar guardada separadamente.

A esteira GitHub Actions valida e compila em Linux antes de gerar o ZIP Docker para ShardCloud; o pacote não inclui arquivos de ambiente. Veja [deploy](docs/DEPLOY_SHARDCLOUD.md), [progresso](docs/PROGRESSO.md), [validação](docs/VALIDACAO.md) e o [plano original](PLANO_IMPLEMENTACAO_CLAUDE.md).

Limites atuais: onboarding comercial de múltiplas empresas, cobrança de assinatura, homologação real do WhatsApp e instalação em aparelhos físicos ainda não concluídos. A demonstração publicada deve permanecer com dados fictícios.
