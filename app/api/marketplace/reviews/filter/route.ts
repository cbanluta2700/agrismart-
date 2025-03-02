import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

// Default configuration (used as fallback)
const DEFAULT_CONFIG = {
  enabled: true,
  blockedKeywords: [
    "scam", "fraud", "fake", "stupid", "idiot", "fool", "garbage", "trash",
    "useless", "terrible", "horrible", "worst", "awful", "hate", "damn"
  ],
  autoRejectThreshold: 3
};

// Helper to get the current filter configuration
async function getFilterConfig() {
  try {
    const config = await db.setting.findFirst({
      where: { key: "reviewFilterConfig" }
    });
    
    if (!config) {
      return DEFAULT_CONFIG;
    }
    
    return JSON.parse(config.value);
  } catch (error) {
    console.error("[GET_FILTER_CONFIG_ERROR]", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * POST /api/marketplace/reviews/filter
 * Check a review for inappropriate content before submission
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { title, content } = body;
    
    // Get filter configuration
    const filterConfig = await getFilterConfig();
    
    // If filtering is disabled, always pass
    if (!filterConfig.enabled) {
      return NextResponse.json({
        passed: true,
        message: "Content filtering is disabled"
      }, { status: 200 });
    }
    
    const combinedText = `${title || ""} ${content || ""}`.toLowerCase();
    
    // Check for inappropriate content using configured keywords
    const foundWords = filterConfig.blockedKeywords.filter(word => 
      new RegExp(`\\b${word}\\b`, "i").test(combinedText)
    );
    
    if (foundWords.length > 0) {
      // Check if the number of found words exceeds the auto-reject threshold
      const shouldAutoReject = foundWords.length >= filterConfig.autoRejectThreshold;
      
      return NextResponse.json({
        passed: false,
        foundWords,
        shouldAutoReject,
        message: shouldAutoReject 
          ? "Your review cannot be submitted as it contains inappropriate content that violates our community guidelines."
          : "Your review contains potentially inappropriate content that may violate our community guidelines."
      }, { status: 200 });
    }
    
    return NextResponse.json({
      passed: true,
      message: "Content passed filtering check"
    }, { status: 200 });
  } catch (error) {
    console.error("[REVIEW_FILTER_ERROR]", error);
    return NextResponse.json(
      { message: "Failed to process content filtering" },
      { status: 500 }
    );
  }
}
