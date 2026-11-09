import { createClient } from "@supabase/supabase-js"

export const SUPABASE_URL = "https://<project>.supabase.co"
export const SUPABASE_ANON_KEY = "<anon key>"

export const isDemoMode = SUPABASE_URL.includes("<project>")
export const db = createClient(
  isDemoMode ? "https://demo.supabase.co" : SUPABASE_URL,
  isDemoMode ? "demo-anon-key" : SUPABASE_ANON_KEY,
)
