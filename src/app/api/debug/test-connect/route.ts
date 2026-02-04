import { NextResponse } from 'next/server'

const API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const API_KEY = process.env.UPLOAD_POST_API_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://base-content-studio-v2.vercel.app'

export async function GET() {
  const testUsername = `test_flow_${Date.now()}`
  const results: any = { steps: [] }

  // Step 1: Create profile
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: testUsername }),
    })
    const data = await res.json()
    results.steps.push({
      step: '1. Create Profile',
      status: res.status,
      success: res.ok,
      data,
    })
    if (!res.ok) {
      return NextResponse.json(results)
    }
  } catch (err: any) {
    results.steps.push({ step: '1. Create Profile', error: err.message })
    return NextResponse.json(results)
  }

  // Step 2: Generate JWT URL
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users/generate-jwt`, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: testUsername,
        redirect_url: `${APP_URL}/test-callback`,
        connect_title: 'Teste de Conexão',
        connect_description: 'Testando fluxo completo',
        platforms: ['instagram', 'tiktok'],
        show_calendar: false,
      }),
    })
    const data = await res.json()
    results.steps.push({
      step: '2. Generate JWT URL',
      status: res.status,
      success: res.ok,
      data,
    })
  } catch (err: any) {
    results.steps.push({ step: '2. Generate JWT URL', error: err.message })
  }

  // Step 3: Get profile status
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users/${testUsername}`, {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    const data = await res.json()
    results.steps.push({
      step: '3. Get Profile',
      status: res.status,
      success: res.ok,
      data,
    })
  } catch (err: any) {
    results.steps.push({ step: '3. Get Profile', error: err.message })
  }

  results.summary = {
    allPassed: results.steps.every((s: any) => s.success),
    testUsername,
    appUrl: APP_URL,
  }

  return NextResponse.json(results)
}
