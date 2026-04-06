import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, Film, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReelCard } from '@/components/reels/ReelCard'
import { useProfiles } from '@/hooks/useProfiles'
import { useAppStore } from '@/store'
import { formatNumber } from '@/lib/utils'
import supabase from '@/lib/supabase'
import type { Reel } from '@/types'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { profiles, loading: profilesLoading } = useProfiles()
  const activeJobs = useAppStore((s) => s.activeJobs)
  const user = useAppStore((s) => s.user)

  const [topReels, setTopReels] = useState<Reel[]>([])
  const [reelsLoading, setReelsLoading] = useState(false)
  const [totalReels, setTotalReels] = useState(0)

  useEffect(() => {
    if (!user || profiles.length === 0) return

    async function fetchTopReels() {
      setReelsLoading(true)
      const profileIds = profiles.map((p) => p.id)

      const { data, count } = await supabase
        .from('reels')
        .select('*', { count: 'exact' })
        .in('profile_id', profileIds)
        .order('engagement_score', { ascending: false })
        .limit(8)

      setTopReels((data ?? []) as Reel[])
      setTotalReels(count ?? 0)
      setReelsLoading(false)
    }

    fetchTopReels()
  }, [user, profiles])

  const activeJobCount = activeJobs.filter(
    (j) => j.status === 'pending' || j.status === 'processing'
  ).length

  const stats = [
    {
      title: 'Perfis',
      value: profiles.length,
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Reels',
      value: totalReels,
      icon: Film,
      color: 'text-blue-400',
    },
    {
      title: 'Top Engagement',
      value: topReels[0]?.engagement_score ?? 0,
      icon: TrendingUp,
      color: 'text-accent',
    },
    {
      title: 'Jobs Ativos',
      value: activeJobCount,
      icon: Zap,
      color: 'text-yellow-400',
    },
  ]

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-primary/10 p-6">
          <Zap className="size-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Bem-vindo ao Creator OS</h2>
        <p className="max-w-md text-center text-muted-foreground">
          Comece adicionando perfis do Instagram para extrair e analisar
          conteúdos virais.
        </p>
        <Button onClick={() => navigate('/profiles')} className="mt-2">
          Adicionar Perfis
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-muted p-3">
                <stat.icon className={`size-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active jobs */}
      {activeJobCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-sm">
              {activeJobCount} job{activeJobCount > 1 ? 's' : ''} em
              processamento...
            </span>
          </CardContent>
        </Card>
      )}

      {/* Top viral reels */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Ranking Viral</CardTitle>
            <Badge variant="secondary">{totalReels} reels</Badge>
          </div>
          {profiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/profiles/${profiles[0].id}/reels`)}
            >
              Ver todos
              <ArrowRight className="ml-1 size-3" />
            </Button>
          )}
        </div>

        {reelsLoading ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-[9/16] bg-muted" />
                <CardContent className="space-y-2 pt-2">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : topReels.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {topReels.map((reel, index) => (
              <div key={reel.id} className="relative">
                {index < 3 && (
                  <Badge className="absolute -left-2 -top-2 z-10 bg-accent text-accent-foreground">
                    #{index + 1}
                  </Badge>
                )}
                <ReelCard reel={reel} />
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum reel encontrado ainda. Inicie o scraping de um perfil.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
