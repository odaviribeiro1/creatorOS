import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Download, Loader2, Mic, Check, X, AlertCircle, Film } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { scrapeProfile, generateVoiceProfile, getJobStatus } from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/utils'
import supabase from '@/lib/supabase'
import type { Profile } from '@/types'

type ButtonStatus = 'idle' | 'starting' | 'processing' | 'success' | 'error'

interface ProfileCardProps {
  profile: Profile
  onScrapeComplete?: () => void
}

export function ProfileCard({ profile, onScrapeComplete }: ProfileCardProps) {
  const navigate = useNavigate()
  const modelProvider = useAppStore((s) => s.modelProvider)
  const modelId = useAppStore((s) => s.modelId)

  const [scrapeStatus, setScrapeStatus] = useState<ButtonStatus>('idle')
  const [scrapeProgress, setScrapeProgress] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<ButtonStatus>('idle')
  const [voiceProgress, setVoiceProgress] = useState(0)
  const [hasVoiceProfile, setHasVoiceProfile] = useState<boolean | null>(null)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  // Poll job status until done
  const pollJob = useCallback(
    (
      jobId: string,
      setStatus: (s: ButtonStatus) => void,
      setProgress: (p: number) => void,
      setError: (e: string | null) => void,
      onComplete?: () => void
    ) => {
      let cancelled = false

      async function poll() {
        while (!cancelled) {
          try {
            const job = await getJobStatus(jobId)
            setProgress(job.progress)

            if (job.status === 'completed') {
              setStatus('success')
              setProgress(100)
              onComplete?.()
              setTimeout(() => {
                if (!cancelled) setStatus('idle')
              }, 4000)
              return
            }
            if (job.status === 'failed') {
              setStatus('error')
              setError(job.error_message ?? 'Falha no processamento')
              setTimeout(() => {
                if (!cancelled) setStatus('idle')
              }, 8000)
              return
            }
          } catch {
            // Continue polling
          }
          await new Promise((r) => setTimeout(r, 3000))
        }
      }

      poll()
      return () => { cancelled = true }
    },
    []
  )

  // Check if voice profile exists (own profiles only)
  useEffect(() => {
    if (profile.profile_type !== 'own' || hasVoiceProfile !== null) return
    supabase
      .from('voice_profiles')
      .select('id')
      .eq('profile_id', profile.id)
      .limit(1)
      .then(({ data }) => {
        setHasVoiceProfile((data ?? []).length > 0)
      })
  }, [profile.id, profile.profile_type, hasVoiceProfile])

  async function handleScrape(e: React.MouseEvent) {
    e.stopPropagation()
    setScrapeError(null)
    setScrapeStatus('starting')
    setScrapeProgress(0)
    try {
      const { job_id } = await scrapeProfile([profile.instagram_username])
      setScrapeStatus('processing')
      pollJob(job_id, setScrapeStatus, setScrapeProgress, setScrapeError, onScrapeComplete)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setScrapeError(msg)
      setScrapeStatus('error')
      setTimeout(() => setScrapeStatus('idle'), 8000)
    }
  }

  async function handleAnalyzeVoice(e: React.MouseEvent) {
    e.stopPropagation()
    setVoiceError(null)
    setVoiceStatus('starting')
    setVoiceProgress(0)
    try {
      const { data: reels } = await supabase
        .from('reels')
        .select('id')
        .eq('profile_id', profile.id)
        .order('engagement_score', { ascending: false })
        .limit(10)

      const reelIds = (reels ?? []).map((r: { id: string }) => r.id)
      if (reelIds.length === 0) {
        setVoiceError('Processe o perfil primeiro para ter reels disponíveis')
        setVoiceStatus('error')
        setTimeout(() => setVoiceStatus('idle'), 5000)
        return
      }

      const { job_id } = await generateVoiceProfile(profile.id, reelIds, modelProvider, modelId)
      setVoiceStatus('processing')
      pollJob(job_id, setVoiceStatus, setVoiceProgress, setVoiceError, () => {
        setHasVoiceProfile(true)
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setVoiceError(msg)
      setVoiceStatus('error')
      setTimeout(() => setVoiceStatus('idle'), 8000)
    }
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:ring-primary/30"
      onClick={() => navigate(`/profiles/${profile.id}/reels`)}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          {profile.profile_pic_url ? (
            <img
              src={profile.profile_pic_url}
              alt={profile.instagram_username}
              className="size-10 rounded-full object-cover ring-1 ring-border"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
              {profile.instagram_username.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">
              @{profile.instagram_username}
            </CardTitle>
            {profile.full_name && (
              <p className="truncate text-xs text-muted-foreground">
                {profile.full_name}
              </p>
            )}
          </div>
          <Badge
            variant={profile.profile_type === 'own' ? 'default' : 'secondary'}
            className={
              profile.profile_type === 'own'
                ? 'bg-accent/20 text-accent'
                : 'bg-blue-500/20 text-blue-400'
            }
          >
            {profile.profile_type === 'own' ? 'Meu Perfil' : 'Referência'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="size-3.5" />
            <span>
              {profile.followers_count !== null
                ? formatNumber(profile.followers_count)
                : '—'}{' '}
              seguidores
            </span>
          </div>
          {profile.last_scraped_at && (
            <span>Atualizado {formatDate(profile.last_scraped_at)}</span>
          )}
        </div>

        {/* Scrape button */}
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="xs"
            className={cn(
              'w-full transition-all duration-300',
              scrapeStatus === 'processing' && 'border-primary/50 bg-primary/5 text-primary',
              scrapeStatus === 'success' && 'border-accent/50 bg-accent/10 text-accent',
              scrapeStatus === 'error' && 'border-destructive/50 bg-destructive/10 text-destructive',
            )}
            onClick={handleScrape}
            disabled={scrapeStatus === 'starting' || scrapeStatus === 'processing'}
          >
            {scrapeStatus === 'idle' && (
              <>
                <Download className="size-3" />
                Processar
              </>
            )}
            {scrapeStatus === 'starting' && (
              <>
                <Loader2 className="size-3 animate-spin" />
                Iniciando...
              </>
            )}
            {scrapeStatus === 'processing' && (
              <>
                <Loader2 className="size-3 animate-spin" />
                Processando{scrapeProgress > 0 ? ` ${scrapeProgress}%` : '...'}
              </>
            )}
            {scrapeStatus === 'success' && (
              <>
                <Check className="size-3" />
                Concluído!
              </>
            )}
            {scrapeStatus === 'error' && (
              <>
                <X className="size-3" />
                Falhou — tentar novamente
              </>
            )}
          </Button>

          {/* Progress bar */}
          {(scrapeStatus === 'processing' || scrapeStatus === 'starting') && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  scrapeStatus === 'starting' ? 'bg-primary/50 animate-pulse w-full' : 'bg-primary'
                )}
                style={scrapeStatus === 'processing' ? { width: `${Math.max(scrapeProgress, 5)}%` } : undefined}
              />
            </div>
          )}

          {scrapeError && scrapeStatus === 'error' && (
            <div className="flex items-start gap-1.5 rounded bg-destructive/5 px-2 py-1">
              <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
              <p className="text-[10px] leading-tight text-destructive line-clamp-2">{scrapeError}</p>
            </div>
          )}
        </div>

        {/* Voice profile button (own profiles only) */}
        {profile.profile_type === 'own' && (
          <div className="space-y-1.5">
            <Button
              variant="outline"
              size="xs"
              className={cn(
                'w-full transition-all duration-300',
                voiceStatus === 'processing' && 'border-primary/50 bg-primary/5 text-primary',
                voiceStatus === 'success' && 'border-accent/50 bg-accent/10 text-accent',
                voiceStatus === 'error' && 'border-destructive/50 bg-destructive/10 text-destructive',
                hasVoiceProfile && voiceStatus === 'idle' && 'border-accent/30 text-accent',
              )}
              onClick={handleAnalyzeVoice}
              disabled={
                voiceStatus === 'starting' ||
                voiceStatus === 'processing' ||
                (hasVoiceProfile === true && voiceStatus === 'idle')
              }
            >
              {voiceStatus === 'idle' && hasVoiceProfile && (
                <>
                  <Check className="size-3" />
                  Tom de fala salvo
                </>
              )}
              {voiceStatus === 'idle' && !hasVoiceProfile && (
                <>
                  <Mic className="size-3" />
                  Analisar tom de fala
                </>
              )}
              {voiceStatus === 'starting' && (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Iniciando análise...
                </>
              )}
              {voiceStatus === 'processing' && (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Analisando tom{voiceProgress > 0 ? ` ${voiceProgress}%` : '...'}
                </>
              )}
              {voiceStatus === 'success' && (
                <>
                  <Check className="size-3" />
                  Tom salvo!
                </>
              )}
              {voiceStatus === 'error' && (
                <>
                  <X className="size-3" />
                  Falhou — tentar novamente
                </>
              )}
            </Button>

            {(voiceStatus === 'processing' || voiceStatus === 'starting') && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    voiceStatus === 'starting' ? 'bg-primary/50 animate-pulse w-full' : 'bg-primary'
                  )}
                  style={voiceStatus === 'processing' ? { width: `${Math.max(voiceProgress, 5)}%` } : undefined}
                />
              </div>
            )}

            {voiceError && voiceStatus === 'error' && (
              <div className="flex items-start gap-1.5 rounded bg-destructive/5 px-2 py-1">
                <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                <p className="text-[10px] leading-tight text-destructive line-clamp-2">{voiceError}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
