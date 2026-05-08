#!/usr/bin/env bash
# Stop hook: avisa quando mudanças relevantes pedem update no runbook/.
# Fail-open: qualquer erro silencia (não trava o ciclo de Stop).
#
# Triggers que pedem runbook-keeper:
#   - supabase/migrations/*.sql        -> schema.md / rls.md
#   - supabase/functions/*             -> edge-functions.md
#   - src/App.tsx                      -> rotas.md
#   - src/lib/credit-calculations.ts   -> funil.md / dossie.md
#   - src/lib/analysis-status.ts       -> funil.md / dossie.md
#   - src/pages/*.tsx (NOVO arquivo)   -> rotas.md + estrutura.md
#
# Não dispara para: testes, lockfiles, .md, .css, runbook/*, .claude/*.

set -u

# Move pra raiz do repo
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

# Se runbook/ está sendo editado agora, presume que keeper já está trabalhando — sai.
if {
  git diff --name-only HEAD 2>/dev/null
  git diff --name-only --cached 2>/dev/null
  git ls-files --others --exclude-standard 2>/dev/null
} | grep -qE '^runbook/'; then
  exit 0
fi

# Coleta tudo que mudou na sessão (último commit + uncommitted + staged + untracked)
files=$(
  {
    git diff --name-only HEAD~1 HEAD 2>/dev/null
    git diff --name-only HEAD 2>/dev/null
    git diff --name-only --cached 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u
)
[ -z "$files" ] && exit 0

hits=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    runbook/*|*.md) continue ;;
    src/test/*|*.test.ts|*.test.tsx|playwright.config.ts|playwright-fixture.ts) continue ;;
    package.json|package-lock.json|bun.lockb|yarn.lock|pnpm-lock.yaml) continue ;;
    .claude/*) continue ;;
    *.css) continue ;;

    supabase/migrations/*.sql)
      hits="${hits}|${f} -> runbook/schema.md (e rls.md se policy nova)" ;;
    supabase/functions/*)
      hits="${hits}|${f} -> runbook/edge-functions.md" ;;
    src/App.tsx)
      hits="${hits}|${f} -> runbook/rotas.md (rota nova/removida?)" ;;
    src/lib/credit-calculations.ts|src/lib/analysis-status.ts)
      hits="${hits}|${f} -> runbook/funil.md ou dossie.md (regra canonica)" ;;
    src/pages/*.tsx)
      # Página nova? Verifica se foi adicionada no último commit ou está untracked
      if git ls-files --others --exclude-standard 2>/dev/null | grep -qx "$f" \
         || git log --diff-filter=A --name-only --pretty=format: HEAD~1..HEAD 2>/dev/null | grep -qx "$f"; then
        hits="${hits}|${f} -> runbook/rotas.md + estrutura.md (pagina nova)"
      fi ;;
  esac
done <<< "$files"

[ -z "$hits" ] && exit 0

# Monta reason
reason="Mudancas relevantes detectadas - chame o agente \`runbook-keeper\` pra atualizar o runbook:"
old_ifs="$IFS"
IFS='|'
for hit in $hits; do
  [ -z "$hit" ] && continue
  reason="${reason}
- ${hit}"
done
IFS="$old_ifs"
reason="${reason}

(Hook automatico em .claude/settings.json. Critério: migration, edge function, rota nova ou regra canonica. Pra ignorar pontualmente, basta seguir sem chamar o keeper.)"

# Saída JSON pra Stop hook (decision=block + reason)
node -e 'process.stdout.write(JSON.stringify({decision:"block",reason:process.argv[1]}))' "$reason" 2>/dev/null || exit 0
