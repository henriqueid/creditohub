## RLS & Multi-tenancy

### Padrão da casa

Toda tabela business tem:
1. Coluna `tenant_id UUID NOT NULL` com DEFAULT `00000000-0000-0000-0000-000000000001`
2. FK pra `tenants(id) ON DELETE CASCADE`
3. Trigger `set_tenant_id_trigger BEFORE INSERT` (preenche pelo `auth.uid()`)
4. RLS habilitado com policies tenant-scoped:

```sql
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<tabela>_select" ON public.<tabela>
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "<tabela>_insert" ON public.<tabela>
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "<tabela>_update" ON public.<tabela>
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "<tabela>_delete" ON public.<tabela>
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
```

### Helpers SECURITY DEFINER (já criados)

- `public.get_user_tenant_id(_user_id UUID)` → tenant_id do user
- `public.has_role(_user_id, _role)` → boolean
- `public.is_admin(_user_id)` → atalho pra `has_role(_, 'admin')`
- `public.set_tenant_id_from_user()` → trigger function
- `public.handle_new_user()` → cria profile + role admin no signup
- `public.get_tenant_colleagues()` → lista users do mesmo tenant sem expor `anthropic_api_key`

### Profiles RLS estrita (migration 20260509000000)

- `profiles_select_self` — usuário só vê própria row (anthropic_api_key não vaza)
- Pra mostrar colega no UI: usa função `get_tenant_colleagues()` (não expõe key)
