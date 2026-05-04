# Smoke Test — creator-os (Open Source Self-Hosted)

> Roteiro de validação ponta-a-ponta para a branch `oss-self-hosted`.
> Objetivo: provar que o boilerplate funciona como anunciado para quem clona pela primeira vez.
> Esforço estimado de execução: ~60 minutos.
>
> **Como usar:** execute cada passo em sequência. Para cada caso, marque ✅/❌ + observações em `migration/SMOKE_TEST_RESULTS.md`.

---

## Setup do ambiente de teste

> Pré-requisitos: `node` ≥ 20, `npm`, `supabase` CLI ≥ 1.200, conta Supabase com permissão de criar projects, contas e API keys de Apify, OpenAI, Gemini e Anthropic.

1. **Criar Supabase project novo** (ou fazer reset num project existente dedicado a teste). Anotar `Project Ref`, `Project URL`, `anon key`, `service role key`.
2. **Clonar o repositório** a partir da branch `oss-self-hosted` em uma pasta temporária:
   ```bash
   git clone -b oss-self-hosted <repo-url> /tmp/creator-os-smoke
   cd /tmp/creator-os-smoke
   ```
3. **Instalar dependências:**
   ```bash
   npm install
   ```
4. **Copiar `.env.example` → `.env`:**
   ```bash
   cp .env.example .env
   ```
5. **Preencher `.env`** com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do project novo.
6. **Manter `VITE_APP_NAME=Smoke Test`** em `.env` (para validar Fase 1 — branding via env var).
7. **Login + link no Supabase:**
   ```bash
   supabase login
   supabase link --project-ref <ref>
   ```
8. **Aplicar migrations** (incluindo `app_users` da Fase 2):
   ```bash
   supabase db push
   ```
9. **Configurar secrets no Supabase Dashboard** → Edge Functions → Secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APIFY_TOKEN`
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY` (se for testar geração de roteiro com Claude)
10. **Deploy das 6 Edge Functions:**
    ```bash
    supabase functions deploy scrape-profiles
    supabase functions deploy scrape-reel-url
    supabase functions deploy analyze-content
    supabase functions deploy generate-voice-profile
    supabase functions deploy generate-script
    supabase functions deploy job-status
    ```
11. **Subir dev server:**
    ```bash
    npm run dev
    ```

---

## Casos de teste

### Caso 1 — Branding via env var (valida Fase 1)

**Objetivo:** Confirmar que o literal "Creator OS" foi substituído por `VITE_APP_NAME`.

**Passos:**
1. Abrir `http://localhost:5173/login` no browser.
2. Inspecionar o título do card de login.
3. Inspecionar a `<title>` da aba do browser.

**Critério:**
- ✅ se ambos exibem `Smoke Test` (valor de `VITE_APP_NAME` no `.env`).
- ❌ se exibem `Creator OS` ou outro literal hardcoded.

---

### Caso 2 — Signup do primeiro user vira admin (valida Fase 2)

**Objetivo:** Confirmar que o trigger SQL `handle_first_user_admin` (ou equivalente) atribui `role = 'admin'` ao primeiro signup.

**Passos:**
1. Em `/login`, criar conta nova com email descartável (ex: `admin-smoke-<timestamp>@example.com`).
2. Verificar email se a confirmação estiver ativada. Confirmar.
3. Login.
4. No Supabase Dashboard → SQL Editor:
   ```sql
   SELECT user_id, role, created_at FROM app_users ORDER BY created_at;
   ```

**Critério:**
- ✅ se existe exatamente 1 linha com `role = 'admin'`.
- ❌ se a linha tem `role = 'operator'` ou se não existe linha.

---

### Caso 3 — Signup do segundo user vira operator (valida Fase 2)

**Objetivo:** Confirmar que do segundo signup em diante, `role = 'operator'`.

**Passos:**
1. Logout. Criar segunda conta com outro email (ex: `op-smoke-<timestamp>@example.com`).
2. Verificar + confirmar.
3. Login com a segunda conta.
4. No SQL Editor:
   ```sql
   SELECT user_id, role, created_at FROM app_users ORDER BY created_at;
   ```

**Critério:**
- ✅ se a primeira linha tem `role = 'admin'` e a segunda tem `role = 'operator'`.
- ❌ se a segunda linha tem `role = 'admin'` ou se não existe segunda linha.

---

### Caso 4 — RLS de `app_users` impede operator de ver lista completa (valida Fase 2)

**Objetivo:** Confirmar que policies de RLS isolam corretamente — operator vê apenas a própria linha em `app_users`.

**Passos:**
1. Logado como o operator (segunda conta), abrir DevTools do browser → Console.
2. Executar (substituindo `<url>` e `<anon>` pelos valores do `.env`):
   ```js
   const { data: { session } } = await supabase.auth.getSession();
   const r = await fetch('<url>/rest/v1/app_users?select=*', {
     headers: {
       apikey: '<anon>',
       Authorization: 'Bearer ' + session.access_token
     }
   });
   console.log(await r.json());
   ```

**Critério:**
- ✅ se retorna **apenas 1 linha** (a do próprio user).
- ❌ se retorna 2 linhas (RLS quebrado) ou erro inesperado.

---

### Caso 5 — Adicionar perfil de referência e fazer scrape (valida domínio nuclear)

**Objetivo:** Validar pipeline Apify → DB → Storage funcionando.

**Passos:**
1. Logado como admin (primeira conta), ir em `/profiles`.
2. Clicar em "Adicionar perfil". Inserir um **perfil público pequeno** para minimizar custo Apify (ex: perfil pessoal com poucos reels). Tipo: `reference`.
3. Disparar scrape. Acompanhar via UI ou via SQL:
   ```sql
   SELECT id, status, progress, error_message FROM processing_jobs ORDER BY created_at DESC LIMIT 1;
   ```
4. Aguardar `status = 'completed'`.
5. Navegar para `/profiles/:id/reels`.

**Critério:**
- ✅ se aparecem reels com `likes_count`, `comments_count`, `shares_count`, `views_count`, thumbnail e duração.
- ❌ se job falhou, lista vazia, ou métricas todas em zero.

---

### Caso 6 — Análise de um reel (valida pipeline Whisper + Gemini + LLM)

**Objetivo:** Validar pipeline de análise completo.

**Passos:**
1. Em `/profiles/:id/reels`, selecionar 1 reel.
2. Disparar análise via UI.
3. Aguardar job `analyze` concluir (acompanhar via `processing_jobs`).
4. Abrir `/analysis/:reelId`.
5. Inspecionar cada bloco da análise.

**Critério:**
- ✅ se transcription tem texto + segments com timestamps; hook/development/cta com texto + start/end ts; transitions/broll/text_overlays como arrays não vazios; viral_patterns presente.
- ❌ se algum bloco vazio, erro de parsing, ou job falhou.

---

### Caso 7 — Geração de Voice Profile

**Objetivo:** Validar extração de tom de fala a partir de reels do próprio perfil.

**Passos:**
1. Em `/profiles`, adicionar próprio perfil com `profile_type = 'own'`. Pode ser um perfil pessoal pequeno.
2. Fazer scrape. Aguardar conclusão.
3. Em `/voice-profile`, selecionar 5+ reels e disparar `generate-voice-profile`.
4. Aguardar job concluir.
5. Abrir página de Voice Profile.

**Critério:**
- ✅ se exibe `full_profile_document` (texto descritivo), `vocabulary_style`, `filler_words`, `common_expressions`, `tone_description`.
- ❌ se algum campo vazio ou job falhou.

---

### Caso 8 — Geração de roteiro

**Objetivo:** Validar geração de roteiro + relatório de edição.

**Passos:**
1. Em `/scripts/new`, escolher um tema (ex: "Como criar conteúdo viral em 60s").
2. Selecionar o Voice Profile gerado no Caso 7.
3. Referenciar 2-3 reels analisados no Caso 6 como base de padrões virais.
4. Disparar geração. Aguardar job concluir.
5. Abrir `/scripts/:id`.
6. Conferir `script_teleprompter`, `script_annotated`, `editing_report`.
7. Abrir modo Teleprompter (`/scripts/:id/teleprompter`).

**Critério:**
- ✅ se script_teleprompter tem texto corrido para leitura; script_annotated tem marcações de timing; editing_report tem `editing_instructions` por seção (hook/desenvolvimento/cta) com `visual`, `text_overlay`, `audio`; teleprompter abre em fullscreen.
- ❌ se qualquer parte vazia, mal formatada, ou teleprompter quebrado.

---

### Caso 9 — Realtime de jobs (valida `processing_jobs` em supabase_realtime)

**Objetivo:** Confirmar que a tabela `processing_jobs` continua na publication `supabase_realtime` após a Fase 2 (roles).

**Passos:**
1. Disparar um scrape novo (ou qualquer outro job).
2. Sem dar refresh manual na página, observar a UI atualizando o status do job (pending → processing → completed).

**Critério:**
- ✅ se a UI atualiza o status sem F5.
- ❌ se precisa de refresh manual.

> Verificação adicional via SQL:
> ```sql
> SELECT pubname, schemaname, tablename
> FROM pg_publication_tables
> WHERE pubname = 'supabase_realtime' AND tablename = 'processing_jobs';
> ```
> Deve retornar exatamente 1 linha.

---

### Caso 10 — `.env.example` é fonte de verdade (valida Fase 3)

**Objetivo:** Garantir que `.env.example` está versionado, completo, e que `.env` nunca foi staged.

**Passos:**
1. Na pasta de teste (`/tmp/creator-os-smoke`):
   ```bash
   git diff .env.example
   git status
   ```

**Critério:**
- ✅ se `git diff .env.example` está vazio (não foi tocado durante o teste) e `git status` mostra `.env` como `untracked` (ou ausente da listagem porque está em `.gitignore`).
- ❌ se `.env.example` foi modificado ou se `.env` aparece como `staged` ou `modified`.

---

### Caso 11 — Documentação navegável (valida Fase 4)

**Objetivo:** Confirmar que a documentação está completa e navegável.

**Passos:**
1. Abrir `README.md` num viewer de Markdown (ex: GitHub web, VSCode preview).
2. Confirmar seções: pré-requisitos, setup numerado, custos estimados, comandos, troubleshooting, links para `LICENSE`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, `CHANGELOG.md`.
3. Abrir `ARCHITECTURE.md`. Confirmar seções: stack, modelo de dados, edge functions.
4. Abrir `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`. Confirmar que existem e são legíveis.
5. Clicar nos links internos no README para validar que apontam para arquivos existentes.

**Critério:**
- ✅ se toda a documentação renderiza, links funcionam, e o setup numerado é seguível por alguém de fora.
- ❌ se algum link quebrado, seção ausente ou setup ambíguo.

---

### Caso 12 — Build de produção

**Objetivo:** Garantir que `npm run build` na branch `oss-self-hosted` é limpo.

**Passos:**
1. Na pasta de teste:
   ```bash
   npm run build
   ```
2. Anexar log completo em `SMOKE_TEST_RESULTS.md`.

**Critério:**
- ✅ se build conclui com `built in <time>` e gera `dist/` válido. Avisos sobre `chunkSizeWarningLimit` são tolerados.
- ❌ se erro de TypeScript, erro de Vite, ou falha de bundling.

---

## Restrições de execução

- **Não modifique código** durante o smoke test. Se um caso falhar, registre como ❌ em `SMOKE_TEST_RESULTS.md` e abra issue/nota no `CHANGELOG.md` `Unreleased` para hotfix em fase pós-migração.
- Use perfis Instagram pequenos (poucos reels) para minimizar custo Apify (~$2.60 por 1.000 resultados).
- **Não exponha credenciais reais** em `SMOKE_TEST_RESULTS.md` — ofuscar tokens, IDs de Supabase project, emails de teste (use `***` ou hash parcial).
- Custo estimado total do smoke test: ~$1.00–3.00 (Apify + Whisper + Gemini + Claude para 1 perfil pequeno + 1 análise + 1 voice profile + 1 roteiro).

---

## Checklist final

Após executar todos os 12 casos:

- [ ] Todos os passos do Setup foram concluídos sem erro.
- [ ] Casos 1–12 marcados ✅ ou ❌ em `SMOKE_TEST_RESULTS.md`.
- [ ] Falhas (se houver) têm severidade + plano de hotfix registrados.
- [ ] Decisão final: pode mergear `oss-self-hosted` em `main` e taggear `v1.0.0`?

Comando sugerido para release (apenas se todos os casos passarem):
```bash
git checkout main
git merge --no-ff oss-self-hosted
git tag v1.0.0 -m "OSS self-hosted release"
git push origin main --tags
```
