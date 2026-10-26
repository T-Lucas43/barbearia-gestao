# Elares Barber: lembretes e avisos

## Um único WhatsApp da barbearia

1. O cliente informa o telefone com DDD e autoriza o contato ao agendar.
2. O profissional acompanha somente seus clientes. Pode solicitar um lembrete pela área Cortes ou pela aba Lembretes.
3. O gestor e a recepção recebem a solicitação em uma central compartilhada. Também veem os lembretes cuja antecedência configurada já chegou, mesmo sem solicitação do barbeiro.
4. A equipe revisa a mensagem e clica em **Abrir WhatsApp da barbearia**. O servidor confere novamente horário, versão, autorização, profissional e permissões antes de liberar o atalho.
5. O WhatsApp abre com destinatário e texto preenchidos. A pessoa revisa e envia. Ela precisa usar um dispositivo conectado à conta da barbearia: o atalho não escolhe automaticamente a conta remetente.
6. Depois do envio, a pessoa marca a confirmação e seleciona **Registrar envio manual**. Esse registro é uma declaração da equipe; o sistema não confirma envio, entrega ou leitura pelo provedor.

Não é necessária integração com a API do WhatsApp para esse fluxo. Não há disparo externo pelo servidor. A integração automática anterior permanece opcional e desligada na demonstração.

## Fila e prevenção de repetições

- Uma solicitação por agendamento e versão do horário. Cliques repetidos não criam filas duplicadas.
- Preparar uma conversa reserva esse lembrete ao funcionário por dez minutos; outro funcionário recebe um aviso antes de abrir o mesmo envio. A pessoa que o preparou pode retomar a conversa.
- Um envio já informado não é reaberto pelo atalho antigo. O gestor pode reabrir um lembrete explicitamente na central.
- Remarcação cria uma nova versão; dados e confirmações de um horário anterior não são reutilizados.
- Cancelamentos, atendimentos concluídos, cortes avulsos, telefones inválidos e clientes sem autorização não geram atalhos.
- Solicitações antecipadas ficam disponíveis nos sete dias anteriores ao atendimento.
- O status **Em preparo pela equipe** não comprova que a conversa abriu no aparelho nem que a mensagem foi enviada. Confira o histórico do WhatsApp antes de repetir um envio.

## Avisos do profissional

- Pop-up a partir de dez minutos antes de um corte agendado ou confirmado.
- Aviso de lembrete pendente; o profissional solicita o envio à recepção, sem usar seu WhatsApp pessoal.
- Gestor e recepção recebem aviso agregado da central.
- Atualização a cada trinta segundos com a aplicação visível; atualização adicional ao retornar à tela.
- O aviso não rouba o foco e pode ser dispensado. Não aparece sobre um formulário de atendimento aberto.
- O sino permite consultar os avisos, desativar os pop-ups da sessão e testar uma prévia identificada como exemplo.
- Não são notificações de sistema com o aplicativo fechado, nem notificações push em segundo plano.

## Configuração

Em **Configurações → WhatsApp**, informe o número da barbearia e a antecedência desejada para os avisos de lembrete. O aviso do próximo corte usa a janela de dez minutos.

Os dados de demonstração são compartilhados. Somente registros artificiais identificados pelo seed têm exemplos de autorização; a autorização de agendamentos reais não é alterada pelo seed. Para testar um envio no aparelho, use apenas seu próprio número.

## Validação

Testes locais cobrem isolamento por barbearia/profissional, versão do agendamento, solicitação idempotente, confirmação explícita, janela dos dez minutos e abertura com redirecionamento inspecionado sem acessar o WhatsApp. A instalação em aparelhos físicos e a entrega de mensagens não fazem parte dessa validação.
