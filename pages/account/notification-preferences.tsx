import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import AccountLayout from '@/components/layouts/AccountLayout';
import NotificationPreferences from '@/components/account/NotificationPreferences';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export default function NotificationPreferencesPage() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">Access denied. Please sign in.</div>;
  }
  
  return (
    <AccountLayout>
      <Head>
        <title>Notification Preferences - AgriSmart</title>
      </Head>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage your notification preferences
          </p>
        </div>
        
        <NotificationPreferences />
      </div>
    </AccountLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/account/notification-preferences',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}
