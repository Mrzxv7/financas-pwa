# Finanças PWA 3.0

PWA financeira pessoal, mobile-first, sincronizada entre celular e computador pelo Supabase e utilizável offline após o primeiro acesso.

## Publicar

1. Copie os arquivos deste pacote para a raiz do repositório publicado pelo GitHub Pages.
2. Preserve a pasta `vendor` já existente, com `pdf.mjs`, `pdf.worker.mjs` e a licença do PDF.js.
3. Confirme os arquivos em `icons/`.
4. Faça commit/push no branch do GitHub Pages.
5. Abra o site por HTTPS e faça uma recarga completa para ativar o service worker `financas-pwa-v3.0.0`.

Para teste local:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080/` (ou o subdiretório correspondente). Não abra `index.html` diretamente: Auth, service worker, instalação e PDF.js precisam de HTTP/HTTPS.

## Primeiro acesso

1. Conecte-se à internet.
2. Entre com o e-mail e senha do usuário criado no Supabase.
3. Se a PWA encontrar dados da versão local anterior, confirme a migração.
4. Aguarde o indicador mostrar **Sincronizado**.
5. Use o mesmo login no PC e no celular.

## Recursos

- Supabase Auth com sessão persistente e logout.
- Movimentações, orçamentos mensais, boletos e ideias no Supabase.
- Dashboard e Lista atualizados imediatamente após inclusão ou importação.
- Realtime entre dispositivos autenticados com a mesma conta.
- Cache separado por usuário e fila persistente para operações offline.
- Retomada automática da sincronização quando a conexão volta.
- Importação PDF/CSV/TXT com prévia, edição e detecção de duplicidade.
- PDF.js local: o PDF é processado no dispositivo e não é enviado ao servidor.
- Backup e restauração JSON.
- Migração segura dos dados locais da versão 2, com cópia de segurança preservada.

## Estrutura esperada

```text
financas-pwa/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.webmanifest
├── README.md
├── RELATORIO-ALTERACOES.md
├── icons/
│   ├── icon-180.png
│   ├── icon-192.png
│   └── icon-512.png
└── vendor/                 # preserve a pasta do repositório atual
    ├── pdf.mjs
    ├── pdf.worker.mjs
    └── PDFJS-LICENSE.txt
```

## Supabase

O app já contém a Project URL e a Publishable Key fornecidas. Não inclua `service_role`, Secret Key, senha do banco ou connection string no repositório.

O esquema esperado é o já criado:

- `transactions`: `id`, `user_id`, `transaction_date`, `description`, `category`, `type`, `payment_method`, `amount`, `source`, `created_at`, `updated_at`.
- `budgets`: `id`, `user_id`, `month`, `amount`, `created_at`, `updated_at`; restrição única em `(user_id, month)`.
- `bills`: `id`, `user_id`, `description`, `amount`, `due_date`, `status`, `created_at`, `updated_at`.
- `ideas`: `id`, `user_id`, `text`, `created_at`, `updated_at`.

RLS deve permanecer habilitado com acesso condicionado a `auth.uid() = user_id`, e as tabelas devem continuar na publicação `supabase_realtime`.

## Teste rápido

1. Entre no celular e no PC com a mesma conta.
2. Crie uma movimentação no celular; confira Lista/Dashboard e depois o PC.
3. Importe um arquivo e confirme que o mesmo arquivo não cria duplicidades.
4. Salve orçamento, boleto e ideia; confira o outro dispositivo.
5. Crie uma movimentação offline e religue a rede; o status deve mudar para **Sincronizado**.

Consulte `RELATORIO-ALTERACOES.md` para o relatório completo e o roteiro detalhado.
