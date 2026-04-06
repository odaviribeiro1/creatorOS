import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RETRIES = 3

interface AnalyzeRequest {
  reel_ids: string[]
  user_id: string
  model_provider: 'openai' | 'gemini'
  model_id: string
}

function log(level: string, message: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...data }))
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok || response.status < 500) return response
      lastError = new Error(`HTTP ${response.status}: ${await response.text()}`)
      log('warn', `Attempt ${attempt}/${retries} failed`, { status: response.status })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      log('warn', `Attempt ${attempt}/${retries} network error`, { error: lastError.message })
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 30000)))
    }
  }
  throw lastError ?? new Error('fetchWithRetry exhausted all retries')
}

async function transcribeWithWhisper(
  videoUrl: string,
  openaiKey: string
): Promise<{ full_text: string; segments: unknown[] }> {
  const videoResponse = await fetchWithRetry(videoUrl, { method: 'GET' })
  const videoBlob = await videoResponse.blob()

  const formData = new FormData()
  formData.append('file', videoBlob, 'audio.mp4')
  formData.append('model', 'whisper-1')
  formData.append('language', 'pt')
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'word')
  formData.append('timestamp_granularities[]', 'segment')

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/audio/transcriptions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error(`Whisper API failed (${response.status}): ${await response.text()}`)
  }

  const result = await response.json()
  return { full_text: result.text ?? '', segments: result.segments ?? [] }
}

// Upload video to Gemini Files API, then reference it — much faster than inline base64
async function uploadToGeminiFiles(
  videoUrl: string,
  geminiKey: string
): Promise<string | null> {
  try {
    // Download video
    const videoResponse = await fetchWithRetry(videoUrl, { method: 'GET' })
    const videoBlob = await videoResponse.blob()
    const videoSize = videoBlob.size

    log('info', `Video size: ${(videoSize / 1024 / 1024).toFixed(1)}MB`)

    // Skip if > 20MB (Gemini inline limit; Files API supports up to 2GB but slow)
    if (videoSize > 20 * 1024 * 1024) {
      log('info', 'Video too large for Gemini, skipping visual analysis')
      return null
    }

    // Upload via resumable upload to Files API
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': String(videoSize),
          'X-Goog-Upload-Header-Content-Type': 'video/mp4',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: 'reel.mp4' } }),
      }
    )

    const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL')
    if (!uploadUrl) {
      log('warn', 'No upload URL returned from Gemini Files API')
      return null
    }

    // Upload the bytes
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
        'Content-Type': 'video/mp4',
      },
      body: videoBlob,
    })

    if (!uploadResponse.ok) {
      log('warn', `Gemini file upload failed: ${uploadResponse.status}`)
      return null
    }

    const uploadResult = await uploadResponse.json()
    const fileUri = uploadResult.file?.uri
    if (!fileUri) {
      log('warn', 'No file URI in upload response')
      return null
    }

    // Wait for file to be processed (ACTIVE state)
    const fileName = uploadResult.file?.name
    for (let i = 0; i < 20; i++) {
      const statusRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${geminiKey}`
      )
      const statusData = await statusRes.json()
      if (statusData.state === 'ACTIVE') return fileUri
      if (statusData.state === 'FAILED') return null
      await new Promise((r) => setTimeout(r, 2000))
    }

    return fileUri
  } catch (err) {
    log('warn', `Gemini file upload error: ${err}`)
    return null
  }
}

async function analyzeVideoWithGemini(
  videoUrl: string,
  geminiKey: string
): Promise<Record<string, unknown>> {
  const prompt = `Analise este vídeo do Instagram Reels e retorne um JSON com:
1. transitions: [{timestamp, type, description}]
2. broll_segments: [{start_ts, end_ts, description, visual_type}]
3. text_overlays: [{start_ts, end_ts, text, style, position}]
4. sound_effects: [{timestamp, type, description}]
5. music_segments: [{start_ts, end_ts, mood, energy_level, genre}]
Timestamps em segundos. Retorne APENAS JSON válido.`

  // Try Files API first (faster for large videos)
  const fileUri = await uploadToGeminiFiles(videoUrl, geminiKey)

  let contentParts
  if (fileUri) {
    contentParts = [{ fileData: { mimeType: 'video/mp4', fileUri } }, { text: prompt }]
  } else {
    // Fallback: skip video analysis, return empty
    log('info', 'Skipping Gemini visual analysis (no file URI)')
    return {}
  }

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: contentParts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    log('warn', `Gemini API failed (${response.status}): ${errText.slice(0, 300)}`)
    return {}
  }

  const result = await response.json()
  const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    log('warn', 'Failed to parse Gemini response', { text: textContent.slice(0, 500) })
    return {}
  }
}

const STRUCTURE_PROMPT = `Analise esta transcrição de um Instagram Reel e a análise visual, e identifique a estrutura narrativa.

TRANSCRIÇÃO:
{transcription}

ANÁLISE VISUAL:
{visual}

Retorne APENAS um JSON válido com esta estrutura:
{
  "hook": { "text": "texto do hook", "start_ts": 0, "end_ts": 3, "type": "pergunta|afirmação chocante|promessa|polêmica|curiosidade", "effectiveness_score": 8 },
  "development": { "text": "resumo", "start_ts": 3, "end_ts": 25, "key_points": ["ponto 1"], "storytelling_technique": "storytelling|tutorial|lista|antes/depois|problema-solução" },
  "cta": { "text": "texto do CTA", "start_ts": 25, "end_ts": 30, "type": "seguir|comentar|compartilhar|link na bio|salvar", "strength_score": 7 },
  "viral_patterns": { "hook_type": "tipo", "pacing": "ritmo", "retention_technique": "técnica", "emotional_arc": "arco" }
}

Retorne APENAS o JSON.`

async function analyzeStructureWithOpenAI(
  transcription: string,
  visualAnalysis: Record<string, unknown>,
  openaiKey: string,
  modelId: string
): Promise<Record<string, unknown>> {
  const prompt = STRUCTURE_PROMPT
    .replace('{transcription}', transcription)
    .replace('{visual}', JSON.stringify(visualAnalysis, null, 2))

  const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API failed (${response.status}): ${await response.text()}`)
  }

  const result = await response.json()
  const text = result.choices?.[0]?.message?.content ?? '{}'
  try {
    return JSON.parse(text)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  }
}

async function analyzeStructureWithGemini(
  transcription: string,
  visualAnalysis: Record<string, unknown>,
  geminiKey: string,
  modelId: string
): Promise<Record<string, unknown>> {
  const prompt = STRUCTURE_PROMPT
    .replace('{transcription}', transcription)
    .replace('{visual}', JSON.stringify(visualAnalysis, null, 2))

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: 'application/json' },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Gemini API failed (${response.status}): ${await response.text()}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {}
  } catch {
    return {}
  }
}

async function analyzeOneReel(
  supabase: SupabaseClient,
  reelId: string,
  modelProvider: 'openai' | 'gemini',
  modelId: string,
  openaiKey: string,
  geminiKey: string
) {
  const { data: reel, error: reelError } = await supabase
    .from('reels')
    .select('*')
    .eq('id', reelId)
    .single()

  if (reelError || !reel) {
    log('warn', `Reel not found: ${reelId}`)
    return
  }

  const videoUrl = reel.storage_path
    ? supabase.storage.from('videos').getPublicUrl(reel.storage_path).data.publicUrl
    : reel.video_url

  if (!videoUrl) {
    log('warn', `No video URL for reel ${reelId}`)
    return
  }

  // 1. Transcribe with Whisper
  log('info', 'Starting Whisper transcription', { reelId })
  const whisperResult = await transcribeWithWhisper(videoUrl, openaiKey)

  await supabase.from('transcriptions').upsert(
    {
      reel_id: reelId,
      full_text: whisperResult.full_text,
      language: 'pt',
      segments: whisperResult.segments,
      whisper_model: 'whisper-1',
      processed_at: new Date().toISOString(),
    },
    { onConflict: 'reel_id' }
  )

  // 2. Analyze video visually with Gemini
  log('info', 'Starting Gemini video analysis', { reelId })
  const visualAnalysis = await analyzeVideoWithGemini(videoUrl, geminiKey)

  // 3. Analyze structure with selected model
  log('info', `Starting structure analysis with ${modelProvider}/${modelId}`, { reelId })
  let structureAnalysis: Record<string, unknown>

  if (modelProvider === 'openai') {
    structureAnalysis = await analyzeStructureWithOpenAI(
      whisperResult.full_text, visualAnalysis, openaiKey, modelId
    )
  } else {
    structureAnalysis = await analyzeStructureWithGemini(
      whisperResult.full_text, visualAnalysis, geminiKey, modelId
    )
  }

  // 4. Save content analysis
  await supabase.from('content_analyses').upsert({
    reel_id: reelId,
    hook: structureAnalysis.hook ?? { text: '', start_ts: 0, end_ts: 3, type: 'unknown', effectiveness_score: 5 },
    development: structureAnalysis.development ?? { text: '', start_ts: 3, end_ts: 20, key_points: [], storytelling_technique: 'unknown' },
    cta: structureAnalysis.cta ?? { text: '', start_ts: 20, end_ts: 30, type: 'unknown', strength_score: 5 },
    transitions: visualAnalysis.transitions ?? [],
    music_segments: visualAnalysis.music_segments ?? [],
    sound_effects: visualAnalysis.sound_effects ?? [],
    broll_segments: visualAnalysis.broll_segments ?? [],
    text_overlays: visualAnalysis.text_overlays ?? [],
    viral_patterns: structureAnalysis.viral_patterns ?? {},
    gemini_model: 'gemini-2.0-flash',
    claude_model: `${modelProvider}/${modelId}`,
    analyzed_at: new Date().toISOString(),
  }, { onConflict: 'reel_id' })
}

async function processInBackground(
  supabase: SupabaseClient,
  jobId: string,
  reelIds: string[],
  userId: string,
  modelProvider: 'openai' | 'gemini',
  modelId: string,
  openaiKey: string,
  geminiKey: string
) {
  try {
    const total = reelIds.length
    let processed = 0

    for (const reelId of reelIds) {
      log('info', `Analyzing reel ${reelId} (${processed + 1}/${total})`, { jobId })

      try {
        // Timeout per reel: 90 seconds — skip if stuck
        const result = await Promise.race([
          analyzeOneReel(supabase, reelId, modelProvider, modelId, openaiKey, geminiKey),
          new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 90_000)),
        ])

        if (result === 'timeout') {
          log('warn', `Reel ${reelId} timed out after 90s, skipping`)
        }
      } catch (err) {
        log('warn', `Reel ${reelId} failed: ${err instanceof Error ? err.message : err}, skipping`)
      }

      processed++
      await supabase.from('processing_jobs').update({
        progress: Math.round((processed / total) * 100)
      }).eq('id', jobId)
    }

    await supabase.from('processing_jobs').update({
      status: 'completed', progress: 100,
      output_data: { reels_analyzed: processed, model: `${modelProvider}/${modelId}` },
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log('error', 'Analysis job failed', { jobId, error: errorMessage })
    await supabase.from('processing_jobs').update({
      status: 'failed', error_message: errorMessage, completed_at: new Date().toISOString(),
    }).eq('id', jobId)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !openaiKey || !geminiKey) {
      throw new Error('Missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, GEMINI_API_KEY)')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: AnalyzeRequest = await req.json()
    const { reel_ids, user_id, model_provider = 'openai', model_id = 'gpt-4o' } = body

    if (!reel_ids || !Array.isArray(reel_ids) || reel_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'reel_ids must be a non-empty array' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: job, error: jobError } = await supabase
      .from('processing_jobs')
      .insert({
        user_id, job_type: 'analyze', status: 'processing', progress: 0,
        input_data: { reel_ids, model_provider, model_id },
        started_at: new Date().toISOString(),
      })
      .select('id').single()

    if (jobError || !job) throw new Error(`Failed to create job: ${jobError?.message}`)

    const backgroundTask = processInBackground(
      supabase, job.id, reel_ids, user_id, model_provider, model_id, openaiKey, geminiKey
    )

    try {
      // deno-lint-ignore no-explicit-any
      const runtime = (globalThis as any).EdgeRuntime
      if (runtime?.waitUntil) runtime.waitUntil(backgroundTask)
    } catch {
      backgroundTask.catch((err) => log('error', 'Background task failed', { error: String(err) }))
    }

    return new Response(JSON.stringify({ job_id: job.id }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log('error', 'Request handler failed', { error: errorMessage })
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
