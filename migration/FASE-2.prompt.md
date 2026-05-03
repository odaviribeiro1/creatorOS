# FASE 2 — Roles consolidados (`admin` + `operator`) com trigger "primeiro user vira admin"

> Migração SaaS → Open Source Self-Hosted | Projeto: creator-os
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 1 deve estar commitada.
> Esforço estimado: 45–60min. Risco: Médio.

---

## Prompt para Claude Code

Você está executando a **Fase 2** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md` na raiz do repositório, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`.
2. `git status --porcelain` — confirmar working directory limpo.
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase1): ...`.
4. `view AUDIT_REPORT.md` — releia a seção 2.G (Roles existentes) e seção 6 (sequência sugerida, item 4).
5. `view MIGRATION_PLAN.md` — releia o escopo desta fase e a observação específica sobre roles serem opcionais.
6. `view supabase/migrations/20260403000000_initial_schema.sql` — entenda RLS atual (`auth.uid() = user_id` em todas as tabelas).

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

O projeto não tem sistema de roles hoje — todo usuário autenticado tem o mesmo nível de acesso aos próprios dados via RLS. Esta fase introduz **dois roles**: `admin` (gestor) e `operator` (operacional, ex.: editor de vídeo, assistente do criador). O **primeiro usuário cadastrado vira `admin` automaticamente** via trigger `on_auth_user_created`; usuários subsequentes recebem `operator` por padrão. O `admin` pode promover/rebaixar outros usuários; o `operator` apenas opera o produto.

**Como roles afetam RLS:** o modelo per-user atual (`auth.uid() = user_id`) é mantido para tabelas de domínio — cada usuário continua vendo apenas seus próprios profiles, reels, scripts etc. A diferenciação `admin` vs `operator` é usada exclusivamente para gerenciar a tabela nova `app_users` (apenas admin lista/altera/remove outros users) e para rotas administrativas futuras. Isso preserva o escopo per-user existente sem regressão.

### Lista de mudanças concretas (geradas a partir do `AUDIT_REPORT.md`)

#### Migrations SQL a criar
- `supabase/migrations/20260502000000_app_users_and_roles.sql` — cria:
  - Tabela `app_users` com colunas: `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`, `role TEXT NOT NULL CHECK (role IN ('admin', 'operator')) DEFAULT 'operator'`, `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`.
  - Função SQL `is_admin()` `SECURITY DEFINER STABLE` que retorna `boolean` indicando se `auth.uid()` pertence a `app_users` com `role = 'admin'`.
  - Trigger `on_auth_user_created` em `auth.users` (`AFTER INSERT FOR EACH ROW`) que executa função `handle_new_user()`: se `(SELECT count(*) FROM public.app_users) = 0` insere o user novo como `'admin'`, senão como `'operator'`.
  - RLS habilitada em `app_users`:
    - Policy SELECT: usuário pode ver a própria linha (`user_id = auth.uid()`); admin pode ver todas (`is_admin()`).
    - Policy UPDATE: apenas admin (`is_admin()`).
    - Policy INSERT: bloqueada via RLS (apenas trigger/service role insere).
    - Policy DELETE: apenas admin, e admin não pode deletar a si mesmo (proteção contra lock-out: `is_admin() AND user_id <> auth.uid()`).
  - Índice `idx_app_users_role` em `app_users(role)`.
  - Backfill: para cada `auth.users` existente sem linha em `app_users`, inserir como `'operator'`. Como pode haver users criados antes da feature, o "primeiro vira admin" só vale a partir desta migration. Usuário-fork com base já populada deve promover manualmente o admin via SQL — documentar isso em `README` na Fase 4.

> Nota crítica sobre `auth.users` e `SECURITY DEFINER`: triggers em `auth.users` exigem `SECURITY DEFINER` e privilégios de superuser. Se o ambiente Supabase do fork não permitir, oferecer fallback: chamar `app_users` insert manualmente após signup via Edge Function. Documentar essa alternativa como comentário na própria migration.

#### Edge Functions a modificar
- Nenhuma estritamente obrigatória. As 6 Edge Functions atuais usam `user_id` como argumento e fazem isolamento per-user via RLS — não precisam saber sobre roles para esta fase. Roles afetam apenas o frontend (telas administrativas futuras) e a tabela `app_users`.

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a criar
- `src/types/auth.ts` — exporta `export type AppRole = 'admin' | 'operator'` e `export type AppUser = { user_id: string; role: AppRole; created_at: string; updated_at: string }`.
- `src/hooks/useAppUser.ts` — hook que carrega a linha de `app_users` do user atual e expõe `{ appUser, isAdmin, loading, error }`. Usa `supabase.from('app_users').select().eq('user_id', userId).single()`.

#### Arquivos TypeScript a modificar
- `src/store/index.ts` — adicionar campo `appUser: AppUser | null` e setter `setAppUser`. Mantém o estado de role acessível globalmente sem refetch.
- `src/components/auth/AuthProvider.tsx` — após resolver `session`, fazer fetch da linha de `app_users` e popular `setAppUser` no store. Em logout, limpar `appUser`.
- `src/pages/SettingsPage.tsx` — adicionar uma seção condicional `{isAdmin && <UsersAdminPanel />}` (apenas como placeholder com texto "Gerenciamento de usuários — disponível em fork futuro" se for poupar trabalho nesta fase, ou implementar listagem real se houver tempo). **Recomendação:** placeholder textual na Fase 2; implementação completa fica como melhoria futura, fora do plano.

#### Arquivos TypeScript a deletar
- Nenhum.

#### Tipos a atualizar
- `src/types/index.ts` — re-exportar `AppRole` e `AppUser` de `./auth` para conveniência (ou deixar import direto de `@/types/auth`; manter consistência com o que já existe).

#### Outros artefatos
- Adicionar comentário em `README.md` (a ser editado de fato na Fase 4) sobre como promover manualmente um user a admin via SQL: `UPDATE app_users SET role = 'admin' WHERE user_id = '<uuid>';`. Por agora, registrar esse snippet como TODO no final do `MIGRATION_PLAN.md` ou em comentário inline na migration.

### Ordem de execução recomendada

1. Criar a migration SQL `supabase/migrations/20260502000000_app_users_and_roles.sql`.
2. Validar a sintaxe SQL relendo a migration completa antes de avançar (não rodar `db push`).
3. Criar `src/types/auth.ts`.
4. Criar `src/hooks/useAppUser.ts`.
5. Atualizar `src/store/index.ts` com campo e setter.
6. Atualizar `src/components/auth/AuthProvider.tsx` para popular `appUser` no boot e em mudanças de auth.
7. Atualizar `src/pages/SettingsPage.tsx` com seção condicional (placeholder).
8. Rodar `npm run build` para confirmar que TS compila.
9. Validação (gate abaixo).
10. Commit.

### Restrições

- Não toque em arquivos fora do escopo desta fase.
- **Não rode `supabase db push` ou `supabase functions deploy`** — apenas crie o arquivo SQL. O usuário aplica num momento controlado, com backup feito.
- Não rode `npm install`.
- Não modifique RLS de tabelas de domínio (`profiles`, `reels`, `scripts` etc.) — o modelo per-user é preservado.
- Não delete nada.
- Não tente implementar UI completa de gerenciamento de users (listagem, promote/demote, delete) — fica como placeholder. Uma fase futura fora do plano pode implementar.
- Se você descobrir que precisa modificar algo fora do escopo planejado (ex: alguma Edge Function precisa checar `is_admin()`), **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 2 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] Migration `supabase/migrations/20260502000000_app_users_and_roles.sql` existe e contém: tabela `app_users`, função `is_admin()`, função `handle_new_user()`, trigger `on_auth_user_created`, 4 RLS policies (SELECT, INSERT, UPDATE, DELETE), índice `idx_app_users_role`, backfill de users existentes.
- [ ] Migration está envelopada em `BEGIN;` / `COMMIT;` (idempotência via `IF NOT EXISTS` onde aplicável).
- [ ] `src/types/auth.ts` exporta `AppRole` e `AppUser`.
- [ ] `src/hooks/useAppUser.ts` retorna `{ appUser, isAdmin, loading, error }` e usa `useAppStore` para evitar refetch.
- [ ] `src/store/index.ts` tem `appUser` e `setAppUser`.
- [ ] `src/components/auth/AuthProvider.tsx` chama `setAppUser` em mudanças de auth e em logout limpa para `null`.
- [ ] `src/pages/SettingsPage.tsx` tem seção condicional baseada em `isAdmin`.

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar log.
- [ ] Não há erros de TypeScript em arquivos modificados.

#### 3. Testes visuais (apenas se houve mudança de UI)
- [ ] Background `#0A0A0F` aplicado.
- [ ] Cards: blur 40px, borda `rgba(59, 130, 246, 0.25)`, glow inset top.
- [ ] Blues batem: `#3B82F6` / `#60A5FA` / `#1E3A8A` / `#2563EB`.
- [ ] Botões primários: gradient 135° `#1E3A8A` → `#3B82F6`.
- [ ] Tipografia Inter/Geist; texto `#F8FAFC` / `#94A3B8` / `#CBD5E1`.
- [ ] Hover blue glow 30–60px, transição 0.4s `cubic-bezier`.
- [ ] Seção condicional em `SettingsPage` só aparece quando `isAdmin = true` (testar com user sintético; se não for prático, validar via review do código).

#### 4. Testes responsivos
- [ ] 375px / 768px / 1280px verificados na `SettingsPage` sem regressão.

#### 5. Testes de integração
- [ ] Conexão Supabase preservada — queries de domínio continuam funcionando.
- [ ] **Validação SQL manual (não automática):** após aplicar a migration num ambiente de teste, signup de novo user com tabela `auth.users` vazia deve resultar em linha `app_users` com `role = 'admin'`. Segundo signup deve resultar em `'operator'`. *(Esta validação roda na Fase 5 — Smoke test. Por ora, apenas garantir que a migration está sintaticamente correta.)*
- [ ] Realtime publication em `processing_jobs` continua válida (a migration desta fase não altera a tabela).

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima (não agrupar como "tudo ok").
- Evidência objetiva: trechos de código antes/depois, IDs de arquivos modificados, log do build, conteúdo da migration.
- Bugs/regressões encontrados e como foram resolvidos — ou registrados como débito técnico explícito com justificativa.
- Anote explicitamente: "A migration NÃO foi aplicada ao banco. Aplicar no momento controlado pelo usuário com `supabase db push` (após backup)."

### Commit final

Quando o gate passar, fazer commit:

```bash
git add -A
git commit -m "migration(fase2): roles admin/operator com trigger primeiro-user-vira-admin

Mudanças principais:
- migration 20260502000000_app_users_and_roles.sql cria app_users + RLS + trigger
- is_admin() helper SQL SECURITY DEFINER
- src/types/auth.ts, src/hooks/useAppUser.ts criados
- AuthProvider popula appUser no store após login
- SettingsPage com seção condicional para admins (placeholder)

Refs: MIGRATION_PLAN.md fase 2"
```

Reporte ao usuário a conclusão e instrua: a próxima fase é `migration/FASE-3.prompt.md` (`.env.example` completo).
