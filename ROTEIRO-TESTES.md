# Roteiro de validação — versão 4.6.1

## 1. Configuração estática

1. Confirme que `security-config.js` contém a Site Key pública real.
2. Confirme que nenhuma Secret Key, `service_role` ou senha aparece no repositório.
3. Abra a PWA em janela anônima.
4. Verifique que o botão de autenticação só é liberado após o Turnstile.
5. Expire/recarregue o desafio e confirme que o botão volta a ficar bloqueado.

## 2. CAPTCHA

Execute cada fluxo com um desafio válido:

- entrar;
- criar usuário;
- solicitar recuperação de senha.

Depois tente enviar token ausente, expirado ou inválido e confirme que o Supabase rejeita a operação. A resposta não deve revelar se o e-mail existe no fluxo de recuperação.

## 3. Primeiro cadastro MFA

1. Entre com uma conta sem fatores MFA.
2. Confirme que o Dashboard não abre em AAL1.
3. Escaneie o QR Code em um aplicativo autenticador.
4. Teste um código incorreto.
5. Digite o código correto.
6. Confirme a mensagem **MFA ativado com sucesso** e a abertura do app.
7. Abra a conta pelo botão do topo e confirme **MFA ativo • sessão verificada em dois fatores**.

## 4. Login com MFA já ativo

1. Saia da conta.
2. Faça login com senha e CAPTCHA.
3. Confirme que a tela de código aparece antes de qualquer dado financeiro.
4. Teste código incorreto e, depois, correto.
5. Recarregue a página e confirme que a sessão AAL2 válida é restaurada.

## 5. RLS AAL2

1. Execute `supabase-migration-v4.2-mfa.sql`.
2. Confirme 28 políticas no resultado: 4 comandos × 7 tabelas.
3. Com um JWT AAL1, tente consultar `transactions`: nenhuma linha deve ser retornada.
4. Com o JWT AAL2 do mesmo usuário, os registros próprios devem aparecer.
5. Com outra conta AAL2, os registros da primeira conta não devem aparecer.

## 6. Recuperação

1. Solicite recuperação com Turnstile válido.
2. Abra o link, cadastre nova senha e faça login.
3. Confirme que a conta ainda exige o fator TOTP existente.
4. Verifique que tokens de recuperação não permanecem na URL.

## 7. Perda do autenticador

1. Em uma conta de teste, simule a perda do TOTP.
2. Remova o fator apenas pelo procedimento administrativo documentado no Supabase.
3. Entre novamente e confirme que a PWA exige novo enrolamento.
4. Registre quem executou o reset administrativo.

## 8. Regressão funcional

Após AAL2, teste:

- criar, editar e excluir movimentação;
- importação PDF/CSV/TXT e conciliação;
- regras versionadas;
- fluxo de caixa e cenários;
- contas a pagar e orçamento;
- sincronização PC/celular;
- fila offline e reconexão;
- exportação/restauração de backup;
- instalação PWA e atualização do cache 4.2.

## 9. Importação Bradesco

1. Com internet, selecione o PDF Bradesco usado na validação.
2. Aguarde o indicador de OCR. A segunda página em branco deve ser ignorada.
3. Compare a prévia com o extrato e confirme data, descrição e valor de cada compra.
4. Confirme que `SALDO ANTERIOR` e `Total para` não aparecem.
5. Confirme a importação e valide que somente as compras reais aparecem na Lista e no Dashboard do mês correto.
6. Reimporte o mesmo arquivo e confirme o bloqueio por hash.
7. Repita uma importação CSV e TXT já aceita pela versão 4.2.1.

## 10. Mobile

Validar pelo menos em 320 × 568, 390 × 844 e 430 × 932:

- Turnstile sem estouro horizontal;
- QR Code totalmente visível;
- chave manual quebrando linha;
- campo TOTP e teclado numérico;
- botões acessíveis acima da área segura do iPhone.


## 11. Saldo anterior e reimportação

1. Execute `supabase-migration-v4.3-opening-balance.sql`.
2. Importe a fatura Bradesco com a opção de ajuste desmarcada.
3. Confirme que as compras entram e o saldo anterior fica pendente no mês anterior.
4. Confira a equação e a diferença na prévia e na aba Conciliação.
5. Reimporte o mesmo arquivo: todas as compras devem aparecer como já representadas.
6. Marque **Adicionar apenas a diferença ao mês anterior**.
7. Confirme que só um registro `opening_balance` é criado e que ele não tem categoria de consumo.
8. Reimporte e tente novamente: nenhum segundo ajuste deve ser criado.
9. No Dashboard do mês anterior, confira Despesas, Gastos detalhados, Saldo consolidado e Qualidade.
10. Confirme que categoria, maiores despesas e Oportunidades ignoram o saldo consolidado.
11. Faça o teste com duas contas para confirmar isolamento RLS dos metadados de conciliação.

## 12. Detectores genéricos e recusa segura

1. Execute `supabase-migration-v4.4-generic-opening-balance.sql`.
2. Importe TXT com `Saldo de abertura`, período e conta explícitos.
3. Importe CSV com linha `tipo = opening_balance`.
4. Importe CSV com coluna dedicada `opening_balance`.
5. Confirme parser, evidência, linha/campo, confiança e conta na conciliação.
6. Teste `saldo disponível`, `saldo atual` e `saldo projetado`: nenhum deve virar âncora.
7. Teste rótulo explícito sem período: deve exigir revisão, sem ajuste automático.
8. Teste dois saldos de abertura no mesmo arquivo: deve recusar a interpretação automática.
9. Confirme que transações de outra conta ou período não explicam o saldo.
10. Consulte `PARSER-CONTRACT.md` antes de adicionar um novo parser.

## 13. Adaptadores e mapeador

1. Execute `supabase-migration-v4.5-adapters-mapper.sql`.
2. Importe o PDF Bradesco e confirme a seleção do adaptador específico.
3. Importe CSV padrão e confirme o adaptador delimitado.
4. Importe arquivo com cabeçalhos não reconhecidos e confirme a abertura do mapeador.
5. Associe data, descrição e valor; confira a amostra destacada.
6. Aplique e confirme que a prévia normal aparece antes da gravação.
7. Salve o mapeamento e importe outro arquivo com a mesma estrutura.
8. Confirme a reutilização automática e nova validação.
9. Altere um cabeçalho e confirme que a assinatura muda.
10. Teste dois adaptadores com score próximo; o mapeador deve ser usado.
11. Confirme o mapeamento sincronizado no segundo dispositivo.
12. Desconecte a internet e confirme o uso do mapeamento já armazenado localmente.

## 14. MFA opcional e step-up AAL2

1. Execute `supabase-migration-v4.6-optional-mfa.sql`.
2. Entre com uma conta sem TOTP e confirme acesso ao app em AAL1.
3. Abra Ajustes > Segurança e inicie a ativação.
4. Confirme QR, chave manual e URI otpauth.
5. Teste copiar chave e copiar URI.
6. Cadastre em qualquer aplicativo TOTP e confirme que o código muda a cada 30 segundos.
7. Digite código incorreto e depois correto.
8. Navegue por várias telas e confirme que o código não é pedido novamente.
9. Saia e entre novamente; o código deve ser solicitado após a senha.
10. Em AAL1 sem fator, tente salvar um mapeamento reutilizável; o enrollment deve abrir.
11. Em AAL1 com fator, tente ação sensível; o challenge deve abrir.
12. Cancele o enrollment e confirme retorno ao app sem fator incompleto.
13. Remova o fator em sessão AAL2 e valide o próximo login.
14. Confirme que a área SMS está desativada e não envia/simula códigos.

## 15. Hotfix do retorno Supabase

1. Inicie enrollment e confirme QR, chave e URI simultaneamente.
2. Copie a chave e a URI.
3. Cancele; confirme que o fator incompleto desaparece.
4. Inicie novamente e conclua challenge + verify.
5. Confirme sessão AAL2.
6. Saia e entre novamente; o fator verificado deve pedir código.
7. Simule uma tentativa interrompida e confirme que novo enrollment limpa apenas o fator não verificado.
8. Confirme que não houve necessidade de nova migration ou alteração no Cloudflare.
