# CCPS Equinos — Seleon

Sistema web de lançamentos (Clínica, Trato, Coleta, Observações, Cadastro de produto), controle de estoque e relatórios, com login por usuário/senha e banco de dados no Supabase.

## Passo 1 — Criar as tabelas no Supabase

1. Acesse seu projeto em https://supabase.com/dashboard
2. Vá em **SQL Editor** (menu lateral) → **New query**
3. Abra o arquivo `schema.sql` deste projeto, copie todo o conteúdo, cole no editor e clique em **Run**
4. Isso cria todas as tabelas e dois usuários padrão:
   - `admin / admin123` (acesso total)
   - `operador / operador123` (lançamentos e leitura)

## Passo 2 — Subir o projeto no GitHub

1. Crie uma conta gratuita em https://github.com (se ainda não tiver)
2. Crie um novo repositório (ex: `ccps-equinos`)
3. Faça upload de todos os arquivos desta pasta para o repositório (pode usar "uploading an existing file" na própria interface do GitHub, arrastando a pasta inteira)

## Passo 3 — Publicar na Vercel

1. Acesse https://vercel.com e crie uma conta gratuita (login com GitHub)
2. Clique em **Add New → Project**
3. Selecione o repositório `ccps-equinos`
4. A Vercel detecta automaticamente que é um projeto Vite — não precisa mudar nada
5. Clique em **Deploy**
6. Em alguns minutos você receberá uma URL própria, ex: `https://ccps-equinos.vercel.app`

Essa URL pode ser acessada de qualquer celular ou computador, pelo time todo, com os dados sincronizados em tempo real pelo Supabase.

## Após o primeiro acesso

1. Entre com `admin / admin123`
2. Vá em **Cadastro → Usuários** e troque a senha do admin (crie um novo usuário admin com sua senha e exclua/ajuste o padrão, ou simplesmente edite via SQL Editor do Supabase)
3. Cadastre os **Produtos** (medicamentos, insumos, ração) e os **Animais**
4. Cadastre os usuários **operadores** da equipe (perfil "operador" só vê lançamentos + leitura, sem acesso ao Cadastro)

## Observações importantes de segurança

- As senhas dos usuários ficam salvas em texto simples na tabela `usuarios` do Supabase. Não use senhas pessoais — use senhas exclusivas para este sistema.
- A chave usada no app (`sb_publishable_...`) é pública por natureza (aparece no navegador de quem acessa o site). O controle de quem pode cadastrar/editar é feito pelo login dentro do app, não pelo Supabase.
- A chave **secreta** (`sb_secret_...`) que você gerou NÃO é usada neste projeto e não deve ser colocada em nenhum arquivo deste código. Guarde-a em local seguro — ela dá acesso total ao banco, sem restrições.

## Desenvolvimento local (opcional)

Se quiser testar no seu computador antes de publicar:

```bash
npm install
npm run dev
```
