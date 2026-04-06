import { Film, Music, Volume2, Video, Type } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDuration } from '@/lib/utils'
import type { ContentAnalysis } from '@/types'

interface EditingElementsMapProps {
  analysis: ContentAnalysis
  onSeek?: (time: number) => void
}

export function EditingElementsMap({ analysis, onSeek }: EditingElementsMapProps) {
  const elements = [
    {
      title: 'Transições',
      icon: Film,
      color: 'text-purple-400',
      items: analysis.transitions.map((t) => ({
        time: t.timestamp,
        label: t.type,
        desc: t.description,
      })),
    },
    {
      title: 'Música',
      icon: Music,
      color: 'text-pink-400',
      items: analysis.music_segments.map((m) => ({
        time: m.start_ts,
        endTime: m.end_ts,
        label: `${m.mood} · ${m.energy_level}`,
        desc: m.genre,
      })),
    },
    {
      title: 'Efeitos Sonoros',
      icon: Volume2,
      color: 'text-yellow-400',
      items: analysis.sound_effects.map((s) => ({
        time: s.timestamp,
        label: s.type,
        desc: s.description,
      })),
    },
    {
      title: 'B-Rolls',
      icon: Video,
      color: 'text-cyan-400',
      items: analysis.broll_segments.map((b) => ({
        time: b.start_ts,
        endTime: b.end_ts,
        label: b.visual_type,
        desc: b.description,
      })),
    },
    {
      title: 'Texto na Tela',
      icon: Type,
      color: 'text-orange-400',
      items: analysis.text_overlays.map((t) => ({
        time: t.start_ts,
        endTime: t.end_ts,
        label: t.style,
        desc: t.text,
      })),
    },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Elementos de Edição</h3>

      <div className="space-y-3">
        {elements.map((group) => (
          <div key={group.title} className="rounded-lg border border-[rgba(59,130,246,0.12)] bg-[rgba(59,130,246,0.04)] p-3">
            <div className="mb-2 flex items-center gap-2">
              <group.icon className={`size-4 ${group.color}`} />
              <span className="text-xs font-medium text-foreground">{group.title}</span>
              <Badge variant="secondary" className="text-[10px]">
                {group.items.length}
              </Badge>
            </div>

            {group.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum encontrado</p>
            ) : (
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <button
                    key={i}
                    className="flex w-full items-start gap-2 rounded px-2 py-1 text-left transition-colors hover:bg-[rgba(59,130,246,0.08)]"
                    onClick={() => onSeek?.(item.time)}
                  >
                    <span className="mt-0.5 shrink-0 text-[10px] font-mono text-muted-foreground">
                      {formatDuration(item.time)}
                      {'endTime' in item && typeof item.endTime === 'number'
                        ? ` - ${formatDuration(item.endTime as number)}`
                        : ''}
                    </span>
                    <span className="flex-1 text-xs">
                      <span className="font-medium text-foreground">{item.label}</span>
                      {item.desc && (
                        <span className="text-muted-foreground"> · {item.desc}</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
