# Copiloto Financeiro 4.0

PWA financeira pessoal com Supabase, conciliação verificável, categorização versionada, fluxo de caixa com cenários e oportunidades baseadas em histórico.

## Publicação — ordem obrigatória

### 1. Atualizar o Supabase

1. Abra **Supabase → SQL Editor → New query**.
2. Cole todo o conteúdo de `supabase-migration-v4.sql`.
3. Execute **Run**.
4. Confirme que a consulta final lista 7 tabelas com `rowsecurity = true`.

A migração é idempotente: pode ser executada novamente. Ela preserva as tabelas e dados existentes.

### 2. Substituir o GitHub Pages

Envie **o conteúdo desta pasta** para a raiz do repositório, substituindo os arquivos existentes. O `index.html` deve ficar na raiz.

```text
index.html
app.js
styles.css
sw.js
manifest.webmanifest
supabase-migration-v4.sql
README.md
RELATORIO-ALTERACOES.md
SECURITY.md
ROTEIRO-TESTES.md
icons/
vendor/
```

Não envie o ZIP para o repositório. Envie os arquivos extraídos.

### 3. Atualizar o app instalado

Após o deploy:

- abra o site no Safari/navegador e atualize;
- no iPhone, feche completamente a PWA instalada e abra novamente;
- se uma versão antiga persistir, remova o atalho e instale novamente.

## Recursos

- Entrar e criar usuário pelo Supabase Auth.
- Sincronização PC/celular e fila offline.
- Dashboard, Lista, importação PDF/CSV/TXT e PWA.
- Hash SHA-256, lotes e ORIGINAL × REGISTRO.
- Regras explícitas, prioridade e versões preservadas.
- Realizado, comprometido e projetado.
- Cenários de receita/despesa/categoria.
- Oportunidades por comparação de três meses.
- Backup JSON completo.

## Teste local

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080`. O service worker funciona em localhost, mas autenticação real requer acesso ao projeto Supabase.

## Arquivos importantes

- `RELATORIO-ALTERACOES.md`: o que mudou.
- `SECURITY.md`: arquitetura, controles e riscos residuais.
- `ROTEIRO-TESTES.md`: validação funcional, RLS, sincronização e offline.
- `supabase-migration-v4.sql`: esquema, índices, RLS e políticas.
- `vendor/`: PDF.js local e licença.

## Observação de segurança

A publishable key no JavaScript é pública por definição. A proteção dos dados depende de autenticação e RLS. Nunca inclua `service_role`, secret key ou senha do banco no repositório.
