/**
 * Upload-Post API client
 * Server-side only - protects API key
 */

const API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const API_KEY = process.env.UPLOAD_POST_API_KEY!

function headers(): Record<string, string> {
  return {
    'Authorization': `ApiKey ${API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export interface UploadPostSocialAccount {
  username?: string
  display_name?: string
  social_images?: string
}

export interface UploadPostProfile {
  created_at: string
  social_accounts: Record<string, UploadPostSocialAccount | string | null>
  username: string
}

/**
 * Create a user profile in Upload-Post
 */
export async function createProfile(username: string): Promise<{ success: boolean; profile?: UploadPostProfile; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username }),
    })

    const data = await res.json()

    if (res.status === 409) {
      // Profile already exists - that's fine for lazy creation
      return { success: true, profile: data.profile }
    }

    if (!res.ok) {
      return { success: false, error: data.message || `HTTP ${res.status}` }
    }

    return { success: true, profile: data.profile }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Get a specific user profile
 */
export async function getProfile(username: string): Promise<{ success: boolean; profile?: UploadPostProfile; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: headers(),
    })

    const data = await res.json()

    if (res.status === 404) {
      return { success: false, error: 'not_found' }
    }

    if (!res.ok) {
      return { success: false, error: data.message || `HTTP ${res.status}` }
    }

    return { success: true, profile: data.profile }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Ensure a profile exists (lazy creation)
 */
export async function ensureProfile(username: string): Promise<{ success: boolean; profile?: UploadPostProfile; error?: string }> {
  // Try to get existing profile
  const existing = await getProfile(username)
  if (existing.success && existing.profile) {
    return existing
  }

  // Create if not found
  return createProfile(username)
}

/**
 * Generate JWT connect URL
 */
export async function generateJwtUrl(params: {
  username: string
  redirect_url?: string
  logo_image?: string
  connect_title?: string
  connect_description?: string
  platforms?: string[]
  show_calendar?: boolean
}): Promise<{ success: boolean; access_url?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users/generate-jwt`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(params),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.message || `HTTP ${res.status}` }
    }

    return { success: true, access_url: data.access_url }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Delete a user profile
 */
export async function deleteProfile(username: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ username }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.message || `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Parse social_accounts from Upload-Post into a normalized array
 */
export function parseSocialAccounts(
  socialAccounts: Record<string, UploadPostSocialAccount | string | null>
): Array<{
  platform: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
  connected: boolean
}> {
  const result: Array<{
    platform: string
    display_name: string | null
    avatar_url: string | null
    username: string | null
    connected: boolean
  }> = []

  for (const [platform, value] of Object.entries(socialAccounts)) {
    if (value && typeof value === 'object' && (value.display_name || value.username)) {
      result.push({
        platform,
        display_name: value.display_name || null,
        avatar_url: value.social_images || null,
        username: value.username || null,
        connected: true,
      })
    }
    // Skip empty strings, nulls, or objects without any useful data
  }

  return result
}

/**
 * Build the Upload-Post username for a client
 */
export function buildUsername(orgId: string, clienteId: string): string {
  return `org_${orgId}_client_${clienteId}`
}
