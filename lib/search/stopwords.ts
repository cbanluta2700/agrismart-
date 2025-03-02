import prisma from "@/lib/prisma";

// Cache for stopwords to avoid frequent DB calls
let stopwordsCache: string[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default stopwords list
const DEFAULT_STOPWORDS = [
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", 
  "for", "with", "by", "about", "from", "as", "of", "is", "are", 
  "was", "were", "be", "been", "being", "have", "has", "had", 
  "do", "does", "did", "can", "could", "shall", "should", "will", 
  "would", "may", "might", "must", "that", "which", "who", "whom", 
  "this", "these", "those", "my", "your", "his", "her", "its", 
  "our", "their", "i", "you", "he", "she", "it", "we", "they"
];

// Check if stopwords filtering is enabled
export async function isStopWordsFilteringEnabled(): Promise<boolean> {
  try {
    const settings = await prisma.setting.findFirst({
      where: {
        key: "search_relevance",
      },
    });
    
    if (!settings) {
      return true; // Enable by default
    }
    
    const parsedSettings = JSON.parse(settings.value);
    return parsedSettings.enableStopwords !== false; // True unless explicitly set to false
  } catch (error) {
    console.error("Error checking if stopwords filtering is enabled:", error);
    return true; // Enable by default in case of error
  }
}

// Get the stopwords list from settings
export async function getStopWords(): Promise<string[]> {
  // Check if cache is valid
  const now = Date.now();
  if (stopwordsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return stopwordsCache;
  }
  
  try {
    // Check if stopwords filtering is enabled
    const isEnabled = await isStopWordsFilteringEnabled();
    if (!isEnabled) {
      return []; // Return empty array if feature is disabled
    }
    
    // Get search relevance settings from the database
    const settings = await prisma.setting.findFirst({
      where: {
        key: "search_relevance",
      },
    });
    
    if (!settings) {
      // Return default stopwords if no settings exist
      stopwordsCache = DEFAULT_STOPWORDS;
      cacheTimestamp = now;
      return DEFAULT_STOPWORDS;
    }
    
    // Parse the settings value from JSON
    const parsedSettings = JSON.parse(settings.value);
    
    // Extract stopwords array or use default if not found
    const stopwords = parsedSettings.stopwords || DEFAULT_STOPWORDS;
    
    // Update cache
    stopwordsCache = stopwords;
    cacheTimestamp = now;
    
    return stopwords;
  } catch (error) {
    console.error("Error fetching stopwords:", error);
    return DEFAULT_STOPWORDS;
  }
}

// Remove stopwords from a string
export async function removeStopWords(text: string): Promise<string> {
  // Check if stopwords filtering is enabled
  const isEnabled = await isStopWordsFilteringEnabled();
  if (!isEnabled) {
    return text;
  }
  
  // Get the stopwords list
  const stopwords = await getStopWords();
  
  // Create a regex pattern for faster matching
  const stopwordPattern = new RegExp(`\\b(${stopwords.join('|')})\\b`, 'gi');
  
  // Remove stopwords
  return text.replace(stopwordPattern, '').replace(/\s+/g, ' ').trim();
}

// Filter stopwords from an array of strings
export async function filterStopWords(words: string[]): Promise<string[]> {
  // Check if stopwords filtering is enabled
  const isEnabled = await isStopWordsFilteringEnabled();
  if (!isEnabled) {
    return words;
  }
  
  // Get the stopwords list
  const stopwords = await getStopWords();
  const stopwordsSet = new Set(stopwords.map(word => word.toLowerCase()));
  
  // Filter out stopwords
  return words.filter(word => !stopwordsSet.has(word.toLowerCase()));
}

// Get meaningful words from a string (non-stopwords)
export async function extractMeaningfulWords(text: string): Promise<string[]> {
  if (!text) return [];
  
  // Split text into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)             // Split on whitespace
    .filter(word => word.length > 1); // Remove single characters
  
  // Filter out stopwords
  return await filterStopWords(words);
}
