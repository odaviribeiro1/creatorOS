# Migration Plan — creator-os

> Plano de migração de SaaS multi-tenant para Open Source Self-Hosted.
> Gerado em 2026-05-02 com base em `AUDIT_REPORT.md`.
> Branch de trabalho: `oss-self-hosted` | Tag de snapshot: `v0-saas-final`.

## Resumo da auditoria

- **Decisão:** MIGRAR
- **Esforço total estimado:** 2–6 horas (somando todas as fases incluídas)
- **Qualidade média do código atual:** 4.0 / 5
- **Acoplamento crítico identificado:** Praticamente inexistente. O projeto **não tem casca SaaS multi-tenant**: zero `tenant_id`, sem `tenants`/`workspaces`, sem subdomínio dinâmico, sem white-label dinâmico, sem billing, sem BYOK, sem onboarding wizard. O isolamento já é per-user simples (`auth.uid() = user_id`), o tema é fixo (Agentise dark glassmorphism em `src/index.css`), e as API keys de provedores (Apify, OpenAI, Gemini, Anthropic) já vivem em env vars das Edge Functions. A migração é, na prática, polish de DX e branding/documentação.

## Domínio nuclear a preservar

**Descrição:** Ferramenta de análise de Reels do Instagram. Faz scraping de perfis (Apify), transcreve áudio (Whisper), analisa estrutura narrativa e edição (Gemini + Claude/OpenAI), extrai um Voice Profile do criador a partir dos próprios vídeos, e gera roteiros para teleprompter + relatório de edição.

- **Entidades centrais:** `profiles`, `reels`, `transcriptions`, `content_analyses`, `voice_profiles`, `scripts` (periféricas: `script_versions`, `processing_jobs`).
- **Edge Functions de domínio:** `scrape-profiles`, `scrape-reel-url`, `analyze-content`, `generate-voice-profile`, `generate-script`, `job-status`.
- **Telas de domínio (todas as 11):** `DashboardPage`, `ProfilesPage`, `ProfileReelsPage`, `AnalysisPage`, `ReelAnalysisPage`, `VoiceProfilePage`, `ScriptsPage`, `NewScriptPage`, `ScriptDetailPage`, `TeleprompterPage`, `SettingsPage`.

Nenhuma destas é casca SaaS — 100% do app é domínio nuclear e deve ser preservado.

## Fases incluídas neste plano

| # | Fase | Esforço estimado | Risco | Status |
|---|---|---|---|---|
| 0 | Branch e snapshot | 5min | Baixo | ✅ Concluída |
| 1 | Branding como constante / env var | 15–30min | Baixo | ⏳ Pendente |
| 2 | Roles consolidados (`admin` + `operator`) com trigger "primeiro user = admin" | 45–60min | Médio | ⏳ Pendente |
| 3 | `.env.example` completo e documentação de secrets | 15–20min | Baixo | ⏳ Pendente |
| 4 | README + DX (LICENSE, CONTRIBUTING, CHANGELOG, ARCHITECTURE) | 60–90min | Baixo | ⏳ Pendente |
| 5 | Smoke test manual end-to-end | 60min | Médio | ⏳ Pendente |

**Total estimado:** ~3–5 horas.

## Fases excluídas e justificativa

| Fase do catálogo | Por que não se aplica |
|---|---|
| Remover BYOK | Auditoria confirmou ausência total de `pgcrypto`, `pgp_sym_encrypt`, `tenant_credentials`. API keys já vivem em env vars das Edge Functions; inputs em `SettingsPage` já estão `disabled` como mera referência visual. |
| Remover white-label dinâmico | Tema já está fixo em `src/index.css` com cores Agentise hardcoded. Nenhuma coluna `primary_color`/`logo_url`/`branding` em tabelas. Nenhum helper `applyWhiteLabel`. |
| Remover `tenant_id` | Auditoria confirmou zero ocorrências de `tenant_id` em SQL e em TS. Não existe tabela `tenants` nem `workspaces`. Modelo já é per-user com RLS `auth.uid() = user_id`. |
| Achatar onboarding wizard | Não há rota `/onboarding`/`/setup`/`/wizard` em `src/App.tsx`. Não há componentes `OnboardingWizard`/`SetupWizard`. Único onboarding é login/signup com email+senha. |
| Remover billing | Auditoria confirmou ausência total de Stripe/checkout/subscription/pricing/plan/seat. Único match para `subscription` é o listener `onAuthStateChange` da Supabase Auth, não billing. |
| Remover subdomain dinâmico | Sem lógica de `hostname.split`/`window.location.hostname`/`subdomain` no frontend. Sem middleware de tenant resolution. |
| Decidir `/setup` vs `.env` | Decisão já tomada pela base de código atual: `.env` com `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Não há rota `/setup` para colar credenciais; manter assim é coerente com o público-alvo (devs que farão fork). |
| Schema namespace dedicado | Auditoria avaliou como opcional. Tabelas no schema `public` são adequadas para self-host single-purpose. Risco de coabitação com outros apps no mesmo Supabase é responsabilidade de quem dá fork. |

## Ordem de execução e dependências

A ordem foi escolhida para minimizar conflitos e maximizar valor entregue cedo:

1. **Fase 1 (Branding)** primeiro, porque é a mudança mais isolada e visível: extrai o literal `"Creator OS"` para constante/env var. Não toca DB, não toca Edge Functions. Valida que o ciclo de mudança → build → commit funciona na branch.
2. **Fase 2 (Roles)** antes da Fase 3 porque introduz a primeira migration SQL nova da branch (`app_users` + trigger). É a mudança de maior impacto técnico do plano e merece atenção concentrada cedo, com smoke test fazendo gate final na Fase 5.
3. **Fase 3 (`.env.example`)** vem depois das Fases 1 e 2 porque ambas podem introduzir novas env vars (`VITE_APP_NAME` na Fase 1, eventuais flags na Fase 2). Consolidar todas no `.env.example` em um único passo evita revisitar o arquivo.
4. **Fase 4 (Docs)** penúltima, porque o README precisa refletir o estado final do `.env.example` e o modelo de roles definitivo. Documentar antes seria escrever sobre um alvo móvel.
5. **Fase 5 (Smoke test)** sempre por último: valida que tudo funciona ponta a ponta numa instância nova, simulando a experiência de quem dá fork.

## Como executar

Cada fase tem um arquivo correspondente em `migration/FASE-N.prompt.md`. Para executar:

1. Abra Claude Code numa nova sessão na raiz deste repositório.
2. Confirme que está na branch `oss-self-hosted`.
3. Confirme que a fase anterior está commitada (mensagem do commit segue padrão `migration(faseN): <descrição>`).
4. Cole o conteúdo de `migration/FASE-N.prompt.md`.
5. Aguarde a execução completa, incluindo o gate de validação no final.
6. Revise as mudanças. Se aprovar, faça merge em `main` apenas no final de todas as fases. Entre fases, mantém-se em `oss-self-hosted`.
7. Cada fase termina com commit feito por Claude Code com mensagem padrão.

Se uma fase falhar:
- Não abandone a branch. Use `git reset --hard` para voltar ao último commit válido.
- Releia o `FASE-N.prompt.md` e ajuste manualmente se for caso.
- Ou abra issue / converse com o autor do plano antes de prosseguir.

## Observações específicas deste projeto

- **Assistente artifact preservado:** o arquivo `.claude/CLAUDE.md` deste repositório é um quasi-architecture-doc detalhado (modelo de dados, APIs externas, arquitetura, custos, módulos). A Fase 4 (Docs) deve **derivar** um `ARCHITECTURE.md` ou seções do `README.md` a partir desse conteúdo, não simplesmente apagá-lo. É um ativo do projeto.
- **`.env` no working directory:** o arquivo `.env` está untracked e não está no `.gitignore`. **Nunca adicionar ao git.** A Fase 3 deve incluir entrada `.env` em `.gitignore` se ainda não estiver.
- **Realtime ativo:** `processing_jobs` está em `supabase_realtime`. Após a Fase 2 (roles), confirmar que a publication continua válida para a tabela.
- **Nenhuma dependência de subdomínio ou wildcard DNS:** o app roda em domínio único; deploy Vercel padrão funciona sem configuração extra.
- **Tema fixo respeitado:** todas as fases que tocarem UI devem manter o glassmorphism dark Agentise (`#0A0A0F` base, `#3B82F6` primary, blur 40px, borders `rgba(59,130,246,0.x)`).
- **Pequeno débito visível:** `dist/` existe localmente mesmo com regra `dist` no `.gitignore` — não é bloqueante, mas a Fase 4 pode mencionar limpar.
- **Roles na Fase 2 são opcionais para uma instância single-user**, mas o plano os inclui porque o público-alvo do boilerplate self-hosted pode querer 2-3 usuários (criador + editor de vídeo + assistente). Se o usuário-fork quiser pular roles, basta marcar a Fase 2 como pulada e ajustar a Fase 5 (smoke test) para não testar autenticação multiconta.
