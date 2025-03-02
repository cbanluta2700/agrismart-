import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs';

export async function GET(request: Request) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // 'all', 'posts', 'groups', 'users'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Define base filters for searching
    const searchFilter = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Handle group visibility filtering
    const groupsFilter = userId
      ? {
          OR: [
            { isPrivate: false },
            {
              isPrivate: true,
              members: {
                some: {
                  userId,
                },
              },
            },
          ],
        }
      : { isPrivate: false };

    // Results container
    let results: any = {
      posts: [],
      groups: [],
      postsCount: 0,
      groupsCount: 0,
      pagination: {
        page,
        limit,
        totalPages: 0,
        totalItems: 0,
      },
    };

    // Search posts
    if (type === 'all' || type === 'posts') {
      const [posts, postsCount] = await Promise.all([
        prisma.forumPost.findMany({
          where: {
            ...searchFilter,
            hidden: false,
            group: groupsFilter,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                comments: true,
                likes: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: type === 'posts' ? skip : 0,
          take: type === 'posts' ? limit : 5, // Limited preview if searching all
        }),
        prisma.forumPost.count({
          where: {
            ...searchFilter,
            hidden: false,
            group: groupsFilter,
          },
        }),
      ]);

      results.posts = posts;
      results.postsCount = postsCount;
    }

    // Search groups
    if (type === 'all' || type === 'groups') {
      const [groups, groupsCount] = await Promise.all([
        prisma.group.findMany({
          where: {
            ...searchFilter,
            ...groupsFilter,
          },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                members: true,
                posts: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: type === 'groups' ? skip : 0,
          take: type === 'groups' ? limit : 5, // Limited preview if searching all
        }),
        prisma.group.count({
          where: {
            ...searchFilter,
            ...groupsFilter,
          },
        }),
      ]);

      results.groups = groups;
      results.groupsCount = groupsCount;
    }

    // Calculate pagination info
    const totalItems =
      type === 'posts'
        ? results.postsCount
        : type === 'groups'
        ? results.groupsCount
        : results.postsCount + results.groupsCount;

    results.pagination = {
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error('[SEARCH_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
