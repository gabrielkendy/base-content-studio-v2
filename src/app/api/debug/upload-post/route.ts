import { NextResponse } from 'next/server'

const API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const API_KEY = process.env.UPLOAD_POST_API_KEY

export async function GET() {
  // Test basic connectivity
  const hasKey = !!API_KEY
  const keyLength = API_KEY?.length || 0
  const keyPrefix = API_KEY?.substring(0, 20) || 'NOT_SET'

  // Try to create a test profile
  let testResult = null
  let testError = null

  if (hasKey) {
    try {
      const res = await fetch(`${API_URL}/api/uploadposts/users/debug_test_${Date.now()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Apikey ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      testResult = {
        status: res.status,
        statusText: res.statusText,
        body: data,
      }
    } catch (err: any) {
      testError = err.message
    }
  }

  return NextResponse.json({
    env: {
      UPLOAD_POST_API_URL: API_URL,
      UPLOAD_POST_API_KEY_SET: hasKey,
      UPLOAD_POST_API_KEY_LENGTH: keyLength,
      UPLOAD_POST_API_KEY_PREFIX: keyPrefix,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    },
    test: testResult,
    testError,
    timestamp: new Date().toISOString(),
  })
}
