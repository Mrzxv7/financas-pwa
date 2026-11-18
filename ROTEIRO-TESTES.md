# Roteiro de validação

## 1. Migração e autenticação

1. Execute `supabase-migration-v4.sql`.
2. Confirme que o resultado final mostra 7 tabelas com `rowsecurity = true`.
3. Crie um usuário pela nova tela.
4. Se confirmação de e-mail estiver habilitada, confirme e entre.
5. Abra a PWA em outro dispositivo com a mesma conta.

## 2. Isolamento RLS

1. Crie duas contas de teste.
2. Na conta A, grave uma movimentação.
3. Entre na conta B e confirme que a movimentação da conta A não aparece.
4. No Table Editor, confirme que as linhas têm `user_id` distintos.

## 3. Importação e conciliação

1. Importe um CSV/TXT/PDF com valores conhecidos.
2. Confira ORIGINAL × REGISTRO na prévia.
3. Altere manualmente uma categoria.
4. Confirme a importação.
5. Verifique Lista, Dashboard, Fluxo e Conciliação.
6. Importe o mesmo arquivo novamente e confirme o bloqueio pelo SHA-256.
7. Confira o lote, a taxa de conciliação, o hash e as linhas.

## 4. Regras versionadas

1. Crie `IFOOD → Alimentação`.
2. Importe ou digite uma movimentação com IFOOD.
3. Confirme na Lista `Regra v1`.
4. Edite a regra e salve nova versão.
5. Confirme que a tela mostra duas versões preservadas e apenas a última corrente.
6. Verifique que o lançamento antigo continua apontando para a versão aplicada na época.

## 5. Fluxo de caixa

1. Cadastre receita e despesa no mês atual.
2. Cadastre uma conta pendente com vencimento no mês.
3. Confira os blocos Realizado, Comprometido e Projetado.
4. Crie cenário com receita -15% e despesas -10%.
5. Confira a tabela e as premissas.
6. Marque a conta como paga e confirme que sai do comprometido.

## 6. Sincronização e offline

1. No PC, adicione `TESTE PC — R$ 1,00`.
2. No celular, volte à PWA ou aguarde até 90 segundos e confira o registro.
3. Ative modo avião no celular e adicione `TESTE OFFLINE — R$ 2,00`.
4. Confirme indicador de pendência/offline.
5. Reconecte e confira sincronização no PC.

## 7. PWA

1. Abra por HTTPS.
2. Instale na tela inicial.
3. Abra uma vez online.
4. Feche, desligue a rede e reabra.
5. Confirme que a interface abre e os dados em cache aparecem.
6. Confirme que login/sincronização informam falta de rede sem perder alterações.

## 8. Critérios de aceite

- Nenhum erro no console ao carregar.
- Nenhum vazamento de dados entre contas.
- O mesmo arquivo não é importado duas vezes.
- Regras exibem versão e origem.
- Cenários mostram todas as premissas.
- Lista e Dashboard mudam imediatamente após importação.
- Fila offline sincroniza ao voltar a rede.


## Recuperação de senha — versão 4.1

1. Na tela **Entrar**, toque em **Esqueci minha senha**.
2. Teste e-mail vazio e formato inválido; o envio deve ser bloqueado.
3. Informe um e-mail cadastrado; a mensagem deve orientar a consultar a caixa de entrada.
4. Abra o link recebido no mesmo navegador e em outro dispositivo.
5. Confirme que a PWA mostra **Nova senha** e **Confirmar senha**.
6. Teste senha menor que 8 caracteres e confirmações diferentes; ambas devem ser bloqueadas.
7. Salve uma senha válida e confirme a mensagem de sucesso.
8. Entre com a nova senha; a senha anterior não deve autenticar.
9. Reabra o mesmo link; ele deve ser rejeitado como expirado ou utilizado.
10. Confirme que a URL final não mantém `access_token`, `refresh_token` ou outros tokens.
11. Confirme que dados financeiros, fila offline e políticas RLS não foram alterados.
