# Progresso

Atualizado em 25/10/2026. O plano original descreve também funcionalidades futuras; este arquivo registra a implementação atual.

| Área | Estado |
|---|---|
| Fundação | PostgreSQL persistente, migrações aditivas, seed sem apagar dados e pool limitado |
| Acesso | Contas individuais, proprietário/recepção/barbeiro, duas contas de demonstração interativas, troca de senha e revogação por desativação |
| Cadastros | Serviços, profissionais, divisão percentual/fixa, regras por serviço, jornada e bloqueios |
| Agenda | Lista/Dia/Semana/Mês, concorrência por profissional, autoatendimento e remarcação atômica |
| Financeiro | Ledger, parcial/dividido, desconto, taxas, gorjetas separadas, estornos, repasses, adiantamentos e caixa |
| Relatórios | Período e perfil, CSV e PDF estilizado |
| TV | Atual/próximos por profissional, dados mínimos e dispositivo revogável |
| WhatsApp | Adaptador e webhook implementados; modo simulado, sem envio externo homologado |
| Mobile | Layout responsivo, menu com fechar/toque fora, PWA e fallback offline sem dados privados |
| Demonstração | Histórico e agenda futura fictícios; dois perfis interativos com dados fictícios |
| Operação | Backup criptografado e restauração temporária verificados; pacote Docker Linux em preparação |

Ainda faltam onboarding SaaS, cobrança de planos, homologação do provedor WhatsApp, testes em Smart TV/celular físico e ensaio de recuperação da hospedagem. Não confundir demonstração publicada com homologação comercial completa.

## Publicação — 26/10/2026

Demonstração disponível em https://navalha-gestao.shardweb.app/. Node.js 22, 512 MB, PostgreSQL separado. Duas demonstrações: gestor e barbeiro (Rafael) e profissional (Leonardo), com permissões próprias. A fonte 1070c0a passou em typecheck, 18 testes e build; correção de empacotamento 8d76662 preserva os módulos externos do Next.

Login, permissões, PDF, PWA, TV, reserva pública e persistência após reinício foram verificados no endereço público. A reserva fictícia de QA foi cancelada depois da conferência. O menu mobile fecha por X e toque fora na versão publicada.

WhatsApp continua simulado e a instalação em dispositivos físicos permanece pendente. A conexão administrativa de transporte foi autorizada especificamente para a demonstração; as sessões SQL usam navalha_app. Veja docs/DEPLOY_SHARDCLOUD.md para as limitações e a evidência de implantação.

## Atualização dos perfis e cortes — 26/10/2026

Duas contas de demonstração interativas: gestor vinculado ao Rafael e profissional vinculado ao Leonardo. O profissional tem Cortes, Agenda, Financeiro, Lembretes e Configurações próprios, com filtros e permissões no servidor. Contas demo não alteram credenciais nem gerenciam usuários.

Registro avulso concluído, recebimento imediato ou pendente, divisão contratada, idempotência, sem reserva de horário ou WhatsApp. Navegação retorna ao topo. Build e typecheck locais concluídos. Publicação da atualização em andamento.

Publicação da atualização concluída em https://navalha-gestao.shardweb.app/. Release 20623ab confirmada por health e checagem dos dois perfis. Suíte final 19/19 e CI concluída.

## Lembretes manuais — 26/10/2026

Envio manual sem API: lista da agenda futura por período, acesso individual por profissional, mensagem editável com cliente/serviço/barbeiro/data/hora e link wa.me com número brasileiro normalizado. Sem disparo automático ou confirmação de envio/entrega. Sem autorização de contato, atalho indisponível. Cortes avulsos e atendimentos cancelados/concluídos não aparecem. Histórico da integração automática preservado em área recolhida; integração real continua opcional e desligada na demonstração.

22 testes locais passaram, incluindo isolamento, reagendamento, ausência de dependência da fila e formato seguro do link. Não foi aberta conversa nem enviada mensagem externa na validação.

## Elares Barber e central compartilhada — 26/10/2026

Marca derivada dos vetores originais da Elares, com laranja solar, grafite e interface clara. Logo SVG, ícones PWA, tela de entrada, área do profissional, TV e relatórios atualizados. Próximo corte futuro em destaque; horários vencidos ficam em área separada.

Avisos dentro do app para cortes a dez minutos e lembretes pendentes. Barbeiro solicita à central; gestor/recepção prepara a conversa usando o único WhatsApp da barbearia. Validação de origem, permissões, consentimento e versão antes de redirecionar; reserva temporária por funcionário e confirmação manual de envio.

24 testes locais e typecheck passaram. Formulário nativo conferido no navegador com destinatário inexistente, sem sair do sistema. Nenhuma conversa externa foi aberta na validação. Veja LEMBRETES_E_AVISOS.md para o fluxo e seus limites. Publicação desta versão em preparação.
