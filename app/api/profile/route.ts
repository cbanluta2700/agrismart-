import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();

  try {
    const updatedProfile = await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        bio: data.bio,
        location: data.location,
        website: data.website,
        phoneNumber: data.phoneNumber,
        jobTitle: data.jobTitle,
        company: data.company,
        twitter: data.twitter,
        github: data.github,
        linkedin: data.linkedin,
        theme: data.theme,
        language: data.language,
        timezone: data.timezone,
        profileVisibility: data.profileVisibility,
        showEmail: data.showEmail,
        showLocation: data.showLocation,
        notifyMarketing: data.notifyMarketing,
        notifySecurity: data.notifySecurity,
        notifyUpdates: data.notifyUpdates,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
