# PLANEJAR+ — primeira versão conectada ao Supabase

Inclui interface responsiva, cadastro/login por e-mail, resumo de receitas/despesas/saldo, cadastro e exclusão de lançamentos e cadastro/visualização de metas.

## Configuração
1. Use um computador com Node.js LTS instalado.
2. Extraia o ZIP e copie `.env.example` para `.env.local`.
3. Preencha `NEXT_PUBLIC_SUPABASE_URL` com a URL base do projeto, removendo `/rest/v1/`.
4. Preencha `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave `sb_publishable_...`.
5. No terminal, dentro da pasta, execute `npm install` e depois `npm run dev`.
6. Abra `http://localhost:3000`.

## Banco
O app espera tabelas com nomes SQL `transactions` e `goals`, colunas e políticas RLS do script inicial. As cinco tabelas do projeto precisam estar com RLS e políticas restritas ao usuário autenticado. Não use dados financeiros reais até testar as permissões com duas contas diferentes.

## Segurança
A chave publicável pode ser usada no navegador somente com RLS corretamente configurado. Nunca coloque `sb_secret_...`, `service_role`, senha do banco ou credenciais privilegiadas no frontend. Não compartilhe `.env.local`.

## Antes de publicar
Esta é uma primeira integração, não está pronta para produção. Ainda faltam recuperação de senha na interface, edição de lançamentos, atualização de metas, orçamentos, desafios, relatórios, testes, política de privacidade, termos, monitoramento, cobrança Premium, SMTP confiável e hospedagem. Configure as URLs de autenticação quando o domínio definitivo existir.
