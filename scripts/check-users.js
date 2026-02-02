const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
)
async function check() {
  const { data: { users } } = await supabase.auth.admin.listUsers()
  console.log('=== Users ===')
  for (const u of users) {
    console.log(`- ${u.email} | confirmed: ${!!u.email_confirmed_at} | created: ${u.created_at}`)
  }
  const { data: members } = await supabase.from('members').select('*, organizations(name, slug)')
  console.log('\n=== Members ===')
  for (const m of (members || [])) {
    console.log(`- ${m.display_name} | role: ${m.role} | user_id: ${m.user_id} | org: ${m.organizations?.name}`)
  }
  const { data: orgs } = await supabase.from('organizations').select('*')
  console.log('\n=== Organizations ===')
  for (const o of (orgs || [])) {
    console.log(`- ${o.name} | slug: ${o.slug} | id: ${o.id}`)
  }
}
check()
