## AI integration (Claude)

- **Provider:** Anthropic
- **Modelo:** `claude-sonnet-4-6`
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Headers:** `x-api-key`, `anthropic-version: 2023-06-01`
- **Per-user key:** stored em `profiles.anthropic_api_key` (RLS self-only)
- **Edge functions buscam a key server-side** via JWT do user (nunca recebem do body)
- **Fallback:** env `ANTHROPIC_API_KEY` se user não configurou

### Onde aparece no UI

- `/perfil` → seção "Configurações de IA" (input mascarado da chave)
- `/analises/:id` → painel `AIInsightsPanel` em cada seção do dossiê
- `/analises/:id` → upload de documento → `SectionFileUpload` chama `analyze-document`
