import { GetServerSideProps } from 'next';
import { useSession } from 'next-auth/react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import AdminLayout from '@/components/layouts/AdminLayout';
import BulkModerationPanel from '@/components/admin/moderation/BulkModerationPanel';
import Head from 'next/head';

export default function BulkModerationPage() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">Access denied. Please sign in.</div>;
  }
  
  return (
    <AdminLayout>
      <Head>
        <title>Bulk Resource Moderation - AgriSmart Admin</title>
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Bulk Resource Moderation</h1>
          <p className="mt-2 text-sm text-gray-500">
            Efficiently manage multiple resources at once. Select resources and apply actions in bulk.
          </p>
        </div>
        
        <BulkModerationPanel />
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/admin/resources/bulk-moderation',
        permanent: false,
      },
    };
  }
  
  // Check for admin or moderator role
  const userRole = session.user?.role;
  if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}
