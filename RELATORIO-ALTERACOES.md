# Alterações da versão 4.1 — recuperação de senha

- Link **Esqueci minha senha** na tela de entrada.
- Solicitação de e-mail pelo endpoint seguro do Supabase Auth.
- Redirecionamento para a própria PWA e remoção imediata dos tokens da URL.
- Tela de definição e confirmação da nova senha.
- Encerramento da sessão temporária de recuperação após a troca.
- Mensagem neutra no envio do e-mail para reduzir enumeração de contas.
- Mensagens amigáveis para link inválido, expirado, limite de tentativas e credenciais incorretas.
- Cache PWA atualizado para 4.1.0.
- Nenhuma alteração de tabela, RLS ou migração SQL.

# Relatório de alterações — Copiloto Financeiro 4.0

## Objetivo

Esta versão implementa juntas as três fundações solicitadas: **conciliação bancária verificável**, **regras de categorização explícitas e versionadas** e **fluxo de caixa realizado/comprometido/projetado com cenários editáveis**. Também inclui **criação de usuário na tela de acesso**.

## 1. Conciliação bancária confiável e verificável

- Cada arquivo ou texto importado recebe um **SHA-256** calculado localmente.
- Reimportação do mesmo arquivo é bloqueada pelo hash e também por restrição única no banco.
- Cada lote registra: arquivo, hash, data, itens encontrados, importados, duplicados, erros e status.
- Cada lançamento importado guarda: descrição e valor originais, arquivo, hash, linha, lote e estado da conciliação.
- A prévia mostra **ORIGINAL × REGISTRO** antes da confirmação.
- A tela `Planejar → Conciliação` mostra taxa conciliada, totais e comparação linha a linha.
- A deduplicação verifica primeiro `hash + linha`; como segunda defesa, verifica data + tipo + valor + descrição normalizada.
- A importação confirmada atualiza imediatamente **Lista**, **Dashboard**, **Fluxo** e **Oportunidades**.

## 2. Regras de categorização explícitas e versionadas

- Nova tela `Planejar → Regras`.
- Tipos de correspondência: contém, começa com e igual a.
- Prioridade configurável.
- Cada alteração gera uma **nova versão imutável** do conteúdo da regra; a versão anterior deixa de ser corrente, mas permanece no banco.
- Lançamentos registram a origem da categoria: `manual`, `rule`, `system:v1` ou migração.
- Quando uma regra é aplicada, a movimentação registra o ID e a versão exata usados.
- Ao corrigir manualmente uma categoria, o app pode perguntar se deve criar uma regra para o futuro.
- A Lista identifica se a categoria foi manual, do sistema ou de uma regra versionada.

## 3. Fluxo de caixa e cenários

- Separação visível entre:
  - **realizado**: lançamentos já ocorridos;
  - **comprometido**: contas pendentes no mês do vencimento;
  - **projetado adicional**: média histórica descontando o que já foi realizado.
- Cenários editáveis com:
  - variação de receita;
  - redução geral de despesas;
  - redução adicional em uma categoria;
  - histórico de 1, 3, 6 ou 12 meses;
  - horizonte de 3, 6 ou 12 meses.
- Todas as premissas aparecem abaixo da projeção.
- O cálculo evita dupla contagem: o projetado adicional subtrai valores já realizados.
- Contas marcadas como pagas deixam de compor o comprometido.

## 4. Cadastro e autenticação

- A tela inicial agora alterna entre **Entrar** e **Criar usuário**.
- Cadastro com nome, e-mail, senha e confirmação.
- Compatível com confirmação de e-mail do Supabase.
- Sessão persistente e renovação por refresh token.
- Mesma conta sincroniza PC e celular.
- Migração opcional dos dados locais da versão 2 para a conta autenticada.

## 5. Integrações e funções preservadas

- Supabase Auth e PostgreSQL com RLS.
- Sincronização PC/celular, fila offline e cache separado por usuário.
- Atualização ao recuperar conexão, voltar ao app e a cada 90 segundos quando visível.
- Importação PDF/CSV/TXT e texto colado.
- PDF.js local, sem CDN em tempo de execução.
- Lista, Dashboard, Oportunidades, Contas, orçamento e backup JSON.
- PWA instalável e cache offline do **app shell**.
- GitHub Pages continua sendo apenas a hospedagem dos arquivos estáticos.

## 6. Oportunidades

- Compara cada categoria do mês com a média dos três meses anteriores com dados.
- Só mostra uma oportunidade quando a diferença é material.
- Exibe gasto atual, média, potencial estimado e atalho para os lançamentos.
- O cálculo é determinístico; não inventa dados nem envia o histórico a um modelo generativo.

## 7. Segurança aplicada

- Nenhuma `service_role`, senha de banco ou chave secreta foi incluída.
- A publishable key permanece pública por projeto; o acesso aos dados depende do token do usuário e das políticas RLS.
- O service worker foi corrigido para **nunca armazenar respostas do Supabase/Auth**.
- HTML proveniente de dados do usuário é escapado antes de renderizar.
- Exclusão e operações destrutivas exigem confirmação.
- O SHA-256 prova igualdade do arquivo, mas não substitui backup nem assinatura digital bancária.

## 8. Mudanças de banco necessárias

Execute `supabase-migration-v4.sql` no SQL Editor antes de publicar o frontend. A migração é idempotente e:

- preserva as quatro tabelas existentes;
- adiciona colunas de auditoria às movimentações;
- cria `import_batches`, `category_rules` e `cashflow_scenarios`;
- cria índices, triggers, RLS e políticas por usuário;
- mantém/publica as tabelas no Supabase Realtime.

## 9. Limites conhecidos

- A leitura de PDF depende de o arquivo conter texto; PDFs apenas escaneados exigiriam OCR, que não foi adicionado para não enviar documentos a terceiros.
- A projeção é uma estimativa baseada em médias e premissas escolhidas; não é garantia de resultado.
- O token e o cache local ficam no armazenamento do navegador. Um dispositivo desbloqueado ou comprometido pode expor os dados locais.
- O frontend não executa sozinho alterações de esquema: a migração SQL é obrigatória uma vez.
