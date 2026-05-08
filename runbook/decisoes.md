## Decisões de produto

### Em vigor

1. **Cada transição no funil é decisão humana** — sistema não promove automaticamente (Consulta → Prospect → Pipeline → Análise → Comitê → Portfólio).
2. **Análise nasce sempre vinculada a um cliente** — botão "Nova análise" foi removido em favor de "+ Nova consulta" com bypass condicional.
3. **Comitê é inviolável** — análise em status `in_committee+` só muda via `finalize_committee` (RPC). Override de admin exige `reason` e fica registrado em `committee_override_*` + `audit_log` (evento `'finalize_committee'` com diff de status + votos).
4. **AI key por usuário** — não há chave compartilhada do tenant. Cada user paga seus créditos.
5. **Multi-tenancy** — tenant default `00000000-0000-0000-0000-000000000001` pra dev/teste; novos users entram nele automaticamente.
6. **Mobile** — tablet (768+) é experiência completa; smartphone (<640) é read-only com overlay no dossiê.

### Pendentes (esperando alinhamento)

- **Modelo SaaS B2B** — super-admin (`/admin`) com lead capture (`/contato`), CRUD de tenants, sistema de convites por email, controle de licenças. Migrations e fluxo desenhados mas não implementados.
- **Volume operado real** — métrica "Top cedentes por volume" trocada por "Limite aprovado" como compromisso. Volume real depende de integração SPED/NFs (fase futura).
