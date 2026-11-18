# Copiloto Financeiro 4.5.0 — adaptadores bancários e mapeador

PWA financeira pessoal com Supabase, conciliação verificável, regras versionadas, fluxo de caixa, recuperação de senha, **MFA TOTP obrigatório** e **CAPTCHA Cloudflare Turnstile**.

## Framework de adaptadores

- Registro desacoplado em `bank-adapters.js`.
- Cada adaptador declara ID, nome, versão, prioridade, formatos, detecção e parser.
- A seleção usa score de confiança e registra os motivos.
- Scores próximos geram estado ambíguo; score insuficiente gera formato desconhecido.
- Adaptadores iniciais: Bradesco, tabela delimitada genérica e extrato textual genérico.
- Consulte `BANK-ADAPTER-CONTRACT.md` antes de adicionar outro banco.

## Mapeador de arquivos desconhecidos

- Quando nenhum adaptador é confiável, nenhum lançamento é criado automaticamente.
- O usuário mapeia data, descrição, valor, tipo, conta, período e âncoras financeiras.
- A tela mostra amostra das linhas/colunas antes de gerar a prévia.
- O mapeamento pode ser salvo e reutilizado pela assinatura da estrutura.
- Mapeamentos são sincronizados pelo Supabase e continuam disponíveis no cache offline.
- Períodos fixos não são reaplicados em arquivos futuros.

## Configuração de segurança já incorporada

- A Site Key pública `0x4AAAAAAGG8KpDfQB5IhLrJ` já está configurada em `security-config.js`.
- `captchaRequired` e `mfaRequired` permanecem ativos.
- O Supabase já foi configurado em **Authentication → Attack Protection** com o provedor **Turnstile by Cloudflare** e a Captcha secret.
- Nenhuma Secret Key do Turnstile, `service_role`, senha de banco ou credencial administrativa está presente no pacote.
- Uma política de segurança de conteúdo restringe scripts, frames e conexões aos domínios necessários do próprio app, Supabase, Cloudflare Turnstile e aos ativos versionados do OCR.

## Conceito comum para saldo de abertura

- A versão 4.4.0 normaliza `saldo anterior`, `saldo de abertura`, `saldo inicial`, `opening balance`, `previous balance` e equivalentes seguros para o conceito comum `opening_balance`.
- A detecção genérica atende PDF com texto/OCR, CSV, TXT e o contrato documentado para parsers futuros.
- O parser da fatura aberta do Bradesco continua preservado, mas agora funciona apenas como um adaptador do mesmo contrato genérico.
- O parser reconhece o leiaute **Aplicativo Bradesco / Situação do Extrato: Em Aberto**, inclusive quando o OCR omite os dígitos do mês nas linhas e eles precisam ser inferidos pela data do extrato.
- `SALDO ANTERIOR` não vira compra. Ele é uma âncora associada ao mês anterior.
- O app procura despesas já detalhadas da mesma conta/cartão/período e calcula somente a parcela ainda não explicada.
- Por padrão, a diferença fica **pendente para conciliação** e não altera o histórico.
- O usuário pode optar por adicionar somente a diferença como `opening_balance`, um saldo consolidado sem categoria de consumo e sem criar transações fictícias.
- Um índice único no banco e a verificação local impedem mais de um `opening_balance` por usuário/conta/período.
- A conciliação usa saldo anterior + novas compras - créditos/pagamentos = total da fatura e mostra a diferença.
- `Total para`, totais, resumos, limites, vencimentos e subtotais continuam fora da Lista.
- As compras reconhecidas passam pela conferência editável. Somente os itens selecionados e confirmados são gravados na Lista, sincronizados e contabilizados no Dashboard.
- O navegador baixa o motor e o idioma do OCR de URLs fixadas por versão. A imagem da fatura permanece no dispositivo e não é enviada a um serviço de OCR.

### Quando a interpretação não é aplicada

- saldo disponível, saldo atual ou saldo projetado;
- menções de “saldo anterior” dentro de uma descrição maior;
- valor sem rótulo/campo semântico explícito;
- rótulo sem período seguro;
- múltiplos saldos de abertura conflitantes no mesmo input.

Nesses casos, o app não cria âncora nem ajuste automaticamente e informa a necessidade de revisão.

## Dashboard e qualidade

- Despesas totais continuam compondo o saldo realizado.
- **Gastos detalhados** e **saldo consolidado** aparecem separadamente.
- O gráfico por categoria, maiores despesas, regras e Oportunidades usam somente compras detalhadas; o saldo consolidado não recebe categoria inventada.
- A qualidade do detalhamento é exibida em percentual.

## Publicação no GitHub Pages

1. Extraia o ZIP.
2. Abra a pasta `financas-pwa-4.5.0-adapters-mapper`.
3. Envie **todo o conteúdo interno da pasta** para a raiz do repositório `financas-pwa`.
4. Substitua os arquivos existentes, incluindo `security-config.js`, `app.js`, `index.html`, `styles.css`, `sw.js` e a pasta `vendor`.
5. Não envie o próprio ZIP para a raiz do site.
6. Aguarde o GitHub Pages concluir o deploy.
7. No iPhone, feche totalmente a PWA instalada e abra novamente. O cache `copiloto-financeiro-v4.5.0` força a atualização dos arquivos estáticos.

## Banco e MFA

- Se `supabase-migration-v4.sql` já foi executada na versão 4.0/4.1, **não é necessário executá-la novamente**.
- Execute `supabase-migration-v4.2-mfa.sql` uma vez no SQL Editor, caso ainda não tenha feito isso. Ela preserva os dados e reforça as políticas das sete tabelas para exigir `user_id = auth.uid()` e `aal2`.
- **Antes de testar a importação 4.3**, execute `supabase-migration-v4.3-opening-balance.sql` uma vez. Ela adiciona somente metadados de conciliação e a proteção de unicidade do saldo consolidado; não apaga dados.
- Depois, execute `supabase-migration-v4.4-generic-opening-balance.sql`. Ela adiciona a identidade genérica de conta, parser e evidência, preservando a compatibilidade com `card_key` da 4.3.
- Execute `supabase-migration-v4.5-adapters-mapper.sql` para criar os mapeamentos sincronizados com RLS AAL2.
- No primeiro login de uma conta sem fator, o app mostra o QR Code para cadastro no Microsoft Authenticator, Google Authenticator, 1Password ou outro aplicativo TOTP compatível.
- Contas com MFA já cadastrado precisam informar o código de seis dígitos antes de abrir os dados financeiros.

## Teste mínimo após publicar

1. Abra uma janela anônima e confirme que o Turnstile aparece.
2. Teste **Criar usuário** e confirme o e-mail recebido.
3. Entre com senha e conclua o TOTP.
4. Confira Dashboard, Lista e sincronização.
5. Teste **Esqueci minha senha**; após trocar a senha, o TOTP deve continuar obrigatório.
6. Faça um lançamento no PC e confirme no celular.
7. Importe o arquivo Bradesco usado na validação e confira as âncoras, a diferença e o período anterior.
8. Primeiro mantenha a opção de ajuste desmarcada: as compras entram, mas o saldo anterior fica pendente.
9. Reanalise o mesmo arquivo: as compras devem aparecer como já representadas, sem duplicação.
10. Marque o ajuste opcional e confirme que somente a diferença não explicada entra no mês anterior como saldo consolidado.
11. Repita com CSV e TXT que tragam campo/rótulo explícito de saldo de abertura.
12. Teste um arquivo com apenas “saldo disponível”: ele não pode virar `opening_balance`.
13. Importe um arquivo com cabeçalhos desconhecidos e conclua o mapeamento manual.
14. Salve o mapeamento e teste outro arquivo com a mesma estrutura.
15. Confira Lista, Dashboard, qualidade de detalhamento, Oportunidades e Conciliação.

## Fluxos de segurança

```text
Login / cadastro / recuperação
        ↓
Cloudflare Turnstile
        ↓ token de uso único
Supabase Auth valida CAPTCHA
        ↓ senha válida (AAL1)
TOTP do aplicativo autenticador
        ↓ código válido
Sessão AAL2
        ↓
PostgreSQL + RLS (user_id + aal2)
```

- O CAPTCHA protege login, cadastro e solicitação de recuperação.
- O MFA é obrigatório para entrar na área financeira.
- O QR Code e a chave TOTP ficam somente na etapa de configuração; o app não os persiste.
- A sessão AAL2 é renovada pelo Supabase e permanece no armazenamento local para a PWA.
- A migração 4.3 é aditiva e preserva os dados financeiros existentes.

## Perda do autenticador

Esta versão não cria códigos de recuperação próprios. Se o único autenticador for perdido, um administrador confiável do projeto deverá remover o fator MFA do usuário no Supabase Dashboard. No login seguinte, o app exigirá um novo cadastro TOTP. Antes da adoção por terceiros, documente e restrinja esse procedimento administrativo.

## Arquivos principais

```text
index.html
styles.css
app.js
bank-adapters.js
file-mapper.js
security-config.js
sw.js
manifest.webmanifest
supabase-migration-v4.sql
supabase-migration-v4.2-mfa.sql
supabase-migration-v4.3-opening-balance.sql
supabase-migration-v4.4-generic-opening-balance.sql
supabase-migration-v4.5-adapters-mapper.sql
SECURITY.md
ROTEIRO-TESTES.md
VALIDACAO.md
THIRD-PARTY.md
PARSER-CONTRACT.md
BANK-ADAPTER-CONTRACT.md
vendor/
icons/
```

## Teste local

```bash
python3 -m http.server 8080
```

Para Turnstile, autorize também o hostname usado no teste ou use as chaves oficiais de teste apenas no ambiente local. Não publique chaves de teste em produção.
