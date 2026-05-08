## Auth flow

1. **Signup público** está habilitado em `/auth` (modo signup)
2. Trigger `handle_new_user` cria:
   - `profiles` com `tenant_id` default
   - `user_roles` com role `admin` no tenant default
3. Login via Supabase Auth (`signInWithPassword`)
4. Reset password via `resetPasswordForEmail` → email com link → `/reset-password`
5. JWT armazenado em localStorage, autorefreshed

> **Pendência:** modelo SaaS B2B planejado mas não implementado (super-admin, leads, convites, licenças). Veja `decisoes.md`.
