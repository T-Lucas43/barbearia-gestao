# Modelo implementado

- `tenants`: barbearia e slug.
- `professionals`: profissional, comissão em pontos-base e tenant.
- `services`: serviço, preço em centavos e duração em minutos.
- `appointments`: cliente e telefone restritos à área privada; horários UTC; snapshot de preço e comissão; status e recebimento integral. Chaves compostas vinculam serviço/profissional ao tenant.
- `expenses`: despesas pagas.
- `payouts`: repasses ao profissional.
- `notifications`: tarefas de confirmação e lembrete vinculadas à reserva; chave única reserva/tipo.
- `audit_log`: eventos principais de criação, status e repasse.
- `sessions`: hash de token aleatório, tenant, perfil e expiração.

Constraints: exclusão GiST para intervalos ativos/concluídos do profissional; valores positivos; recebimento entre zero e preço; FKs entre tenants. Conclusão bloqueia a reserva e é idempotente; repasse bloqueia o profissional e calcula saldo na transação.

Clientes ainda estão embutidos nos atendimentos. Ledger, catálogo editável, membership individual, regras de jornada e relações financeiras completas do plano são próximas etapas, não entidades implementadas.
