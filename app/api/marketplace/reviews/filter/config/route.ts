import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

const DEFAULT_CONFIG = {
  enabled: true,
  blockedKeywords: ["profanity", "offensive", "scam", "spam"],
  autoRejectThreshold: 3
};

/**
 * Get the current review filter configuration
 * GET /api/marketplace/reviews/filter/config
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    if (!user?.roles?.includes("ADMIN")) {
      return NextResponse.json(
        { error: "Not authorized. Admin role required" },
        { status: 403 }
      );
    }
    
    // Get filter configuration from database or create default if not exists
    let config = await db.setting.findFirst({
      where: { key: "reviewFilterConfig" }
    });
    
    // If no config exists, create default
    if (!config) {
      config = await db.setting.create({
        data: {
          key: "reviewFilterConfig",
          value: JSON.stringify(DEFAULT_CONFIG)
        }
      });
    }
    
    // Parse config
    const filterConfig = JSON.parse(config.value);
    
    return NextResponse.json(filterConfig);
  } catch (error) {
    console.error("[GET_FILTER_CONFIG_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch filter configuration" },
      { status: 500 }
    );
  }
}

/**
 * Update the review filter configuration
 * POST /api/marketplace/reviews/filter/config
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and has admin role
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Check if user has admin role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { roles: true },
    });
    
    if (!user?.roles?.includes("ADMIN")) {
      return NextResponse.json(
        { error: "Not authorized. Admin role required" },
        { status: 403 }
      );
    }
    
    // Get request body
    const body = await req.json();
    
    // Validate configuration
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid configuration: 'enabled' must be a boolean" },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(body.blockedKeywords)) {
      return NextResponse.json(
        { error: "Invalid configuration: 'blockedKeywords' must be an array" },
        { status: 400 }
      );
    }
    
    if (typeof body.autoRejectThreshold !== "number" || body.autoRejectThreshold < 1) {
      return NextResponse.json(
        { error: "Invalid configuration: 'autoRejectThreshold' must be a positive number" },
        { status: 400 }
      );
    }
    
    // Save configuration to database
    await db.setting.upsert({
      where: { key: "reviewFilterConfig" },
      update: { value: JSON.stringify(body) },
      create: {
        key: "reviewFilterConfig",
        value: JSON.stringify(body)
      }
    });
    
    return NextResponse.json({ success: true, message: "Filter configuration updated successfully" });
  } catch (error) {
    console.error("[UPDATE_FILTER_CONFIG_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update filter configuration" },
      { status: 500 }
    );
  }
}
