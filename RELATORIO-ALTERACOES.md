# Relatório de alterações — 4.6.0

## Objetivo

Ler corretamente o modelo de fatura aberta do Bradesco sem remover a proteção contra automação, MFA, recuperação de senha, sincronização, modo offline ou recursos financeiros consolidados na versão 4.2.1.

## Importação Bradesco 4.2.2

- Detecta PDFs sem camada de texto e aciona OCR no navegador.
- Renderiza uma página por vez e ignora páginas em branco para reduzir memória e tempo.
- Reconhece datas `dd/mm`, `ddmm` e `dd/` quando o OCR perde o mês; neste último caso, usa o mês/ano do cabeçalho do extrato.
- Separa data, descrição e o último valor em reais da linha do modelo Bradesco.
- Exclui `SALDO ANTERIOR`, `Total para` e demais linhas de resumo.
- Mantém hash, detecção de duplicidade, prévia, edição, seleção e confirmação antes da gravação.
- Preserva importadores PDF com texto, CSV e TXT.

## Implementado

### Cloudflare Turnstile

- Widget explícito na tela de autenticação.
- CAPTCHA nos fluxos de login, criação de usuário e recuperação.
- Token enviado ao Supabase em `gotrue_meta_security.captcha_token`.
- Reset do desafio após cada tentativa.
- Bloqueio do botão quando a configuração está ausente, o widget não carregou ou o token expirou.
- Configuração isolada em `security-config.js`, sem Secret Key no frontend.

### MFA TOTP

- Detecção do nível AAL no JWT.
- Consulta dos fatores do usuário após a senha.
- Enrolamento obrigatório para contas sem TOTP verificado.
- Exibição de QR Code, chave manual e cópia segura.
- Challenge + verify para ativação e logins futuros.
- Sessão atualizada com o JWT AAL2 retornado pelo Supabase.
- Bloqueio da área financeira até a conclusão do segundo fator.
- Estado MFA visível no diálogo da conta.

### Defesa no banco

- Nova migração idempotente `supabase-migration-v4.2-mfa.sql`.
- Políticas das sete tabelas exigem `user_id = auth.uid()` e `aal = aal2`.
- Dados existentes não são alterados.

### PWA e documentação

- Cache atualizado para `copiloto-financeiro-v4.6.0`.
- `security-config.js` incluído no cache estático.
- Script Turnstile continua fora do cache do service worker.
- Layout responsivo para CAPTCHA e QR Code.
- README, segurança, validação e roteiro de testes atualizados.

## Integração final do Turnstile

- Site Key pública incorporada em `security-config.js`.
- Provedor e Captcha secret já configurados pelo usuário no Supabase Attack Protection.
- Secret Key, `service_role` e credenciais administrativas não foram solicitadas nem incluídas.
- CSP adicionada para limitar scripts, frames e conexões aos domínios necessários.

## Compatibilidade

- Mantidos os dados, tabelas e chaves locais da versão 4.1.
- Mantidos PDF.js local, importação, fila offline e migração v4. O OCR é acionado apenas para PDF sem texto utilizável.
- A recuperação de senha continua funcionando e o login posterior exige TOTP.
- Navegadores precisam de JavaScript, HTTPS e acesso ao domínio do Turnstile para novas autenticações.


## Evolução 4.3 - saldo anterior

- Saldo anterior capturado como âncora e associado ao mês anterior.
- Busca de valores já contabilizados do mesmo cartão/período.
- Residual pendente por padrão; ajuste `opening_balance` somente por decisão do usuário.
- Proteção local e índice único no banco contra duplicação do ajuste.
- Reimportação do mesmo arquivo permitida para completar a conciliação, mantendo compras como duplicadas não selecionáveis.
- Âncoras de saldo, compras, créditos/pagamentos e total com diferença explícita.
- Dashboard separa despesas detalhadas de saldo consolidado e mostra qualidade percentual.
- Categorias, regras, maiores despesas e Oportunidades ignoram saldo consolidado.
- Nova migração aditiva `supabase-migration-v4.3-opening-balance.sql`.

## Evolução 4.4 - conceito genérico

- Contrato comum `opening_balance` para PDF, CSV, TXT e parsers futuros.
- Bradesco convertido em adaptador específico, sem concentrar a regra de negócio.
- Detecção somente por rótulo/campo semântico explícito e período seguro.
- Recusa de saldos disponíveis, atuais, projetados, menções incidentais e múltiplos candidatos.
- Identidade genérica `accountKey`, com escopo explícito ou restrito à origem.
- Persistência do parser, evidência, confiança e referência original.
- Reconciliação e unicidade por usuário/conta/período.
- Nova migração aditiva `supabase-migration-v4.4-generic-opening-balance.sql`.
- Contrato para extensões documentado em `PARSER-CONTRACT.md`.

## Evolução 4.5 - adaptadores e mapeador

- Framework `bank-adapters.js` com registro, score, prioridade, ambiguidade e fallback seguro.
- Bradesco e parsers genéricos registrados como adaptadores independentes.
- Interface para mapear arquivos desconhecidos sem inserir dados automaticamente.
- Modos tabela delimitada e linhas sem cabeçalho.
- Mapeamento de transações, conta, período e âncoras de conciliação.
- Assinaturas de estrutura e mapeamentos reutilizáveis.
- Sincronização dos mapeamentos em `import_mappings` com RLS AAL2.
- Scripts do framework incluídos no cache offline 4.5.0.
- Contrato de extensão documentado em `BANK-ADAPTER-CONTRACT.md`.

## Evolução 4.6 - MFA opcional e step-up

- QR Code Supabase TOTP renderizado a partir de SVG, data URI, URL ou base64.
- Chave manual e URI otpauth com botões copiar.
- Instruções para qualquer aplicativo TOTP e ciclo de 30 segundos.
- Primeiro acesso em AAL1 sem obrigar enrollment.
- Lembrete e ativação posterior em Ajustes > Segurança.
- Challenge após novo login para usuários com TOTP cadastrado.
- Sessão AAL2 reutilizada enquanto válida.
- Step-up guiado para mapeamentos reutilizáveis, backups, limpeza e remoção de fator.
- Interface futura de telefone/SMS desativada, sem simulação de códigos.
- Nova migração `supabase-migration-v4.6-optional-mfa.sql`.
