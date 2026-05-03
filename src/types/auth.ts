// ==========================================
// Auth / Roles — Creator OS
// ==========================================

export type AppRole = 'admin' | 'operator'

export type AppUser = {
  user_id: string
  role: AppRole
  created_at: string
  updated_at: string
}
