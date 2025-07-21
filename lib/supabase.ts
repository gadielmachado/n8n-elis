import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cache para clientes Supabase
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Função para validar e obter variáveis de ambiente
function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set. Please check your .env file or Vercel environment variables.`)
  }
  return value
}

// Cliente público (frontend) - lazy loading
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = getEnvVar('SUPABASE_URL')
    const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY')
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

// Cliente administrativo (backend/APIs) - lazy loading
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = getEnvVar('SUPABASE_URL')
    const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_KEY')
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return _supabaseAdmin
}

// Exportações para compatibilidade (lazy)
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  }
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient]
  }
})

// Tipos do banco de dados
export interface DatabaseContact {
  id: string
  phone: string
  name?: string
  push_name?: string
  avatar_url?: string
  last_seen?: string
  created_at: string
  updated_at: string
}

export interface DatabaseConversation {
  id: string
  contact_id: string
  remote_jid: string
  status: 'active' | 'archived' | 'blocked'
  last_message_at?: string
  messages_count: number
  created_at: string
  updated_at: string
  contact?: DatabaseContact
}

export interface DatabaseMessage {
  id: string
  conversation_id: string
  contact_id: string
  content?: string
  message_type: string
  from_me: boolean
  status: string
  timestamp: string
  created_at: string
  metadata?: any
}

export interface DashboardMetricsDB {
  id: string
  date: string
  total_leads: number
  response_rate: number
  no_response_count: number
  total_conversations: number
  conversations_today: number
  avg_response_time: number
  created_at: string
} 