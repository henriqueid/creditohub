## Setup & Comandos

```bash
# Setup
npm install
cp .env.local.example .env.local  # criar com VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY

# Dev
npm run dev                    # http://localhost:8080
npm run build                  # produção
npm run preview                # preview do build

# Tests
npm run test:e2e              # Playwright
TEST_EMAIL=... TEST_PASSWORD=... npx playwright test --project=setup
TEST_EMAIL=... TEST_PASSWORD=... npx playwright test --project=smoke

# Supabase
npx supabase login            # 1x via browser
npx supabase functions deploy <nome> --project-ref rwypdyksgmzrxruzgldk
```
