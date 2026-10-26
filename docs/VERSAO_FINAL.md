# Preparação da versão comercial do Elares Barber

Atualizado em 26/10/2026. A implementação local avançou; a liberação comercial continua pendente das dependências externas abaixo.

## Decisões confirmadas

- SaaS para várias barbearias, com contas e acesso por empresa.
- Planos configuráveis e cobrança manual inicialmente.
- Preços/limites não foram aprovados; Essencial, Equipe e Escala são rascunhos sem preço.
- Temas claro, escuro e automático, com dourado vivo e logo adaptada.
- WhatsApp manual pela central da barbearia, usando seu único número.
- Sem provedor de e-mail, suporte público e destino externo de backup definidos.
- Elares Beauty permanece outro projeto; seu código não foi alterado.

## Implementação e evidências locais

| Frente | Implementado | Validação / limite |
| --- | --- | --- |
| Marca | Logo vetorial, ícones e PWA dourados; dois temas e preferência persistente | Inspeção mobile e desktop; sem overflow em 320 e 1366 px |
| SaaS | Cadastro isolado, aceite versionado, proprietário também profissional, planos, limite concorrente e assinatura | Testes de isolamento, concorrência, vencimento, renovação e permissão |
| Cobrança | Confirmação manual auditada, referência, validade, idempotência e suspensão | Nenhum pagamento real; não há gateway |
| Acesso | Recuperação, confirmação de e-mail, segundo fator TOTP/códigos de recuperação e revogação de sessões | Biblioteca Better Auth; testes com captura local de e-mail |
| Dados | Exportação por cliente e anonimização confirmada, preservando financeiro | Testes de permissão, outra empresa, remoção da identificação e links |
| Segurança | Origem, corpo JSON limitado, erros genéricos, CSP com nonce, fontes locais e cookies Barber próprios | Tipos e testes locais; não equivale a auditoria independente |
| Operação | Backup criptografado, ensaio em banco temporário, retenção, adaptador PUT e histórico privado | Criação/restauração locais passaram; sem destino externo homologado |
| Inicialização | Produção comercial cria operador sem dados fictícios; preflight e cadastro bloqueado quando incompleto | Necessita configurar os serviços externos antes de vender |
| Publicação | Última release pública verificada: 93f2783 | Nova etapa ainda não publicada |

A suíte completa passou em 29/29 cenários, incluindo confirmação de e-mail e administrador sem vínculo com barbearia. A asserção de remarcação distingue confirmações já simuladas do cancelamento de lembretes pendentes quando o worker está ativo. Typecheck e compilação de produção concluídos; CI Linux da fonte 5566e0a aprovada ([execução 40419408569](https://github.com/T-Lucas43/barbearia-gestao/actions/runs/40419408569)); auditoria npm das dependências de produção sem vulnerabilidades conhecidas no momento da execução. Evidências adicionais ficam em VALIDACAO.md.

Banco nativo local, aplicação e worker ficaram em execução. Dados do desenvolvimento são fictícios. O backup local de 26/10 passou em restauração numa base temporária; não foi ensaio de recuperação da hospedagem.

## Pendências para liberação comercial

1. **PostgreSQL exclusivo:** credencial de transporte restrita, permissões revisadas e conexão comprovada. A exceção administrativa compartilhada atual vale apenas para demonstração.
2. **Acesso por e-mail:** escolher remetente/provedor, configurar SMTP e comprovar entrega de verificação/recuperação.
3. **Backups externos:** escolher destino, instalar cliente PostgreSQL compatível na hospedagem, guardar chave fora do servidor, configurar retenção externa e testar recuperação a partir da cópia externa.
4. **Oferta e documentos:** aprovar preços/limites, dados do operador, contato público e textos de termos/privacidade. Os textos atuais são rascunhos.
5. **Homologação operacional:** uso em Android, iPhone e Smart TV físicos, carga compatível com a quantidade de empresas pretendida e ensaio de incidente.
6. **Publicação:** gerar pacote Linux da nova fonte, implantar e conferir SHA, bundles, login, isolamento e persistência no ambiente publicado.

Nenhum pagamento, e-mail externo ou mensagem WhatsApp real foi realizado nesta etapa. Notificações internas dependem do sistema aberto. Não declarar a versão comercial liberada com estes itens em aberto.
