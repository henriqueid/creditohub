// PLACEHOLDER — Serasa Experian.
// Implementação real depende do contrato comercial do cliente FIDC.
// Documentação: https://developer.serasaexperian.com.br/
//
// Endpoints típicos:
//   - POST /credit-score/v1/companies/{cnpj}
//   - POST /negative-data/v1/companies/{cnpj}
//   - POST /lawsuits/v1/companies/{cnpj}
//
// Auth: OAuth2 client_credentials (precisa client_id + client_secret no secret).

import type { BureauAdapter, AdapterRequest, AdapterResult } from "./base.ts";

export const serasaAdapter: BureauAdapter = {
  type: "serasa",
  async consultar(_req: AdapterRequest): Promise<AdapterResult> {
    return {
      status: "erro",
      raw: null,
      normalized: null,
      error_message:
        "Adapter Serasa não implementado. Configure as credenciais e implemente a chamada à API conforme contrato.",
    };
  },
};
