# Validação da primeira entrega local

Data: 25/10/2026. Dados fictícios. Nenhuma validação de produção ou envio real de WhatsApp.

## Executado com sucesso

- `npm run typecheck`: sem erros de TypeScript.
- `npm run build`: build concluído; páginas e rotas geradas.
- `npm test`: 5 testes passaram, nenhum falhou.
- `npm install`: auditoria automática informou zero vulnerabilidades nas dependências instaladas. Isso não representa auditoria integral de segurança.
- PostgreSQL Docker disponível e seed aditivo executado.

## Cobertura automatizada

1. Rotas privadas exigem sessão e mutações rejeitam origem externa.
2. Perfil barbeiro recebe somente seus profissionais/atendimentos e não pode criar despesas.
3. Duas reservas concorrentes no mesmo intervalo: uma aceita e outra HTTP 409. Valores de preço/comissão persistidos; conclusão repetida preserva recebimento; dois repasses simultâneos do saldo: um aceito e outro rejeitado.
4. Corte de R$ 60 com 45%: R$ 27 ao barbeiro, R$ 33 restantes.
5. Arredondamento, valor zero e rejeição de valores inválidos.

O teste concorrente usa PostgreSQL real e limpa apenas seus próprios registros fictícios. Ainda não há suíte completa de isolamento multiempresa, estornos, notificações e toda a matriz do plano.

## Conferência no navegador

- Login de demonstração do proprietário e painel renderizados.
- Agenda e financeiro mobile conferidos visualmente.
- Reserva em quatro passos concluída pelo navegador: cliente fictício `Cliente demonstração mobile`, Rafael, corte masculino, 26/10/2026 às 09h. Reserva posteriormente encontrada na agenda interna.
- Página de confirmação pública sem overflow horizontal nos viewports 320, 375, 390 e 768 px.
- Painel sem overflow horizontal nesses mesmos viewports; scrollbar vertical ocupa 15 px em algumas capturas.
- Menu lateral oculto em mobile também ocultado da navegação acessível quando fechado.
- Atalhos Hoje/Amanhã incluídos. O preenchimento automatizado do campo nativo de data não atualizou o estado React nessa ferramenta; a jornada foi concluída pelo atalho Amanhã. Digitação manual em todos os navegadores ainda precisa de validação específica.
- Capturas em `docs/evidencias/`: painel desktop, painel mobile e confirmação da reserva mobile.

## Limites

Não validado como produção: autenticação individual, acessibilidade integral, restauração de backup, isolamento completo multiempresa, integrações externas, PWA instalada, recebimentos parciais, estornos, jornadas configuráveis ou retomada automática após reinício do Windows. A implementação atual é uma primeira versão local, não o MVP completo do plano.

## Atualização: agenda e painel de TV

- `npm test`: 10 testes passaram após a ampliação. Novos cenários: consulta por período com autorização, intervalo inválido, telefone/valores ausentes na API de TV, restrição ao proprietário, reservas simultâneas de barbeiros diferentes, virada de mês/ano e seleção independente do atual/próximo na TV.
- `npm run typecheck`: sem erros após a atualização.
- `npm run build`: compilação das rotas `/tv`, `/api/tv` e `/api/agenda` concluída.
- Navegador: visão diária por profissional, semanal e mensal renderizadas; mensal e semanal sem overflow da página em viewport de 375 px (a semana usa rolagem interna).
- Painel TV conferido em viewport 1920×1080: conteúdo cabe sem rolagem horizontal ou vertical, com três profissionais do seed. Captura em `docs/evidencias/painel-tv.png`.
- O seed não contém atendimentos efetivamente em andamento no horário da conferência. A captura mostra essa situação real; lógica de dois atendimentos simultâneos foi validada por teste de domínio e reservas simultâneas por integração, não por atendimento real de clientes.
- Não testado em hardware de Smart TV ou em outro dispositivo pela rede; não testados áudio, pareamento exclusivo ou funcionamento offline.

## Ampliação operacional — 25/10/2026

- Integração local: 17 testes principais passaram; teste adicional da conta pública de consulta também passou com asserções de leitura e bloqueio de escrita/troca de senha.
- GitHub Actions no commit 171cd07: 18 testes, 18 aprovados, nenhum erro; typecheck e build concluídos. A etapa posterior de upload falhou por cota de artifacts da conta, sem afetar esses resultados. A esteira passou a validar sem upload; pacote Linux é gerado por Docker local.
- Backup AES-GCM criado e restaurado em banco temporário: 191 atendimentos e quatro usuários conferidos. A base original foi preservada.
- PDF financeiro com dados fictícios: dez páginas A4 renderizadas e inspecionadas; extração confirmou texto em todas e zero caracteres fora dos limites. Ensaio com nomes longos em nove páginas também inspecionado. Ajustado espaço mínimo para manter título/cabeçalho com a primeira linha.
- Menu mobile testado no navegador integrado: botão X e toque no fundo fecham em 375px; Escape fecha e restaura foco em 320px; selecionar Serviços fecha em 390px. Rolagem do corpo liberada após fechar e sem overflow horizontal nesses viewports. Evidência: docs/evidencias/menu-mobile.png.
- Worker local iniciado em modo simulado. Nenhuma mensagem externa enviada.
- Banco e role exclusivos criados na ShardCloud após aprovação específica, mas a conexão pública encerra o acesso da role customizada. Uso de conexão administrativa compartilhada permanece dependente de aprovação específica; nenhuma publicação funcional confirmada até este registro.

Limites: instalação em celular físico e Smart TV não realizada; webhook real e entrega de WhatsApp não homologados; publicação/persistência na hospedagem ainda não verificadas. A ampliação substitui as pendências já concluídas descritas nas seções históricas acima.

- Commit bdbee05: esteira GitHub concluída com sucesso (typecheck, 18 testes e build). Pacote Linux compilado também em Docker local: 185.477.283 bytes, SHA256 45FB6DA187F5DF697807B1851DDBFE87D3C280F795FBF64403720303EA86C074. Nenhum arquivo de ambiente incluído no pacote.

## Evidência pública — 26/10/2026

- Aplicação ShardCloud 9668b057-f1f9-4f9d-a582-c7f5cb1dc30a publicada em HTTPS; /api/health retornou ready, postgresql, demo=true e release 1070c0afea82f9f8c7d4160128cb59004b0e752b.
- `node scripts/qa-publication.mjs prepare`: login, readonly, 401/403, PDF, manifest/ícones/service worker, dados mínimos de TV e reserva pública fictícia aprovados.
- `node scripts/qa-publication.mjs verify`: sessão e reserva encontradas após reinício pelo painel. Reserva de QA cancelada, sem exclusão de histórico ou envio de WhatsApp.
- PDF público salvo em output/pdf/relatorio-publicado.pdf: dez páginas A4; capa renderizada e conferida. Cabeçalhos HTTP efetivos: nosniff e SAMEORIGIN, sem X-Powered-By.
- Módulos pg e PDFKit, inclusive suas fontes, carregados do pacote reestruturado antes do envio. A primeira implantação revelou que o upload removia node_modules aninhados; a correção preserva-os em vendor e recria vínculos na inicialização.
- Navegador integrado: demonstração pública em 375 px sem overflow, menu fecha pelo X e por toque fora, rolagem liberada; botão de fechar instruções PWA visível.
- Memória reservada: 512 MB. O painel observou 107 MB em um dos momentos da validação; o valor varia com carga e inclui picos de instalação. Isso não é ensaio de carga.
- Evidências visuais: docs/evidencias/publicado-mobile.png, publicado-menu-mobile.png e publicado-desktop.png.

Não realizados: instalação física PWA, pareamento físico de TV, envio real de WhatsApp, teste de carga ou recuperação completa da hospedagem. Backup/restauração anteriores são locais; esta verificação pública confirma persistência após reinício da aplicação.

- Ajuste final da TV, fonte 3ef5777: prévia local com três profissionais em 1280x720, 1366x768 e 1920x1080, sem overflow horizontal ou vertical. A versão final substitui a altura anterior que excedia Full HD.
