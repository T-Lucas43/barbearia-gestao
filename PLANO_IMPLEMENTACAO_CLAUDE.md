# Plano de implementação — Sistema de gestão para barbearias

> Documento de execução para o Claude. O diretório atual ainda não contém uma aplicação. Implemente por fases e mantenha evidências do que foi validado. Nome comercial provisório: Barbearia; não inventar uma marca definitiva.

## 1. Objetivo e autorização de execução

Construir um sistema web predominantemente mobile para barbearias, com agenda por profissional, link público de agendamento, serviços e preços, divisão de receitas, financeiro individual dos barbeiros e visão geral do proprietário.

Este plano orienta o desenvolvimento local. Não autoriza publicação, contratação de serviços, envio real de WhatsApp, cobrança de clientes ou alteração de infraestrutura externa. Prepare integrações e ambientes de teste; solicite autorização específica antes de ativar efeitos externos em produção.

Ao iniciar, leia este documento e eventuais AGENTS.md aplicáveis. Inspecione o repositório antes de instalar dependências ou criar estrutura. Preserve alterações existentes. Faça decisões rotineiras de forma autônoma e registre premissas; pergunte apenas quando houver bloqueio real ou decisão comercial que não possa ser representada por configuração.

## 1.1. Base de referência obrigatória e melhoria do layout

Referência indicada pelo usuário: https://github.com/topics/barbearia

Esse endereço é uma página de tópico com vários repositórios, não um repositório específico. Antes da Fase 0, examine os projetos listados e selecione uma base adequada ao sistema deste plano. Não presuma que o primeiro resultado é a base escolhida pelo usuário.

- Compare ao menos três candidatos relevantes, priorizando sistemas com agendamento funcional, experiência mobile e arquitetura compatível. Sites institucionais podem fornecer referências visuais, mas não substituem a gestão financeira e de agenda.
- Verifique código, README, licença, dependências, instruções de execução e persistência. Estrelas e descrição não comprovam qualidade, segurança ou funcionalidades implementadas.
- Registre em `docs/BASE_DE_REFERENCIA.md` os candidatos, URL, licença, commit avaliado, recursos comprovados, limitações e justificativa da seleção.
- Use o projeto selecionado como ponto de partida técnico quando a licença permitir reutilização e a qualidade for adequada. Preserve créditos e avisos exigidos. Código sem licença compatível serve apenas como referência conceitual; implemente código próprio nesses casos.
- Não substitua a pasta atual por um clone nem sobrescreva este plano. Inspecione a base em diretório separado e incorpore somente arquivos necessários, sem segredos ou históricos alheios.
- Se a base tiver stack diferente, avalie o custo de adaptação antes de reescrever. A stack deste plano é referência; as regras de domínio, segurança e aceite permanecem obrigatórias.
- A seleção pode ser feita autonomamente, com justificativa documentada. Se nenhum candidato permitir uso adequado, registre o motivo e desenvolva uma base própria inspirada nos fluxos pesquisados.

### Direção de melhoria visual obrigatória

Melhorar o layout da base selecionada, com aparência profissional e prioridade absoluta ao uso no celular. Não apenas trocar cores ou reproduzir as telas originais.

- Criar tokens consistentes de cor, tipografia, espaçamento, bordas, sombras e estados dos componentes.
- Usar identidade provisória sóbria: superfícies neutras, texto de alto contraste e uma cor de destaque configurável. Evitar impor marca definitiva ou excesso de decoração.
- Separar a experiência pública de reserva da interface operacional, mantendo linguagem visual consistente.
- Tornar serviço, preço, duração, profissional e próximo passo claros na reserva; mostrar resumo antes da confirmação.
- Na agenda mobile, destacar data, horários e estado do atendimento, com ações acessíveis sem depender de hover ou arrastar.
- No financeiro, priorizar valores e períodos legíveis; adaptar tabelas para cartões ou listas no celular sem perder informações essenciais.
- Preservar funcionalidades e acessibilidade ao redesenhar. Não esconder controles para simplificar capturas de tela.
- Usar imagens somente quando ajudarem a escolha do cliente, com licença adequada e carregamento otimizado.
- Validar o layout com dados reais do seed, nomes longos, valores altos, agenda cheia e estados vazios ou de erro.
- Registrar capturas antes/depois quando houver interface executável na base, além das capturas finais em 375 px e desktop, em `docs/VALIDACAO.md`.

**Aceite da referência e do redesign:** base identificada com licença e commit, reaproveitamento documentado, lacunas mapeadas para as fases do plano e fluxos públicos e internos utilizáveis em mobile. O reaproveitamento não dispensa testes ou revisão das regras financeiras e de isolamento.

## 2. Escopo e prioridades

### MVP obrigatório

- Autenticação e permissões para proprietário, recepção e barbeiro.
- Isolamento de dados por barbearia desde a primeira migração.
- Cadastro de profissionais, jornadas, intervalos, folgas e bloqueios.
- Serviços, duração, preços e regras de comissão.
- Agenda interna e agendamento público por link.
- Clientes e histórico de atendimentos.
- Conclusão de atendimento, recebimentos e comissões.
- Despesas, caixa, repasses e painéis financeiros.
- Fluxo de confirmação e lembretes de WhatsApp com provedor simulado inicialmente.
- Interface responsiva e instalável como PWA, com conexão necessária para operações de agenda e financeiro.

### Após o MVP

Lista de espera, sinal antecipado, pagamento online, fidelidade, pacotes, estoque, venda de produtos, recorrência, múltiplas unidades e relatórios avançados. Não iniciar esses módulos antes de concluir os critérios de aceite do MVP.

## 3. Stack de referência

Adotar esta stack se não existir uma base equivalente no repositório:

- TypeScript com verificação estrita.
- Next.js com App Router para interface e backend inicial em uma única aplicação.
- PostgreSQL e Prisma para persistência e migrações.
- Tailwind CSS e componentes acessíveis para a interface.
- Zod para validação de entradas no servidor.
- Biblioteca de autenticação mantida, com sessões revogáveis e controle de acesso no servidor. Verificar suporte e documentação oficial antes de escolher versões.
- Vitest para regras de domínio e integração; Playwright para jornadas críticas.
- Docker Compose para PostgreSQL local.
- Worker separado, usando a mesma base de código, para notificações e tarefas agendadas.
- Fila persistida no PostgreSQL no MVP, com reserva atômica de tarefas, tentativas e chave de idempotência. Não adicionar Redis sem necessidade demonstrada.

Fixar versões compatíveis no lockfile. Não usar dependências sem manutenção ou versões experimentais por conveniência. Registrar comandos de instalação, execução, migração, seed, worker, build e testes no README.

## 4. Experiência e telas

### Área do proprietário

Resumo do dia, agenda da equipe, profissionais, serviços, clientes, recebimentos, despesas, comissões, repasses, relatórios e configurações.

### Área da recepção

Agenda da equipe, clientes, criação e alteração de reservas e registro de recebimentos conforme permissões. Acesso a relatórios, despesas e repasses desabilitado por padrão.

### Área do barbeiro

Minha agenda, detalhes dos próprios atendimentos, conclusão conforme permissão, comissões e extrato de repasses. Não permitir acesso ao financeiro de outros profissionais ou ao resultado geral.

### Página pública

Rota sugerida: `/agendar/[slug]`. Exibir informações da barbearia, serviços, profissionais e horários. Fluxo: serviço → profissional ou qualquer disponível → data/horário → nome e WhatsApp → revisão → confirmação.

Não exigir senha do cliente. Cancelamento e reagendamento devem usar links com tokens aleatórios, armazenados como hash, com expiração e escopo restrito. Não expor IDs sequenciais, dados de outros clientes ou detalhes privados da agenda. Ao reagendar, reservar o novo horário e liberar o antigo na mesma transação.

### Regras mobile

- Desenvolver primeiro para 375 px e validar também 320 px, 390 px, 768 px e desktop.
- Sem rolagem horizontal nas telas principais.
- Alvos de toque de pelo menos 44 px, rótulos claros, foco visível e navegação por teclado.
- Agenda diária como padrão no celular; visões semanal e por equipe como alternativas.
- Navegação inferior com até cinco destinos relevantes ao perfil.
- Formulários curtos com mensagens próximas ao campo e prevenção de envio duplicado.
- Estados de carregamento, vazio, erro, sucesso e perda de conexão.
- Não usar somente cores para comunicar status.
- PWA pode armazenar recursos estáticos; não colocar respostas privadas, tokens ou dados financeiros em cache offline.

## 5. Modelo de dados inicial

Todas as entidades de negócio devem pertencer a uma barbearia (`tenantId`). Exceções globais, como usuário, precisam ter relações de acesso explícitas. Usar chaves e relações que impeçam referências entre tenants.

| Entidade | Responsabilidade |
|---|---|
| Tenant | Barbearia, slug público, fuso IANA, moeda e configurações |
| User / Membership | Usuário, associação à barbearia, perfil e estado do acesso |
| Professional | Perfil público, usuário opcional e estado ativo |
| WorkingSchedule / TimeOff | Jornada semanal, intervalos e exceções por data |
| Service | Nome, duração e preço padrão |
| ProfessionalService | Habilitação, preço e duração específicos opcionais |
| CommissionRule | Percentual em pontos-base ou valor fixo, base de cálculo e vigência |
| Customer | Nome, contato normalizado, consentimentos e observações restritas |
| Appointment / AppointmentItem | Horário, profissional, cliente, serviços e snapshots comerciais |
| Payment / PaymentAllocation | Recebimento, forma, estado e alocação por atendimento/item |
| Refund | Estorno vinculado ao recebimento original |
| CommissionEntry | Crédito ou ajuste de comissão vinculado ao fato de origem |
| Payout / PayoutAllocation | Repasse ao profissional e comissões liquidadas |
| Expense | Despesa, categoria, vencimento e pagamento |
| CashSession / CashMovement | Abertura, movimentos e fechamento do caixa físico |
| NotificationJob / DeliveryAttempt | Agendamento de mensagens, tentativas e entrega |
| AuditLog | Autor, operação, entidade, data e alterações relevantes |

Clientes devem ter cadastro isolado por tenant. Não aplicar unicidade global de telefone. Não impor regras de exclusividade comercial que o plano não exige. Serviços e profissionais com histórico devem ser desativados, não removidos fisicamente.

## 6. Regras de domínio obrigatórias

### Agenda

- Armazenar instantes em UTC e interpretar jornadas no fuso IANA da barbearia; padrão inicial configurável: America/Sao_Paulo.
- Calcular duração pela soma dos serviços, utilizando a duração específica do profissional quando existir.
- Considerar jornada, intervalos, folgas, bloqueios, antecedência mínima e horizonte máximo de reserva.
- Slots públicos podem ter passo configurável de 15 minutos; duração do atendimento é independente desse passo.
- Não permitir conflitos para o mesmo profissional, inclusive em requisições simultâneas.
- Garantir exclusão de intervalos sobrepostos no PostgreSQL, por exemplo com constraint de exclusão sobre `tstzrange` e migração SQL, ou mecanismo transacional equivalente comprovado por teste concorrente.
- Intervalos adjacentes são válidos: um atendimento pode terminar quando o próximo começa.
- Cancelamentos liberam o horário. Reservas confirmadas, agendadas e em atendimento bloqueiam o intervalo.
- Escolher qualquer profissional deve buscar disponibilidade elegível de forma determinística e revalidar a reserva no servidor.
- Encaixes obedecem à mesma proteção contra conflitos. Exceções de jornada exigem permissão e auditoria; não criar bypass de sobreposição.
- Adicionar serviço durante o atendimento deve revalidar a duração e possíveis conflitos.

Estados: `scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`. Definir transições no domínio; cliente público não pode concluir atendimento. Remarcação é alteração auditada do horário, não um estado permanente.

### Valores e comissões

- Dinheiro em centavos inteiros; percentuais em pontos-base. Nunca usar ponto flutuante para cálculos financeiros.
- Salvar snapshots de preço, duração e regra de comissão no item. Mudanças futuras de cadastro não alteram atendimentos já acordados.
- Base padrão proposta: valor do serviço após desconto e antes da taxa do pagamento. Tornar a política explícita na configuração.
- Exemplo obrigatório: R$ 60,00 com comissão de 45% gera R$ 27,00 para o barbeiro e R$ 33,00 para a barbearia antes das despesas.
- Desconto e taxa devem ser distribuídos por item com regra determinística de arredondamento, preservando a soma dos centavos.
- Comissão fixa não pode exceder a base elegível no MVP. Validar configuração e atendimento para impedir saldo residual negativo.
- Gorjeta pertence integralmente ao profissional por padrão e tem lançamento separado. Tornar essa regra visível.
- Concluir o atendimento gera comissão uma única vez. Padrão de liberação para repasse: proporcional ao valor efetivamente recebido, limitado à comissão gerada.
- Conclusão, recebimento e repasse são eventos diferentes. Mostrar comissão gerada, liberada, paga e saldo pendente separadamente.
- Repetir uma requisição não pode duplicar recebimento, comissão ou repasse; usar idempotência e restrições no banco.
- Não apagar histórico financeiro: corrigir com estorno ou lançamento compensatório, com motivo e auditoria.
- Estorno antes do repasse reduz o saldo disponível. Depois do repasse, gerar ajuste rastreável para conciliação; não alterar silenciosamente repasses concluídos.
- Repasse não pode alocar uma comissão duas vezes ou exceder o disponível, inclusive sob concorrência.
- Adiantamentos devem ser lançamentos próprios, distintos de despesas gerais, com compensação explícita no fechamento.

### Financeiro

- Separar valor de atendimentos concluídos, recebimentos, comissões, despesas e caixa.
- Painel inicial por regime de caixa: recebimentos menos estornos, comissões liberadas e despesas pagas, com fórmula visível e sem duplicar repasses como nova despesa.
- Não chamar esse indicador de lucro contábil; usar resultado operacional simplificado.
- A parte da barbearia no serviço não representa lucro.
- Pagamentos podem ser divididos entre dinheiro, Pix, débito e crédito; validar soma e saldo pendente.
- Registrar taxa de cartão separadamente e evitar dupla dedução quando a base da comissão também considerar taxas.
- Caixa físico soma apenas movimentos em dinheiro. Pix e cartão aparecem no resumo financeiro, não no saldo da gaveta.
- Fechamento registra saldo esperado, contado, diferença e justificativa, sem reescrever movimentos anteriores.
- Filtros usam limites de datas no fuso da barbearia e autorização no servidor.

## 7. WhatsApp e tarefas em segundo plano

Implementar contrato de provedor com adaptador simulado e adaptador real configurável. Verificar a documentação oficial do provedor escolhido antes de integrar. Não usar automação informal de WhatsApp Web.

- Mensagens transacionais para criação, alteração, cancelamento e lembrete.
- Registrar consentimento, origem e data; não misturar lembretes com campanhas comerciais.
- Horário inicial sugerido de lembrete: duas horas antes, configurável. Não enviar lembrete retroativo.
- Persistir tarefas na mesma transação do evento de negócio por padrão outbox ou equivalente.
- Chave única por reserva, tipo de mensagem e versão do agendamento.
- Cancelar ou invalidar lembretes antigos após cancelamento ou remarcação.
- Revalidar estado e horário da reserva imediatamente antes de enviar.
- Worker com lease, recuperação após interrupção, tentativas limitadas e atraso progressivo.
- Validar assinatura dos webhooks conforme o provedor e processar eventos repetidos de forma idempotente.
- Diferenciar pendente, enviado ao provedor, entregue, falhou e estado desconhecido.
- Timeout com efeito externo incerto exige reconciliação antes de novo envio; não prometer entrega exatamente uma vez sem suporte do provedor.
- Falha de mensagem não desfaz o agendamento. Mostrar falha operacional ao responsável.
- Ambiente local usa mensagens simuladas e nunca envia para números reais por padrão.

## 8. Segurança e privacidade

- Negar acesso por padrão; verificar tenant, perfil e propriedade em toda operação no servidor.
- Tenant deve vir da sessão e associação validada, nunca ser aceito sem validação de um campo do cliente.
- Rotas públicas resolvem a barbearia pelo slug e retornam apenas dados públicos mínimos.
- Não confiar em filtros da interface para proteger agenda ou financeiro.
- Usar autenticação de biblioteca; não desenvolver criptografia ou recuperação de senha próprias.
- Cookies seguros em produção, sessões com expiração, proteção contra CSRF conforme arquitetura e rate limiting persistente para login e reservas públicas.
- Segredos somente por variáveis de ambiente, com `.env.example` sem credenciais.
- Não registrar tokens, senhas, conversas ou dados pessoais completos em logs.
- Auditoria para mudanças de comissão, permissões, valores, estornos e repasses.
- Sanitizar observações e evitar renderização de HTML fornecido pelo usuário.
- Definir retenção, exportação e anonimização de dados pessoais respeitando a necessidade de preservar registros financeiros. Documentar pendências de política e revisão aplicável antes de produção.
- Prever backup e ensaio de restauração antes de qualquer liberação real.

## 9. Regras de desenvolvimento para o Claude

1. Inspecione arquivos e instruções existentes. Não substitua projeto já iniciado sem necessidade.
2. Antes de cada fase, registre objetivo, arquivos previstos e validação. Depois, registre resultado real e pendências.
3. Separe interface, autorização, regras de domínio e persistência. Não coloque cálculo financeiro somente em componentes.
4. Valide entradas no servidor; use transações para operações que precisam ser atômicas.
5. Não usar mocks como persistência final. Seeds e adaptadores simulados devem ser claramente identificados.
6. Evite complexidade desnecessária: aplicação modular e worker bastam para o MVP.
7. Não introduza `any`, supressões de TypeScript ou desativação de lint para ocultar erros.
8. Não deixar botões falsos, totais inventados ou telas que aparentam salvar sem persistir. Estados indisponíveis devem ser explícitos.
9. Aplique migrações versionadas. Nunca executar reset, apagar banco ou remover arquivos preexistentes sem autorização específica.
10. Consulte documentação oficial quando detalhes de APIs ou versões forem incertos.
11. Escreva testes para riscos reais: concorrência, isolamento, dinheiro, permissões e integrações. Não exigir testes triviais para cada elemento visual.
12. Execute verificações compatíveis com a fase. Não declarar integração, entrega de mensagem ou produção validada apenas porque o build passou.
13. Mantenha README, `.env.example`, modelo de dados e registro de decisões atualizados.
14. Se houver Git, use branch `codex/` com nome descritivo e commits pequenos em português no padrão Conventional Commits. Não fazer push, merge ou deploy sem instrução do usuário.
15. Não instalar serviços pagos nem colocar segredos em arquivos versionados.
16. Se uma dependência externa impedir avanço, entregue o adaptador, modo simulado, testes e configuração pendente; continue as partes independentes.

## 10. Fases de execução e critérios de aceite

### Fase 0 — Fundação

Criar estrutura, ambiente local, banco, migrações, configuração de qualidade, README e `docs/DECISOES.md`. Registrar política financeira inicial, estados e matriz de permissões.

**Aceite:** aplicação inicia; banco e worker têm instruções reproduzíveis; lint, tipos e build passam; não há credenciais versionadas.

### Fase 1 — Acesso e cadastros

Implementar autenticação, tenant, perfis, profissionais, clientes, serviços, jornadas e regras de comissão. Seed local com duas barbearias, usuários de cada perfil e dados fictícios.

**Aceite:** CRUD persiste; campos são validados; usuário de uma barbearia não lê nem altera a outra; barbeiro não acessa financeiro alheio; profissional desativado desaparece de novas reservas e mantém histórico.

### Fase 2 — Agenda e link público

Implementar disponibilidade, reservas internas/públicas, bloqueios, estados, cancelamento e remarcação. Adicionar proteção concorrente no banco.

**Aceite:** duas reservas concorrentes no mesmo intervalo produzem uma confirmação e um conflito amigável; intervalos adjacentes funcionam; folgas e fuso são respeitados; remarcação é atômica; cliente agenda pelo celular sem conta.

### Fase 3 — Atendimento, pagamentos e comissões

Implementar conclusão, snapshot dos itens, pagamentos parciais/divididos, gorjetas, comissão, estornos e ajustes.

**Aceite:** exemplo R$ 60/45% correto; descontos e centavos fecham; repetição de requisição não duplica lançamentos; alterações de cadastro não reescrevem histórico; recebimento parcial libera apenas parcela correspondente da comissão.

### Fase 4 — Financeiro e repasses

Implementar extrato individual, despesas, resultado geral, caixa diário, adiantamentos e fechamento de comissão.

**Aceite:** repasses concorrentes não liquidam o mesmo saldo; relatórios conciliam com os lançamentos; Pix/cartão não aumentam caixa físico; filtros por período funcionam; estorno posterior ao repasse aparece como ajuste rastreável.

### Fase 5 — Notificações

Implementar outbox/fila, worker, simulação, adaptador de provedor e webhooks conforme configuração disponível.

**Aceite:** reiniciar worker não perde tarefas; cancelamento/remarcação invalida lembretes; retries são limitados; webhook repetido não duplica eventos; ambiente local não envia mensagens reais. Documentar separadamente testes simulados e eventual homologação com provedor.

### Fase 6 — Qualidade mobile e entrega local

Revisar acessibilidade, PWA, estados de erro, jornadas completas, documentação e preparação operacional.

**Aceite:** jornada pública e interna verificadas nas larguras previstas; build de produção passa; testes críticos passam; entrega inclui limitações conhecidas, instruções e evidências. Produção permanece pendente de autorização e configuração operacional.

## 11. Matriz mínima de validação

| Área | Cenário obrigatório |
|---|---|
| Isolamento | Tentativa de acessar IDs de outra barbearia em leitura e escrita |
| Permissões | Barbeiro consulta seu extrato e recebe bloqueio ao acessar outro |
| Agenda | Concorrência, adjacência, folgas, intervalos e remarcação atômica |
| Horários | Datas e limites de período no fuso configurado |
| Financeiro | Comissão percentual/fixa, desconto, taxas, gorjeta e arredondamento |
| Recebimentos | Parcial, dividido, repetição e estorno |
| Repasses | Limite disponível, concorrência, adiantamento e ajuste posterior |
| Mensagens | Cancelamento, remarcação, retries, lease e webhook duplicado |
| Mobile | Reserva pública, conclusão e repasse sem rolagem horizontal |
| Persistência | Dados mantidos após reinício da aplicação e do banco |

Usar PostgreSQL real nos testes de integração de concorrência e constraints. Não substituir esse teste por banco em memória. Registrar comando, resultado e cenário de cada validação relevante, sem salvar dados pessoais reais nas evidências.

## 12. Entregáveis e acompanhamento

- Código funcional e migrações.
- README com execução local e credenciais exclusivamente fictícias do seed.
- `.env.example` documentado.
- `docs/DECISOES.md` com escolhas e premissas.
- `docs/MODELO_DE_DADOS.md` com entidades, relações e invariantes.
- `docs/PROGRESSO.md` com checklist por fase: não iniciado, em andamento, implementado, validado ou bloqueado.
- `docs/VALIDACAO.md` com comandos executados, evidências, falhas e limitações.
- `docs/OPERACAO.md` com worker, logs, backup/restauração e pendências de integração.

Ao finalizar cada fase, informar o que funciona, o que foi testado, o que falta e qualquer decisão comercial pendente. Não marcar uma fase como validada quando existir somente código ou mock.

## 13. Instrução inicial pronta para o Claude

> Leia este plano integralmente e as instruções aplicáveis do repositório. Inspecione a pasta e, antes da fundação, avalie os repositórios em https://github.com/topics/barbearia conforme a seção 1.1. Selecione e documente uma base reutilizável com licença compatível, melhore substancialmente o layout com prioridade mobile e execute as fases em ordem. Desenvolva o MVP local completo, preservando arquivos existentes. Use as premissas e regras financeiras deste documento como padrão configurável. Mantenha progresso, decisões e validação documentados. Priorize o uso no celular, a proteção contra conflito de agenda, o isolamento entre barbearias e a integridade de pagamentos e comissões. Não faça publicação, push ou envio real de mensagens sem autorização específica. Entregue funcionalidades persistidas e informe com precisão o que foi validado e o que depende de integração externa.

