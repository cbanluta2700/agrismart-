import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken, validateEmail, validatePassword } from '@/lib/auth/utils';
import { User } from '@/lib/auth/types';

export async function POST(request: Request) {
  console.log('[Register API] Start - Received registration request');

  try {
    // Verify database connection
    await db.$connect();
    console.log('[Register API] Database connection successful');

    const body = await request.json();
    console.log('[Register API] Request body:', JSON.stringify(body));

    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      console.log('[Register API] Missing required fields');
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      console.log('[Register API] Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      console.log('[Register API] Invalid password format');
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('[Register API] User already exists:', email);
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    console.log('[Register API] Creating new user');
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        roles: ['USER']
      },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true
      }
    });

    console.log('[Register API] User created successfully:', user.id);

    // Generate token
    const sanitizedUser: User = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      name: user.name
    };
    
    const token = generateToken(sanitizedUser);
    console.log('[Register API] Token generated successfully');

    return NextResponse.json({
      user: sanitizedUser,
      token
    });
  } catch (error) {
    console.error('[Register API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await db.$disconnect();
    console.log('[Register API] End - Database disconnected');
  }
}