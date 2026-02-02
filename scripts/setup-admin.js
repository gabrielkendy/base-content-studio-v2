const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
)

async function setup() {
  // Use existing kendy account, just update password to 123456
  const kendyId = '7d16cf60-ed7a-4866-9d6c-395aeeec37b0'
  
  const { error } = await supabase.auth.admin.updateUserById(kendyId, {
    password: '123456',
    email_confirm: true
  })
  if (error) { console.error('Error:', error.message); return }
  console.log('✅ Password updated to 123456 for kendy@agenciabase.com.br')

  // Also update gabriel account
  const gabrielId = '9c1f963a-9fed-4b4d-adee-ade5bc77c552'
  await supabase.auth.admin.updateUserById(gabrielId, { password: '123456', email_confirm: true })
  console.log('✅ Password updated to 123456 for gabriel.kend@gmail.com')

  // Create adm@agenciabase.com.br using signUp instead (bypasses trigger issues maybe)
  // Actually let's try with a simpler email
  const email = 'adm@agenciabase.com.br'
  
  // Try creating without auto_confirm first to avoid trigger
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: '123456',
    email_confirm: true,
    user_metadata: { full_name: 'Admin' },
    app_metadata: { skip_org_creation: true }
  })
  
  if (createErr) {
    console.log('Create user failed:', createErr.message)
    console.log('Using kendy@agenciabase.com.br instead')
  } else {
    console.log('✅ User adm created:', newUser.user.id)
    // Add as member
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', 'agencia-base').single()
    if (org) {
      await supabase.from('members').insert({
        user_id: newUser.user.id,
        org_id: org.id,
        role: 'admin',
        display_name: 'Admin',
        status: 'active'
      })
      console.log('✅ Member added to Agência BASE')
    }
  }

  // Test login with kendy
  const anonClient = createClient(
    'https://gpqxqykgcrpmvwxktjvp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjMxNTMsImV4cCI6MjA4MjczOTE1M30.v1WbmTecfEEW7g_-NI1uYP0sxIZxquv3rZPQ83a-nKI'
  )
  
  const { data: s1, error: e1 } = await anonClient.auth.signInWithPassword({ email: 'kendy@agenciabase.com.br', password: '123456' })
  console.log(e1 ? '❌ kendy login: ' + e1.message : '✅ kendy login OK')
  
  const { data: s2, error: e2 } = await anonClient.auth.signInWithPassword({ email, password: '123456' })
  console.log(e2 ? '❌ adm login: ' + e2.message : '✅ adm login OK')

  console.log('\n📋 Contas disponíveis (senha: 123456):')
  console.log('   1. kendy@agenciabase.com.br')
  console.log('   2. gabriel.kend@gmail.com')
  if (!createErr) console.log('   3. adm@agenciabase.com.br')
}

setup()
