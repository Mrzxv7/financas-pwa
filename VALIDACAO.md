# Validação técnica executada

Data da validação: 18/11/2026.

## Aprovado

- Sintaxe de `app.js` e `sw.js` verificada pelo Node.js.
- 123 IDs únicos na interface e todas as referências JavaScript resolvidas.
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
