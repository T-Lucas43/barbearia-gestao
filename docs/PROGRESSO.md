# Progresso

Primeira entrega local. O plano original continua sendo o escopo-alvo, não uma declaração de implementação completa.

| Fase | Estado |
|---|---|
| 0 Fundação | Implementada; banco Docker, schema aditivo, seed, aplicação e worker |
| 1 Acesso e cadastros | Parcial: sessão de demonstração, proprietário/barbeiro e cadastros via seed |
| 2 Agenda pública e interna | Parcial: reserva, filtros, status e concorrência; faltam jornadas, folgas, remarcação e gestão pública |
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
