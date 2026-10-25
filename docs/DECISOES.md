# Decisões

- Next.js + PostgreSQL direto via `pg`: reduz ferramentas na primeira entrega; migração inicial SQL versionada em `scripts/schema.sql`. Prisma não adotado nesta etapa.
- Dinheiro em centavos inteiros e comissão em pontos-base. Comissão arredondada para o centavo mais próximo; parte da barbearia é o residual.
- Snapshot no agendamento; conclusão recebe o valor integral. Sem desconto ou taxa nesta versão.
- Exclusão GiST bloqueia sobreposição também entre requisições simultâneas. Atendimentos concluídos preservam ocupação histórica.
- Repasse serializado por linha do profissional e validação do saldo dentro da transação.
- Horário America/Sao_Paulo; instantes em timestamptz. Jornada fixa até implementação do cadastro.
- Autenticação local de demonstração: cookie HttpOnly, SameSite e token aleatório com hash no banco e validade de 12h. Seleção de perfil e senha comum não substituem autenticação real.
- Nenhuma mensagem é enviada externamente. Fila só registra simulação; não marca entrega.
- Repositório remoto privado por padrão para o projeto solicitado.
