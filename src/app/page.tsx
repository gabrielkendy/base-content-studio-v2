import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to dashboard in demo mode
  redirect('/dashboard')
}
