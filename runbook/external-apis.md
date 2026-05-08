## External APIs

### BrasilAPI (público, sem auth)

- **Endpoint:** `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- **CORS:** aberto (`*`)
- **Limitação:** só CNPJ (14 dígitos), não suporta CPF
- **Chamada:** direta do browser via `src/lib/external-consulta.ts`

### Bureau (configurável)

- Adapters em `supabase/functions/bureau/adapters/`
- Implementados: `mock` (funciona) | `serasa`/`boavista`/`quod` (stubs retornando "não implementado")
- Credenciais em env vars (não em DB)
- Cache em `bureau_consultas` com TTL

### Google Maps (opcional)

- Embed do mapa em `/consulta` quando `VITE_GOOGLE_MAPS_API_KEY` está setado
- Sem a env, iframe não renderiza (degrada graceful)
