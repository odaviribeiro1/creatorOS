# UPDATE — Atualizar sua instância

> Use este arquivo sempre que quiser puxar a versão mais recente do projeto upstream e aplicá-la na sua instância.

## Como usar

1. No GitHub, vá no seu fork e clique em **"Sync fork"** (botão no topo) — isso traz os commits novos do upstream para sua main remota.
2. No terminal, dentro da pasta do projeto: `git pull`.
3. Abra Claude Code: `claude`.
4. Digite na sessão: **"Leia o arquivo UPDATE.md e execute tudo"**.
5. Aguarde — Claude Code aplica migrations novas, redeploya Edge Functions e valida.

A Vercel detecta o push na main do fork e redeploya o frontend automaticamente.

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido pelo Claude Code do aluno e contém as instruções que você (Claude Code) deve executar quando o aluno disser "leia UPDATE.md e execute tudo".

Você está atualizando uma instância já configurada do **Creator OS**. Pré-requisitos: existe `.env` na raiz com `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` válidos (criados no setup inicial via START.md). Este projeto usa o Supabase CLI direto — não há scripts npm `db:push`/`functions:deploy`.

### Pré-checagem

1. Confirmar que `.env` existe e contém `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF`. Se faltar, instruir o aluno a rodar START.md primeiro.
2. Confirmar `supabase --version` está disponível.
3. `git status` deve estar limpo. Se tiver modificações locais, alertar e pedir orientação.
4. Mostrar ao aluno os commits novos: `git log HEAD@{1}..HEAD --oneline` (commits puxados desde o último update). Se não houver commits novos, avisar e perguntar se quer continuar mesmo assim (pode ser útil para revalidar deploy).

### Sequência

1. **Carregar variáveis**: ler `.env` e exportar `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` no ambiente da sessão (ou prefixar comandos como `SUPABASE_ACCESS_TOKEN=... supabase ...`).

2. **Aplicar migrations novas**:
   ```bash
   SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase db push --project-ref {PROJECT_REF}
   ```
   Mostrar saída. O CLI aplica apenas as migrations ainda não registradas em `supabase_migrations.schema_migrations`.

3. **Redeploy Edge Functions**: para cada diretório em `supabase/functions/*/`, redeployar:
   ```bash
   for fn in supabase/functions/*/; do
     name=$(basename "$fn")
     [[ "$name" == _* ]] && continue
     SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase functions deploy "$name" \
       --project-ref {PROJECT_REF} --no-verify-jwt
   done
   ```
   Mostrar progresso. Se uma function falhar, oferecer retry só dela.

4. **Verificar secrets necessárias**: ler `.env.example` atualizado e listar todas as vars do grupo "Edge Functions Secrets". Para cada uma, consultar o Supabase via Management API:
   ```bash
   curl -s "https://api.supabase.com/v1/projects/{PROJECT_REF}/secrets" \
     -H "Authorization: Bearer {ACCESS_TOKEN}"
   ```
   Comparar a lista. Se há secrets no `.env.example` que não estão no Supabase, listar para o aluno e perguntar se quer configurá-las agora (sim → pedir valor → PATCH em `/v1/projects/{ref}/secrets`; não → seguir avisando que features dependentes ficam offline).

5. **Resumo final**: listar o que foi aplicado, o que falhou (se algo), e qualquer ação manual necessária. Lembrar que o frontend redeploya automaticamente via Vercel após o `git push` (o aluno já fez o pull, então a main já está atualizada).

### Tratamento de erros

- **Migration falha** → mostrar erro completo, NÃO continuar para Edge Functions, pedir orientação. Pode ser conflito com dados existentes — investigar caso a caso.
- **Edge Function falha** → tentar deployar individualmente as que falharam, reportar quais ficaram. Não bloquear as outras etapas.
- **Sem permissão na Management API** (401) → instruir o aluno a verificar `SUPABASE_ACCESS_TOKEN` (pode ter sido revogado) e refazer.
- **`supabase` CLI não encontrado** → pedir instalação via `brew install supabase/tap/supabase` e repetir.

### Princípio

Você está mexendo em produção do aluno. Cuidado e transparência > velocidade.
