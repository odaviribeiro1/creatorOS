import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils'
import type { ContentAnalysis } from '@/types'

interface StructureTimelineProps {
  analysis: ContentAnalysis
  onSeek?: (time: number) => void
}

const sections = [
  { key: 'hook' as const, label: 'Hook', color: 'bg-red-500', textColor: 'text-red-400' },
  { key: 'development' as const, label: 'Desenvolvimento', color: 'bg-blue-500', textColor: 'text-blue-400' },
  { key: 'cta' as const, label: 'CTA', color: 'bg-green-500', textColor: 'text-green-400' },
]

export function StructureTimeline({ analysis, onSeek }: StructureTimelineProps) {
  const totalDuration = Math.max(
    analysis.hook.end_ts,
    analysis.development.end_ts,
    analysis.cta.end_ts,
    1
  )

  function getWidth(startTs: number, endTs: number) {
    return ((endTs - startTs) / totalDuration) * 100
  }

  function getLeft(startTs: number) {
    return (startTs / totalDuration) * 100
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Estrutura Narrativa</h3>

      {/* Timeline bar */}
      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-muted">
        {sections.map((section) => {
          const data = analysis[section.key]
          const width = getWidth(data.start_ts, data.end_ts)
          const left = getLeft(data.start_ts)

          return (
            <button
              key={section.key}
              className={cn(
                'absolute top-0 h-full cursor-pointer transition-opacity hover:opacity-80',
                section.color
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
              onClick={() => onSeek?.(data.start_ts)}
              title={`${section.label}: ${formatDuration(data.start_ts)} - ${formatDuration(data.end_ts)}`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white">
                {width > 15 ? section.label : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {sections.map((section) => {
          const data = analysis[section.key]
          return (
            <div key={section.key} className="flex items-center gap-1.5 text-xs">
              <div className={cn('size-2.5 rounded-full', section.color)} />
              <span className={section.textColor}>{section.label}</span>
              <span className="text-muted-foreground">
                {formatDuration(data.start_ts)} - {formatDuration(data.end_ts)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Section details */}
      <div className="space-y-3">
        {sections.map((section) => {
          const data = analysis[section.key]
          return (
            <div
              key={section.key}
              className="rounded-lg border border-border bg-card p-3 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('size-2 rounded-full', section.color)} />
                  <span className="text-xs font-medium text-foreground">
                    {section.label}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatDuration(data.start_ts)} - {formatDuration(data.end_ts)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.text}
              </p>
              {section.key === 'hook' && 'effectiveness_score' in data && (
                <p className="text-[10px] text-muted-foreground">
                  Tipo: <span className="text-foreground">{(data as { type: string }).type}</span>
                  {' · '}Eficácia: <span className="text-accent">{(data as { effectiveness_score: number }).effectiveness_score}/10</span>
                </p>
              )}
              {section.key === 'development' && 'storytelling_technique' in data && (
                <p className="text-[10px] text-muted-foreground">
                  Técnica: <span className="text-foreground">{(data as { storytelling_technique: string }).storytelling_technique}</span>
                </p>
              )}
              {section.key === 'cta' && 'strength_score' in data && (
                <p className="text-[10px] text-muted-foreground">
                  Tipo: <span className="text-foreground">{(data as { type: string }).type}</span>
                  {' · '}Força: <span className="text-accent">{(data as { strength_score: number }).strength_score}/10</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
