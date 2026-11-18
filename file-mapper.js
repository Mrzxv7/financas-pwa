/* Copiloto Financeiro - mapeador de arquivos desconhecidos 1.0 */
(() => {
  "use strict";

  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const stableToken = value => { let hash = 2166136261; for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); };
  const aliases = {
    date: ["data", "date", "transaction date", "data lancamento"],
    description: ["descricao", "description", "historico", "title", "estabelecimento", "memo"],
    amount: ["valor", "amount", "value", "montante"],
    type: ["tipo", "type", "natureza", "entry kind", "record type"],
    account: ["conta", "account", "account id", "cartao", "card", "card id"],
    period: ["periodo", "competencia", "statement month", "statement period", "mes"],
    openingBalance: ["opening balance", "saldo anterior", "saldo de abertura", "saldo inicial"],
    statementTotal: ["statement total", "total da fatura", "total do extrato", "saldo final"],
    creditPayment: ["payment", "pagamento", "credit payment", "credito pagamento"]
  };

  function guessDelimiter(line) {
    return [";", "\t", ",", "|"].map(delimiter => ({ delimiter, count: String(line || "").split(delimiter).length - 1 })).sort((a, b) => b.count - a.count)[0];
  }

  function looksLikeHeader(row) {
    if (!row?.length) return false;
    const labels = row.map(normalize), matches = labels.filter(label => Object.values(aliases).flat().some(alias => label === alias || label.includes(alias))).length;
    const numeric = row.filter(value => /^\s*-?[\d.,]+\s*$/.test(value)).length;
    return matches > 0 || numeric < row.length / 2;
  }

  function suggest(headers) {
    const result = {};
    for (const [field, values] of Object.entries(aliases)) {
      const index = headers.map(normalize).findIndex(header => values.some(value => header === value || header.includes(value)));
      result[field] = index;
    }
    return result;
  }

  function analyze(text, meta, helpers) {
    const first = String(text || "").split(/\r?\n/).find(line => line.trim()) || "";
    const delimiterGuess = guessDelimiter(first);
    let mode = "lines", delimiter = "", headers = [], rows = [], sourceLines = [];

    const decimalCommaOnly = delimiterGuess.delimiter === "," && delimiterGuess.count === 1 && /\d,\d{2}\s*$/.test(first);
    if (delimiterGuess.count >= 1 && !decimalCommaOnly) {
      const parsed = helpers.parseCSVRows(text, delimiterGuess.delimiter);
      if (parsed.length >= 2 && parsed.some(row => row.length > 1)) {
        mode = "delimited"; delimiter = delimiterGuess.delimiter;
        const hasHeader = looksLikeHeader(parsed[0]);
        headers = hasHeader ? parsed[0].map((value, index) => value || `Coluna ${index + 1}`) : parsed[0].map((_, index) => `Coluna ${index + 1}`);
        rows = hasHeader ? parsed.slice(1) : parsed;
        sourceLines = rows.map((_, index) => index + (hasHeader ? 2 : 1));
      }
    }

    if (!rows.length) {
      headers = ["Linha original", "Data sugerida", "Descrição sugerida", "Valor sugerido"];
      String(text || "").split(/\r?\n/).forEach((raw, index) => {
        const line = raw.replace(/\s+/g, " ").trim();
        if (!line) return;
        const dateMatch = line.match(/(?:^|\s)(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?|\d{4}-\d{2}-\d{2})(?:\s|$)/);
        const amounts = [...line.matchAll(/(?:R\$|BRL|USD|US\$)?\s*(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[,.]\d{2})(?!\d)/gi)];
        const amountMatch = amounts.at(-1);
        let description = line;
        if (dateMatch) description = description.replace(dateMatch[1], " ");
        if (amountMatch) description = description.replace(amountMatch[0], " ");
        description = description.replace(/\s+/g, " ").trim();
        rows.push([line, dateMatch?.[1] || "", description, amountMatch?.[1] || ""]);
        sourceLines.push(index + 1);
      });
    }

    const suggestions = suggest(headers);
    if (mode === "lines") Object.assign(suggestions, { date: 1, description: 2, amount: 3, type: -1, account: -1, period: -1, openingBalance: -1, statementTotal: -1, creditPayment: -1 });
    const signature = `mapper-v1:${mode}:${stableToken(headers.map(normalize).join("|"))}`;
    return { mode, delimiter, headers, rows, sourceLines, suggestions, signature, fileName: meta.fileName, hash: meta.hash, batchId: meta.batchId, text };
  }

  function valueAt(row, index) { return Number.isInteger(index) && index >= 0 ? String(row[index] ?? "").trim() : ""; }

  function apply(model, config, meta, helpers) {
    const tx = [], openingCandidates = [], totals = [], credits = [], warnings = [], errors = [];
    const fixedPeriod = String(config.fixedPeriod || "").trim(), fixedAccount = String(config.fixedAccount || "").trim();
    const accountRawDefault = fixedAccount || valueAt(model.rows.find(row => valueAt(row, config.account)), config.account);
    const periodDefault = fixedPeriod || valueAt(model.rows.find(row => valueAt(row, config.period)), config.period);
    const identity = helpers.normalizeAccountIdentity(accountRawDefault, meta, config.provider || "");

    model.rows.forEach((row, index) => {
      const line = model.sourceLines[index] || index + 1;
      const semanticRaw = valueAt(row, config.semantic), descriptionRaw = valueAt(row, config.description), semantic = helpers.semanticAnchorKind(semanticRaw) || helpers.semanticAnchorKind(descriptionRaw);
      const amountRaw = valueAt(row, config.amount), openingRaw = valueAt(row, config.openingBalance), totalRaw = valueAt(row, config.statementTotal), paymentRaw = valueAt(row, config.creditPayment);
      const amount = helpers.parseMoney(amountRaw), openingAmount = Math.abs(helpers.parseMoney(openingRaw)), totalAmount = Math.abs(helpers.parseMoney(totalRaw)), creditAmount = Math.abs(helpers.parseMoney(paymentRaw));
      if (openingAmount && !openingCandidates.some(candidate => candidate.evidence === `coluna ${model.headers[config.openingBalance]}` && Math.abs(candidate.amount - openingAmount) < .01)) openingCandidates.push({ amount: openingAmount, label: model.headers[config.openingBalance], line, evidence: `coluna ${model.headers[config.openingBalance]}` });
      if (totalAmount) totals.push(totalAmount);
      if (creditAmount) credits.push(creditAmount);
      if (semantic === "opening_balance" && Math.abs(amount)) { openingCandidates.push({ amount: Math.abs(amount), label: semanticRaw || descriptionRaw, line, evidence: `mapeamento semântico: ${semanticRaw || descriptionRaw}` }); return; }
      if (semantic === "statement_total" && Math.abs(amount)) { totals.push(Math.abs(amount)); return; }
      if (semantic === "credit_payment" && Math.abs(amount)) { credits.push(Math.abs(amount)); return; }
      if (!descriptionRaw && !amount) return;
      const dateRaw = valueAt(row, config.date), date = helpers.normalizeDate(dateRaw);
      if (!descriptionRaw || !amount || !date) { errors.push(`Linha ${line}: data, descrição ou valor inválido.`); return; }
      const typeRaw = normalize(valueAt(row, config.type)), type = /receita|credito|entrada|income/.test(typeRaw) ? "income" : /despesa|debito|saida|expense/.test(typeRaw) ? "expense" : amount < 0 ? "expense" : config.defaultType || "expense";
      tx.push(helpers.makeImported({ type, description: descriptionRaw.slice(0, 90), amount: Math.abs(amount), paymentMethod: config.paymentMethod || "Outro", date, accountKey: identity.accountKey, accountLabel: identity.accountLabel }, { ...meta, line, parserId: "user-mapped-v1", accountKey: identity.accountKey, accountLabel: identity.accountLabel }));
    });

    const uniqueOpenings = openingCandidates.filter((candidate, index, all) => all.findIndex(other => other.line === candidate.line && Math.abs(other.amount - candidate.amount) < .01) === index);
    let statement = null;
    if (uniqueOpenings.length === 1) {
      const opening = uniqueOpenings[0], statementMonth = helpers.normalizeStatementMonth(periodDefault, tx);
      const anchor = { concept: "opening_balance", evidenceKind: "explicit_semantic_label", amount: opening.amount, statementMonth, accountRaw: accountRawDefault, provider: config.provider || "", label: opening.label, evidence: `Mapeamento confirmado pelo usuário: ${opening.evidence}`, sourceRef: `linha ${opening.line}`, parserId: "user-mapped-v1", creditsPayments: credits.reduce((a, b) => a + b, 0), statementTotal: totals.at(-1) || 0 };
      statement = helpers.normalizeOpeningBalanceConcept(anchor, tx, { ...meta, parserId: "user-mapped-v1", institution: config.provider || "" });
      if (!statement) warnings.push("Saldo de abertura mapeado sem período seguro; não foi criada âncora automática.");
    } else if (uniqueOpenings.length > 1) warnings.push("Mais de um saldo de abertura mapeado; revise as colunas antes de continuar.");

    return { transactions: tx, statement, warnings, errors, mapping: { ...config, signature: model.signature, mode: model.mode, delimiter: model.delimiter, headers: model.headers } };
  }

  window.UnknownFileMapper = Object.freeze({ version: "1.0", analyze, apply, suggest, stableToken });
})();
