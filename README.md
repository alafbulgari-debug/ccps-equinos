# CCPS Equinos — Seleon

Sistema web de lançamentos (Clínica, Trato, Coleta, Observações, Cadastro de produto), controle de estoque e relatórios, com login por usuário/senha e banco de dados no Supabase.

## Passo 1 — Criar as tabelas no Supabase

1. Acesse: https://supabase.com/dashboard/project/hkmylkafhknknewsrbea/sql/new
2. Abra o arquivo `schema.sql` deste projeto, copie todo o conteúdo, cole no editor e clique em **Run**
3. Isso cria todas as tabelas e dois usuários padrão:
   - `admin / admin123` (acesso total)
   - `operador / operador123` (lançamentos e leitura)

## Passo 2 — Subir os arquivos no GitHub

No repositório `ccps-equinos`, certifique-se de que TODOS estes arquivos estão na raiz (não dentro de nenhuma pasta):

- index.html
- package.json
- vite.config.js
- schema.sql
- main.jsx
- App.jsx
- supabaseClient.js
- README.md

## Passo 3 — Publicar na Vercel

1. Acesse: https://vercel.com/new
2. Selecione o repositório `ccps-equinos` e clique em **Import**
3. Clique em **Deploy** (não precisa mudar nada)
4. Em 1-2 minutos você recebe a URL do site

## Primeiro acesso

1. Login: `admin` / Senha: `admin123`
2. Vá em **Cadastro → Usuários** e troque essa senha
3. Cadastre Produtos e Animais antes de usar as outras abas

## Segurança

- As senhas dos usuários ficam salvas em texto simples na tabela `usuarios` do Supabase. Use senhas exclusivas para este sistema.
- A chave secreta (`sb_secret_...`) do Supabase NÃO é usada neste projeto. Guarde-a em local seguro.
