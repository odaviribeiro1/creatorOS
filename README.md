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

Este projeto é self-hosted. Cada usuário roda própria instância em Supabase + Vercel. Setup completo em ~15 minutos.

### Caminho recomendado: setup automático via Claude Code

Se você tem [Claude Code](https://claude.com/claude-code) instalado, esse é o caminho mais simples — Claude Code lê o `START.md` deste repositório, te pergunta cada credencial, valida tudo, e configura sua instância sozinho.

1. Crie um projeto novo no Supabase em https://supabase.com/dashboard.
2. Faça fork deste repositório no GitHub.
3. Clone o seu fork localmente: `git clone https://github.com/<seu-usuario>/creator-os.git`.
4. Entre na pasta: `cd creator-os`.
5. Abra Claude Code: `claude`.
6. Digite na sessão: **"Leia o arquivo START.md e execute tudo"**
7. Responda às perguntas conforme Claude Code as faz — ele aplica as 3 migrations, deploya as 6 Edge Functions, configura as secrets e cria seu admin.
8. Quando terminar, faça deploy do frontend na Vercel preenchendo `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Claude Code te lembra desses valores no final).
9. Acesse a URL gerada pela Vercel e faça login com o admin criado.

Veja [`START.md`](./START.md) para a lista de credenciais que você precisa ter em mãos antes de começar.

### Caminho manual (sem Claude Code)

Se prefere fazer tudo no terminal:

```bash
git clone https://github.com/<seu-usuario>/creator-os.git
cd creator-os
cp .env.example .env
# Edite .env preenchendo VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
# SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF (veja comentários no arquivo)
npm install

# Aplicar migrations
supabase link --project-ref <seu-project-ref>
supabase db push

# Deploy das 6 Edge Functions
for fn in scrape-profiles scrape-reel-url analyze-content generate-voice-profile generate-script job-status; do
  supabase functions deploy "$fn" --project-ref <seu-project-ref> --no-verify-jwt
done
```

Configure as secrets das Edge Functions manualmente em **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (lista no `.env.example` grupo "Edge Functions Secrets": `APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`).

Crie sua conta admin acessando a aplicação localmente (`npm run dev`) ou após deploy na Vercel — o primeiro usuário que se cadastrar vira admin automaticamente (trigger `on_auth_user_created` na migration `20260502000000_app_users_and_roles.sql`).

Para deploy do frontend na Vercel, acesse [vercel.com/new](https://vercel.com/new), importe seu fork e preencha `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` na tela de Environment Variables.

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

## 📚 Documentação adicional

- [`START.md`](./START.md) — setup automático via Claude Code (caminho recomendado).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — modelo de dados, fluxo do pipeline, prompts usados nas chamadas a LLMs, padrão async de jobs e limitações conhecidas.
- [`CHANGELOG.md`](./CHANGELOG.md) — histórico de versões.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — como contribuir.
- [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) — visão técnica completa (referência interna para desenvolvimento com Claude Code).

---

## Contribuindo

Bug reports, ideias e PRs são bem-vindos. Veja [`CONTRIBUTING.md`](./CONTRIBUTING.md) para convenções de commit, branch model e style guide.

Histórico de mudanças em [`CHANGELOG.md`](./CHANGELOG.md).

---

## Licença

[MIT](./LICENSE) © 2026 Creator OS Contributors.
