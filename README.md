# Navalha — gestão de barbearias

Primeira versão local de desenvolvimento, mobile first, com Next.js, TypeScript e PostgreSQL. Identidade e dados são fictícios. Não é uma versão pronta para produção.

## Executar

Requisitos: Node 22+, npm e Docker Desktop em execução.

```powershell
npm install
Copy-Item .env.example .env
docker compose up -d
npm run db:seed
npm run dev
```

Em outro terminal: `npm run worker` para processar lembretes **simulados**.

- Painel: http://127.0.0.1:3000
- Página pública: http://127.0.0.1:3000/agendar/studio-da-navalha
- Painel para TV: http://127.0.0.1:3000/tv (entrar como proprietário no mesmo navegador antes de abrir).
- Senha fictícia local: `demo-local-2026`. Perfis disponíveis: proprietário e barbeiro Rafael.
- Banco restrito a loopback, porta 5547. Dados persistem no volume Docker `barber_data`.

O seed é aditivo e não limpa os dados. Não execute `docker compose down -v` se quiser preservá-los.

## Verificações

Com servidor e banco executando:

```powershell
npm run typecheck
npm test
npm run build
```

Os testes de integração criam e removem somente os próprios dados fictícios. Não executar os testes contra bases reais.

## Implementado

Agenda com filtros e datas; proteção de sobreposição no PostgreSQL; reservas públicas em quatro passos; snapshots de preço e comissão; confirmação, início, cancelamento e conclusão; recebimento integral por Pix/dinheiro/cartão; comissões individuais; despesas e repasses com proteção concorrente; resultado diário; fila persistente de notificações simuladas; perfis locais com sessão revogável; layout responsivo.

## Atualização: agenda e TV

A aba Agenda possui quatro visões: Lista, Dia (horários por profissional), Semana e Mês. Todas preservam busca, filtro por profissional e abertura dos detalhes. Semana/mês consultam o período completo no servidor, com controle de acesso. A agenda permite reservas simultâneas para profissionais diferentes e bloqueia sobreposição no mesmo profissional.

O painel `/tv` mostra um quadro por barbeiro, atendimento iniciado, horário previsto quando ainda não iniciado, próximos três atendimentos e contadores diários. Atualiza a cada 15 segundos, tem botão de tela cheia e omite telefone e valores. Nomes de clientes são abreviados no servidor. Requer sessão local do proprietário; pareamento exclusivo de aparelho de TV e implantação em rede são etapas futuras. Pode ser exibido pelo computador local conectado à TV.

## Pendências para o MVP completo

- Autenticação é uma porta de demonstração com senha compartilhada e perfil selecionável. Não fornece identidade individual ou controle seguro de contas para produção. Não exponha o servidor à internet.
- Uma barbearia de demonstração; tenant aplicado às consultas privadas e relações, mas onboarding e isolamento multiempresa completo ainda precisam de testes e implementação.
- Cadastro de serviços/profissionais é feito pelo seed; interface de edição, recepção, jornadas configuráveis, folgas e bloqueios ainda pendentes. Disponibilidade inicial fixa: todos os dias, 09h–18h.
- Recebimento integral ao concluir; pagamentos parciais/divididos, descontos, estornos, gorjetas, comissão fixa, adiantamentos e fechamento de caixa físico ainda pendentes.
- Relatório diário e saldo acumulado; relatórios mensais e exportações ainda pendentes.
- Consentimento e fila existem; não há integração externa de WhatsApp. Worker marca `simulated`, nunca `delivered`.
- Cancelamento pelo cliente, remarcação e recuperação de reserva por token ainda pendentes. Hash de token é preparado na reserva.
- Manifesto e ícone preparados; instalação PWA varia conforme navegador. Sem service worker ou funcionamento offline.
- Rate limit inicial por telefone para reservas; antiabuso distribuído e limitação de login pendentes.

Veja o plano completo em [PLANO_IMPLEMENTACAO_CLAUDE.md](PLANO_IMPLEMENTACAO_CLAUDE.md) e o andamento em [docs/PROGRESSO.md](docs/PROGRESSO.md). Apesar do nome histórico do arquivo, a implementação atual foi iniciada pelo Codex.
