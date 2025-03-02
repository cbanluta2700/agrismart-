import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const ProfilePage = async () => {
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
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <p>{profile.user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Bio</label>
              <p>{profile.bio || 'No bio provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Location</label>
              <p>{profile.location || 'No location provided'}</p>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Website</label>
              <p>{profile.website || 'No website provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <p>{profile.phoneNumber || 'No phone number provided'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
