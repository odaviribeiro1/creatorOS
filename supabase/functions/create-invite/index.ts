import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateInviteRequest {
  email: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const missing: string[] = []
    if (!supabaseUrl) missing.push('SUPABASE_URL')
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    if (missing.length > 0) {
      return json({
        error: `Secrets ausentes: ${missing.join(', ')}.`,
        instrucao: 'Configure em Supabase Dashboard → Project Settings → Edge Functions → Secrets.',
      }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: { persistSession: false },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Sessão inválida' }, 401)

    const { data: caller } = await supabase
      .from('app_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!caller || caller.role !== 'owner') {
      return json({ error: 'Apenas o owner pode criar convites' }, 403)
    }

    const body: CreateInviteRequest = await req.json()
    const email = (body.email || '').toLowerCase().trim()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Email inválido' }, 400)
    }

    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const inviteToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const { data: invite, error: insertErr } = await supabase
      .from('invites')
      .insert({
        email,
        token: inviteToken,
        role: 'member',
        invited_by: user.id,
      })
      .select('id, email, expires_at, created_at')
      .single()

    if (insertErr) return json({ error: insertErr.message }, 500)

    const appUrl = Deno.env.get('APP_URL') ?? ''
    const inviteUrl = appUrl ? `${appUrl}/invite?token=${inviteToken}` : `/invite?token=${inviteToken}`

    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false
    if (resendKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: Deno.env.get('EMAIL_FROM') ?? 'noreply@example.com',
            to: email,
            subject: 'Você foi convidado para o Creator OS',
            html: `<p>Você foi convidado para esta instância do Creator OS.</p>
                   <p>Acesse o link abaixo para criar sua conta (válido por 7 dias):</p>
                   <p><a href="${inviteUrl}">${inviteUrl}</a></p>`,
          }),
        })
        emailSent = resendRes.ok
      } catch {
        emailSent = false
      }
    }

    return json({
      ok: true,
      invite_id: invite.id,
      invite_url: inviteUrl,
      expires_at: invite.expires_at,
      email_sent: emailSent,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
