import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });
  
  if (user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    // Get search relevance settings from the database
    const settings = await prisma.setting.findFirst({
      where: {
        key: "search_relevance",
      },
    });
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings = {
        titleWeight: 1.5,
        descriptionWeight: 1.0,
        categoryWeight: 1.2,
        attributesWeight: 1.0,
        sellerWeight: 0.8,
        priceWeight: 0.6,
        ratingWeight: 0.7,
        enableSynonyms: true,
        enableTypoTolerance: true,
        enableStopwords: true,
        synonyms: [
          { original: "organic", synonyms: ["natural", "bio", "chemical-free"] },
          { original: "fertilizer", synonyms: ["plant food", "soil enhancer", "nutrient"] },
        ],
        stopwords: ["the", "and", "of", "in", "for"],
      };
      
      return NextResponse.json(defaultSettings);
    }
    
    // Parse the settings value from JSON
    const parsedSettings = JSON.parse(settings.value);
    
    return NextResponse.json(parsedSettings);
  } catch (error) {
    console.error("Error fetching search relevance settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch search relevance settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      role: true,
    },
  });
  
  if (user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const body = await request.json();
    
    // Validate the request body
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    
    // Check for required fields
    const requiredFields = [
      "titleWeight", 
      "descriptionWeight", 
      "categoryWeight", 
      "attributesWeight",
      "sellerWeight",
      "priceWeight",
      "ratingWeight",
      "enableSynonyms",
      "enableTypoTolerance",
      "enableStopwords"
    ];
    
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Store the settings in the database
    await prisma.setting.upsert({
      where: {
        key: "search_relevance",
      },
      update: {
        value: JSON.stringify(body),
        updatedAt: new Date(),
      },
      create: {
        key: "search_relevance",
        value: JSON.stringify(body),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving search relevance settings:", error);
    return NextResponse.json(
      { error: "Failed to save search relevance settings" },
      { status: 500 }
    );
  }
}
