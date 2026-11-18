# Segurança da informação — versão 4.2

## Arquitetura

```text
GitHub Pages (código estático)
      │ HTTPS
      ├── Cloudflare Turnstile (desafio antirobô)
      │
      ▼
Supabase Auth: senha + TOTP → JWT AAL2
      │
      ▼
PostgreSQL + RLS (auth.uid() = user_id AND aal = aal2)
```

O GitHub Pages hospeda a interface. Os dados sincronizados ficam no PostgreSQL do Supabase; uma cópia de trabalho e a fila offline ficam no navegador do usuário.

## Controles da versão 4.6.0

### CAPTCHA

- Cloudflare Turnstile protege login, criação de conta e solicitação de recuperação.
- A Site Key é pública e pode ficar em `security-config.js`.
- A Secret Key permanece somente no painel do Supabase.
- O token do desafio é de uso único, enviado ao Supabase e descartado pela interface após a tentativa.
- O formulário permanece bloqueado quando o CAPTCHA é obrigatório e a Site Key não foi configurada, o widget não carregou ou o desafio expirou.

### MFA TOTP

- Após a senha, a sessão está em AAL1.
- Contas sem fator verificado são direcionadas ao cadastro TOTP.
- Contas com fator ativo precisam informar um código de seis dígitos para elevar a sessão a AAL2.
- A chave e o QR Code de cadastro ficam apenas em memória durante o enrolamento; não são gravados em `localStorage`.
- A migração `supabase-migration-v4.2-mfa.sql` exige AAL2 nas políticas RLS das sete tabelas financeiras.
- A proteção não depende apenas da tela: um token AAL1 não atende às políticas do banco.

## Credenciais e segredos

- **Públicos no frontend:** Project URL, publishable key do Supabase e Site Key do Turnstile.
- **Proibidos no frontend:** `service_role`, Secret Key do Turnstile, secret key do Supabase, senha do banco e connection string administrativa.
- A publishable key não contorna Auth nem RLS.

## Isolamento entre usuários

Cada operação financeira precisa satisfazer simultaneamente:

```sql
auth.uid() = user_id
and auth.jwt()->>'aal' = 'aal2'
```

O isolamento efetivo está no banco. A interface também impede a abertura da área financeira sem AAL2.

## Sessão e dispositivo

- GitHub Pages, Cloudflare e Supabase usam HTTPS.
- Senha e TOTP são enviados diretamente aos endpoints de autenticação; o app não os grava.
- Access token e refresh token ficam em armazenamento local para manter a sessão da PWA.
- Dados financeiros em cache e fila offline também ficam no navegador.
- Proteja o dispositivo com PIN/biometria, não use conta em equipamento compartilhado e faça logout antes de descartar um dispositivo.

## Recuperação de senha e de MFA

- A recuperação de senha usa link de validade limitada e CAPTCHA.
- O token de recuperação é removido da barra de endereço e mantido somente em memória durante a troca.
- A resposta ao pedido de recuperação é neutra para reduzir enumeração de contas.
- Não há códigos de recuperação TOTP gerados pelo app. A perda do único autenticador exige remoção administrativa do fator no Supabase; restrinja administradores e registre esse procedimento.

## Service worker e terceiros

- O service worker guarda somente arquivos estáticos do mesmo domínio.
- Respostas do Supabase, tokens e dados de autenticação não entram no cache do service worker.
- O script do Turnstile vem de `challenges.cloudflare.com` e não é armazenado pelo service worker.
- Quando um PDF não contém texto, o navegador baixa o Tesseract.js 5.1.1 e o idioma português de URLs HTTPS fixadas por versão (`cdn.jsdelivr.net` e `tessdata.projectnaptha.com`). O service worker não armazena recursos de outra origem.
- O documento não é enviado a esses domínios: somente o código e o modelo de idioma são baixados; o reconhecimento roda no dispositivo.
- A CSP permite esses dois domínios exclusivamente para o OCR. Atualizações futuras devem revisar a versão e a procedência antes de trocar as URLs.
- Bloqueadores de conteúdo ou indisponibilidade do Turnstile impedem novas autenticações quando o CAPTCHA está obrigatório; uma sessão AAL2 ainda válida pode abrir o cache local.

## Importação

- PDF.js permanece empacotado localmente.
- PDFs/CSVs/TXTs são processados no dispositivo. O OCR de PDFs de imagem também é local ao navegador; não há upload da página para um serviço de OCR.
- SHA-256 identifica reimportação, mas não comprova autenticidade bancária.
- Textos exibidos passam por escape de HTML para reduzir XSS.

## Modelo de ameaça resumido

| Risco | Controle | Risco residual |
|---|---|---|
| Senha vazada | MFA TOTP + RLS AAL2 | Roubo simultâneo da sessão/dispositivo |
| Bots e força bruta | Turnstile + rate limits do Supabase | Abuso distribuído ou falha do provedor |
| Usuário acessar dados de outro | RLS por `auth.uid()` | Política alterada incorretamente |
| Bypass da tela MFA | RLS exige `aal2` | Administrador alterar políticas |
| Dispositivo perdido | Bloqueio local, logout, expiração | Token/cache acessível até revogação/limpeza |
| Perda do autenticador | Reset administrativo controlado | Dependência de administrador confiável |
| Chave pública exposta | Chaves públicas + Auth/RLS | Consumo de cotas dos endpoints públicos |
| XSS em conteúdo importado | Escape de HTML | Regressão futura ou dependência vulnerável |

## Operação segura

1. Execute e verifique as duas migrações SQL.
2. Mantenha `captchaRequired`, `mfaOptional` e `sensitiveActionsRequireAal2` como `true` em produção.
3. Restrinja administradores do Supabase, Cloudflare e GitHub.
4. Revise logs de autenticação, falhas MFA, rate limits e usuários.
5. Teste RLS com duas contas e com um JWT AAL1.
6. Tenha rotina de backup e recuperação do PostgreSQL.
7. Atualize dependências e revise o código após mudanças no Supabase Auth ou Turnstile.


## Saldo consolidado 4.3

- `SALDO ANTERIOR` nunca é convertido automaticamente em compra.
- O ajuste `opening_balance` exige opt-in explícito e registra somente o residual não explicado.
- `category_source = not_applicable`; regras e Oportunidades não classificam esse valor.
- A chave de cartão guarda somente banco e os quatro últimos dígitos, não o número completo.
- O índice único parcial do Supabase impede dois ajustes consolidados do mesmo usuário/cartão/período.
- Os novos campos permanecem nas tabelas já protegidas por `user_id = auth.uid()` e sessão AAL2.
- Execute `supabase-migration-v4.3-opening-balance.sql` antes de publicar; sem ela, as novas gravações permanecerão na fila local e não devem ser consideradas sincronizadas.

## Detecção genérica 4.4

- A interpretação exige rótulo semântico explícito, valor válido e período seguro.
- Heurísticas de posição, valor isolado e termos ambíguos não criam `opening_balance`.
- Quando não há conta explícita, a associação é limitada à família da origem; não cruza indiscriminadamente contas.
- `accountKey` é derivada e não armazena número completo de cartão como texto legível.
- Parser, evidência, confiança e referência da origem ficam auditáveis no lote.
- Execute `supabase-migration-v4.4-generic-opening-balance.sql` para persistir os novos metadados e aplicar a unicidade genérica.

## Adaptadores e mapeamentos 4.5

- Adaptadores apenas produzem payloads; não gravam diretamente e não pulam a prévia.
- Score insuficiente ou ambíguo abre o mapeador em vez de escolher silenciosamente.
- Arquivos desconhecidos não são enviados a serviços externos.
- Mapeamentos guardam estrutura e escolhas, não o conteúdo financeiro bruto do arquivo.
- Período fixo não é salvo para reutilização, reduzindo o risco de lançar em mês antigo.
- `import_mappings` usa RLS por usuário e exige AAL2.
- Scripts do framework são estáticos do mesmo domínio e entram no service worker.

## MFA opcional e step-up 4.6

- Funções comuns usam AAL1 ou AAL2, sempre limitadas a `user_id = auth.uid()`.
- `import_mappings` continua protegido por AAL2 no banco.
- Backup completo, restauração, limpeza total e remoção de fator exigem step-up no frontend.
- Usuários com TOTP cadastrado precisam verificar o código após novo login.
- JWT AAL2 é mantido enquanto a sessão for válida; não há solicitação por tela.
- O QR e a URI vêm do enrollment Supabase; a PWA não gera códigos TOTP.
- A URI de fallback contém apenas os parâmetros padrão do TOTP e a chave retornada pelo Supabase.
- Segredo e URI não são persistidos pelo app nem enviados por e-mail.
- SMS/telefone permanece desativado até existir integração oficial com o Supabase.
