# FASE 3 — `.env.example` completo e documentação de secrets

> Migração SaaS → Open Source Self-Hosted | Projeto: creator-os
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 2 deve estar commitada.
> Esforço estimado: 15–20min. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 3** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md`, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`.
2. `git status --porcelain` — confirmar working directory limpo (apenas `.env` untracked é tolerável).
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase2): ...`.
4. `view AUDIT_REPORT.md` — releia a seção 6 (sequência sugerida, item 5).
5. `view MIGRATION_PLAN.md` — releia o escopo desta fase.
6. `view .env.example` — entenda o estado atual.
7. `view .gitignore` — confirme o que já está ignorado.

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

O `.env.example` atual lista apenas as variáveis de frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e mantém as secrets de Edge Functions como comentários soltos. Para um boilerplate self-hosted, o exemplo precisa ser **a fonte de verdade explícita** de todas as variáveis necessárias para rodar o projeto, separadas por contexto (frontend vs Edge Functions) e com instruções claras de onde colá-las (`.env` local vs Supabase Dashboard → Edge Functions → Secrets). Esta fase também garante que `.env` está no `.gitignore` para impedir commit acidental de credenciais.

### Lista de mudanças concretas (geradas a partir do `AUDIT_REPORT.md`)

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

#### Outros artefatos
- `.env.example` — reescrever completamente seguindo o template abaixo:
  ```
  # =====================================================================
  # FRONTEND (Vite) — variáveis prefixadas com VITE_ são embutidas no build
  # =====================================================================

  # Supabase: copie do Project Settings → API
  VITE_SUPABASE_URL=https://xxxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJxxxxx

  # Nome da marca exibido na UI (login, sidebar, dashboard, title do browser).
  # Default: 'Creator OS'. Mude aqui se você fez fork e quer rebrandar.
  VITE_APP_NAME=Creator OS

  # =====================================================================
  # EDGE FUNCTIONS (Supabase) — NUNCA colocar no .env do frontend!
  # Cole estas em Supabase Dashboard → Settings → Edge Functions → Secrets.
  # =====================================================================

  # Supabase service role key (gera no Project Settings → API → service_role).
  # Usada pelas Edge Functions para escrever em tabelas com RLS habilitado.
  # SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

  # Apify (https://apify.com/) — para scraping de Reels/perfis Instagram.
  # APIFY_TOKEN=apify_api_xxxxx

  # OpenAI — usado para Whisper (transcrição) e GPT (análise/geração).
  # OPENAI_API_KEY=sk-xxxxx

  # Google Gemini (https://ai.google.dev/) — análise visual de vídeo.
  # GEMINI_API_KEY=AIzaSyxxxxx

  # Anthropic Claude — geração de roteiros e voice profile.
  # Opcional se você usar apenas modelos OpenAI/Gemini via SettingsPage.
  # ANTHROPIC_API_KEY=sk-ant-xxxxx
  ```
- `.gitignore` — adicionar entrada `.env` e `.env.local` no topo do arquivo (em uma seção própria comentada `# Local environment files`), garantindo que credenciais nunca vão pro git. Confirmar antes via `view` que ainda não está lá.
- **Não criar `.env`.** O arquivo `.env` real é responsabilidade de quem clona; sempre copiar de `.env.example`.

### Ordem de execução recomendada

1. `view .env.example` para registrar o estado atual no relatório.
2. Reescrever `.env.example` com o template acima.
3. `view .gitignore` para checar se `.env` já está listado.
4. Se não estiver, adicionar bloco `# Local environment files\n.env\n.env.local` no topo do `.gitignore`.
5. `git status --porcelain` — confirmar que `.env` continua untracked e não vai ser comitado.
6. Validação (gate abaixo).
7. Commit.

### Restrições

- **Nunca adicionar `.env` ao git.** Se o `git status` mostrar `.env` como modified/staged, abortar e investigar.
- Não rode `supabase db push` ou `supabase functions deploy`.
- Não rode `npm install`.
- Não modifique código de domínio.
- Não exclua nada.
- Se você descobrir que precisa modificar algo fora do escopo planejado, **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 3 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] `.env.example` contém todas as 7 variáveis listadas no template, em duas seções (frontend / Edge Functions).
- [ ] `.env.example` tem comentários explicando origem de cada credencial (Supabase Project Settings, Apify, OpenAI, Gemini, Anthropic).
- [ ] `.gitignore` contém `.env` em uma linha própria (case-sensitive, sem espaços).
- [ ] `git check-ignore .env` retorna `.env` (confirma que está ignorado).
- [ ] `git status --porcelain` **não** mostra `.env` como tracked/staged.
- [ ] `VITE_APP_NAME` aparece no `.env.example` e bate com o uso introduzido na Fase 1 (`src/lib/brand.ts`).

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro (apenas para garantir que nada quebrou). Anexar log.

#### 3. Testes visuais
- [ ] Não se aplica.

#### 4. Testes responsivos
- [ ] Não se aplica.

#### 5. Testes de integração
- [ ] Cada secret no `.env.example` referencia um nome de variável que **bate exatamente** com o que as Edge Functions consomem via `Deno.env.get(...)`. Verificar via `grep -rn "Deno.env.get" supabase/functions/` e cruzar com o `.env.example`.
- [ ] `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY` aparecem em `src/lib/supabase.ts` ou `src/lib/api.ts` — confirmar que os nomes batem.
- [ ] `import.meta.env.VITE_APP_NAME` é consumido em `src/lib/brand.ts` — confirmar consistência.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima.
- Evidência objetiva: diff do `.env.example` (antes/depois), diff do `.gitignore`, output de `git check-ignore .env`.
- Lista de variáveis encontradas via `grep "Deno.env.get"` cruzada com o `.env.example`. Discrepâncias precisam ser resolvidas antes do commit.

### Commit final

Quando o gate passar, fazer commit:

```bash
git add .env.example .gitignore
git commit -m "migration(fase3): .env.example completo e .gitignore protege .env

Mudanças principais:
- .env.example documenta as 7 variáveis em 2 seções (frontend / Edge Functions)
- Comentários indicam origem e onde colar cada credencial
- .gitignore garante que .env nunca seja comitado

Refs: MIGRATION_PLAN.md fase 3"
```

> Atenção: usar `git add .env.example .gitignore` (e não `git add -A`) para garantir que `.env` real não entra no commit por engano.

Reporte ao usuário a conclusão e instrua: a próxima fase é `migration/FASE-4.prompt.md` (Documentação final + DX).
