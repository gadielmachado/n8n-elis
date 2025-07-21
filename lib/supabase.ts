import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Cliente público (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente administrativo (backend/APIs)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
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