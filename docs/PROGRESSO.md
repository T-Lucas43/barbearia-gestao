# Progresso

Primeira entrega local. O plano original continua sendo o escopo-alvo, não uma declaração de implementação completa.

| Fase | Estado |
|---|---|
| 0 Fundação | Implementada; banco Docker, schema aditivo, seed, aplicação e worker |
| 1 Acesso e cadastros | Parcial: sessão de demonstração, proprietário/barbeiro e cadastros via seed |
| 2 Agenda pública e interna | Parcial: reserva, filtros, status, concorrência, visões Lista/Dia/Semana/Mês e painel TV; faltam jornadas, folgas, remarcação e gestão pública |
| 3 Financeiro do atendimento | Parcial: snapshot, comissão percentual e pagamento integral; faltam pagamentos parciais e estornos |
| 4 Financeiro e repasses | Parcial: despesas, saldos e repasses; faltam caixa físico e conciliação avançada |
| 5 Notificações | Simulação local com fila persistente; integração externa pendente |
| 6 Qualidade e operação | Ver docs/VALIDACAO.md; produção não autorizada |

## Próximos passos

1. Autenticação individual mantida por biblioteca, onboarding e recepção.
2. CRUD de profissionais, serviços e comissões; jornada e bloqueios.
3. Remarcação atômica e autoatendimento com tokens.
4. Ledger financeiro, pagamento parcial/dividido, estorno e caixa.
5. Provedor WhatsApp oficial, outbox com leases e reconciliação.
6. Backup/restauração e validação multiempresa antes de produção.
7. Pareamento com perfil exclusivo para TV, operação em rede e instalação em aparelho real.

## Atualização: visualizações e TV

- Agenda com Lista, Dia por profissional, Semana e Mês, mantendo filtros e detalhes.
- Consultas de períodos de até 42 dias, com tenant/perfil validados no servidor.
- Reservas simultâneas para profissionais distintos verificadas em teste de integração.
- Tela `/tv`: quadros por profissional, atendimento atual, próximo e fila; relógio, contadores, tela cheia e atualização de 15s.
- Dados de TV limitados no servidor: sem telefone, financeiro ou nome completo do cliente.
- Não há sincronização por WebSocket ou chamada sonora nesta etapa.
