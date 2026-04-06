import { Settings, Key, Brain } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModelSelector } from '@/components/shared/ModelSelector'
import { useAppStore } from '@/store'

interface ApiKeyField {
  key: string
  label: string
  envVar: string
  placeholder: string
}

const API_KEYS: ApiKeyField[] = [
  {
    key: 'apify',
    label: 'Apify',
    envVar: 'APIFY_TOKEN',
    placeholder: 'apify_api_xxxxx',
  },
  {
    key: 'openai',
    label: 'OpenAI (Whisper + GPT)',
    envVar: 'OPENAI_API_KEY',
    placeholder: 'sk-xxxxx',
  },
  {
    key: 'gemini',
    label: 'Google Gemini',
    envVar: 'GEMINI_API_KEY',
    placeholder: 'AIzaSyxxxxx',
  },
]

export default function SettingsPage() {
  const user = useAppStore((s) => s.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Configurações da conta, modelo de IA e API keys
        </p>
      </div>

      {/* Account info */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Settings className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Conta</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="label-uppercase">Email</p>
              <p className="text-sm text-foreground">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="label-uppercase">User ID</p>
              <p className="truncate text-sm font-mono text-muted-foreground">
                {user?.id ?? '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model selection */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Modelo de IA</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha o modelo usado para análise de conteúdo, geração de Voice Profile e
            criação de roteiros. A seleção é salva automaticamente.
          </p>
          <ModelSelector />
        </CardContent>
      </Card>

      {/* API keys reference */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
            <Badge variant="secondary" className="text-[10px] border border-[rgba(59,130,246,0.2)]">
              Configuradas via ambiente
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground">
            As API keys são configuradas como variáveis de ambiente nas Supabase Edge
            Functions. Esta seção é apenas referência.
          </p>

          <div className="space-y-3">
            {API_KEYS.map((apiKey) => (
              <div key={apiKey.key} className="space-y-1">
                <Label className="text-xs text-[#CBD5E1]">
                  {apiKey.label}{' '}
                  <span className="font-mono text-muted-foreground">
                    ({apiKey.envVar})
                  </span>
                </Label>
                <Input
                  placeholder={apiKey.placeholder}
                  disabled
                  className="font-mono text-xs glass-input opacity-60"
                />
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] p-3">
            <p className="text-xs text-muted-foreground">
              Para configurar as API keys, defina as variáveis de ambiente no painel do
              Supabase em{' '}
              <span className="font-mono text-[#60A5FA]">
                Settings {'>'} Edge Functions {'>'} Secrets
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
