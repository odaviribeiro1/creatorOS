# Audit Report — creator-os

> Auditoria de viabilidade de migração SaaS → Open Source Self-Hosted.
> Gerado em 2026-05-02.

## 1. Inventário

- **Stack:** React 19 + Vite 8 + TypeScript 5.9 + Tailwind 4 + shadcn/ui + Zustand 5 + React Router 7 + Supabase JS 2.101 + Recharts 3 + Lucide React. Edge Functions em Deno.
- **Migrations:** 2 arquivos em `supabase/migrations/` (`20260403000000_initial_schema.sql`, `20260406000000_editing_visual_effects_script_versions.sql`).
- **Edge Functions:** 6 — `scrape-profiles`, `scrape-reel-url`, `analyze-content`, `generate-voice-profile`, `generate-script`, `job-status` (~2.091 linhas no total).
- **Possui CLAUDE.md:** sim (em `.claude/CLAUDE.md` no projeto, versão Creator OS — bem detalhada e atualizada).
- **Possui README útil:** **não** — é o boilerplate genérico do `npm create vite` (React + TS + Vite). Não menciona Creator OS.
- **`.env.example`:** sim, presente e mínimo (Supabase URL/Anon Key + comentários sobre keys de Edge Functions).
- **Frontend:** 11 páginas em `src/pages/`, 7 áreas em `src/components/` (analysis, auth, layout, profiles, reels, shared, ui), 7 hooks customizados, 1 store Zustand, 1 client Supabase, 1 camada `lib/api.ts`.

## 2. Acoplamento SaaS detectado

### A. Multi-tenancy no banco
- Tabelas com `tenant_id`: **0**
- Tabela `tenants` ou `workspaces`: **0**
- Policies RLS com `tenant_id` ou `auth.jwt() ->> 'tenant_id'`: **0**
- Auth Hook customizado: **não**
- Modelo de isolamento atual: **per-user via `auth.uid() = user_id`** (cada usuário vê apenas seus próprios dados). RLS habilitado em todas as 8 tabelas, com policies simples e diretas.
- Arquivos: `supabase/migrations/20260403000000_initial_schema.sql` (linhas 163–190).

### B. Multi-tenancy no frontend
- Ocorrências de `tenant_id` / `tenantId`: **0**
- Hooks/contextos de tenant: **nenhum**
- Lógica de subdomínio (`hostname.split`, `window.location.hostname`, `subdomain`, `slug`): **nenhuma**
- O app resolve usuário apenas via `supabase.auth.getUser()` em `src/lib/api.ts:4` e via `AuthProvider` em `src/components/auth/AuthProvider.tsx`.

### C. White-label / branding dinâmico
- **Não há.** Cores são fixas em `src/index.css` (Agentise dark glassmorphism: `#0A0A0F` base, `#3B82F6` primary, `rgba(59,130,246,0.25)` borders).
- Sem `--brand-primary` / `--brand-secondary` dinâmicos, sem `logo_url` / `primary_color` / `branding` em código. Tema é hardcoded.
- Texto "Creator OS" hardcoded em `src/components/auth/LoginPage.tsx:78`.

### D. Billing
- **Nenhuma referência a Stripe, checkout, subscription (de billing), pricing, plan ou seat.**
- Único match para `subscription` está em `src/components/auth/AuthProvider.tsx:22-29` — é a Supabase Auth subscription (listener de `onAuthStateChange`), não billing.
- Sem Edge Functions de billing.

### E. BYOK (keys cifradas)
- **Não há.** Nenhuma referência a `pgp_sym_encrypt`, `pgcrypto`, `encrypted_keys`, `AES-GCM` ou similares.
- API keys (Apify, OpenAI, Gemini, Claude) estão em **variáveis de ambiente das Edge Functions**, conforme `.env.example`.
- A página `src/pages/SettingsPage.tsx` tem inputs de API keys, **mas estão `disabled`** e servem apenas como referência/documentação (linhas 109–117). O usuário não insere keys pela UI.

### F. Onboarding wizard de tenant
- **Não há.** Sem rotas `/onboarding`, `/setup` ou `/wizard` em `src/App.tsx`. Sem componentes `OnboardingWizard` / `SetupWizard` / `TenantSetup`.
- Único onboarding é login/signup com email+senha em `LoginPage.tsx`.

### G. Roles existentes
- **Nenhum sistema de roles.** Não há coluna `role` em `auth.users`, nem em tabelas próprias. Não há policies RLS por role.
- Modelo atual: todo usuário autenticado tem o mesmo nível de acesso aos próprios dados.
- Falsos positivos por busca: a palavra "Todos" aparece em strings de UI em pt-BR, e `member` não aparece como role.

## 3. Domínio nuclear

- **Descrição:** Ferramenta de análise de Reels do Instagram. Faz scraping de perfis (Apify), transcreve áudio (Whisper), analisa estrutura narrativa e edição (Gemini + Claude/OpenAI), extrai um Voice Profile do criador a partir dos próprios vídeos, e gera roteiros para teleprompter + relatório de edição.
- **Entidades centrais (5):** `profiles`, `reels`, `transcriptions`, `content_analyses`, `voice_profiles`, `scripts`. (Periféricas: `script_versions`, `processing_jobs`.)
- **Edge Functions de domínio (todas as 6):**
  - `scrape-profiles` — Apify → reels + storage
  - `scrape-reel-url` — scraping de Reel avulso por URL
  - `analyze-content` — Whisper + Gemini + Claude/OpenAI → análise estrutural e de edição
  - `generate-voice-profile` — análise de tom de fala
  - `generate-script` — geração de roteiro + relatório de edição
  - `job-status` — leitura de status de job (utilitária, mas do domínio)
- **Telas de domínio (todas as 11):** `DashboardPage`, `ProfilesPage`, `ProfileReelsPage`, `AnalysisPage`, `ReelAnalysisPage`, `VoiceProfilePage`, `ScriptsPage`, `NewScriptPage`, `ScriptDetailPage`, `TeleprompterPage`, `SettingsPage`. Nenhuma é de billing/onboarding-de-tenant/branding.

**Observação relevante:** este projeto **não tem casca SaaS**. 100% das telas, Edge Functions e tabelas são domínio nuclear.

## 4. Esforço estimado de migração

| Item | Nível | Justificativa |
|---|---|---|
| Remover `tenant_id` de tabelas e RLS | **Nulo** | Não existe `tenant_id` em lugar nenhum. |
| Consolidar roles | **Baixo** | Não há roles. Adicionar coluna `is_admin` em uma tabela `app_users` + trigger "primeiro signup vira admin" é trabalho mecânico (~30min). Pode ser pulado se 1 role bastar. |
| Remover subdomínio | **Nulo** | Sem lógica de subdomínio. |
| Remover branding dinâmico | **Nulo** | Tema já é fixo (Agentise dark glassmorphism em `index.css`). Substituir o literal `"Creator OS"` em `LoginPage.tsx:78` por uma constante é cosmético. |
| Remover billing | **Nulo** | Sem Stripe/billing. |
| Remover BYOK | **Nulo** | Já é env-var-only. Inputs em `SettingsPage` já estão `disabled` como mera referência. |
| Remover onboarding wizard | **Nulo** | Sem wizard. |
| Testes pós-migração | **Baixo** | Sem suíte de testes existente, mas o app é pequeno (11 páginas). Smoke test manual + fluxo end-to-end (cadastrar perfil → scrape → análise → roteiro) cobre tudo em ~1h. |

**Total estimado:** **2–6 horas** (faixa baixa-alta) de polish para virar boilerplate self-hosted distribuível. Os passos reais são:

1. Reescrever `README.md` (atualmente é o boilerplate Vite) com instruções de self-host: clonar, `.env`, `supabase db push`, deploy de Edge Functions, deploy Vercel.
2. Renomear schema/projeto se desejar (atualmente "creator-os" no `package.json`, schema `public` padrão Supabase).
3. (Opcional) Adicionar trigger SQL "primeiro signup vira admin" + coluna `is_admin` em uma tabela `app_users` se 2 roles forem necessários. Caso contrário, deixar 1 role implícito.
4. (Opcional) Substituir `"Creator OS"` literal por constante `BRAND_NAME` ou env var `VITE_APP_NAME` para facilitar fork.
5. Validar `.env.example` ampliado documentando todas as keys (Apify, OpenAI, Gemini, Anthropic, Service Role).

## 5. Qualidade do código existente

| Critério | Nota (1-5) |
|---|---|
| Tipagem TypeScript | **5** — strict mode, zero `: any` ou `as any`, types explícitos em `src/types/index.ts`, casts pontuais com `as Record<string, unknown>` (6 ocorrências, todas justificadas em parsing de JSONB). |
| Organização de pastas | **4** — clara separação `pages/`, `components/{auth,layout,profiles,reels,analysis,shared,ui}/`, `hooks/`, `lib/`, `store/`, `types/`. Padrão consistente e idiomático. |
| Idempotência de migrations | **4** — segunda migration usa `IF NOT EXISTS` corretamente. A inicial é one-shot mas limpa, sem hacks de correção. |
| Tratamento de erro nas Edge Functions | **4** — padrão consistente: `fetchWithRetry` com exponential backoff, logs estruturados em JSON, CORS headers reutilizados, `try/catch` envolvendo lógica externa. |
| Aderência ao design system Agentise | **5** — glassmorphism dark já implementado: `#0A0A0F` background, blues `#3B82F6`/`#1E3A8A`, `rgba(59,130,246,0.x)` borders/glows, classes utilitárias `glass-card`, `glass-sidebar`, `glass-input`, `btn-gradient`. Geist + Inter como fonts. |
| Documentação (README) | **1** — README é o boilerplate genérico do Vite, sem nenhuma palavra sobre Creator OS, setup, deploy ou self-host. CLAUDE.md compensa em parte (muito detalhado), mas não substitui README. |
| Dívidas técnicas (TODO/FIXME) | **5** — zero TODOs/FIXMEs/HACKs reais (a única ocorrência de "TODO" é a palavra "TODOS" em prompt PT-BR). |

**Média:** (5+4+4+4+5+1+5) / 7 = **4.0**

## 6. Recomendação final

**Decisão: MIGRAR**

**Justificativa em 3-5 frases:**
Este projeto **não tem casca SaaS para remover**. Não existe `tenant_id`, `tenants`, subdomínio, white-label, billing, BYOK ou onboarding wizard — nenhuma das categorias críticas do checklist está presente. O isolamento é per-user simples (`auth.uid() = user_id`), o tema já está fixo em Agentise dark glassmorphism, as API keys já vivem em env vars, e 100% das tabelas/Edge Functions/telas são domínio nuclear. A qualidade do código é alta (média 4.0/5, com tipagem rigorosa, edge functions com retry/backoff, zero `any`, zero TODOs reais). O único débito visível é o README — que é o boilerplate Vite genérico — e isso se resolve em uma sessão curta. Refazer do zero seria desperdício; o esforço total para virar boilerplate self-hosted distribuível é de 2–6h.

**Se MIGRAR — sequência sugerida de fases:**

1. **README + setup docs (1–2h)** — substituir o README genérico por instruções de self-host: pré-requisitos (Supabase CLI, Vercel CLI, conta Apify/OpenAI/Gemini/Anthropic), passo-a-passo de fork, configuração de `.env`, `supabase db push`, deploy de Edge Functions com `supabase functions deploy <nome>`, deploy frontend na Vercel. Documentar custos estimados por análise (~$0.40–0.80/Reel) já listados em `.claude/CLAUDE.md`.
2. **Branding-as-constant (15min, opcional)** — extrair `"Creator OS"` de `LoginPage.tsx:78` (e de qualquer outro lugar onde apareça hardcoded) para uma constante exportada de `src/lib/brand.ts` ou para uma env var `VITE_APP_NAME`. Facilita renomear no fork sem grep.
3. **Schema namespace (30min, opcional)** — atualmente as tabelas estão no schema `public`. Se houver risco de coabitar o Supabase com outros apps, criar schema `creator_os` e atualizar migrations. Para self-host single-purpose isso é dispensável.
4. **Roles (1h, opcional)** — se houver requisito de 2 roles (admin/operador), adicionar tabela `app_users(user_id, role)` + trigger `on_auth_user_created` que insere o primeiro user com `role = 'admin'` e os subsequentes com `role = 'operator'`, ajustar policies relevantes (ex: apenas admin gerencia outros users). Para uma instância de uso interno por 1 pessoa, pode ser pulado.
5. **`.env.example` completo (15min)** — incluir explicitamente todas as keys: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, e em bloco separado as secrets de Edge Functions: `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`. Documentar onde colá-las (Supabase Dashboard → Edge Functions → Secrets).
6. **Smoke test end-to-end (1h)** — rodar o fluxo completo numa instância nova: signup → adicionar perfil → scrape → análise → voice profile → gerar roteiro → teleprompter. Confirmar que tudo funciona com as instruções do README.
7. **Commit + tag de release v1.0.0** — push para o GitHub privado distribuível.

## 7. Observações livres

- O CLAUDE.md em `.claude/CLAUDE.md` é praticamente um README técnico completo (modelo de dados, APIs externas, arquitetura, custos, módulos de implementação). Considerar movê-lo (ou um derivativo simplificado) para a raiz como `ARCHITECTURE.md` ou incorporá-lo ao README. É um ativo significativo do projeto que está hoje invisível para quem dá fork.
- O CLAUDE.md global do user (não o do projeto) descreve um produto totalmente diferente (**Content Hub**, white-label SaaS de carrosséis com wizard, multi-tenancy etc.). Esse documento **não corresponde a este repositório** — é importante notar para evitar confusão de escopo durante a migração; este repo é Creator OS, single-tenant.
- A tabela `processing_jobs` usa `user_id` para escopo de RLS, e Realtime já está habilitado nela (`ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs`). No modelo self-host single-user, o `user_id` permanece útil para audit trail (saber quem disparou o job) — não há motivo para removê-lo.
- O store Zustand (`src/store/`) e os hooks (`useProfiles`, `useReels`, `useAnalysis`, `useScripts`, `useVoiceProfile`, `useScriptVersions`, `useProcessingJobs`) seguem padrão consistente. Migração não impacta essa camada.
- Recentes commits (visíveis em `git log`) mostram iteração ativa em features de domínio (scraping de Reel avulso por URL, análise individual). Indica que o projeto está vivo e a base é estável.
- Há um `dist/` versionado na raiz — recomendar adicionar ao `.gitignore` antes da publicação. (Já está implícito em `.gitignore` linha "dist", mas o diretório existe localmente).
- Não foi feita amostragem: o repositório é pequeno o suficiente para auditoria completa.
