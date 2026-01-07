import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Função auxiliar para obter token do localStorage
export function getAccessToken(): string | null {
  try {
    const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
    const storedSession = localStorage.getItem(storageKey)
    if (storedSession) {
      const parsed = JSON.parse(storedSession)
      return parsed.access_token || null
    }
  } catch {
    // Ignorar erros
  }
  return null
}

// Função para fazer queries REST diretas (fallback quando SDK trava)
export async function fetchFromSupabase<T>(
  table: string,
  options: {
    select?: string
    filters?: Array<{ column: string; operator: string; value: string | number }>
    order?: { column: string; ascending?: boolean }
    limit?: number
    single?: boolean
  } = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const token = getAccessToken()
    if (!token) {
      return { data: null, error: new Error('No access token') }
    }

    let url = `${supabaseUrl}/rest/v1/${table}?`
    
    // Select
    if (options.select) {
      url += `select=${encodeURIComponent(options.select)}&`
    }
    
    // Filters
    if (options.filters) {
      for (const filter of options.filters) {
        url += `${filter.column}=${filter.operator}.${encodeURIComponent(String(filter.value))}&`
      }
    }
    
    // Order
    if (options.order) {
      url += `order=${options.order.column}.${options.order.ascending ? 'asc' : 'desc'}&`
    }
    
    // Limit
    if (options.limit) {
      url += `limit=${options.limit}&`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorBody = await response.json()
      return { data: null, error: new Error(errorBody.message || 'Query failed') }
    }

    const result = await response.json()
    
    if (options.single) {
      return { data: Array.isArray(result) ? result[0] ?? null : result, error: null }
    }
    
    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err as Error }
  }
}

