/* Copiloto Financeiro - framework de adaptadores bancários 1.0 */
(() => {
  "use strict";

  const required = ["id", "name", "version", "detect", "parse"];
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

  class BankAdapterRegistry {
    constructor({ threshold = 0.68, ambiguityGap = 0.08 } = {}) {
      this.threshold = threshold;
      this.ambiguityGap = ambiguityGap;
      this.adapters = new Map();
    }

    register(adapter) {
      if (!adapter || required.some(key => !adapter[key])) throw new Error("Adaptador bancário inválido");
      if (this.adapters.has(adapter.id)) throw new Error(`Adaptador duplicado: ${adapter.id}`);
      const normalized = Object.freeze({ priority: 100, formats: ["pdf", "csv", "txt"], ...adapter });
      this.adapters.set(normalized.id, normalized);
      return this;
    }

    unregister(id) { this.adapters.delete(id); return this; }
    list() { return [...this.adapters.values()].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)); }

    inspect(input) {
      return this.list().map(adapter => {
        let detection = { score: 0, reasons: [] };
        try {
          const raw = adapter.detect(input) || {};
          detection = typeof raw === "number" ? { score: raw, reasons: [] } : raw;
        } catch (error) {
          detection = { score: 0, reasons: [`Falha na detecção: ${error.message}`] };
        }
        return {
          adapter,
          score: clamp(detection.score),
          reasons: Array.isArray(detection.reasons) ? detection.reasons : [],
          evidence: detection.evidence || null
        };
      }).sort((a, b) => b.score - a.score || a.adapter.priority - b.adapter.priority);
    }

    route(input) {
      const candidates = this.inspect(input), best = candidates[0], second = candidates[1];
      if (!best || best.score < this.threshold) return { status: "unknown", candidates, payload: null, adapter: null };
      if (second && second.score >= this.threshold && best.score - second.score < this.ambiguityGap) {
        return { status: "ambiguous", candidates, payload: null, adapter: null };
      }
      try {
        const payload = best.adapter.parse(input);
        if (!payload || (!Array.isArray(payload.transactions) && !payload.statement)) {
          return { status: "invalid", candidates, payload: null, adapter: best.adapter };
        }
        return {
          status: "matched",
          adapter: best.adapter,
          candidates,
          payload: {
            transactions: Array.isArray(payload.transactions) ? payload.transactions : [],
            statement: payload.statement || null,
            warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
            adapter: {
              id: best.adapter.id,
              name: best.adapter.name,
              version: best.adapter.version,
              score: best.score,
              reasons: best.reasons
            }
          }
        };
      } catch (error) {
        return { status: "error", candidates, payload: null, adapter: best.adapter, error };
      }
    }
  }

  function createRegistry(options) { return new BankAdapterRegistry(options); }

  window.BankAdapterFramework = Object.freeze({
    contractVersion: "1.0",
    BankAdapterRegistry,
    createRegistry
  });
})();
