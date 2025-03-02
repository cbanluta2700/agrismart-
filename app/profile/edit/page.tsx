import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/profile-form';

const EditProfilePage = async () => {
  const session = await auth();
  if (!session?.user?.email) {
    return <div>Not authenticated</div>;
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    include: { user: true }
  });

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>
      <ProfileForm profile={profile} />
    </div>
  );
};

export default EditProfilePage;
