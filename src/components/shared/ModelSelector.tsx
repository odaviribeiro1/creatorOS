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
              className={`rounded-xl border px-2.5 py-1 text-xs transition-all duration-300 ${
                isSelected
                  ? 'border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.1)] text-primary shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                  : 'border-[rgba(59,130,246,0.12)] text-muted-foreground hover:border-[rgba(59,130,246,0.3)] hover:text-[#60A5FA]'
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
      <p className="label-uppercase">Modelo de IA</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODEL_OPTIONS.map((opt) => {
          const isSelected = opt.provider === modelProvider && opt.model === modelId
          return (
            <button
              key={opt.model}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-all duration-300 ${
                isSelected
                  ? 'border-[rgba(59,130,246,0.45)] bg-[rgba(59,130,246,0.08)] shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'border-[rgba(59,130,246,0.12)] hover:border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.04)]'
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
                <Badge className="bg-[rgba(59,130,246,0.15)] text-primary text-[10px] border border-[rgba(59,130,246,0.25)]">Ativo</Badge>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
