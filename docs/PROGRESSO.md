# Progresso

Atualizado em 25/10/2026. O plano original descreve também funcionalidades futuras; este arquivo registra a implementação atual.

| Área | Estado |
|---|---|
| Fundação | PostgreSQL persistente, migrações aditivas, seed sem apagar dados e pool limitado |
| Acesso | Contas individuais, proprietário/recepção/barbeiro, conta pública somente consulta, troca de senha e revogação por desativação |
| Cadastros | Serviços, profissionais, divisão percentual/fixa, regras por serviço, jornada e bloqueios |
| Agenda | Lista/Dia/Semana/Mês, concorrência por profissional, autoatendimento e remarcação atômica |
| Financeiro | Ledger, parcial/dividido, desconto, taxas, gorjetas separadas, estornos, repasses, adiantamentos e caixa |
| Relatórios | Período e perfil, CSV e PDF estilizado |
| TV | Atual/próximos por profissional, dados mínimos e dispositivo revogável |
| WhatsApp | Adaptador e webhook implementados; modo simulado, sem envio externo homologado |
| Mobile | Layout responsivo, menu com fechar/toque fora, PWA e fallback offline sem dados privados |
| Demonstração | Histórico e agenda futura fictícios; conta pública sem alterações |
| Operação | Backup criptografado e restauração temporária verificados; pacote Docker Linux em preparação |

Ainda faltam onboarding SaaS, cobrança de planos, homologação do provedor WhatsApp, testes em Smart TV/celular físico e ensaio de recuperação da hospedagem. Não confundir demonstração publicada com homologação comercial completa.
