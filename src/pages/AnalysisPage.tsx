import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Play, Loader2, Check, X, AlertCircle, Sparkles, Eye, Link } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ModelSelector } from '@/components/shared/ModelSelector'
import { useAnalysisList } from '@/hooks/useAnalysis'
import { useProfiles } from '@/hooks/useProfiles'
import { useAppStore } from '@/store'
import { analyzeContent, scrapeReelUrl, getJobStatus } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { formatNumber, formatDate } from '@/lib/utils'
import supabase from '@/lib/supabase'
import type { Reel } from '@/types'

type AnalyzeStatus = 'idle' | 'starting' | 'processing' | 'success' | 'error'

export default function AnalysisPage() {
  const navigate = useNavigate()
  const { analyses, usedInScriptReelIds, loading, refetch } = useAnalysisList()
  const { profiles } = useProfiles()
  const user = useAppStore((s) => s.user)
  const modelProvider = useAppStore((s) => s.modelProvider)
  const modelId = useAppStore((s) => s.modelId)

  const [unanalyzedReels, setUnanalyzedReels] = useState<Reel[]>([])
  const [loadingUnanalyzed, setLoadingUnanalyzed] = useState(true)
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus>('idle')
  const [analyzeProgress, setAnalyzeProgress] = useState(0)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analyzingReelIds, setAnalyzingReelIds] = useState<string[]>([])
  const [currentReelIndex, setCurrentReelIndex] = useState(0)
  const [sortBy, setSortBy] = useState<'recent' | 'views'>('views')
  const [filterProfileId, setFilterProfileId] = useState<string | 'all'>('all')
  const [reelUrlOpen, setReelUrlOpen] = useState(false)
  const [reelUrl, setReelUrl] = useState('')
  const [reelUrlStatus, setReelUrlStatus] = useState<'idle' | 'scraping' | 'analyzing' | 'success' | 'error'>('idle')
  const [reelUrlProgress, setReelUrlProgress] = useState('')
  const [reelUrlError, setReelUrlError] = useState<string | null>(null)

  async function handleAnalyzeReelUrl() {
    if (!reelUrl.trim()) return
    setReelUrlStatus('scraping')
    setReelUrlProgress('Extraindo dados do reel...')
    setReelUrlError(null)

    try {
      // Step 1: Scrape the reel URL
      const { job_id: scrapeJobId } = await scrapeReelUrl(reelUrl.trim())

      // Poll scrape job
      let reelId: string | null = null
      let done = false
      while (!done) {
        await new Promise(r => setTimeout(r, 3000))
        const job = await getJobStatus(scrapeJobId)
        if (job.status === 'completed') {
          reelId = (job.output_data as { reel_id?: string })?.reel_id ?? null
          done = true
        } else if (job.status === 'failed') {
          throw new Error(job.error_message ?? 'Falha ao extrair reel')
        }
      }

      if (!reelId) throw new Error('Reel ID não encontrado após scraping')

      // Step 2: Analyze the reel
      setReelUrlStatus('analyzing')
      setReelUrlProgress('Analisando estrutura e edição...')

      const { job_id: analyzeJobId } = await analyzeContent([reelId], modelProvider, modelId)

      done = false
      while (!done) {
        await new Promise(r => setTimeout(r, 3000))
        const job = await getJobStatus(analyzeJobId)
        if (job.status === 'completed') {
          done = true
        } else if (job.status === 'failed') {
          throw new Error(job.error_message ?? 'Falha na análise')
        }
      }

      setReelUrlStatus('success')
      setReelUrlProgress('Reel analisado com sucesso!')
      refetch()

      // Reset after delay
      setTimeout(() => {
        setReelUrlStatus('idle')
        setReelUrlOpen(false)
        setReelUrl('')
        setReelUrlProgress('')
        // Navigate to the analysis
        navigate(`/analysis/${reelId}`)
      }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setReelUrlError(msg)
      setReelUrlStatus('error')
    }
  }

  // Auto-load unanalyzed reels (top 10 per profile)
  useEffect(() => {
    if (!user || profiles.length === 0) {
      setLoadingUnanalyzed(false)
      return
    }

    async function load() {
      setLoadingUnanalyzed(true)

      const [analysesResult] = await Promise.all([
        supabase.from('content_analyses').select('reel_id'),
      ])
      const analyzedIds = new Set(
        ((analysesResult.data ?? []) as { reel_id: string }[]).map((a) => a.reel_id)
      )

      // Fetch top 10 per profile
      const allNotAnalyzed: Reel[] = []
      for (const profile of profiles) {
        const { data: reels } = await supabase
          .from('reels')
          .select('*')
          .eq('profile_id', profile.id)
          .order('engagement_score', { ascending: false })
          .limit(10)

        const notAnalyzed = ((reels ?? []) as Reel[]).filter(
          (r) => !analyzedIds.has(r.id)
        )
        allNotAnalyzed.push(...notAnalyzed)
      }

      // Sort by engagement
      allNotAnalyzed.sort((a, b) => b.engagement_score - a.engagement_score)
      setUnanalyzedReels(allNotAnalyzed)
      setLoadingUnanalyzed(false)
    }

    load()
  }, [user, profiles, analyses.length])

  async function handleAnalyze(candidateReelIds: string[]) {
    if (candidateReelIds.length === 0) return
    setAnalyzeError(null)
    setAnalyzeStatus('starting')
    setAnalyzeProgress(0)

    try {
      // Fresh check: exclude reels already analyzed
      const { data: existing } = await supabase
        .from('content_analyses')
        .select('reel_id')
        .in('reel_id', candidateReelIds)
      const alreadyAnalyzed = new Set(
        ((existing ?? []) as { reel_id: string }[]).map((a) => a.reel_id)
      )
      const reelIds = candidateReelIds.filter((id) => !alreadyAnalyzed.has(id))

      if (reelIds.length === 0) {
        setAnalyzeError('Todos esses reels já foram analisados')
        setAnalyzeStatus('error')
        setTimeout(() => setAnalyzeStatus('idle'), 4000)
        return
      }

      setAnalyzingReelIds(reelIds)
      setCurrentReelIndex(0)

      const { job_id } = await analyzeContent(reelIds, modelProvider, modelId)
      setAnalyzeStatus('processing')

      // Poll job
      let done = false
      while (!done) {
        await new Promise((r) => setTimeout(r, 3000))
        try {
          const job = await getJobStatus(job_id)
          setAnalyzeProgress(job.progress)
          // Estimate which reel is being processed
          const estimatedIndex = Math.floor((job.progress / 100) * reelIds.length)
          setCurrentReelIndex(Math.min(estimatedIndex, reelIds.length - 1))

          if (job.status === 'completed') {
            setAnalyzeStatus('success')
            setAnalyzeProgress(100)
            setCurrentReelIndex(reelIds.length)
            refetch()
            // Reload unanalyzed (top 10 per profile)
            const { data: newAnalyses } = await supabase.from('content_analyses').select('reel_id')
            const analyzedIds = new Set(((newAnalyses ?? []) as { reel_id: string }[]).map((a) => a.reel_id))
            const allNotAnalyzed: Reel[] = []
            for (const profile of profiles) {
              const { data: reels } = await supabase.from('reels').select('*').eq('profile_id', profile.id).order('engagement_score', { ascending: false }).limit(10)
              allNotAnalyzed.push(...((reels ?? []) as Reel[]).filter((r) => !analyzedIds.has(r.id)))
            }
            allNotAnalyzed.sort((a, b) => b.engagement_score - a.engagement_score)
            setUnanalyzedReels(allNotAnalyzed)

            setTimeout(() => { setAnalyzeStatus('idle'); setAnalyzingReelIds([]) }, 4000)
            done = true
          } else if (job.status === 'failed') {
            setAnalyzeStatus('error')
            setAnalyzeError(job.error_message ?? 'Falha na análise')
            setTimeout(() => setAnalyzeStatus('idle'), 8000)
            done = true
          }
        } catch {
          // Continue polling
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setAnalyzeError(msg)
      setAnalyzeStatus('error')
      setTimeout(() => setAnalyzeStatus('idle'), 8000)
    }
  }

  const sortedAnalyses = useMemo(() => {
    const sorted = [...analyses]
    if (sortBy === 'views') {
      sorted.sort((a, b) => (b.reel?.views_count ?? 0) - (a.reel?.views_count ?? 0))
    } else {
      sorted.sort((a, b) => {
        const dateA = a.reel?.posted_at ?? a.analyzed_at
        const dateB = b.reel?.posted_at ?? b.analyzed_at
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
    }
    return sorted
  }, [analyses, sortBy])

  const referenceProfiles = useMemo(
    () => profiles.filter((p) => p.profile_type === 'reference'),
    [profiles]
  )

  const groupedAnalyses = useMemo(() => {
    const filtered = filterProfileId === 'all'
      ? sortedAnalyses
      : sortedAnalyses.filter(a => a.reel?.profile_id === filterProfileId)

    const groups: Record<string, typeof sortedAnalyses> = {}
    for (const a of filtered) {
      const key = a.reel?.profile?.instagram_username ?? 'unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(a)
    }
    return groups
  }, [sortedAnalyses, filterProfileId])

  const isAnalyzing = analyzeStatus === 'starting' || analyzeStatus === 'processing'

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
          <h1 className="text-xl font-bold text-foreground">Análises</h1>
          <p className="text-sm text-muted-foreground">
            Breakdown estrutural e de edição dos reels
          </p>
        </div>
        <Button
          size="sm"
          className="btn-gradient"
          onClick={() => setReelUrlOpen(true)}
        >
          <Link className="size-3" />
          Analisar reel avulso
        </Button>
      </div>

      {/* Analyze reel by URL */}
      {reelUrlOpen && (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="size-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Analisar reel por link</span>
              </div>
              <Button variant="ghost" size="xs" onClick={() => { setReelUrlOpen(false); setReelUrlStatus('idle'); setReelUrlError(null) }}>
                <X className="size-3" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="https://www.instagram.com/reel/ABC123..."
                value={reelUrl}
                onChange={(e) => setReelUrl((e.target as HTMLInputElement).value)}
                className="glass-input flex-1"
                disabled={reelUrlStatus === 'scraping' || reelUrlStatus === 'analyzing'}
              />
              <Button
                size="sm"
                className="btn-gradient shrink-0"
                onClick={handleAnalyzeReelUrl}
                disabled={!reelUrl.trim() || reelUrlStatus === 'scraping' || reelUrlStatus === 'analyzing'}
              >
                {reelUrlStatus === 'idle' && (
                  <>
                    <Sparkles className="size-3" />
                    Analisar
                  </>
                )}
                {(reelUrlStatus === 'scraping' || reelUrlStatus === 'analyzing') && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    {reelUrlStatus === 'scraping' ? 'Extraindo...' : 'Analisando...'}
                  </>
                )}
                {reelUrlStatus === 'success' && (
                  <>
                    <Check className="size-3" />
                    Pronto!
                  </>
                )}
                {reelUrlStatus === 'error' && (
                  <>
                    <X className="size-3" />
                    Tentar novamente
                  </>
                )}
              </Button>
            </div>

            {reelUrlProgress && reelUrlStatus !== 'idle' && reelUrlStatus !== 'error' && (
              <p className="text-xs text-[#60A5FA]">{reelUrlProgress}</p>
            )}

            {reelUrlError && (
              <div className="flex items-start gap-1.5 rounded bg-[rgba(239,68,68,0.08)] px-2 py-1.5">
                <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{reelUrlError}</p>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Cole o link de qualquer Reel do Instagram. O vídeo será extraído, transcrito e analisado automaticamente.
            </p>

            <ModelSelector compact />
          </CardContent>
        </Card>
      )}

      {/* Unanalyzed reels card */}
      {loadingUnanalyzed ? (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando reels...</span>
          </CardContent>
        </Card>
      ) : unanalyzedReels.length > 0 || isAnalyzing ? (
        <Card>
          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {unanalyzedReels.length} reels sem análise
                <span className="text-[10px] text-muted-foreground ml-1">(top 10 por perfil)</span>
              </span>
              <Button
                size="sm"
                className={cn(
                  'transition-all duration-300',
                  analyzeStatus === 'processing' && 'bg-primary/80',
                  analyzeStatus === 'success' && 'bg-accent text-accent-foreground',
                  analyzeStatus === 'error' && 'bg-destructive',
                )}
                onClick={() =>
                  handleAnalyze(unanalyzedReels.slice(0, 10).map((r) => r.id))
                }
                disabled={isAnalyzing}
              >
                {analyzeStatus === 'idle' && (
                  <>
                    <Play className="size-3" />
                    Analisar top 10
                  </>
                )}
                {analyzeStatus === 'starting' && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Iniciando...
                  </>
                )}
                {analyzeStatus === 'processing' && (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Analisando {analyzeProgress}%
                  </>
                )}
                {analyzeStatus === 'success' && (
                  <>
                    <Check className="size-3" />
                    Concluído!
                  </>
                )}
                {analyzeStatus === 'error' && (
                  <>
                    <X className="size-3" />
                    Falhou — tentar novamente
                  </>
                )}
              </Button>
            </div>

            {/* Progress bar */}
            {isAnalyzing && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    analyzeStatus === 'starting' ? 'bg-primary/50 animate-pulse w-full' : 'bg-primary'
                  )}
                  style={analyzeStatus === 'processing' ? { width: `${Math.max(analyzeProgress, 3)}%` } : undefined}
                />
              </div>
            )}

            {/* Error */}
            {analyzeError && analyzeStatus === 'error' && (
              <div className="flex items-start gap-1.5 rounded bg-destructive/5 px-2 py-1.5">
                <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{analyzeError}</p>
              </div>
            )}

            {!isAnalyzing && <ModelSelector compact />}
          </CardContent>
        </Card>
      ) : profiles.length > 0 && analyses.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Todos os reels já foram analisados, ou não há reels processados ainda.
          </CardContent>
        </Card>
      ) : null}

      {/* Processing animation — always visible when analyzing */}
      {isAnalyzing && analyzingReelIds.length > 0 && (
        <Card className="border-[rgba(59,130,246,0.3)] overflow-hidden">
          {/* Animated top border */}
          <div className="h-0.5 w-full bg-[rgba(59,130,246,0.06)] overflow-hidden">
            <div className="h-full bg-primary animate-[shimmer_2s_ease-in-out_infinite]" style={{
              width: '40%',
              animation: 'shimmer 2s ease-in-out infinite',
            }} />
          </div>
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>

          <CardContent className="space-y-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="size-4 animate-pulse" />
                Processando reel {Math.min(currentReelIndex + 1, analyzingReelIds.length)} de {analyzingReelIds.length}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>Pipeline:</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                  Whisper
                </Badge>
                <span>→</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                  Gemini
                </Badge>
                <span>→</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                  {modelProvider === 'openai' ? 'GPT' : 'Gemini'}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              {analyzingReelIds.map((reelId, i) => {
                const reel = unanalyzedReels.find((r) => r.id === reelId)
                const isDone = i < currentReelIndex
                const isCurrent = i === currentReelIndex
                const isPending = i > currentReelIndex

                return (
                  <div
                    key={reelId}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-500',
                      isCurrent && 'bg-primary/10 ring-1 ring-primary/20 scale-[1.01]',
                      isDone && 'opacity-50',
                      isPending && 'opacity-40',
                    )}
                  >
                    {/* Status icon */}
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border">
                      {isDone && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-accent/20">
                          <Check className="size-3 text-accent" />
                        </div>
                      )}
                      {isCurrent && (
                        <div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
                          <Loader2 className="size-3 animate-spin text-primary" />
                        </div>
                      )}
                      {isPending && (
                        <span className="text-[9px] text-muted-foreground">{i + 1}</span>
                      )}
                    </div>

                    {/* Reel info */}
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'truncate text-xs',
                        isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground',
                      )}>
                        {reel?.caption?.split('\n')[0]?.slice(0, 70) ?? `Reel ${i + 1}`}
                      </p>
                      {isCurrent && (
                        <p className="text-[10px] text-primary animate-pulse">
                          Transcrevendo e analisando estrutura...
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        'shrink-0 text-[9px] px-1.5 py-0 h-4',
                        isDone && 'bg-accent/10 text-accent border-accent/20',
                        isCurrent && 'bg-primary/10 text-primary border-primary/20 animate-pulse',
                        isPending && 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isDone && 'concluído'}
                      {isCurrent && 'analisando'}
                      {isPending && 'na fila'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success animation */}
      {analyzeStatus === 'success' && (
        <Card className="border-[rgba(16,185,129,0.3)]">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex size-8 items-center justify-center rounded-full bg-accent/20">
              <Check className="size-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-accent">Análise concluída!</p>
              <p className="text-xs text-muted-foreground">
                {analyzingReelIds.length} reels analisados com sucesso
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort + Analyses grid */}
      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] py-16">
          <BarChart3 className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma análise concluída</p>
          <p className="text-xs text-muted-foreground">
            {unanalyzedReels.length > 0
              ? 'Clique em "Analisar top 10" acima para começar'
              : 'Processe perfis primeiro para ter reels disponíveis'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {analyses.length} {analyses.length === 1 ? 'reel analisado' : 'reels analisados'}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Ordenar:</span>
              <Button
                variant={sortBy === 'views' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSortBy('views')}
              >
                <Eye className="size-3" />
                Mais vistos
              </Button>
              <Button
                variant={sortBy === 'recent' ? 'default' : 'outline'}
                size="xs"
                onClick={() => setSortBy('recent')}
              >
                Mais recentes
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Perfil:</span>
              <select
                value={filterProfileId}
                onChange={e => setFilterProfileId(e.target.value)}
                className="rounded-lg border border-[rgba(59,130,246,0.15)] bg-[rgba(59,130,246,0.05)] px-2 py-1 text-xs text-foreground outline-none"
              >
                <option value="all">Todos</option>
                {referenceProfiles.map(p => (
                  <option key={p.id} value={p.id}>@{p.instagram_username}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedAnalyses).map(([username, profileAnalyses]) => (
              <div key={username} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">@{username}</span>
                  <Badge variant="secondary" className="border border-[rgba(59,130,246,0.2)]">
                    {profileAnalyses.length} {profileAnalyses.length === 1 ? 'reel' : 'reels'}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profileAnalyses.map((analysis) => (
                    <Card
                      key={analysis.id}
                      className="cursor-pointer transition-colors hover:border-[rgba(59,130,246,0.45)]"
                      onClick={() => navigate(`/analysis/${analysis.reel_id}`)}
                    >
                      <CardContent className="space-y-3 pt-4">
                        <div className="flex gap-3">
                          <div className="size-16 shrink-0 rounded-lg bg-muted" />
                          <div className="min-w-0 flex-1">
                            {analysis.reel?.profile?.instagram_username && (
                              <p className="text-sm font-bold text-foreground">
                                @{analysis.reel.profile.instagram_username}
                              </p>
                            )}
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {analysis.reel?.caption ?? 'Sem legenda'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]">
                                <Eye className="mr-0.5 size-2.5" />
                                {formatNumber(analysis.reel?.views_count ?? 0)} views
                              </Badge>
                              {usedInScriptReelIds.has(analysis.reel_id) && (
                                <Badge className="bg-[rgba(59,130,246,0.15)] text-[#60A5FA] text-[10px] border border-[rgba(59,130,246,0.25)]">
                                  Em roteiro
                                </Badge>
                              )}
                              {analysis.reel?.posted_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatDate(analysis.reel.posted_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1">
                          <div className="rounded bg-red-500/10 px-2 py-1 text-center">
                            <p className="text-[10px] text-red-400">Hook</p>
                            <p className="text-xs font-medium text-foreground">
                              {analysis.hook.type}
                            </p>
                          </div>
                          <div className="rounded bg-blue-500/10 px-2 py-1 text-center">
                            <p className="text-[10px] text-blue-400">Técnica</p>
                            <p className="truncate text-xs font-medium text-foreground">
                              {analysis.development.storytelling_technique}
                            </p>
                          </div>
                          <div className="rounded bg-green-500/10 px-2 py-1 text-center">
                            <p className="text-[10px] text-green-400">CTA</p>
                            <p className="text-xs font-medium text-foreground">
                              {analysis.cta.type}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
