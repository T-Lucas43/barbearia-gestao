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
