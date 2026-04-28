// PLACEHOLDER — Boa Vista (Equifax).
// Documentação: https://www.boavistaservicos.com.br/desenvolvedores
// Auth: token estático ou OAuth2 conforme produto contratado.

import type { BureauAdapter, AdapterRequest, AdapterResult } from "./base.ts";

export const boavistaAdapter: BureauAdapter = {
  type: "boavista",
  async consultar(_req: AdapterRequest): Promise<AdapterResult> {
    return {
      status: "erro",
      raw: null,
      normalized: null,
      error_message: "Adapter Boa Vista não implementado.",
    };
  },
};
