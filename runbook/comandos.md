## Comandos críticos

### SQL — rodar manualmente no Supabase SQL Editor

Migrations são criadas em `supabase/migrations/` mas a aplicação é manual (Docker não roda local). Cole o conteúdo do `.sql` no [SQL Editor](https://supabase.com/dashboard/project/rwypdyksgmzrxruzgldk/sql).

### Edge function deploy

```bash
npx supabase login                                                                              # 1x
npx supabase functions deploy <nome> --project-ref rwypdyksgmzrxruzgldk
```

### Test a função sem login (verificar deploy):

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST "https://rwypdyksgmzrxruzgldk.supabase.co/functions/v1/<nome>"
# Espera 401 (auth obrigatória)
```

### Auditoria de segurança

```bash
# Disparar agente
# Use Task tool com subagent_type: "security-auditor"
```

### Atualizar este runbook

Após feature/fix relevante, dispatch o agente `runbook-keeper` (`.claude/agents/runbook-keeper.md`) com diff dos commits recentes.
