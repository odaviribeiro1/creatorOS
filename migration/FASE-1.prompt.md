# FASE 1 — Branding como constante / env var

> Migração SaaS → Open Source Self-Hosted | Projeto: creator-os
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 0 deve estar commitada.
> Esforço estimado: 15–30min. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 1** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md` na raiz do repositório, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`.
2. `git status --porcelain` — confirmar working directory limpo (apenas `.env` untracked é tolerável; nada mais).
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase0): branch oss-self-hosted criada e plano de migração gerado` (ou equivalente).
4. `view AUDIT_REPORT.md` — releia a seção 2.C (white-label / branding) e seção 6 (sequência sugerida, item 2).
5. `view MIGRATION_PLAN.md` — releia o escopo desta fase.

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

Extrair o literal `"Creator OS"` (hardcoded em 5 arquivos) para uma única fonte de verdade configurável via env var `VITE_APP_NAME`. Manter `"Creator OS"` como default para que forks que não configurem nada continuem funcionando. Isto é exclusivamente cosmético — não toca DB, não toca Edge Functions, não muda comportamento. Visa facilitar que quem dá fork rebrande o app trocando uma única env var.

### Lista de mudanças concretas (geradas a partir do `AUDIT_REPORT.md`)

#### Migrations SQL a criar
- Nenhuma.

#### Edge Functions a modificar
- Nenhuma.

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a criar
- `src/lib/brand.ts` — exporta a constante `APP_NAME` lida de `import.meta.env.VITE_APP_NAME` com fallback `'Creator OS'`. Single source of truth para o nome da marca exibido na UI.

#### Arquivos TypeScript a modificar
- `src/components/auth/LoginPage.tsx` linha 78 — substituir o literal `Creator OS` dentro de `<CardTitle>` por `{APP_NAME}` (importar de `@/lib/brand`).
- `src/components/layout/MainLayout.tsx` linha 25 — substituir `return 'Creator OS'` por `return APP_NAME` (importar de `@/lib/brand`).
- `src/components/layout/Sidebar.tsx` linha 53 — substituir o literal `Creator OS` pelo `{APP_NAME}` (importar de `@/lib/brand`).
- `src/pages/DashboardPage.tsx` linha 95 — substituir `Bem-vindo ao Creator OS` por <code>{`Bem-vindo ao ${APP_NAME}`}</code> (importar de `@/lib/brand`).
- `index.html` linha 7 — substituir `<title>Creator OS</title>` por `<title>%VITE_APP_NAME%</title>`. Se Vite não fizer interpolação automática (na versão 8 não faz), manter `Creator OS` como default e adicionar atualização programática em `src/main.tsx` via `document.title = APP_NAME` no startup.
- `src/main.tsx` — adicionar `document.title = APP_NAME` após o render (importar de `@/lib/brand`). Garante que o title do browser respeita a env var.

#### Arquivos TypeScript a deletar
- Nenhum.

#### Tipos a atualizar
- `src/types/index.ts` linha 2 (comentário `// Database Types — Creator OS`) — opcional. Pode-se manter o nome literal no comentário (não é exibido em runtime). Recomendação: deixar como está.

#### Outros artefatos
- `.env.example` — adicionar entrada `VITE_APP_NAME=Creator OS` com comentário explicando que é o nome exibido na UI e que pode ser sobrescrito pelo fork.
- `package.json` linha 2 (`"name": "creator-os"`) — **não modificar** nesta fase. O nome do package npm é independente do brand exibido. Quem fizer fork pode renomear depois.

### Ordem de execução recomendada

1. Criar `src/lib/brand.ts` com a constante `APP_NAME`.
2. Atualizar `src/components/auth/LoginPage.tsx`.
3. Atualizar `src/components/layout/MainLayout.tsx`.
4. Atualizar `src/components/layout/Sidebar.tsx`.
5. Atualizar `src/pages/DashboardPage.tsx`.
6. Atualizar `src/main.tsx` para setar `document.title`.
7. Atualizar `.env.example` com a nova entrada `VITE_APP_NAME`.
8. Rodar `npm run build` para confirmar que o TypeScript não quebrou.
9. Validação (gate abaixo).
10. Commit.

### Restrições

- Não toque em arquivos fora do escopo desta fase.
- Não rode `supabase db push` ou `supabase functions deploy` — não há mudança de backend nesta fase.
- Não rode `npm install` — nenhuma dependência nova.
- Não exclua nada que esteja fora da lista de "Arquivos a deletar" acima (que está vazia).
- Não renomeie o package npm em `package.json` nesta fase.
- Se você descobrir que precisa modificar algo fora do escopo planejado, **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A fase 1 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] `src/lib/brand.ts` existe e exporta `APP_NAME` com fallback `'Creator OS'`.
- [ ] `grep -rn "Creator OS" src/ index.html` não retorna nenhuma ocorrência em código TSX/TS de runtime (comentários e `src/types/index.ts` linha 2 são ok).
- [ ] Cada um dos 5 arquivos modificados importa `APP_NAME` de `@/lib/brand` e usa a constante em vez do literal.
- [ ] `src/main.tsx` chama `document.title = APP_NAME` após o render.
- [ ] `.env.example` contém a linha `VITE_APP_NAME=Creator OS` com comentário descritivo.

#### 2. Build e tipos
- [ ] `npm run build` executa sem erro. Anexar log no chat (ou os últimos 30 linhas se for muito grande).
- [ ] Não há erros de TypeScript em arquivos modificados.

#### 3. Testes visuais (apenas se houve mudança de UI)
- [ ] Background `#0A0A0F` aplicado; nenhum vestígio de light mode.
- [ ] Cards: blur 40px, borda `rgba(59, 130, 246, 0.25)`, glow inset top.
- [ ] Blues batem: `#3B82F6` / `#60A5FA` / `#1E3A8A` / `#2563EB`.
- [ ] Botões primários: gradient 135° de `#1E3A8A` → `#3B82F6`.
- [ ] Tipografia Inter/Geist; texto `#F8FAFC` (primário), `#94A3B8` (secundário), `#CBD5E1` (auxiliar).
- [ ] Hover blue glow 30–60px com transição 0.4s `cubic-bezier`.
- [ ] Validação direta: temporariamente setar `VITE_APP_NAME=Teste Fork` em `.env`, rodar `npm run dev`, confirmar que `LoginPage`, `Sidebar`, `Dashboard` e `<title>` exibem `Teste Fork`. Reverter `.env` depois.

#### 4. Testes responsivos
- [ ] Não se aplica (mudança de texto, sem layout).

#### 5. Testes de integração
- [ ] Conexão Supabase intacta (não foi tocada).
- [ ] Login com email+senha continua funcional.
- [ ] Navegação Sidebar → todas as páginas renderiza sem erro.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima (não agrupar como "tudo ok").
- Evidência objetiva: trechos de código antes/depois, IDs de arquivos modificados, log do build.
- Bugs/regressões encontrados e como foram resolvidos — ou registrados como débito técnico explícito com justificativa.

### Commit final

Quando o gate passar, fazer commit:

```bash
git add -A
git commit -m "migration(fase1): branding via VITE_APP_NAME

Mudanças principais:
- src/lib/brand.ts criado com APP_NAME (fallback 'Creator OS')
- 5 arquivos passam a importar APP_NAME em vez de literal
- src/main.tsx seta document.title = APP_NAME no startup
- .env.example documenta VITE_APP_NAME

Refs: MIGRATION_PLAN.md fase 1"
```

Reporte ao usuário a conclusão e instrua: a próxima fase é `migration/FASE-2.prompt.md` (Roles consolidados).
