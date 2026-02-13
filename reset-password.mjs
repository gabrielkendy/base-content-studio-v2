import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function resetPassword() {
  // List users to find the one
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.find(u => u.email === 'gabriel.kend@gmail.com')
  
  if (!user) {
    console.log('User not found!')
    console.log('Available users:', users.map(u => u.email))
    return
  }

  console.log('Found user:', user.id, user.email)

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'Base@2026'
  })

  if (error) {
    console.error('Error updating password:', error)
  } else {
    console.log('Password updated successfully!')
    console.log('New password: Base@2026')
  }
}

resetPassword()
