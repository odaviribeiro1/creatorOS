# FASE 5 — Smoke test manual end-to-end

> Migração SaaS → Open Source Self-Hosted | Projeto: creator-os
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 4 deve estar commitada.
> Esforço estimado: 60min. Risco: Médio.

---

## Prompt para Claude Code

Você está executando a **Fase 5** (última) da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md`, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`.
2. `git status --porcelain` — confirmar working directory limpo.
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase4): ...`.
4. `git log --oneline -10` — confirmar a sequência: fase0 → fase1 → fase2 → fase3 → fase4.
5. `view AUDIT_REPORT.md` — releia a seção 6 (sequência sugerida, item 6).
6. `view MIGRATION_PLAN.md` — releia a observação sobre Realtime e a observação sobre roles serem opcionais.

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

**Esta fase NÃO modifica código.** Ela escreve um roteiro de smoke test, executa a validação ponta-a-ponta numa instância nova (idealmente um Supabase project recém-criado, simulando a experiência de fork), e produz um `migration/SMOKE_TEST_RESULTS.md` registrando o resultado de cada caso. O objetivo é provar que o boilerplate funciona como anunciado para quem clona pela primeira vez.

Se o ambiente de teste limpo não estiver disponível na sessão (ex: o usuário não tem outro Supabase project para uso), Claude Code deve **escrever o roteiro completo** e pedir ao usuário para executá-lo manualmente, registrando os resultados depois. **Não pular** o roteiro escrito.

### Lista de mudanças concretas

#### Migrations SQL a criar
- Nenhuma.

#### Edge Functions a modificar
- Nenhuma.

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a modificar/criar
- Nenhum.

#### Tipos a atualizar
- Nenhum.

#### Outros artefatos a criar
- `migration/SMOKE_TEST.md` — roteiro detalhado, dividido em passos numerados.
- `migration/SMOKE_TEST_RESULTS.md` — relatório preenchido após execução. Estrutura: para cada passo do roteiro, marcar ✅/❌ + observações.

### Roteiro de smoke test (a escrever em `migration/SMOKE_TEST.md`)

#### Setup do ambiente de teste
1. Criar Supabase project novo (ou fazer reset num project existente dedicado a teste).
2. Clonar o repositório a partir da branch `oss-self-hosted` em uma pasta temporária.
3. `npm install`.
4. Copiar `.env.example` → `.env`.
5. Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do project novo.
6. Manter `VITE_APP_NAME=Smoke Test` (para validar Fase 1).
7. `supabase login` + `supabase link --project-ref <ref>`.
8. `supabase db push` — aplicar todas as migrations (incluindo `app_users` da Fase 2).
9. Configurar secrets no Supabase Dashboard: `SUPABASE_SERVICE_ROLE_KEY`, `APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` (se for testar Claude).
10. Deploy das 6 Edge Functions: `supabase functions deploy scrape-profiles analyze-content generate-script generate-voice-profile job-status scrape-reel-url`.
11. `npm run dev`.

#### Casos de teste

**Caso 1 — Branding via env var (valida Fase 1)**
- Abrir `http://localhost:5173/login`.
- Confirmar que o título do card e o `<title>` do browser exibem `Smoke Test`, não `Creator OS`.
- ✅ se exibe corretamente / ❌ se não.

**Caso 2 — Signup do primeiro user vira admin (valida Fase 2)**
- Criar conta nova com email descartável.
- Verificar email + confirmar.
- Login.
- No Supabase Dashboard → SQL Editor: `SELECT * FROM app_users;`
- Confirmar que existe 1 linha com `role = 'admin'`.
- ✅ se admin / ❌ se operator.

**Caso 3 — Signup do segundo user vira operator (valida Fase 2)**
- Logout. Criar segunda conta com outro email.
- Login com a segunda conta.
- No SQL Editor: `SELECT * FROM app_users ORDER BY created_at;`
- Confirmar que a segunda linha tem `role = 'operator'`.
- ✅ se operator / ❌ se admin.

**Caso 4 — RLS de `app_users` impede operator de ver lista completa (valida Fase 2)**
- Logado como operator, no app, em DevTools console rodar (substituir `<url>` e `<anon>`):
  ```js
  fetch('<url>/rest/v1/app_users?select=*', {
    headers: { apikey: '<anon>', Authorization: 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token }
  }).then(r => r.json()).then(console.log)
  ```
- Confirmar que retorna apenas a linha do próprio user (não as duas).
- ✅ se 1 linha / ❌ se 2 linhas.

**Caso 5 — Adicionar perfil de referência e fazer scrape (valida domínio nuclear)**
- Logado como admin, ir em Profiles → Adicionar perfil.
- Inserir um perfil público pequeno (poucos reels) para minimizar custo Apify.
- Aguardar job concluir (acompanhar via `processing_jobs`).
- Confirmar que aparecem reels com métricas em `Profiles → :id → reels`.
- ✅ se reels carregam / ❌ se erro.

**Caso 6 — Análise de um reel (valida pipeline Whisper + Gemini + LLM)**
- Selecionar 1 reel da lista. Disparar análise.
- Aguardar job concluir.
- Abrir `Analysis → :reelId`.
- Confirmar: transcrição, hook/development/cta, lista de transitions/broll/text_overlays, viral_patterns.
- ✅ se análise completa / ❌ se algum bloco vazio ou erro.

**Caso 7 — Geração de Voice Profile**
- Adicionar próprio perfil (`profile_type = 'own'`). Scrape.
- Selecionar 5+ reels. Disparar generate-voice-profile.
- Aguardar conclusão.
- Abrir VoiceProfile page. Confirmar full_profile_document, vocabulary_style, etc.
- ✅ / ❌.

**Caso 8 — Geração de roteiro**
- Em /scripts/new, escolher tema, voice profile, e referenciar reels analisados.
- Aguardar geração.
- Abrir ScriptDetail → conferir `script_teleprompter`, `script_annotated`, `editing_report`.
- Abrir Teleprompter mode → confirmar fullscreen + scroll.
- ✅ / ❌.

**Caso 9 — Realtime de jobs (valida que `processing_jobs` em supabase_realtime continua funcionando)**
- Disparar um scrape novo. Sem refresh manual da página, observar UI atualizar status do job.
- ✅ se atualiza sozinho / ❌ se precisa F5.

**Caso 10 — `.env.example` é fonte de verdade (valida Fase 3)**
- `git diff` em `.env.example` deve estar vazio (não foi tocado durante o teste).
- `git status` deve mostrar `.env` como untracked, nunca staged.
- ✅ / ❌.

**Caso 11 — Documentação navegável (valida Fase 4)**
- Abrir `README.md` num viewer Markdown. Confirmar setup numerado, custos, comandos, troubleshooting, links pra LICENSE/CONTRIBUTING/ARCHITECTURE renderizam.
- Abrir `ARCHITECTURE.md`. Confirmar que cobre stack, modelo de dados, edge functions.
- ✅ / ❌.

**Caso 12 — Build de produção**
- `npm run build` na pasta de teste. Anexar log.
- ✅ se build limpo / ❌ se erro.

### Ordem de execução recomendada

1. Criar `migration/SMOKE_TEST.md` com o roteiro completo acima.
2. Criar `migration/SMOKE_TEST_RESULTS.md` em branco (template para preencher).
3. Se a sessão tiver acesso ao ambiente de teste, executar os 12 casos e preencher resultados conforme avança.
4. Se não tiver acesso, escrever o roteiro e instruir o usuário a executar manualmente, retornando depois para preencher `SMOKE_TEST_RESULTS.md` em sessão futura.
5. Validação (gate abaixo).
6. Commit.

### Restrições

- **Não modifique código** nesta fase. Se um caso falhar e exigir hotfix, registrar como ❌ em `SMOKE_TEST_RESULTS.md` e abrir GitHub issue (ou nota no `CHANGELOG.md` `Unreleased`) para resolução em fase pós-migração.
- Não rode comandos que cobrem custo significativo (ex: scrape de perfil com 1.000 reels). Use perfis pequenos.
- Não exponha credenciais reais em `SMOKE_TEST_RESULTS.md` — ofuscar tokens, IDs de Supabase, emails de teste.
- Se você descobrir que precisa modificar código fora do escopo planejado, **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 5 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] `migration/SMOKE_TEST.md` existe com os 12 casos de teste numerados, cada um com passos e critério ✅/❌ explícito.
- [ ] `migration/SMOKE_TEST_RESULTS.md` existe com o resultado de cada caso (ou marcado como `⏳ pendente — usuário executará manualmente` se a sessão não tiver acesso).

#### 2. Build e tipos
- [ ] `npm run build` na branch `oss-self-hosted` executa sem erro (Caso 12). Anexar log.

#### 3. Testes visuais
- [ ] Caso 1 (branding) marcado em `SMOKE_TEST_RESULTS.md`.

#### 4. Testes responsivos
- [ ] Não se aplica.

#### 5. Testes de integração
- [ ] Casos 5, 6, 7, 8, 9 (domínio nuclear + Realtime) marcados em `SMOKE_TEST_RESULTS.md`. Se qualquer um falhou, há ação registrada (commit de hotfix em fase futura, ou ressalva no `CHANGELOG.md`).
- [ ] Casos 2, 3, 4 (roles) marcados — confirmando que trigger funciona e RLS isola corretamente.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima.
- Resumo dos 12 casos: quantos passaram, quais falharam, severidade e plano para cada falha.
- Lista final de débitos técnicos abertos (se houver), referenciados em `CHANGELOG.md` Unreleased.
- Recomendação ao usuário: pode mergear `oss-self-hosted` em `main`? Se sim, comando sugerido: `git checkout main && git merge --no-ff oss-self-hosted && git tag v1.0.0 -m "OSS self-hosted release"`. Se não, listar o que falta.

### Commit final

Quando o gate passar, fazer commit:

```bash
git add migration/SMOKE_TEST.md migration/SMOKE_TEST_RESULTS.md
git commit -m "migration(fase5): smoke test end-to-end com 12 casos

Mudanças principais:
- migration/SMOKE_TEST.md com roteiro de 12 casos (branding, roles, domínio, realtime, docs, build)
- migration/SMOKE_TEST_RESULTS.md com resultado de cada caso

Refs: MIGRATION_PLAN.md fase 5"
```

Reporte ao usuário a conclusão da migração inteira. Liste:
- Resumo das 5 fases concluídas.
- Resultado do smoke test.
- Próximo passo sugerido: revisar todo o histórico em `oss-self-hosted` (`git log --oneline v0-saas-final..HEAD`), mergear em `main` quando aprovado, criar tag `v1.0.0`, criar release no GitHub.
