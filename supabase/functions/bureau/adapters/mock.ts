// Adapter sintético determinístico.
// Mesmo documento => sempre o mesmo resultado.
// Usado para demos, desenvolvimento e testes E2E sem custo.

import type { BureauAdapter, AdapterRequest, AdapterResult } from "./base.ts";
import { classificarFaixa } from "./base.ts";
import type { ResponseNormalized } from "../schema.ts";

// Hash determinístico simples (FNV-1a)
function hashDocumento(doc: string): number {
  let hash = 2166136261;
  for (let i = 0; i < doc.length; i++) {
    hash ^= doc.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function rng(seed: number, salt: number): number {
  // LCG determinístico baseado em seed+salt → [0,1)
  const x = Math.sin((seed + salt) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export const mockAdapter: BureauAdapter = {
  type: "mock",
  async consultar(req: AdapterRequest): Promise<AdapterResult> {
    const doc = req.documento.replace(/\D/g, "");
    const seed = hashDocumento(doc);

    const scoreValor = Math.floor(rng(seed, 1) * 1000);
    const faixa = classificarFaixa(scoreValor);

    const qtdProtestos = Math.floor(rng(seed, 2) * 4); // 0-3
    const valorProtestos = qtdProtestos > 0 ? Math.floor(rng(seed, 3) * 50000) + 1000 : 0;

    const qtdAcoes = Math.floor(rng(seed, 4) * 3); // 0-2
    const qtdRestritivos = Math.floor(rng(seed, 5) * 3);
    const valorRestritivos = qtdRestritivos > 0 ? Math.floor(rng(seed, 6) * 30000) + 500 : 0;

    const qtdPendencias = Math.floor(rng(seed, 7) * 4);
    const valorPendencias = qtdPendencias > 0 ? Math.floor(rng(seed, 8) * 20000) + 300 : 0;

    const qtdConsultas = Math.floor(rng(seed, 9) * 8);

    const ufs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA"];
    const uf = ufs[Math.floor(rng(seed, 10) * ufs.length)];

    const normalized: ResponseNormalized = {
      documento: doc,
      tipo_pessoa: req.tipo_pessoa,
      consultado_em: new Date().toISOString(),
      score: req.tipos_consulta.includes("score")
        ? { valor: scoreValor, faixa, fonte: "Mock Bureau", modelo: "mock-v1" }
        : null,
      protestos: req.tipos_consulta.includes("protestos")
        ? {
            quantidade: qtdProtestos,
            valor_total: valorProtestos,
            detalhes: Array.from({ length: qtdProtestos }, (_, i) => ({
              cartorio: `${i + 1}º Tabelionato de Protesto`,
              cidade: uf === "SP" ? "São Paulo" : "Capital",
              uf,
              data: new Date(Date.now() - (i + 1) * 30 * 86400000).toISOString().slice(0, 10),
              valor: Math.floor(valorProtestos / qtdProtestos),
            })),
          }
        : null,
      acoes_judiciais: req.tipos_consulta.includes("acoes_judiciais")
        ? {
            quantidade: qtdAcoes,
            detalhes: Array.from({ length: qtdAcoes }, (_, i) => ({
              numero_processo: `${1000000 + Math.floor(rng(seed, 100 + i) * 9000000)}-12.2024.8.26.0100`,
              vara: `${i + 1}ª Vara Cível`,
              comarca: uf === "SP" ? "São Paulo" : "Capital",
              uf,
              natureza: i % 2 === 0 ? "Execução de Título Extrajudicial" : "Cobrança",
              valor_causa: Math.floor(rng(seed, 200 + i) * 100000) + 5000,
              data_distribuicao: new Date(Date.now() - (i + 1) * 90 * 86400000).toISOString().slice(0, 10),
              polo: "passivo",
            })),
          }
        : null,
      restritivos: req.tipos_consulta.includes("restritivos")
        ? {
            quantidade: qtdRestritivos,
            valor_total: valorRestritivos,
            detalhes: Array.from({ length: qtdRestritivos }, (_, i) => ({
              fonte: i % 2 === 0 ? "SPC" : "Serasa",
              data: new Date(Date.now() - (i + 1) * 60 * 86400000).toISOString().slice(0, 10),
              valor: Math.floor(valorRestritivos / qtdRestritivos),
              credor: `Credor ${String.fromCharCode(65 + i)}`,
            })),
          }
        : null,
      pendencias_financeiras: req.tipos_consulta.includes("pendencias_financeiras")
        ? {
            quantidade: qtdPendencias,
            valor_total: valorPendencias,
            detalhes: Array.from({ length: qtdPendencias }, (_, i) => ({
              tipo: i % 2 === 0 ? "Cheque sem fundo" : "Atraso bancário",
              fonte: "BACEN",
              valor: Math.floor(valorPendencias / qtdPendencias),
              data: new Date(Date.now() - (i + 1) * 45 * 86400000).toISOString().slice(0, 10),
            })),
          }
        : null,
      consultas_recentes: req.tipos_consulta.includes("consultas_recentes")
        ? { quantidade: qtdConsultas, periodo_dias: 90 }
        : null,
    };

    return {
      status: "sucesso",
      raw: { mock: true, seed, ...normalized },
      normalized,
      custo_estimado: 0,
    };
  },
};
