import { Metadata } from 'next';
import NotificationsView from './notifications-view';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Notifications | AgriSmart',
  description: 'View and manage your notifications',
};

export default async function NotificationsPage() {
  const session = await auth();
  
  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/notifications');
  }
  
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      <NotificationsView />
    </div>
  );
}
