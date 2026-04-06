import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, Share2, Eye, Clock, Film } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatDate, formatDuration } from '@/lib/utils'
import type { Reel } from '@/types'

interface ReelCardProps {
  reel: Reel
}

export function ReelCard({ reel }: ReelCardProps) {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const caption = reel.caption
    ? reel.caption.length > 80
      ? `${reel.caption.slice(0, 80)}...`
      : reel.caption
    : 'Sem legenda'

  return (
    <Card
      className="cursor-pointer overflow-hidden"
      onClick={() => navigate(`/analysis/${reel.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] w-full overflow-hidden">
        {reel.thumbnail_url && !imgError ? (
          <img
            src={reel.thumbnail_url}
            alt={caption}
            className="size-full object-cover"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-[rgba(59,130,246,0.15)] to-[rgba(37,99,235,0.05)]">
            <Film className="size-8 text-muted-foreground/50" />
          </div>
        )}
        {reel.duration_seconds !== null && (
          <Badge
            variant="secondary"
            className="absolute bottom-1.5 right-1.5 bg-black/70 text-white border-0"
          >
            <Clock className="size-3" />
            {formatDuration(reel.duration_seconds)}
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-col gap-2 pt-2">
        {/* Caption */}
        <p className="line-clamp-2 text-xs text-muted-foreground">{caption}</p>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Heart className="size-3 text-red-400" />
            <span>{formatNumber(reel.likes_count)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="size-3 text-[#60A5FA]" />
            <span>{formatNumber(reel.comments_count)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="size-3 text-accent" />
            <span>{formatNumber(reel.shares_count)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="size-3 text-[#3B82F6]" />
            <span>{formatNumber(reel.views_count)}</span>
          </div>
        </div>

        {/* Engagement + date */}
        <div className="flex items-center justify-between border-t border-[rgba(59,130,246,0.08)] pt-2">
          <Badge className="bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.25)]">
            {formatNumber(reel.engagement_score)} eng
          </Badge>
          {reel.posted_at && (
            <span className="text-[10px] text-muted-foreground">
              {formatDate(reel.posted_at)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
