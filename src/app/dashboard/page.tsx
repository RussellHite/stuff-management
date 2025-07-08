import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Redirect to the household dashboard
  redirect('/dashboard/household')
}