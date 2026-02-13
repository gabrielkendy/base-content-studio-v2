const SUPABASE_URL = 'https://gpqxqykgcrpmvwxktjvp.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'

async function main() {
  console.log('Fetching users...')
  
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  })
  
  console.log('Status:', res.status)
  
  if (!res.ok) {
    const text = await res.text()
    console.log('Error response:', text.substring(0, 500))
    return
  }
  
  const data = await res.json()
  console.log('Total users:', data.users?.length)
  
  const user = data.users?.find(u => u.email === 'gabriel.kend@gmail.com')
  
  if (!user) {
    console.log('User not found! Available emails:')
    data.users?.forEach(u => console.log('-', u.email))
    return
  }
  
  console.log('Found user:', user.id)
  console.log('Updating password...')
  
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: 'Base@2026' })
  })
  
  console.log('Update status:', updateRes.status)
  
  if (updateRes.ok) {
    console.log('✅ SENHA ATUALIZADA!')
    console.log('Email: gabriel.kend@gmail.com')
    console.log('Senha: Base@2026')
  } else {
    const err = await updateRes.text()
    console.log('Error:', err)
  }
}

main().catch(console.error)
