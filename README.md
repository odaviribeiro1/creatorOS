# Creator OS

> Análise de Reels virais do Instagram + geração de roteiros para teleprompter, tudo self-hosted em Supabase + Vercel.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20Vite%208%20%7C%20Supabase-3B82F6)](./ARCHITECTURE.md)

---

## O que é

Creator OS é uma ferramenta self-hosted que automatiza o ciclo de criação de Reels para Instagram:

1. **Extrai** os Reels mais virais de perfis-referência (via Apify).
2. **Analisa** estrutura narrativa (hook, desenvolvimento, CTA) e elementos de edição (transições, b-rolls, música, efeitos sonoros, texto na tela) com timestamps — usando Whisper, Gemini e GPT.
3. **Aprende** o tom de fala do criador a partir dos próprios vídeos (Voice Profile).
4. **Gera** roteiros prontos para teleprompter + relatório de edição estruturado para o editor de vídeo.

Você roda na sua própria conta Supabase + Vercel, com suas próprias chaves de provedores. Sem SaaS, sem multi-tenant, sem billing externo.

---

## Stack

- **Frontend:** React 19, Vite 8, TypeScript 5.9, Tailwind 4, shadcn/ui, Zustand 5, React Router 7.
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions Deno).
- **Hosting:** Vercel para o frontend; Supabase Cloud para tudo do lado do servidor.
- **Análise de conteúdo:** Apify (scraping), OpenAI Whisper (transcrição), Google Gemini (análise visual de vídeo + GPT/Gemini para análise estrutural e geração de roteiros).

Detalhes em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 🚀 Como rodar (passo a passo)

Este é um projeto open source self-hosted. Siga estes 6 passos para ter sua instância rodando em produção em ~30 minutos. **Não é necessário editar código.**

### 1. Crie um projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Escolha região (ex: `South America - São Paulo`), defina senha do banco e plano Free.
3. Aguarde o provisionamento (~2 minutos).
4. Anote: **Project URL** e **anon public key** (Settings → API). Você vai usar nos passos 5 e 4.

### 2. Faça fork deste repositório e aplique as migrations

1. Clique em **Fork** no topo desta página para criar sua cópia.
2. No Supabase Dashboard do seu projeto, vá em **Database → Migrations**.
3. Conecte sua conta GitHub e selecione o fork — o Supabase vai detectar automaticamente os arquivos em `supabase/migrations/` e aplicá-los.
4. Confirme no SQL Editor que as tabelas (`profiles`, `reels`, `transcriptions`, `content_analyses`, `voice_profiles`, `scripts`, `script_versions`, `processing_jobs`, `app_users`) foram criadas.

> Alternativa via CLI (modo dev): `supabase link --project-ref <ref>` + `supabase db push`. Veja a seção [Modo dev](#-modo-dev-avançado).

### 3. Configure as Secrets das Edge Functions

No Supabase Dashboard do seu projeto:

1. Vá em **Project Settings → Edge Functions → Secrets**.
2. Adicione cada uma das secrets abaixo:

| Secret | Onde obter | Para que serve |
|---|---|---|
| `APIFY_TOKEN` | https://console.apify.com/account/integrations | Scraping de Reels e perfis do Instagram. |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | Whisper (transcrição de áudio) + GPT (análise estrutural e geração de roteiros). |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | Análise visual de vídeo (transições, b-rolls, texto na tela). |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são auto-injetadas pelo runtime das Edge Functions — não precisa criá-las.

### 4. Configure auto-deploy de Edge Functions via GitHub Actions

No seu fork no GitHub:

1. Vá em **Settings → Secrets and variables → Actions**.
2. Clique em **New repository secret** e adicione duas secrets:
   - `SUPABASE_ACCESS_TOKEN` — gere em https://supabase.com/dashboard/account/tokens (Personal Access Token).
   - `SUPABASE_PROJECT_REF` — encontre em **Supabase Dashboard → Project Settings → General → Reference ID**.
3. Vá na aba **Actions** do seu fork e clique em **I understand my workflows, go ahead and enable them** se solicitado.
4. Clique em **"Deploy Supabase Edge Functions"** → **"Run workflow"** → **"Run workflow"** (botão verde).
5. Aguarde a conclusão (~2 minutos). Todas as 6 Edge Functions serão deployadas.

A partir daqui, qualquer push em `main` que altere arquivos em `supabase/functions/**` redeploya automaticamente as funções.

### 5. Deploy do frontend na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e selecione **Import Git Repository**.
2. Escolha seu fork.
3. Na tela de configuração, expanda **Environment Variables** e preencha:
   - `VITE_SUPABASE_URL` — cole a Project URL do passo 1.
   - `VITE_SUPABASE_ANON_KEY` — cole a anon key do passo 1.
   - `VITE_APP_NAME` (opcional) — nome da marca exibido na UI. Default: `Creator OS`.
4. Clique em **Deploy** e aguarde (~2 minutos).
5. Anote a URL gerada (ex: `seu-projeto.vercel.app`).

### 6. Crie sua conta de administrador

1. Acesse a URL gerada pela Vercel.
2. Clique em **Cadastrar** e crie sua conta com email e senha.
3. **O primeiro usuário cadastrado vira admin automaticamente** (trigger `on_auth_user_created` na migration `20260502000000_app_users_and_roles.sql`).
4. Pronto — você está dentro do dashboard.

---

## 🛠️ Modo dev (avançado)

Para desenvolvimento local com hot reload:

```bash
git clone https://github.com/<seu-usuario>/creator-os.git
cd creator-os
cp .env.example .env
# Edite .env preenchendo VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Ferramentas úteis para desenvolvedores (alternativas ao caminho gráfico):

- **Aplicar migrations via CLI** — `supabase link --project-ref <ref>` seguido de `supabase db push`. Alternativa ao passo 2.
- **Deploy de Edge Function individual** — `supabase functions deploy <nome> --project-ref <ref>`. Alternativa ao passo 4.
- **Logs em tempo real** — `supabase functions logs <nome> --follow`.

Esses comandos requerem [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e `SUPABASE_ACCESS_TOKEN` exportado.

---

## Custos estimados

Os custos abaixo somam todas as APIs externas usadas no pipeline. São aproximações (variam com duração do vídeo e modelos escolhidos):

| Item | Custo |
|---|---|
| Whisper (transcrição) | ~$0.006 / minuto |
| Gemini (análise visual) | ~$0.0075 / vídeo |
| GPT-4o (análise estrutural + geração de roteiros) | ~$0.03 / análise |
| Apify (scraping) | ~$2.60 / 1.000 resultados |
| **Total por Reel analisado** | **~$0.40–0.80** |
| **Perfil de 50 Reels** | **~$2.50–4.00** |

Supabase free tier e Vercel free tier costumam absorver bem o tráfego inicial; revise os limites quando o uso crescer.

---

## Comandos úteis

```bash
# Frontend
npm run dev        # dev server (Vite)
npm run build      # build de produção (tsc + vite build)
npm run lint       # ESLint
npm run preview    # preview local do build

# Supabase (modo dev)
supabase db push                          # aplicar migrations
supabase functions deploy <nome>          # deploy de uma Edge Function
supabase functions logs <nome> --follow   # ver logs em tempo real
supabase functions serve <nome>           # rodar a function local
```

---

## Troubleshooting

### `supabase functions deploy` falha por timeout
Edge Functions de processamento longo (`analyze-content`, `generate-script`) seguem o padrão **async**: criam um job em `processing_jobs` e retornam o `job_id` imediatamente. O processamento real continua em seguida. O frontend escuta `processing_jobs` via Supabase Realtime — não use polling. Se um job ficar travado em `'processing'` por muito tempo, inspecione `processing_jobs.error_message` ou rode `supabase functions logs <nome> --follow`.

### Apify retorna URL de vídeo, mas baixa 404 horas depois
URLs do Apify expiram em **3 dias**. O Edge Function `scrape-profiles` baixa imediatamente para Supabase Storage; se o download falhou, refaça o scrape para gerar URLs novas.

### Whisper retorna erro de "file too large"
Limite é **25MB** por arquivo. Reels do Instagram costumam ficar dentro do limite, mas se exceder, comprime com ffmpeg antes do upload:
```bash
ffmpeg -i input.mp4 -vn -ac 1 -ar 16000 -b:a 64k output.mp3
```

### CORS bloqueia chamadas do frontend
Configure o domínio da Vercel em **Supabase Dashboard → Authentication → URL Configuration → Site URL** e em **Additional Redirect URLs**.

### Realtime não dispara updates de `processing_jobs`
Confirme que a publication está ativa no SQL Editor:
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
A tabela `processing_jobs` deve aparecer. Caso contrário:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
```

### Trigger `on_auth_user_created` não cria linha em `app_users`
Verifique no SQL Editor:
```sql
SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
```
Se o trigger não estiver listado, reaplique a migration `20260502000000_app_users_and_roles.sql`.

### Edge Function retorna `{ "error": "Secrets ausentes: ..." }`
Volte ao passo 3 e confirme que cada secret foi adicionada corretamente em **Supabase Dashboard → Project Settings → Edge Functions → Secrets**. Após adicionar, refaça o deploy (passo 4: re-rodar workflow no GitHub Actions).

---

## Architecture deep-dive

Para detalhes de modelo de dados, fluxo do pipeline, prompts usados nas chamadas a LLMs, padrão async de jobs e limitações conhecidas, leia [`ARCHITECTURE.md`](./ARCHITECTURE.md).

Para visão técnica completa (mantida para referência interna do desenvolvimento com Claude Code), veja [`.claude/CLAUDE.md`](./.claude/CLAUDE.md).

---

## Contribuindo

Bug reports, ideias e PRs são bem-vindos. Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para convenções de commit, branch model e style guide.

Histórico de mudanças em [`CHANGELOG.md`](./CHANGELOG.md).

---

## Licença

[MIT](./LICENSE) © 2026 Creator OS Contributors.
