# Creator OS

> Análise de Reels virais do Instagram + geração de roteiros para teleprompter, tudo self-hosted em Supabase + Vercel.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20Vite%208%20%7C%20Supabase-3B82F6)](./ARCHITECTURE.md)

---

## O que é

Creator OS é uma ferramenta self-hosted que automatiza o ciclo de criação de Reels para Instagram:

1. **Extrai** os Reels mais virais de perfis-referência (via Apify).
2. **Analisa** estrutura narrativa (hook, desenvolvimento, CTA) e elementos de edição (transições, b-rolls, música, efeitos sonoros, texto na tela) com timestamps — usando Whisper, Gemini e Claude/OpenAI.
3. **Aprende** o tom de fala do criador a partir dos próprios vídeos (Voice Profile).
4. **Gera** roteiros prontos para teleprompter + relatório de edição estruturado para o editor de vídeo.

Você roda na sua própria conta Supabase + Vercel, com suas próprias chaves de provedores. Sem SaaS, sem multi-tenant, sem billing externo.

---

## Stack

- **Frontend:** React 19, Vite 8, TypeScript 5.9, Tailwind 4, shadcn/ui, Zustand 5, React Router 7.
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions Deno).
- **Hosting:** Vercel para o frontend; Supabase Cloud para tudo do lado do servidor.
- **Análise de conteúdo:** Apify (scraping), OpenAI Whisper (transcrição), Google Gemini (análise visual de vídeo), Anthropic Claude (geração de roteiros e análise estrutural).

Detalhes em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Pré-requisitos

- **Node.js 20+** (recomendado 22 LTS) e **npm** (ou pnpm).
- **[Supabase CLI](https://supabase.com/docs/guides/cli)** (`brew install supabase/tap/supabase` ou equivalente).
- **[Vercel CLI](https://vercel.com/docs/cli)** (opcional, para deploy via CLI: `npm i -g vercel`).
- Contas free-tier servem para começar:
  - **Supabase** — DB, Auth, Edge Functions, Storage.
  - **Vercel** — hosting do frontend.
  - **[Apify](https://apify.com/)** — scraping de Reels Instagram.
  - **[OpenAI](https://platform.openai.com/)** — Whisper (transcrição) e GPT.
  - **[Google AI Studio](https://ai.google.dev/)** — Gemini (análise visual de vídeo).
  - **[Anthropic](https://console.anthropic.com/)** — Claude (geração de roteiros). Opcional se você usar apenas modelos OpenAI.

---

## Setup

```bash
# 1. Clonar o repositório
git clone <url-do-fork>
cd creator-os

# 2. Instalar dependências
npm install

# 3. Configurar variáveis do frontend
cp .env.example .env
# Edite .env e preencha:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_APP_NAME (opcional, default 'Creator OS')

# 4. Linkar com o seu projeto Supabase
supabase login
supabase link --project-ref <seu-project-ref>

# 5. Aplicar migrations
supabase db push

# 6. Configurar secrets das Edge Functions
#    Supabase Dashboard → Settings → Edge Functions → Secrets
#    Cole as seguintes (todas listadas em .env.example):
#      SUPABASE_SERVICE_ROLE_KEY
#      APIFY_TOKEN
#      OPENAI_API_KEY
#      GEMINI_API_KEY
#      ANTHROPIC_API_KEY  (opcional)

# 7. Deploy de todas as Edge Functions
supabase functions deploy scrape-profiles
supabase functions deploy scrape-reel-url
supabase functions deploy analyze-content
supabase functions deploy generate-voice-profile
supabase functions deploy generate-script
supabase functions deploy job-status

# 8. Rodar local para testar
npm run dev
# Abra http://localhost:5173 e crie sua conta. O primeiro signup vira admin.

# 9. Deploy do frontend (Vercel)
vercel --prod
# Configure as mesmas VITE_* env vars no Project Settings da Vercel.
```

---

## Roles e o primeiro user vira admin

A migration `20260502000000_app_users_and_roles.sql` cria a tabela `app_users` e um trigger `on_auth_user_created` que insere automaticamente:

- **Primeiro signup** → `role = 'admin'`.
- **Demais signups** → `role = 'operator'`.

Se precisar promover um usuário manualmente (por exemplo, depois de testar com várias contas):

```sql
UPDATE app_users SET role = 'admin' WHERE user_id = '<uuid-do-usuario>';
```

Para descobrir o `user_id`, consulte `auth.users` no SQL Editor do Supabase.

---

## Custos estimados

Os custos abaixo somam todas as APIs externas usadas no pipeline. São aproximações (variam com duração do vídeo e modelos escolhidos):

| Item | Custo |
|---|---|
| Whisper (transcrição) | ~$0.006 / minuto |
| Gemini (análise visual) | ~$0.0075 / vídeo |
| Claude (análise estrutural + geração de roteiros) | ~$0.03 / análise |
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

# Supabase
supabase db push                      # aplicar migrations
supabase functions deploy <nome>      # deploy de uma Edge Function
supabase functions logs <nome> --follow   # ver logs em tempo real
supabase functions serve <nome>       # rodar a function local
```

---

## Troubleshooting

### `supabase functions deploy` falha por timeout
Edge Functions de processamento longo (`analyze-content`, `generate-script`) seguem o padrão **async**: criam um job em `processing_jobs` e retornam o `job_id` imediatamente. O processamento real continua em seguida. O frontend escuta `processing_jobs` via Supabase Realtime — não use polling. Se um job ficar travado em `'processing'` por muito tempo, inspecione `processing_jobs.error_message` ou rode `supabase functions logs <nome> --follow`.

### Apify retorna URL de vídeo, mas baixa 404 horas depois
URLs do Apify expiram em **3 dias**. O Edge Function `scrape-profiles` baixa imediatamente para Supabase Storage; se o download falhou, refaça o scrape para gerar URLs novas.

### Whisper retorna erro de "file too large"
Limite é **25MB** por arquivo. Reels do Instagram costumam ficar dentro do limite, mas se exceder, comprimir com ffmpeg antes do upload:
```bash
ffmpeg -i input.mp4 -vn -ac 1 -ar 16000 -b:a 64k output.mp3
```

### CORS bloqueia chamadas do frontend
Configure o domínio da Vercel em **Supabase Dashboard → Authentication → URL Configuration → Site URL** e em **Additional Redirect URLs**.

### Realtime não dispara updates de `processing_jobs`
Confirme que a publication está ativa:
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
Se o trigger não estiver listado, reaplique a migration `20260502000000_app_users_and_roles.sql` via `supabase db push`.

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
