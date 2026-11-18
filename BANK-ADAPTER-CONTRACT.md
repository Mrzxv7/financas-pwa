# Framework de adaptadores bancários

## Contrato

Cada adaptador registrado em `BankAdapterRegistry` precisa fornecer:

```js
{
  id: "instituicao-produto-formato",
  name: "Nome legível",
  version: "1.0.0",
  priority: 50,
  formats: ["pdf", "csv", "txt"],
  detect(input) {},
  parse(input) {}
}
```

`detect(input)` retorna:

```js
{
  score: 0.0, // até 1.0
  reasons: ["evidência objetiva"],
  evidence: {}
}
```

`parse(input)` retorna o payload comum:

```js
{
  transactions: [],
  statement: null,
  warnings: []
}
```

## Seleção

1. Todos os adaptadores são inspecionados.
2. O maior score acima do limite é selecionado.
3. Se dois candidatos válidos ficarem próximos, o resultado é `ambiguous`.
4. Se nenhum atingir o limite, o resultado é `unknown` e o mapeador é aberto.
5. Um adaptador nunca deve inserir dados diretamente; ele apenas produz o payload de conferência.

## Adaptadores incluídos

- `bradesco-open-statement`: fatura aberta Bradesco em PDF/OCR ou texto.
- `generic-delimited`: tabelas CSV/TXT com cabeçalhos reconhecíveis.
- `generic-text`: extratos textuais com linhas transacionais reconhecíveis.

## Novo adaptador

O novo parser deve reutilizar:

- `makeImported` para transações;
- `normalizeOpeningBalanceConcept` para saldo de abertura;
- `PARSER-CONTRACT.md` para evidência segura;
- metadados de arquivo, hash, linha, parser e conta para rastreabilidade.

O adaptador não deve:

- gravar no Supabase;
- pular a prévia;
- inventar categorias;
- forçar `opening_balance` sem evidência explícita;
- ocultar warnings;
- selecionar a si mesmo com score alto baseado apenas no nome do arquivo.

## Testes mínimos

- detecção positiva;
- arquivo semelhante que deve ser recusado;
- score abaixo do limite;
- ambiguidade entre dois adaptadores;
- payload válido;
- rastreabilidade de parser e origem;
- regressão dos demais adaptadores.
