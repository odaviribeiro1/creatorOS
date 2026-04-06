import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  FileText,
  Monitor,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScript } from '@/hooks/useScripts'
import { formatDate } from '@/lib/utils'
import supabase from '@/lib/supabase'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Aprovado', className: 'bg-blue-500/20 text-blue-400' },
  recorded: { label: 'Gravado', className: 'bg-accent/20 text-accent' },
  published: { label: 'Publicado', className: 'bg-green-500/20 text-green-400' },
}

const STATUS_ORDER: string[] = ['draft', 'approved', 'recorded', 'published']

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { script, loading, error, refetch } = useScript(id)
  const [updating, setUpdating] = useState(false)

  async function updateStatus(newStatus: string) {
    if (!script) return
    setUpdating(true)
    await supabase
      .from('scripts')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', script.id)
    await refetch()
    setUpdating(false)
  }

  function exportMarkdown() {
    if (!script) return
    const report = script.editing_report as Record<string, unknown>
    let md = `# ${script.title}\n\n`
    md += `**Tema:** ${script.topic}\n\n`
    md += `**Duração estimada:** ${script.estimated_duration_seconds ? Math.round(script.estimated_duration_seconds) + 's' : 'N/A'}\n\n`
    md += `---\n\n## Roteiro para Teleprompter\n\n${script.script_teleprompter}\n\n`
    md += `---\n\n## Relatório de Edição\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${script.title.replace(/\s+/g, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !script) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/scripts')}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
        <p className="text-sm text-destructive">{error ?? 'Roteiro não encontrado'}</p>
      </div>
    )
  }

  const status = STATUS_LABELS[script.status] ?? STATUS_LABELS.draft
  const editingReport = script.editing_report as Record<string, unknown>
  const editingInstructions = (editingReport?.editing_instructions ?? []) as Array<Record<string, unknown>>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/scripts')}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{script.title}</h1>
              <Badge className={status.className}>{status.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Tema: {script.topic} · Criado {formatDate(script.created_at)}
              {script.estimated_duration_seconds &&
                ` · ~${Math.round(script.estimated_duration_seconds)}s`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/scripts/${script.id}/teleprompter`)}
          >
            <Monitor className="size-3" />
            Teleprompter
          </Button>
          <Button variant="outline" size="sm" onClick={exportMarkdown}>
            <Download className="size-3" />
            Exportar MD
          </Button>
        </div>
      </div>

      {/* Status progression */}
      <Card>
        <CardContent className="flex items-center gap-2 pt-4">
          {STATUS_ORDER.map((s, i) => {
            const currentIdx = STATUS_ORDER.indexOf(script.status)
            const isDone = i <= currentIdx
            const isNext = i === currentIdx + 1
            const label = STATUS_LABELS[s]

            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`h-px w-6 ${isDone ? 'bg-primary' : 'bg-border'}`}
                  />
                )}
                <button
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
                    isDone
                      ? 'bg-primary/20 text-primary'
                      : isNext
                        ? 'border border-dashed border-primary/50 text-muted-foreground hover:bg-primary/10'
                        : 'text-muted-foreground'
                  }`}
                  onClick={() => isNext && updateStatus(s)}
                  disabled={!isNext || updating}
                >
                  {isDone && <CheckCircle2 className="size-3" />}
                  {label.label}
                </button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="teleprompter">
        <TabsList>
          <TabsTrigger value="teleprompter">
            <FileText className="size-3" />
            Roteiro
          </TabsTrigger>
          <TabsTrigger value="editing">
            <Monitor className="size-3" />
            Relatório de Edição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teleprompter" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="mx-auto max-w-2xl">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {script.script_teleprompter}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editing" className="mt-4 space-y-4">
          {/* General info */}
          {editingReport.total_duration_estimate ? (
            <Card>
              <CardContent className="flex flex-wrap gap-4 pt-4">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Duração</p>
                  <p className="text-sm text-foreground">
                    {String(editingReport.total_duration_estimate)}
                  </p>
                </div>
                {editingReport.color_grading ? (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Color Grading</p>
                    <p className="text-sm text-foreground">
                      {String(editingReport.color_grading)}
                    </p>
                  </div>
                ) : null}
                {editingReport.aspect_ratio ? (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Aspecto</p>
                    <p className="text-sm text-foreground">
                      {String(editingReport.aspect_ratio)}
                    </p>
                  </div>
                ) : null}
                {editingReport.captions_style ? (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Legendas</p>
                    <p className="text-sm text-foreground">
                      {String(editingReport.captions_style)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Music recommendation */}
          {editingReport.music_recommendation ? (
            <Card>
              <CardContent className="space-y-2 pt-4">
                <h3 className="text-sm font-semibold text-foreground">Música</h3>
                {(() => {
                  const music = editingReport.music_recommendation as Record<string, unknown>
                  return (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {music.mood ? (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Mood</p>
                          <p className="text-xs text-foreground">{String(music.mood)}</p>
                        </div>
                      ) : null}
                      {music.genre ? (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Gênero</p>
                          <p className="text-xs text-foreground">{String(music.genre)}</p>
                        </div>
                      ) : null}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ) : null}

          {/* Editing instructions timeline */}
          {editingInstructions.length > 0 && (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Instruções de Edição
                </h3>
                {editingInstructions.map((instruction, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {String(instruction.timestamp)}
                      </Badge>
                      <Badge
                        className={
                          instruction.section === 'hook'
                            ? 'bg-red-500/20 text-red-400'
                            : instruction.section === 'cta'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                        }
                      >
                        {String(instruction.section)}
                      </Badge>
                    </div>
                    {instruction.visual ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Visual: </span>
                        <span className="text-foreground">{String(instruction.visual)}</span>
                      </p>
                    ) : null}
                    {instruction.text_overlay ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Texto: </span>
                        <span className="text-foreground">{String(instruction.text_overlay)}</span>
                      </p>
                    ) : null}
                    {instruction.audio ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Áudio: </span>
                        <span className="text-foreground">{String(instruction.audio)}</span>
                      </p>
                    ) : null}
                    {instruction.transitions ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Transições: </span>
                        <span className="text-foreground">{String(instruction.transitions)}</span>
                      </p>
                    ) : null}
                    {Array.isArray(instruction.broll_suggestions) && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">B-Roll: </span>
                        <ul className="ml-4 list-disc text-foreground">
                          {(instruction.broll_suggestions as string[]).map((b, bi) => (
                            <li key={bi}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
