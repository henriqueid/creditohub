## Auth flow

### Signup — fechado por convite

Cadastro **público está desabilitado**. `Auth.tsx` só entra em modo `signup` quando há `?invite=TOKEN` na URL — sem token, força `login`. Fluxo:

1. Super-admin (`is_super_admin = true`) gera convite em `/super-admin` (RPC `create_invitation` → grava em `pending_invitations` + retorna URL `/auth?invite=TOKEN`)
2. Convidado abre o link, vê preview (`get_invitation_info` — RPC público, retorna `tenant_name`, `role`, validade)
3. Preenche email + senha → `supabase.auth.signUp` → trigger `handle_new_user` cria `profiles`
4. `accept_invitation(p_token)` move o user pro tenant correto, cria `user_roles` com a role do convite, marca `used_at`
5. Convite expira em 7 dias (configurável); link reusado retorna `already_used`/`expired`

### Login

- `signInWithPassword` padrão. JWT em localStorage, autorefresh.
- Reset de senha: `resetPasswordForEmail` → email com link → `/reset-password`.

### Permissões

- `tenant_role_permissions` (tabela): por tenant + role, lista quais módulos/features estão liberados (`cedentes`, `comite`, etc.)
- `useUserPermissions` (hook): consulta as permissões do user atual; usado em `<ModuleGuard module="X">` que envolve cada `<Route>` em `App.tsx`
- Edição inline em `/perfil` → seção Equipe (`TeamSection`): admin troca role/módulo de colega de tenant

### Super-admin

- Coluna `profiles.is_super_admin` (default `false`); função SQL `is_super_admin(uuid)` checa
- Rota `/super-admin` (não envolvida em `ModuleGuard`; checa flag direto)
- Policies RLS de bypass cross-tenant em `tenants`, `user_roles`, `tenant_role_permissions`, `pending_invitations`, `profiles` (migration `20260507_super_admin_policies.sql`)
- **Não** vê dados de negócio cross-tenant (analyses, deals, clients) — escopo limitado a admin de plataforma

### Tenant default

- `00000000-0000-0000-0000-000000000001` — usado por contas dev/teste antes do convite
- Trigger `handle_new_user` joga novos signups (sem convite) nele se eventualmente abrir signup público
