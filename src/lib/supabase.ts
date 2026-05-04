import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Configure-as em Vercel → Settings → Environment Variables (produção) ou no arquivo .env (dev local). ' +
    'Veja README.md para o passo a passo.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
