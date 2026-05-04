# Smoke Test Results — creator-os

> Resultado da execução do roteiro definido em `migration/SMOKE_TEST.md`.
> Execução parcial: apenas o Caso 12 (build) foi executado nesta sessão pelo agente.
> Os demais casos exigem ambiente de teste live (Supabase project novo + secrets + dev server) e devem ser executados pelo usuário.

- **Branch:** `oss-self-hosted`
- **Commit base:** `c1a248e — migration(fase4): README + DX (LICENSE, CONTRIBUTING, CHANGELOG, ARCHITECTURE)`
- **Data da última atualização:** 2026-05-03
- **Executor:** parcial (agente Claude Code) + pendente (usuário)

---

## Sumário

| Caso | Descrição | Status | Observação |
|---|---|---|---|
| 1 | Branding via env var | ⏳ pendente | Requer dev server local + env `VITE_APP_NAME=Smoke Test`. |
| 2 | Signup primeiro user vira admin | ⏳ pendente | Requer Supabase project com migrations aplicadas. |
| 3 | Signup segundo user vira operator | ⏳ pendente | Depende do Caso 2. |
| 4 | RLS de `app_users` isola por user | ⏳ pendente | Depende dos Casos 2 e 3. |
| 5 | Adicionar perfil + scrape (Apify) | ⏳ pendente | Requer `APIFY_TOKEN` configurado nas Edge Functions. |
| 6 | Análise de reel (Whisper + Gemini + LLM) | ⏳ pendente | Requer `OPENAI_API_KEY` + `GEMINI_API_KEY` configurados. |
| 7 | Geração de Voice Profile | ⏳ pendente | Requer Caso 5 + 6 prévios. |
| 8 | Geração de roteiro | ⏳ pendente | Requer Caso 7 + `ANTHROPIC_API_KEY`. |
| 9 | Realtime de jobs | ⏳ pendente | Requer Caso 5+ ativo. |
| 10 | `.env.example` é fonte de verdade | ⏳ pendente | Requer execução em pasta de teste com `.env` preenchido. |
| 11 | Documentação navegável | ⏳ pendente | Pode ser executado offline pelo usuário. |
| 12 | Build de produção | ✅ executado | Build limpo na branch `oss-self-hosted`. Log abaixo. |

**Total:** 1 ✅ / 0 ❌ / 11 ⏳

---

## Detalhe por caso

### Caso 1 — Branding via env var (valida Fase 1)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 1 com dev server local rodando.
- **Resultado esperado:** card de login e `<title>` exibem `Smoke Test`.
- **Resultado observado:** _(preencher após execução)_

---

### Caso 2 — Signup do primeiro user vira admin (valida Fase 2)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 2 com Supabase project novo após `supabase db push`.
- **Resultado esperado:** `SELECT * FROM app_users` retorna 1 linha com `role = 'admin'`.
- **Resultado observado:** _(preencher após execução — incluir output da query SQL ofuscando user_id)_

---

### Caso 3 — Signup do segundo user vira operator (valida Fase 2)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 3 após Caso 2 ter passado.
- **Resultado esperado:** segunda linha em `app_users` tem `role = 'operator'`.
- **Resultado observado:** _(preencher)_

---

### Caso 4 — RLS de `app_users` impede operator de ver lista completa (valida Fase 2)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 4 com sessão de operator ativa.
- **Resultado esperado:** fetch retorna apenas 1 linha (a do próprio user).
- **Resultado observado:** _(preencher — não colar token de auth no relatório)_

---

### Caso 5 — Adicionar perfil de referência e fazer scrape (valida domínio nuclear)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 5 com `APIFY_TOKEN` configurado.
- **Resultado esperado:** lista de reels carrega com métricas reais.
- **Resultado observado:** _(preencher — anotar perfil testado de forma ofuscada, ex: `@user***` e quantidade de reels)_

---

### Caso 6 — Análise de um reel (valida pipeline Whisper + Gemini + LLM)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 6.
- **Resultado esperado:** todos os blocos de análise preenchidos (transcription, hook/dev/cta, transitions, broll, viral_patterns).
- **Resultado observado:** _(preencher)_

---

### Caso 7 — Geração de Voice Profile

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 7.
- **Resultado esperado:** Voice Profile gerado com todos os campos descritivos.
- **Resultado observado:** _(preencher)_

---

### Caso 8 — Geração de roteiro

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 8.
- **Resultado esperado:** script_teleprompter, script_annotated e editing_report preenchidos; teleprompter fullscreen funciona.
- **Resultado observado:** _(preencher)_

---

### Caso 9 — Realtime de jobs

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 9 + verificação SQL adicional.
- **Resultado esperado:** UI atualiza status do job sem refresh; query confirma `processing_jobs` em `supabase_realtime`.
- **Resultado observado:** _(preencher)_

---

### Caso 10 — `.env.example` é fonte de verdade (valida Fase 3)

- **Status:** ⏳ pendente
- **Como executar:** seguir passos do `SMOKE_TEST.md` Caso 10 na pasta de teste.
- **Resultado esperado:** `.env.example` sem diff; `.env` untracked ou ignorado.
- **Resultado observado:** _(preencher)_

---

### Caso 11 — Documentação navegável (valida Fase 4)

- **Status:** ⏳ pendente
- **Como executar:** abrir cada arquivo no viewer de Markdown e clicar nos links internos.
- **Resultado esperado:** README.md, ARCHITECTURE.md, CONTRIBUTING.md, CHANGELOG.md, LICENSE — todos presentes e linkados.
- **Resultado observado:** _(preencher)_

---

### Caso 12 — Build de produção ✅

- **Status:** ✅ executado nesta sessão
- **Comando:** `npm run build`
- **Resultado:** build limpo, `dist/` gerado em ~577ms.
- **Log resumido:**

```
> creator-os@0.0.0 build
> tsc -b && vite build

vite v8.0.3 building client environment for production...
✓ 2050 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                           0.47 kB │ gzip:   0.31 kB
dist/assets/geist-cyrillic-wght-normal-CHSlOQsW.woff2    14.69 kB
dist/assets/geist-latin-ext-wght-normal-DMtmJ5ZE.woff2   15.30 kB
dist/assets/geist-latin-wght-normal-Dm3htQBi.woff2       28.40 kB
dist/assets/index-2yO7M88q.css                           77.23 kB │ gzip:  13.51 kB
dist/assets/index-DvjfHiSb.js                           734.46 kB │ gzip: 214.40 kB

✓ built in 577ms
(!) Some chunks are larger than 500 kB after minification.
```

- **Observações:**
  - Zero erros de TypeScript (`tsc -b` passou).
  - Vite gerou bundle de 734.46 kB (gzip 214.40 kB). Aviso sobre `chunkSizeWarningLimit` é tolerado (toleráveis avisos não-bloqueantes do Rollup/Rolldown).
  - Sugestão de débito futuro: code-splitting via dynamic `import()` para reduzir o chunk principal. **Registrar em `CHANGELOG.md` Unreleased como melhoria opcional, não bloqueante para `v1.0.0`.**

---

## Débitos técnicos identificados

| # | Débito | Severidade | Ação sugerida |
|---|---|---|---|
| 1 | Bundle principal acima de 500 kB | Baixa | Code-splitting via dynamic `import()` em rotas pesadas (TeleprompterPage, AnalysisPage). Registrar em `CHANGELOG.md` Unreleased. |

---

## Decisão final

> **Bloqueada até execução completa pelo usuário.**

Após execução dos casos 1–11 pendentes:

- Se **todos passarem** ✅: pode mergear `oss-self-hosted` em `main` e taggear `v1.0.0`.
  ```bash
  git checkout main
  git merge --no-ff oss-self-hosted
  git tag v1.0.0 -m "OSS self-hosted release"
  git push origin main --tags
  ```
- Se **algum falhar** ❌: registrar severidade + plano de hotfix neste arquivo. Bloqueante para `v1.0.0` apenas se afetar fluxo nuclear (Casos 5, 6, 7, 8) ou roles (Casos 2, 3, 4). Falhas em Casos 1, 9, 10, 11 podem ser hotfix pós-merge.
