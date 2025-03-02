import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

/**
 * API route to check if a user has a specific role
 * GET /api/auth/check-role?role=ROLE_NAME
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // If no session, user is not authenticated
    if (!session?.user) {
      return NextResponse.json(
        { hasRole: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Get the role to check from query params
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    
    if (!role) {
      return NextResponse.json(
        { hasRole: false, message: "Role parameter is required" },
        { status: 400 }
      );
    }
    
    // Get user with roles
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    // Check if user has the specified role
    const hasRole = user?.roles?.includes(role) || false;
    
    return NextResponse.json(
      { hasRole },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CHECK_ROLE_ERROR]", error);
    return NextResponse.json(
      { hasRole: false, message: "Failed to check role" },
      { status: 500 }
    );
  }
}
