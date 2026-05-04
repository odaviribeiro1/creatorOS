# Rotation Checklist

> **Atenção:** as credenciais abaixo apareceram em algum arquivo do repositório (atualmente apenas no `.env` local, não trackado pelo Git, mas o histórico do disco pode ainda conter referências). Rotacione cada uma nos respectivos painéis dos providers antes de considerar este repositório seguro para distribuição pública.
>
> Mesmo que você nunca tenha publicado o repositório, rotacionar é boa prática — credenciais que estiveram em disco local podem ter sido capturadas por backups, sincronizações em cloud, indexadores de código, ou ferramentas de busca.

---

## Credenciais a rotacionar

### Supabase — Anon Key + Project URL

- **Onde apareceu:** `.env` local (não trackado pelo Git, mas presente no disco do desenvolvedor). Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- **Project URL exposta:** `https://fjaq...tkhz.supabase.co` (truncado por segurança).
- **Anon Key exposta:** `eyJh...Nk4` (JWT, truncado por segurança).
- **Onde rotacionar:** Supabase Dashboard → seu projeto → **Project Settings → API**.
- **Passo a passo:**
  1. Acesse https://supabase.com/dashboard e abra o projeto correspondente à URL listada acima.
  2. Vá em **Project Settings → API → Project API Keys**.
  3. Clique em **Reset anon key** (ou **Reveal** + copiar uma nova chave gerada). Confirme a regeneração.
  4. **Atualize a nova `anon key`** em:
     - `.env` local (substitua `VITE_SUPABASE_ANON_KEY`).
     - **Vercel → Settings → Environment Variables** (se já houver deploy de produção). Refaça o deploy depois.
  5. Considere também **rotacionar a `service_role key`** no mesmo painel (mesmo que ela nunca tenha estado neste repositório), porque ela é o segredo mais crítico do Supabase.
  6. **Atualize a `service_role key`** em **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (a runtime auto-injeta, mas se você sobrescreveu manualmente, atualize).
- **Observação:** o Project URL em si não pode ser rotacionado — ela é parte da identidade do projeto. Se quiser mudar, é necessário criar um projeto novo e migrar os dados.

---

### Supabase — Personal Access Token (sbp_…)

- **Onde apareceu:** `.claude/settings.local.json` (arquivo local do Claude Code, NÃO trackado pelo Git, mas presente no disco em texto plano dentro de allow-list de comandos `Bash(SUPABASE_ACCESS_TOKEN=sbp_… supabase …)`).
- **Token exposto:** `sbp_2790...30aa` (truncado por segurança).
- **Onde rotacionar:** https://supabase.com/dashboard/account/tokens.
- **Passo a passo:**
  1. Acesse o link acima.
  2. Encontre o token cujos primeiros caracteres sejam `sbp_2790…`.
  3. Clique em **Revoke** (ou **Delete**).
  4. Crie um novo token clicando em **Generate new token**.
  5. Atualize o novo token em:
     - **GitHub → seu fork → Settings → Secrets and variables → Actions** (secret `SUPABASE_ACCESS_TOKEN`).
     - `.claude/settings.local.json` local, se você ainda quiser usar a allow-list (recomendação melhor: trocar a allow-list por `Bash(supabase db:*)` sem inline-env, e exportar `SUPABASE_ACCESS_TOKEN` do shell).
  6. Confirme que `.claude/settings.local.json` está no `.gitignore` (já adicionado nesta sanitização) para nunca ser commitado.

---

## Outras credenciais não encontradas neste repositório, mas que valem checagem

Este projeto também usa as seguintes credenciais nas Edge Functions. **Nenhuma delas foi encontrada no repositório**, mas se você suspeita que vazaram por outro caminho (logs, screenshots, copy-paste em chat etc.), siga os links abaixo para rotacionar:

| Credencial | Onde rotacionar |
|---|---|
| `APIFY_TOKEN` | https://console.apify.com/account/integrations → revogar token e gerar novo |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys → revogar chave (`...`) e gerar nova |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey → deletar chave e criar nova |
| `SUPABASE_ACCESS_TOKEN` (Personal Access Token) | https://supabase.com/dashboard/account/tokens → revogar e gerar novo |

Para cada credencial rotacionada, atualize-a no painel correto:
- `APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY` → **Supabase Dashboard → Project Settings → Edge Functions → Secrets**.
- `SUPABASE_ACCESS_TOKEN` → **GitHub → Repo Settings → Secrets and variables → Actions**.

---

## Verificação final

Após rotacionar a anon key do Supabase:

1. Atualize `.env` local com a nova chave.
2. Rode `npm run dev` e confirme que o login funciona.
3. Atualize a Vercel (Environment Variables) e refaça o deploy.
4. Teste o fluxo end-to-end: signup → adicionar perfil → scrape → análise → roteiro.

Se tudo funcionar com as novas credenciais, o repositório está seguro para distribuição pública.
