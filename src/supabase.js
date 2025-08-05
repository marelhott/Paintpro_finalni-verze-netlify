
import { createClient } from '@supabase/supabase-js'

// Pro Vite používáme import.meta.env s bezpečnými fallback hodnotami
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lseqrqmtjymukewnejdd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw'

// Debug output pro kontrolu
console.log('🔧 Supabase URL:', supabaseUrl ? 'OK' : 'CHYBÍ')
console.log('🔧 Supabase Key:', supabaseAnonKey ? 'OK' : 'CHYBÍ')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Chybí Supabase konfigurace v environment variables!')
  console.error('Zkontrolujte Secrets v Replit:')
  console.error('- VITE_SUPABASE_URL = https://lseqrqmtjymukewnejdd.supabase.co')
  console.error('- VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzZXFycW10anltdWtld25lamRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNjQ2MjcsImV4cCI6MjA2Nzg0MDYyN30.SgWjc-GETZ_D0tJNtErxXhUaH6z_MgRJtxc94RsUXPw')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
