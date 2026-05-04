import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { APP_NAME } from '@/lib/brand'

const missingEnv: string[] = []
if (!import.meta.env.VITE_SUPABASE_URL) missingEnv.push('VITE_SUPABASE_URL')
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missingEnv.push('VITE_SUPABASE_ANON_KEY')

if (missingEnv.length > 0) {
  document.body.innerHTML = `
    <div style="padding: 40px; font-family: 'Geist', system-ui, sans-serif; max-width: 640px; margin: 60px auto; color: #F8FAFC; background: #0A0A0F; border: 1px solid rgba(59,130,246,0.25); border-radius: 16px;">
      <h1 style="margin: 0 0 16px; font-size: 24px;">⚠️ Configuração ausente</h1>
      <p style="margin: 0 0 12px; color: #CBD5E1;">As seguintes variáveis de ambiente não foram encontradas:</p>
      <ul style="margin: 0 0 20px; padding-left: 20px; color: #F87171;">
        ${missingEnv.map((v) => `<li><code>${v}</code></li>`).join('')}
      </ul>
      <p style="margin: 0 0 12px; color: #CBD5E1;">
        Configure-as em <strong>Vercel → Settings → Environment Variables</strong> e refaça o deploy.
      </p>
      <p style="margin: 0; color: #94A3B8; font-size: 14px;">
        Veja o passo a passo completo no <code>README.md</code> do projeto, seção "Como rodar".
      </p>
    </div>
  `
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

document.title = APP_NAME
