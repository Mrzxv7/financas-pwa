# Validação técnica — versão 4.5.0 adaptadores e mapeador

## Verificações automatizadas

- Sintaxe JavaScript de `app.js`, `security-config.js` e `sw.js`.
- JSON válido em `manifest.webmanifest`.
- IDs HTML usados pelo JavaScript presentes e sem duplicidade.
- Referências do service worker existentes no pacote.
- Cache identificado como `copiloto-financeiro-v4.5.0`.
- Registro, score, prioridade, estado desconhecido e ambiguidade de adaptadores validados.
- Adaptadores Bradesco, delimitado e textual validados.
- Mapeador tabular e de linhas validado com prévia e campos obrigatórios.
- Assinatura de estrutura e reutilização de mapeamento validadas.
- Persistência offline e sincronização de `import_mappings` verificadas estaticamente.
- RLS AAL2 da nova tabela validada.
- Contrato `normalizeOpeningBalanceConcept` validado para parsers atuais e futuros.
- Detectores genéricos PDF-texto/OCR, CSV e TXT validados.
- Evidência semântica explícita, período e origem preservados.
- Casos ambíguos, sem período ou com múltiplos saldos foram recusados.
- Reconciliação por `accountKey` e período validada com exclusão de outras contas/períodos.
- Compatibilidade `card_key` -> `account_key` e migração 4.4 verificadas.
- Parser de âncoras validado: saldo anterior, novas compras, créditos/pagamentos e total.
- Associação automática do saldo anterior ao mês anterior validada.
- Histórico parcial, residual, estado pendente padrão e opt-in de `opening_balance` validados.
- Reimportação do mesmo hash sem duplicar compras e sem criar segundo ajuste validada.
- Separação Dashboard entre gasto detalhado e saldo consolidado validada.
- Migração aditiva 4.3 verificada estaticamente, incluindo índice único por usuário/cartão/período.
- Ausência de `service_role`, Secret Key do Turnstile e senha administrativa.
- Presença do envio `gotrue_meta_security.captcha_token` nos três fluxos protegidos.
- Presença de enrolamento, challenge e verify do TOTP.
- Migração com 7 tabelas e 4 políticas por tabela, todas condicionadas a `aal2`.
- Integridade do pacote registrada em `CHECKSUMS.sha256`.
- OCR de PDF de imagem exercitado com worker simulado, página útil e página em branco.
- Parser Bradesco validado com OCR completo e com OCR de baixa resolução que retorna datas como `15/`.
- Todas as compras reais do arquivo de referência foram reconhecidas com data, descrição e valor.
- `SALDO ANTERIOR` e `Total para` não foram inseridos como compras.
- Confirmação da prévia validada: apenas as compras reais entraram na Lista e no total de despesas do Dashboard.
- Regressão de CSV e TXT aprovada.

## Limites da validação local

A Site Key pública foi incorporada e a configuração do provedor/secret no Supabase foi informada pelo usuário. Não foram usados senha de usuário, Secret Key do Turnstile ou acesso administrativo ao projeto real. Portanto, devem ser concluídos após publicação:

1. desafio Turnstile real no domínio do GitHub Pages;
2. rejeição de CAPTCHA inválido pelo Supabase;
3. enrolamento TOTP real e emissão de JWT AAL2;
4. teste das políticas com JWT AAL1 e AAL2;
5. teste de duas contas para isolamento RLS;
6. recuperação administrativa após perda simulada do autenticador;
7. download real do motor/idioma OCR pelo navegador e leitura da fatura no domínio publicado.

## Critério de liberação

A versão só deve ser considerada ativa depois de os testes essenciais do `ROTEIRO-TESTES.md` passarem no ambiente publicado.
