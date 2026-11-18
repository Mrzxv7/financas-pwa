# Contrato de importadores - opening_balance

## Objetivo

Todos os importadores devem normalizar saldo anterior, saldo inicial, saldo de abertura e equivalentes para o conceito comum `opening_balance`. O parser Bradesco é apenas um adaptador desse contrato.

## Regra de segurança

Um parser só pode produzir `opening_balance` quando houver:

1. rótulo ou campo semântico explícito, como `saldo anterior`, `saldo de abertura`, `saldo inicial`, `opening balance`, `previous balance` ou `beginning balance`;
2. valor numérico válido;
3. período do documento identificável por campo de período, data do documento ou datas válidas das transações.

Não interpretar como `opening_balance`:

- saldo disponível;
- saldo projetado;
- saldo atual sem indicação de abertura;
- textos que apenas mencionem “saldo anterior” dentro de uma descrição maior;
- heurísticas baseadas somente na posição ou no valor;
- múltiplos saldos de abertura conflitantes no mesmo input.

## Adaptador comum

Parsers futuros devem chamar:

```js
normalizeOpeningBalanceConcept(anchor, transactions, meta)
```

Estrutura mínima de `anchor`:

```js
{
  concept: "opening_balance",
  evidenceKind: "explicit_semantic_label",
  amount: 1000.00,
  statementMonth: "2026-11",
  accountRaw: "ACC-123",
  label: "Opening balance",
  evidence: "field opening_balance",
  sourceRef: "json.opening_balance",
  parserId: "future-parser"
}
```

Campos opcionais:

```js
{
  provider: "Instituição",
  creditsPayments: 50.00,
  statementTotal: 1050.00
}
```

Se `evidenceKind` não for `explicit_semantic_label`, se o valor for zero/inválido ou se o período não puder ser estabelecido, a função retorna `null`.

## Resultado normalizado

O resultado contém:

- `openingConcept = opening_balance`;
- `openingBalance`;
- `statementMonth` e `previousPeriod`;
- `accountKey`, `accountLabel` e `accountScope`;
- `parserId`, `openingEvidence`, `openingConfidence` e `openingSourceRef`;
- `newPurchases`, `creditsPayments`, `statementTotal`, `expectedTotal` e `statementDifference`;
- estado da equação: `reconciled`, `divergent` ou `not_applicable`.

## Escopo de conta

- `explicit`: o input trouxe conta/cartão identificável.
- `source`: não havia identificador explícito; a associação fica restrita à família da origem/arquivo.

Nunca reconciliar transações de chaves de conta diferentes. O ajuste consolidado usa a mesma `accountKey` e o período anterior.

## Persistência e duplicidade

- Transações detalhadas usam `entry_kind = detailed`.
- Ajustes consolidados usam `entry_kind = opening_balance` e `category_source = not_applicable`.
- Por padrão, a diferença não explicada permanece pendente.
- O ajuste só é criado após seleção explícita do usuário.
- Existe proteção local e índice único no Supabase por usuário, `account_key` e `statement_period`.
- Hash, linha, parser, evidência e referência da origem permanecem auditáveis.
