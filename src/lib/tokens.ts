import { randomBytes } from 'crypto'

/** Generates a cryptographically secure URL-safe token for approval links */
export function generateApprovalToken(): string {
  return randomBytes(32).toString('hex')
}
