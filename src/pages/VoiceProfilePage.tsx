import { useState, useEffect } from 'react'
import { Mic, Loader2, RefreshCw, Quote, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModelSelector } from '@/components/shared/ModelSelector'
import { useVoiceProfile } from '@/hooks/useVoiceProfile'
import { useProfiles } from '@/hooks/useProfiles'
import { useAppStore } from '@/store'
import { generateVoiceProfile } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import supabase from '@/lib/supabase'
import type { Reel } from '@/types'

export default function VoiceProfilePage() {
  const { voiceProfile, loading } = useVoiceProfile()
  const { profiles } = useProfiles()
  const activeJobs = useAppStore((s) => s.activeJobs)

  const [ownReels, setOwnReels] = useState<Reel[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedReels, setSelectedReels] = useState<Set<string>>(new Set())

  const ownProfile = profiles.find((p) => p.profile_type === 'own')
  const vpJobs = activeJobs.filter(
    (j) => j.job_type === 'voice_profile' && (j.status === 'pending' || j.status === 'processing')
  )

  useEffect(() => {
    if (!ownProfile) return
    supabase
      .from('reels')
      .select('*')
      .eq('profile_id', ownProfile.id)
      .order('engagement_score', { ascending: false })
      .then(({ data }) => {
        const reels = (data ?? []) as Reel[]
        setOwnReels(reels)
        // Pre-select top 5-10
        const preselect = reels.slice(0, Math.min(10, reels.length)).map((r) => r.id)
        setSelectedReels(new Set(preselect))
      })
  }, [ownProfile])

  const modelProvider = useAppStore((s) => s.modelProvider)
  const modelId = useAppStore((s) => s.modelId)

  async function handleGenerate() {
    if (!ownProfile || selectedReels.size === 0) return
    setGenerating(true)
    try {
      await generateVoiceProfile(ownProfile.id, Array.from(selectedReels), modelProvider, modelId)
    } catch {
      // Job tracks errors
    }
    setGenerating(false)
  }

  function toggleReel(reelId: string) {
    setSelectedReels((prev) => {
      const next = new Set(prev)
      if (next.has(reelId)) next.delete(reelId)
      else next.add(reelId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Voice Profile</h1>
          <p className="text-sm text-muted-foreground">
            Tom de fala extraído dos seus vídeos
          </p>
        </div>
        {voiceProfile && (
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className="size-3" />
            Regenerar
          </Button>
        )}
      </div>

      {/* Active jobs */}
      {vpJobs.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-sm">
              Gerando Voice Profile...
              {vpJobs[0]?.progress > 0 && ` (${vpJobs[0].progress}%)`}
            </span>
          </CardContent>
        </Card>
      )}

      {/* No own profile */}
      {!ownProfile && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-16">
          <Mic className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Adicione seu perfil do Instagram primeiro
          </p>
          <p className="text-xs text-muted-foreground">
            Vá em Perfis e adicione um perfil do tipo "Meu Perfil"
          </p>
        </div>
      )}

      {/* Voice profile exists */}
      {voiceProfile && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Summary card */}
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <Mic className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Resumo do Tom</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {voiceProfile.source_reel_ids?.length ?? 0} vídeos base
                </Badge>
              </div>

              {voiceProfile.tone_description && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Tom</p>
                  <p className="text-sm text-foreground">{voiceProfile.tone_description}</p>
                </div>
              )}

              {voiceProfile.vocabulary_style && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Vocabulário</p>
                  <p className="text-sm text-foreground">{voiceProfile.vocabulary_style}</p>
                </div>
              )}

              {voiceProfile.sentence_structure && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Estrutura</p>
                  <p className="text-sm text-foreground">{voiceProfile.sentence_structure}</p>
                </div>
              )}

              {voiceProfile.pacing_style && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Ritmo</p>
                  <p className="text-sm text-foreground">{voiceProfile.pacing_style}</p>
                </div>
              )}

              {voiceProfile.emotional_range && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Emoções</p>
                  <p className="text-sm text-foreground">{voiceProfile.emotional_range}</p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                Gerado {formatDate(voiceProfile.generated_at)}
              </p>
            </CardContent>
          </Card>

          {/* Expressions */}
          <Card>
            <CardContent className="space-y-4 pt-4">
              {/* Filler words */}
              {voiceProfile.filler_words.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase text-muted-foreground">
                    Palavras de preenchimento
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {voiceProfile.filler_words.map((word) => (
                      <Badge key={word} variant="secondary" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Common expressions */}
              {voiceProfile.common_expressions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Quote className="size-3 text-muted-foreground" />
                    <p className="text-[10px] uppercase text-muted-foreground">
                      Expressões frequentes
                    </p>
                  </div>
                  <div className="space-y-1">
                    {voiceProfile.common_expressions.map((expr) => (
                      <div
                        key={expr}
                        className="rounded bg-muted px-2 py-1 text-xs text-foreground"
                      >
                        "{expr}"
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Full profile document */}
          <Card className="lg:col-span-2">
            <CardContent className="pt-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Documento Completo do Voice Profile
              </h3>
              <div className="max-h-64 overflow-y-auto rounded-lg bg-muted p-4">
                <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">
                  {voiceProfile.full_profile_document}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate section (when no profile yet or when ownProfile exists) */}
      {ownProfile && !voiceProfile && ownReels.length > 0 && (
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Gerar Voice Profile</h3>
              </div>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating || selectedReels.size < 3}
              >
                {generating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <>
                    <Mic className="size-3" />
                    Gerar ({selectedReels.size} selecionados)
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Selecione pelo menos 5 vídeos para um resultado mais preciso (mínimo 3).
            </p>

            <ModelSelector compact />

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ownReels.map((reel) => (
                <button
                  key={reel.id}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                    selectedReels.has(reel.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  onClick={() => toggleReel(reel.id)}
                >
                  {reel.thumbnail_url ? (
                    <img
                      src={reel.thumbnail_url}
                      alt=""
                      className="size-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {reel.caption?.slice(0, 50) ?? 'Sem legenda'}
                    </p>
                    <Badge className="mt-0.5 bg-accent/20 text-accent text-[10px]">
                      {reel.engagement_score} eng
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ownProfile && ownReels.length === 0 && !voiceProfile && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-16">
          <Mic className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum reel encontrado no seu perfil
          </p>
          <p className="text-xs text-muted-foreground">
            Faça o scraping do seu perfil primeiro
          </p>
        </div>
      )}
    </div>
  )
}
