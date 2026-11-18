# Relatório de alterações — Finanças PWA 3.0

## Resultado

A PWA foi integrada ao projeto Supabase já configurado, usando a Project URL e a Publishable Key públicas fornecidas. A aplicação agora trabalha em modo **offline-first**: atualiza a interface e o cache local imediatamente e sincroniza as alterações com o Supabase quando existe conexão.

## Arquivos atualizados

- `index.html`: tela de login, estado de sincronização, identificação da conta, logout e orçamento por mês.
- `app.js`: autenticação, CRUD no Supabase, cache por usuário, fila offline, migração, Realtime, deduplicação e compatibilidade com o esquema existente.
- `styles.css`: estilos da autenticação e dos indicadores de sincronização.
- `sw.js`: cache v3, shell da PWA, arquivos locais do PDF.js e cache do cliente Supabase após acesso online.
- `manifest.webmanifest`: manifesto atualizado da PWA.
- `README.md`: instruções de publicação e roteiro de testes.

## Funcionalidades implementadas

### Autenticação

- Login por e-mail e senha com Supabase Auth.
- Sessão persistente entre acessos.
- Logout com alerta quando há alterações offline pendentes.
- Dados locais separados por `user_id`, evitando misturar caches de contas diferentes.

### Persistência e sincronização

- `transactions`: inclusão, edição, exclusão e importação.
- `budgets`: orçamento específico por mês.
- `bills`: inclusão, baixa/reabertura e exclusão.
- `ideas`: inclusão e exclusão.
- Mapeamento compatível com as colunas já criadas no Supabase: `transaction_date`, `payment_method`, `due_date` e `status`.
- Observações de movimentações preservadas dentro do campo textual `source`, em formato JSON compatível, sem exigir alteração adicional no banco.
- `updated_at` continua administrado pelos triggers já criados no Supabase.

### Offline-first e proteção contra duplicidades

- Todas as alterações são aplicadas imediatamente à interface e ao cache local.
- Operações sem internet entram em uma fila persistente por usuário.
- A fila é compactada por tabela e registro, evitando o reenvio repetido da mesma alteração.
- A sincronização é retomada automaticamente no evento `online` ou manualmente ao tocar no indicador de status.
- Importações usam uma UUID determinística baseada em data, tipo, valor e descrição normalizada; o mesmo lançamento importado novamente recebe o mesmo identificador.
- A checagem anterior de duplicidade por data, tipo, valor e descrição foi mantida.

### Migração segura

- Após o primeiro login, a PWA procura a base local da versão 2.
- Se houver dados, solicita confirmação antes de migrar.
- Antes da migração, grava uma cópia local com chave `financas_pwa_v2_backup_<timestamp>`.
- A migração cria UUIDs válidas, coloca os registros na fila e preserva a base anterior.
- Um marcador por usuário evita repetir a migração no mesmo dispositivo.

### Realtime

- A PWA assina mudanças do esquema `public` para o usuário autenticado.
- Ao receber uma alteração em qualquer uma das quatro tabelas, recarrega a base da nuvem e atualiza Lista, Dashboard, boletos, ideias e orçamentos.

### Importação e PDF

- O fluxo continua sendo: arquivo → leitura local → prévia → confirmação → cache local → Supabase → Lista/Dashboard.
- `vendor/pdf.mjs` e `vendor/pdf.worker.mjs` continuam locais e não foram modificados.
- O arquivo PDF original não é enviado ao Supabase; somente as movimentações confirmadas são persistidas.

## Publicação no GitHub Pages

1. Faça backup do repositório atual.
2. Extraia o pacote na raiz do repositório, substituindo os arquivos de mesmo nome.
3. **Não apague a pasta `vendor` existente.** Ela deve continuar contendo:
   - `vendor/pdf.mjs`
   - `vendor/pdf.worker.mjs`
   - `vendor/PDFJS-LICENSE.txt` (ou a licença no local já usado pelo repositório)
4. Confirme que a pasta `icons` contém os três ícones.
5. Envie as alterações ao branch publicado pelo GitHub Pages.
6. Abra o site conectado à internet e faça uma recarga completa. No iPhone, se a versão instalada continuar antiga, feche a PWA, abra o endereço no Safari e atualize antes de abrir novamente pelo ícone.

## Roteiro objetivo de teste

1. **Login:** entrar com o usuário já criado no Supabase.
2. **Migração:** se aparecer a confirmação, migrar e conferir os totais antigos.
3. **Movimentação:** criar uma despesa no celular e verificar Lista e Dashboard.
4. **PC:** entrar com a mesma conta e confirmar que o registro aparece.
5. **Edição/exclusão:** alterar e depois excluir um item; confirmar no outro dispositivo.
6. **Importação:** importar PDF/CSV/TXT, revisar a prévia e confirmar; conferir Lista e Dashboard.
7. **Duplicidade:** importar o mesmo arquivo novamente; os itens devem ser indicados como duplicados ou não gerar novos registros.
8. **Orçamento:** salvar um valor para um mês e conferir o mês correspondente no Dashboard.
9. **Boletos/ideias:** criar, alterar o status e excluir; conferir no segundo dispositivo.
10. **Offline:** desligar a rede, criar um item, verificar o status “Offline”, religar a rede e aguardar “Sincronizado”.
11. **Realtime:** deixar PC e celular abertos; alterar em um e observar a atualização no outro.
12. **PWA/PDF:** confirmar instalação e leitura de PDF depois que o service worker v3 estiver ativo.

## Observações de segurança

- A Publishable Key fica no frontend por definição e depende de Auth + RLS para proteção.
- Não foram usadas nem incluídas Secret Key, `service_role`, senha do banco ou connection string.
- O funcionamento pressupõe que as políticas RLS já criadas continuam habilitadas nas quatro tabelas.
- O cache financeiro local segue a segurança do próprio dispositivo/navegador; use bloqueio de tela e evite dispositivos compartilhados.

## Validação executada

- Verificação de sintaxe de `app.js` e `sw.js`.
- 16 asserções automatizadas para valores monetários, datas, categorização, CSV, migração de orçamento, UUID determinística, mapeamento para o Supabase, compactação e processamento da fila.
- Conferência de 92 IDs HTML únicos e 78 referências JavaScript sem elemento ausente.
- Validação do JSON do manifesto, lista de recursos do service worker e ausência de Secret Key/`service_role` no JavaScript.
- Teste HTTP local de carregamento de `index.html` e `app.js`.

A conexão autenticada com o projeto real não foi exercitada porque a senha do usuário não foi fornecida nem deve ser incorporada ao pacote; o roteiro acima valida esse último trecho após a publicação.
