import { useCallback, useEffect, useState } from 'react'
import supabase from '@/lib/supabase'
import type { ContentAnalysis, Transcription } from '@/types'

export function useAnalysis(reelId: string | undefined) {
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null)
  const [transcription, setTranscription] = useState<Transcription | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = useCallback(async () => {
    if (!reelId) {
      setAnalysis(null)
      setTranscription(null)
      return
    }

    setLoading(true)
    setError(null)

    const [analysisResult, transcriptionResult] = await Promise.all([
      supabase
        .from('content_analyses')
        .select('*')
        .eq('reel_id', reelId)
        .maybeSingle(),
      supabase
        .from('transcriptions')
        .select('*')
        .eq('reel_id', reelId)
        .maybeSingle(),
    ])

    if (analysisResult.error && analysisResult.error.code !== 'PGRST116') {
      setError(analysisResult.error.message)
    } else {
      setAnalysis((analysisResult.data as ContentAnalysis) ?? null)
    }

    if (!transcriptionResult.error) {
      setTranscription((transcriptionResult.data as Transcription) ?? null)
    }

    setLoading(false)
  }, [reelId])

  useEffect(() => {
    fetchAnalysis()
  }, [fetchAnalysis])

  return { analysis, transcription, loading, error, refetch: fetchAnalysis }
}

export function useAnalysisList() {
  const [analyses, setAnalyses] = useState<
    (ContentAnalysis & { reel?: { caption: string | null; thumbnail_url: string | null; engagement_score: number; views_count: number; posted_at: string | null; profile_id: string; profile: { instagram_username: string } | null } })[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalyses = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('content_analyses')
      .select('*, reel:reels(caption, thumbnail_url, engagement_score, views_count, posted_at, profile_id, profile:profiles(instagram_username))')
      .order('analyzed_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setAnalyses((data ?? []) as typeof analyses)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAnalyses()
  }, [fetchAnalyses])

  return { analyses, loading, error, refetch: fetchAnalyses }
}
