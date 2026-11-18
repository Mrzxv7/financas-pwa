# Validação técnica executada

Data da validação: 18/11/2026.

## Aprovado

- Sintaxe de `app.js` e `sw.js` verificada pelo Node.js.
- 129 IDs únicos na interface e todas as referências JavaScript resolvidas.
- Manifesto JSON válido e modo `standalone`.
- Chaves CSS balanceadas.
- Arquivos obrigatórios, ícones e PDF.js local presentes.
- Service worker limitado ao mesmo domínio; respostas Supabase/Auth não entram no cache.
- Ausência de `service_role` e `sb_secret_` no código.
- Testes determinísticos aprovados para:
  - moeda brasileira;
  - datas válidas e inválidas;
  - importação CSV;
  - categorização de IFOOD;
  - preservação de linha e valor original;
  - detecção de duplicidade;
  - geração de seis meses do fluxo;
  - estrutura de oportunidades.
- Smoke test HTTP com status 200 para HTML, JS, CSS, manifesto, service worker, ícones e PDF.js.

## Exige validação no ambiente real

- Login/cadastro com a configuração atual do Supabase Auth.
- RLS com duas contas independentes.
- Execução da migração SQL no projeto.
- Sincronização autenticada entre PC e iPhone.
- Leitura de um PDF bancário real e específico do usuário.

Esses itens dependem de credenciais do usuário, da configuração do projeto e de arquivos financeiros reais; não foram simulados como se estivessem concluídos.


## Validação 4.1 — recuperação de senha

Teste automatizado executado em viewport móvel de 390 × 844 px, com as respostas do Supabase Auth simuladas localmente:

- [x] Link de recuperação visível apenas no modo de login.
- [x] Formulário de solicitação mostra apenas o e-mail.
- [x] `redirect_to` aponta para a pasta atual da PWA.
- [x] Callback `type=recovery` é reconhecido, inclusive por navegação na PWA já aberta.
- [x] Tokens do callback são removidos da barra de endereço.
- [x] Validações de e-mail, senha mínima e confirmação divergente.
- [x] Atualização usa `PUT /auth/v1/user` com o token temporário.
- [x] Sessão temporária é encerrada após a troca.
- [x] Senha não é salva no armazenamento local.
- [x] Sem estouro horizontal na tela móvel testada.
- [x] Cache do service worker está em `v4.1.0`.

A entrega real do e-mail, a validade do link emitido pelo projeto e a configuração de **Redirect URLs** ainda devem ser confirmadas após a publicação, pois dependem do Supabase do usuário.
