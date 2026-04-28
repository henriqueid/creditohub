// PLACEHOLDER — Assertiva (agregador).
// Documentação: https://api.assertivasolucoes.com.br/doc/
// Auth: token Bearer com client_credentials.

import type { BureauAdapter, AdapterRequest, AdapterResult } from "./base.ts";

export const assertivaAdapter: BureauAdapter = {
  type: "assertiva",
  async consultar(_req: AdapterRequest): Promise<AdapterResult> {
    return {
      status: "erro",
      raw: null,
      normalized: null,
      error_message: "Adapter Assertiva não implementado.",
    };
  },
};
