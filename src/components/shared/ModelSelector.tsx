import { useAppStore } from '@/store'
import { MODEL_OPTIONS } from '@/types'
import { Badge } from '@/components/ui/badge'

interface ModelSelectorProps {
  compact?: boolean
}

export function ModelSelector({ compact }: ModelSelectorProps) {
  const modelProvider = useAppStore((s) => s.modelProvider)
  const modelId = useAppStore((s) => s.modelId)
  const setModel = useAppStore((s) => s.setModel)

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {MODEL_OPTIONS.map((opt) => {
          const isSelected = opt.provider === modelProvider && opt.model === modelId
          return (
            <button
              key={opt.model}
              className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground'
              }`}
              onClick={() => setModel(opt.provider, opt.model)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Modelo de IA</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODEL_OPTIONS.map((opt) => {
          const isSelected = opt.provider === modelProvider && opt.model === modelId
          return (
            <button
              key={opt.model}
              className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => setModel(opt.provider, opt.model)}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{opt.model}</p>
                <p className="text-[10px] text-muted-foreground">
                  {opt.provider === 'openai' ? 'OpenAI' : 'Google'}
                </p>
              </div>
              {isSelected && (
                <Badge className="bg-primary/20 text-primary text-[10px]">Ativo</Badge>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
