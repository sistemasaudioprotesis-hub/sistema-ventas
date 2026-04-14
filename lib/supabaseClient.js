import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'ACA_TU_URL'
const supabaseAnonKey = 'ACA_TU_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
