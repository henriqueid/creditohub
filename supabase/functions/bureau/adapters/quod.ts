// PLACEHOLDER — Quod (consórcio dos bancos).
// Documentação sob NDA — fornecida no onboarding comercial.

import type { BureauAdapter, AdapterRequest, AdapterResult } from "./base.ts";

export const quodAdapter: BureauAdapter = {
  type: "quod",
  async consultar(_req: AdapterRequest): Promise<AdapterResult> {
    return {
      status: "erro",
      raw: null,
      normalized: null,
      error_message: "Adapter Quod não implementado.",
    };
  },
};
