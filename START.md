# START — Setup da sua instância

> Bem-vindo! Este arquivo configura sua instância do **Creator OS** na sua infraestrutura Supabase + Vercel via Claude Code.
>
> 1. Crie um projeto novo no Supabase em https://supabase.com/dashboard (anote URL, anon key, service_role key e Project Reference em Project Settings → API e General).
> 2. Crie um Personal Access Token Supabase em https://supabase.com/dashboard/account/tokens (escopo "All access").
> 3. Tenha em mãos as chaves de API dos providers que este projeto usa (lista mais abaixo).
> 4. Abra um terminal na raiz deste repositório clonado.
> 5. Execute `claude` (Claude Code precisa estar instalado e autorizado).
> 6. Digite na sessão: **"Leia o arquivo START.md e execute tudo"**
> 7. Responda às perguntas conforme Claude Code as faz.
>
> Em ~10 minutos, sua instância estará configurada: 3 migrations aplicadas, 6 Edge Functions deployadas, secrets configuradas, conta de admin criada. Depois é só fazer o deploy do frontend na Vercel.

---

## Credenciais que serão pedidas

- **Supabase URL** — formato `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`. Em Project Settings → API → Project URL.
- **Supabase anon key** — JWT longo. Em Project Settings → API → Project API keys → `anon` `public`.
- **Supabase service_role key** — JWT longo (manter em sigilo). Em Project Settings → API → Project API keys → `service_role` `secret`.
- **Supabase Project Reference** — código curto tipo `xhznjliwxbosunwrcaut`. Em Project Settings → General → Reference ID.
- **Supabase Personal Access Token** — formato `sbp_...`. Em https://supabase.com/dashboard/account/tokens.
- **Email e senha** que você vai usar como admin desta instância.
- **APIFY_TOKEN** — scraping de Reels Instagram. Crie em https://console.apify.com/account/integrations.
- **OPENAI_API_KEY** — Whisper (transcrição) e GPT (análise/geração). Crie em https://platform.openai.com/api-keys.
- **GEMINI_API_KEY** — análise visual de vídeo. Crie em https://aistudio.google.com/app/apikey.

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido pelo Claude Code do aluno e contém as instruções que você (Claude Code) deve executar quando o aluno disser "leia START.md e execute tudo". Siga as instruções abaixo passo a passo.

Você é responsável por configurar o **Creator OS** self-hosted na infraestrutura Supabase do usuário (aluno). O fluxo é interativo: você vai perguntar uma credencial por vez, validar imediatamente, e só ao final aplicar mudanças no Supabase do usuário.

### Princípios

1. **Interativo, uma pergunta por vez.** Não pedir bloco gigante de credenciais.
2. **Validar antes de prosseguir.** Toda credencial recebida deve ser testada (URL responde, anon key autentica, access token tem permissão).
3. **Nada fica em arquivo permanente até validar.** Manter credenciais em variáveis da sessão até o final.
4. **Resumo antes de aplicar.** No final, listar tudo que vai ser feito e pedir confirmação ("digite SIM para prosseguir").
5. **Mensagens curtas e claras** em pt-BR. Sem postâmbulos longos.
6. **Erros são oportunidade de retry**, não de abandono. Se uma credencial falhar validação, pedir de novo com explicação clara do que está errado.

### Pré-checagem

1. Confirmar `node --version` retorna 20+.
2. Confirmar `supabase --version` está instalado (Supabase CLI). Se não, parar e pedir para o aluno instalar via `brew install supabase/tap/supabase` ou equivalente.
3. Confirmar `pwd` está na raiz do repositório `creator-os` (existe `package.json` com `"name": "creator-os"` e pasta `supabase/migrations/` com 3 arquivos `.sql`).
4. `git status` deve estar limpo (não obrigatório, mas alertar se sujo).
5. Ler `.env.example` na raiz e confirmar 3 grupos: Frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_NAME`), Edge Functions Secrets (`APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`), Scripts (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`).

### Sequência interativa

#### Passo 1 — Apresentação

Mostre ao aluno em uma única mensagem:

```
Olá! Vou configurar sua instância do Creator OS no Supabase.

Vou pedir uma credencial por vez. Você pode pausar e retomar depois — nada é gravado até a confirmação final.

Variáveis a configurar:
  Frontend: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_NAME
  Edge Functions Secrets: APIFY_TOKEN, OPENAI_API_KEY, GEMINI_API_KEY
  Scripts: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
  Admin: email + senha

Pronto pra começar? (responda "vai" ou "ok")
```

Aguarde "ok" / "vai" / "pode" do aluno antes de prosseguir.

#### Passo 2 — Supabase URL

Perguntar: "Cole sua Supabase URL (formato `https://xxxx.supabase.co`)."

Validar:
- Formato regex `^https://[a-z0-9]{20,}\.supabase\.co$`
- Fazer `curl -sI {URL}/rest/v1/ -H "apikey: dummy"` — deve retornar `401` (não `404` ou erro de DNS).

Se inválido, explicar o erro e pedir de novo.

#### Passo 3 — Supabase anon key

Perguntar: "Cole sua Supabase anon key (JWT que começa com `eyJ`)."

Validar:
- Começa com `eyJ`
- Fazer `curl -s {URL}/rest/v1/ -H "apikey: {ANON_KEY}"` — deve retornar `200` ou JSON válido (não `401`).

#### Passo 4 — Supabase service_role key

Perguntar: "Cole sua Supabase service_role key. Atenção: essa chave dá acesso total ao seu banco, mantenha sigilo."

Validar:
- Começa com `eyJ`
- Decodificar o JWT (sem assinatura) e checar que `role = service_role`. Pode usar `node -e "console.log(JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64').toString()))" "{KEY}"`.

#### Passo 5 — Supabase Project Reference

Perguntar: "Cole o Project Reference do seu projeto Supabase (código curto, ex.: `xhznjliwxbosunwrcaut`)."

Validar:
- Regex `^[a-z]{20}$`
- Confirmar que a URL anterior contém esse ref como subdomínio.

#### Passo 6 — Supabase Personal Access Token

Perguntar: "Cole seu Personal Access Token Supabase (formato `sbp_...`). Crie em https://supabase.com/dashboard/account/tokens se ainda não tem."

Validar:
- Começa com `sbp_`
- Testar com Management API:
  ```bash
  curl -s https://api.supabase.com/v1/projects/{PROJECT_REF} \
    -H "Authorization: Bearer {ACCESS_TOKEN}"
  ```
  Deve retornar JSON com dados do projeto (não `401`).

Se falhar com 401, explicar: "Token sem acesso ao projeto. Verifique se o token tem escopo `All access` e se o Project Ref está correto."

#### Passo 7 — Secrets das Edge Functions

Perguntar uma por uma:

**7.1 — APIFY_TOKEN**
- "Cole seu Apify token. Crie em https://console.apify.com/account/integrations se não tem."
- Validar: começa com `apify_api_`.
- Permitir `pular` (avisar que `scrape-profiles` e `scrape-reel-url` não funcionarão).

**7.2 — OPENAI_API_KEY**
- "Cole sua OpenAI API key (Whisper para transcrição + GPT para análise/geração). Crie em https://platform.openai.com/api-keys."
- Validar: começa com `sk-`.
- Permitir `pular` (avisar que análise/geração via OpenAI não funcionará).

**7.3 — GEMINI_API_KEY**
- "Cole sua Google Gemini API key (análise visual de vídeo). Crie em https://aistudio.google.com/app/apikey."
- Validar: começa com `AIza`.
- Permitir `pular` (avisar que análise visual via Gemini não funcionará).

Avisar ao final: "Pelo menos uma de OPENAI_API_KEY ou GEMINI_API_KEY é obrigatória para o pipeline de análise funcionar." Se ambas foram puladas, pedir pelo menos uma.

#### Passo 8 — Conta admin

1. "Email do admin desta instância:" — validar formato email.
2. "Senha do admin (mínimo 8 caracteres):" — validar comprimento.

Anotar para criar via Supabase Auth Admin API no final.

#### Passo 9 — Resumo e confirmação

Em uma mensagem única, mostrar:

```
✅ Supabase URL: https://xxxx...co
✅ Anon key: eyJhbGciOi...
✅ Service role: eyJhbGciOi...
✅ Project ref: xhznjliw...
✅ Access token: sbp_2790...
✅ Secrets: 3 de 3 (ou: 2 de 3, GEMINI_API_KEY pulada)
✅ Admin: voce@email.com

Vou executar nesta ordem:

1. Criar arquivo .env na raiz (VITE_*, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF)
2. Rodar `npm install` se node_modules/ não existir
3. supabase link --project-ref {REF} (autenticação via SUPABASE_ACCESS_TOKEN)
4. supabase db push (aplica as 3 migrations: initial_schema, editing_visual_effects_script_versions, app_users_and_roles)
5. supabase functions deploy {nome} para cada: scrape-profiles, scrape-reel-url, analyze-content, generate-voice-profile, generate-script, job-status
6. Configurar secrets via Management API (PATCH /v1/projects/{ref}/secrets) — apenas as não puladas
7. Criar admin via Supabase Auth Admin API
8. Verificar que app_users.role = 'admin' (trigger on_auth_user_created)

Digite SIM (em maiúsculas) para executar tudo. Qualquer outra coisa cancela.
```

#### Passo 10 — Execução

Apenas se o aluno responder exatamente `SIM`:

**10.1 — Escrever `.env` local**

Criar `.env` na raiz com:
```
VITE_SUPABASE_URL={URL}
VITE_SUPABASE_ANON_KEY={ANON_KEY}
VITE_APP_NAME=Creator OS
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN}
SUPABASE_PROJECT_REF={PROJECT_REF}
```

**Não escrever** as secrets `APIFY_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY` no `.env` local — elas vão direto pro Supabase via Management API.

Avisar: "`.env` está no `.gitignore`, nunca será commitado."

**10.2 — `npm install` se necessário**

Se `node_modules/` não existe, rodar `npm install` e mostrar saída resumida.

**10.3 — Link + Aplicar migrations**

```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase link --project-ref {PROJECT_REF}
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase db push
```

Mostrar saída. Se falhar, capturar o erro e oferecer retry ou abortar.

**10.4 — Deploy de Edge Functions**

Para cada uma das 6 functions:
```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} supabase functions deploy {nome} \
  --project-ref {PROJECT_REF} --no-verify-jwt
```

Functions: `scrape-profiles`, `scrape-reel-url`, `analyze-content`, `generate-voice-profile`, `generate-script`, `job-status`.

Mostrar progresso "{N}/6 deployadas". Se uma falhar, oferecer retry só dela.

**10.5 — Configurar secrets via Management API**

Para cada secret que o aluno informou (não pulada), fazer um único PATCH com array:

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{PROJECT_REF}/secrets" \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"APIFY_TOKEN","value":"..."},
    {"name":"OPENAI_API_KEY","value":"..."},
    {"name":"GEMINI_API_KEY","value":"..."}
  ]'
```

Verificar resposta `200`. Se `401` ou outro erro, capturar e tratar.

**10.6 — Criar admin**

```bash
curl -X POST "{SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}" \
  -H "Content-Type: application/json" \
  -d '{"email":"{EMAIL}","password":"{SENHA}","email_confirm":true}'
```

Verificar resposta `200` e que retorna `id` de usuário.

**10.7 — Validar trigger de admin**

Aguardar 2-3 segundos para o trigger `on_auth_user_created` executar. Consultar via PostgREST:

```bash
curl -s "{SUPABASE_URL}/rest/v1/app_users?select=user_id,role&user_id=eq.{USER_ID}" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}"
```

Confirmar que `role = 'admin'`. Se não for, alertar mas não falhar — o aluno pode promover manualmente via SQL Editor:
```sql
UPDATE app_users SET role = 'admin' WHERE user_id = '{USER_ID}';
```

#### Passo 11 — Relatório final

Mostrar ao aluno em uma única mensagem:

```
✅ Setup concluído!

📊 Configurado:
- Migrations aplicadas: 3 de 3 ✅
- Edge Functions deployadas: 6 de 6 (scrape-profiles, scrape-reel-url, analyze-content, generate-voice-profile, generate-script, job-status)
- Secrets configuradas: N de 3 (lista quais)
- Admin criado: voce@email.com (role = admin ✅)

📋 Próximos passos — Deploy do frontend na Vercel:

1. Acesse https://vercel.com/new
2. Importe seu fork
3. Na tela de Environment Variables, preencha:
   • VITE_SUPABASE_URL = {URL}
   • VITE_SUPABASE_ANON_KEY = {ANON_KEY}
   • VITE_APP_NAME = Creator OS  (opcional)
4. Clique em Deploy e aguarde ~2 minutos
5. Acesse a URL gerada e faça login com:
   email: voce@email.com
   senha: (a que você definiu)

⚠️  Lembrete:
- As secrets das Edge Functions ficaram no Supabase Dashboard.
  Para alterar depois: Project Settings → Edge Functions → Secrets.
- Suas variáveis VITE_* ficaram no .env local (gitignored) e na Vercel.
- Em caso de problema, consulte a seção Troubleshooting do README.md.
```

### Tratamento de erros gerais

- Em qualquer falha, mostrar o erro completo e oferecer 3 opções: retry, pular esta etapa, abortar tudo.
- Se abortar antes do passo 10.1: nenhuma mudança foi feita, pode rodar de novo do zero.
- Se abortar entre 10.1 e 10.5: pode ter `.env` local criado e parcialmente migrations aplicadas. Avisar o aluno claramente do estado.
- Se abortar depois de 10.5: instância parcialmente configurada, melhor terminar manualmente seguindo a seção "Caminho manual" do README.

### Princípio final

Você está tocando na infra de produção do aluno. **Cuidado, transparência e confirmação explícita** são mais importantes que velocidade.
