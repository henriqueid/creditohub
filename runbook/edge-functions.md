## Edge functions

| Função | Auth | Endpoint pattern | O que faz |
|---|---|---|---|
| `generate-insights` | JWT obrigatório | POST | Claude gera análise textual (5 tipos: client/market/financial/risk/summary). Lê `anthropic_api_key` do profile do user autenticado. |
| `analyze-document` | JWT obrigatório | POST | Claude extrai dados estruturados de PDF/texto via tool_use. Limite 5MB. |
| `consulta-externa` | JWT obrigatório | POST | Gateway pra API externa de crédito. Retorna `{status: "not_configured"}` se sem credenciais. |
| `bureau` | JWT obrigatório | POST | Multi-bureau (Serasa/BoaVista/Quod/Mock). Cache em `bureau_consultas`. Credenciais por env. |
| `monitoring-runner` | service_role OU x-cron-secret | POST | Cron — processa monitoring_groups vencidos. **Não aceita ANON_KEY** (público). |
| `deal-followup-check` | service_role OU x-cron-secret | POST | Cron — cria tarefas pra deals parados. **Não aceita ANON_KEY**. |

### Pattern de auth (use sempre):

```ts
async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw 401;
  const jwt = authHeader.slice(7);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error } = await client.auth.getUser(jwt);
  if (error || !user) throw 401;
  return { userId: user.id, jwt };
}
```
