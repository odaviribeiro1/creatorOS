# FASE 4 — README + DX (LICENSE, CONTRIBUTING, CHANGELOG, ARCHITECTURE)

> Migração SaaS → Open Source Self-Hosted | Projeto: creator-os
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 3 deve estar commitada.
> Esforço estimado: 60–90min. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 4** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md`, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`.
2. `git status --porcelain` — confirmar working directory limpo.
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase3): ...`.
4. `view AUDIT_REPORT.md` — releia a seção 5 (Qualidade — README com nota 1) e seção 6 (sequência sugerida, item 1).
5. `view MIGRATION_PLAN.md` — releia o escopo desta fase e a observação sobre preservar o conteúdo de `.claude/CLAUDE.md`.
6. `view README.md` — confirme que ainda é o boilerplate genérico do Vite.
7. `view .claude/CLAUDE.md` — fonte de verdade para arquitetura, modelo de dados, APIs externas e custos. Esta fase derivará conteúdo dele.

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

Substituir o `README.md` boilerplate por documentação completa de self-host: o que é o projeto, stack, pré-requisitos, passo-a-passo de setup (clone → `.env` → migrations → deploy de Edge Functions → frontend Vercel), arquitetura resumida, custos estimados por análise, troubleshooting comum. Adicionar `LICENSE` (MIT), `CONTRIBUTING.md` (guia mínimo de contribuição), `CHANGELOG.md` (registrando v0 → v1 da migração), e `ARCHITECTURE.md` (derivado do `.claude/CLAUDE.md` — seções de stack, modelo de dados, APIs externas, fluxo).

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

#### Outros artefatos a criar/modificar

**1. `README.md` (sobrescrever)** — estrutura mínima:
- **Header** com nome do projeto (`Creator OS`), 1 linha de tagline, badges opcionais (license, stack).
- **O que é** (3-5 frases): ferramenta de análise de Reels do Instagram + geração de roteiros, self-hosted em Supabase + Vercel.
- **Stack**: React 19, Vite 8, TypeScript 5.9, Tailwind 4, shadcn/ui, Supabase, Edge Functions Deno.
- **Pré-requisitos**:
  - Conta Supabase (free tier serve para dev)
  - Conta Vercel (free tier serve)
  - Conta Apify, OpenAI, Google AI Studio (Gemini), e opcional Anthropic
  - Node 20+, pnpm/npm, Supabase CLI
- **Setup** (passos numerados):
  1. `git clone` + `cd`
  2. `npm install`
  3. Copiar `.env.example` → `.env` e preencher `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_NAME`.
  4. `supabase login` + `supabase link --project-ref <ref>`
  5. `supabase db push` para aplicar migrations.
  6. Configurar Edge Function secrets no Supabase Dashboard (lista do `.env.example`).
  7. `supabase functions deploy scrape-profiles analyze-content generate-script generate-voice-profile job-status scrape-reel-url` (ou um por um).
  8. `npm run dev` para testar local.
  9. Deploy frontend: `vercel --prod` (linkar projeto).
- **Primeiro user vira admin** — explicar que o trigger `on_auth_user_created` cuida disso. Para promover manualmente: `UPDATE app_users SET role = 'admin' WHERE user_id = '<uuid>';`.
- **Custos estimados** (derivar de `.claude/CLAUDE.md` seção 10): ~$0.40–0.80 por Reel analisado (Whisper + Gemini + Claude). Apify ~$2.60 / 1.000 resultados.
- **Comandos úteis**: `npm run dev`, `npm run build`, `supabase db push`, `supabase functions deploy <nome>`, `supabase functions logs <nome> --follow`.
- **Troubleshooting**: Edge Function timeout (jobs longos), Apify URL expira em 3 dias (download imediato), Whisper limite 25MB (compressão ffmpeg), CORS no Supabase (configurar domínio Vercel).
- **Licença**: MIT, ver `LICENSE`.
- **Architecture deep-dive**: link para `ARCHITECTURE.md`.
- **Contribuindo**: link para `CONTRIBUTING.md`.

**2. `LICENSE` (criar)** — texto completo da licença MIT, ano `2026`, holder `Creator OS Contributors` (ou em branco para o fork preencher; recomendação: `Creator OS Contributors`).

**3. `CONTRIBUTING.md` (criar)** — guia mínimo:
- Como reportar bug (GitHub Issues).
- Convenção de commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:` (em pt-BR ou en, escolher um).
- Branch model: `main` é prod, feature branches `feat/<nome>`.
- Como rodar local antes de PR.
- Style guide: TypeScript strict, sem `any`, Tailwind utility-first, shadcn/ui como base.
- Edge Functions: tratamento de erro consistente, logs estruturados em JSON, retry/backoff.

**4. `CHANGELOG.md` (criar)** — formato Keep a Changelog:
- `## [Unreleased]` (ou `## [1.0.0] — 2026-05-02`)
  - **Added**: Branding via `VITE_APP_NAME`. Roles `admin`/`operator` com trigger primeiro-user-vira-admin. `.env.example` completo com seções frontend/Edge Functions. `README.md`, `LICENSE`, `CONTRIBUTING.md`, `ARCHITECTURE.md`.
  - **Changed**: README boilerplate Vite substituído por documentação completa de self-host.
  - **Removed**: nenhuma feature de domínio removida.
- `## [0.1.0-saas] — 2026-04-XX` (estado pré-migração marcado pela tag `v0-saas-final`)
  - Releases iniciais de Creator OS como projeto interno. Sem changelog formal anterior.

**5. `ARCHITECTURE.md` (criar)** — derivado de `.claude/CLAUDE.md`. Não copiar literalmente; sumarizar e adaptar para tom de docs públicas:
- **Visão geral do sistema** (1.1 do CLAUDE.md adaptado)
- **Diagrama de fluxo** (copiar o ASCII art da seção 2.2 de CLAUDE.md ou regenerar)
- **Modelo de dados** (seção 3 de CLAUDE.md, em formato resumido — listar tabelas e relações; SQL completo fica nas migrations)
- **APIs externas** (Apify, Whisper, Gemini, Claude — propósito de cada uma)
- **Edge Functions** (lista das 6 e o que cada uma faz)
- **Padrão async de jobs** (seção 6.2 de CLAUDE.md)
- **Estrutura do frontend** (seção 5 de CLAUDE.md, resumida)
- **Decisões técnicas e limitações** (seção 10 de CLAUDE.md)

**6. `.claude/CLAUDE.md` (manter)** — não deletar. Continua sendo a fonte de verdade técnica para quem desenvolve com Claude Code. `ARCHITECTURE.md` é o equivalente público derivado dele.

**7. `dist/` (limpar localmente, não comitar)** — confirmar via `git ls-files dist/` que `dist/` não está versionado. Se estiver, remover do tracking sem deletar o conteúdo local: `git rm -r --cached dist`. Garantir que `dist` permanece no `.gitignore`.

### Ordem de execução recomendada

1. `view .claude/CLAUDE.md` para identificar trechos a derivar.
2. Criar `ARCHITECTURE.md` derivado do CLAUDE.md.
3. Criar `LICENSE` (MIT 2026).
4. Criar `CONTRIBUTING.md`.
5. Criar `CHANGELOG.md`.
6. Sobrescrever `README.md` com a estrutura completa.
7. Verificar `dist/` no tracking via `git ls-files dist/` e limpar se necessário.
8. Rodar `npm run build` apenas para confirmar que nada quebrou (não há mudança de código).
9. Validação (gate abaixo).
10. Commit.

### Restrições

- Não toque em código TypeScript ou em SQL nesta fase.
- Não rode `supabase db push` ou `supabase functions deploy`.
- Não rode `npm install`.
- Não delete `.claude/CLAUDE.md`.
- **Preservar idioma pt-BR** em toda documentação gerada (READMEs e arquivos `.md`).
- Não invente comandos ou env vars que não existem — sempre cruzar com `.env.example` (Fase 3) e com os scripts em `package.json`.
- Se você descobrir que precisa modificar algo fora do escopo planejado, **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 4 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] `README.md` existe com seções: O que é / Stack / Pré-requisitos / Setup numerado / Primeiro user vira admin / Custos / Comandos úteis / Troubleshooting / License / Architecture link / Contributing link.
- [ ] Setup do README cita exatamente as 7 variáveis do `.env.example` (Fase 3).
- [ ] `LICENSE` existe com texto MIT correto e ano `2026`.
- [ ] `CONTRIBUTING.md` existe com convenções de commit, branch model, style guide.
- [ ] `CHANGELOG.md` existe em formato Keep a Changelog com entrada para `1.0.0` (ou `Unreleased`).
- [ ] `ARCHITECTURE.md` existe e cobre: visão geral, fluxo, modelo de dados (resumo), APIs externas, Edge Functions, padrão async, estrutura do frontend, limitações.
- [ ] `.claude/CLAUDE.md` continua intacto e não foi modificado nesta fase.
- [ ] `git ls-files dist/` retorna vazio (ou foi limpo via `git rm --cached`).

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar log (apenas confirmação que não quebrou).

#### 3. Testes visuais
- [ ] Não se aplica.

#### 4. Testes responsivos
- [ ] Não se aplica.

#### 5. Testes de integração documental
- [ ] Comandos no README batem com scripts do `package.json` (`dev`, `build`, `lint`, `preview`).
- [ ] Lista de Edge Functions no README/ARCHITECTURE bate com diretórios em `supabase/functions/` (`scrape-profiles`, `scrape-reel-url`, `analyze-content`, `generate-voice-profile`, `generate-script`, `job-status`).
- [ ] Lista de tabelas em ARCHITECTURE bate com migrations: `profiles`, `reels`, `transcriptions`, `content_analyses`, `voice_profiles`, `scripts`, `script_versions`, `processing_jobs`, e (após Fase 2) `app_users`.
- [ ] Variáveis citadas no README batem com `.env.example`.
- [ ] Snippet SQL de promover admin (`UPDATE app_users SET role = 'admin' WHERE user_id = '<uuid>';`) está no README.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima.
- Evidência objetiva: estrutura final dos arquivos criados (cabeçalhos H1/H2), nomes dos arquivos novos, log do build.
- Cruzamento explícito: tabela `Edge Functions citadas no README ⇄ diretórios reais`, tabela `vars no README ⇄ vars no .env.example`. Discrepâncias precisam ser corrigidas antes do commit.

### Commit final

Quando o gate passar, fazer commit:

```bash
git add -A
git commit -m "migration(fase4): README + DX (LICENSE, CONTRIBUTING, CHANGELOG, ARCHITECTURE)

Mudanças principais:
- README.md substitui boilerplate Vite por guia completo de self-host
- LICENSE (MIT 2026), CONTRIBUTING.md, CHANGELOG.md, ARCHITECTURE.md criados
- ARCHITECTURE.md derivado de .claude/CLAUDE.md (sem deletar a fonte)
- README documenta setup, custos, comandos, troubleshooting

Refs: MIGRATION_PLAN.md fase 4"
```

Reporte ao usuário a conclusão e instrua: a próxima fase é `migration/FASE-5.prompt.md` (Smoke test manual end-to-end). É a última do plano.
