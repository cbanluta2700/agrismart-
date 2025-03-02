import prisma from "@/lib/prisma";

interface SynonymEntry {
  original: string;
  synonyms: string[];
}

// Cache for synonym dictionary to avoid frequent DB calls
let synonymCache: SynonymEntry[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get the synonyms dictionary from settings
export async function getSynonymDictionary(): Promise<SynonymEntry[]> {
  // Check if cache is valid
  const now = Date.now();
  if (synonymCache && (now - cacheTimestamp) < CACHE_TTL) {
    return synonymCache;
  }
  
  try {
    // Get search relevance settings from the database
    const settings = await prisma.setting.findFirst({
      where: {
        key: "search_relevance",
      },
    });
    
    if (!settings) {
      // Return default synonyms if no settings exist
      const defaultSynonyms: SynonymEntry[] = [
        { original: "organic", synonyms: ["natural", "bio", "chemical-free"] },
        { original: "fertilizer", synonyms: ["plant food", "soil enhancer", "nutrient"] },
      ];
      
      // Update cache
      synonymCache = defaultSynonyms;
      cacheTimestamp = now;
      
      return defaultSynonyms;
    }
    
    // Parse the settings value from JSON
    const parsedSettings = JSON.parse(settings.value);
    
    // Extract synonyms array or use empty array if not found
    const synonyms = parsedSettings.synonyms || [];
    
    // Update cache
    synonymCache = synonyms;
    cacheTimestamp = now;
    
    return synonyms;
  } catch (error) {
    console.error("Error fetching synonym dictionary:", error);
    return [];
  }
}

// Check if synonym matching is enabled
export async function isSynonymMatchingEnabled(): Promise<boolean> {
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
    return parsedSettings.enableSynonyms !== false; // True unless explicitly set to false
  } catch (error) {
    console.error("Error checking if synonym matching is enabled:", error);
    return true; // Enable by default in case of error
  }
}

// Expand a search query with synonyms
export async function expandQueryWithSynonyms(query: string): Promise<string> {
  // Check if synonym matching is enabled
  const isEnabled = await isSynonymMatchingEnabled();
  if (!isEnabled) {
    return query;
  }
  
  // Get the synonym dictionary
  const synonymDictionary = await getSynonymDictionary();
  
  // Split the query into words
  const words = query.toLowerCase().split(/\s+/);
  
  // Create a Set to hold all query terms
  const expandedTerms = new Set(words);
  
  // For each word in the query, add all synonyms to the expanded terms
  for (const word of words) {
    // Skip very short words
    if (word.length < 3) continue;
    
    // Find matching entries in the synonym dictionary
    for (const entry of synonymDictionary) {
      // Check if this word matches the original term or any of its synonyms
      if (
        entry.original.toLowerCase() === word ||
        entry.synonyms.some(syn => syn.toLowerCase() === word)
      ) {
        // Add the original term
        expandedTerms.add(entry.original.toLowerCase());
        
        // Add all synonyms
        for (const synonym of entry.synonyms) {
          expandedTerms.add(synonym.toLowerCase());
        }
      }
    }
  }
  
  // Convert the Set back to an array and join with OR operator
  return Array.from(expandedTerms).join(" | ");
}

// Create inverted index for fast synonym lookup
export async function createSynonymIndex(): Promise<Map<string, string[]>> {
  const dictionary = await getSynonymDictionary();
  const index = new Map<string, string[]>();
  
  for (const entry of dictionary) {
    // Index the original term
    index.set(entry.original.toLowerCase(), [
      entry.original, 
      ...entry.synonyms
    ]);
    
    // Index each synonym
    for (const synonym of entry.synonyms) {
      index.set(synonym.toLowerCase(), [
        entry.original,
        ...entry.synonyms.filter(s => s !== synonym)
      ]);
    }
  }
  
  return index;
}

// Find synonyms for a specific word
export async function findSynonyms(word: string): Promise<string[]> {
  if (!word || word.length < 3) return [];
  
  const dictionary = await getSynonymDictionary();
  const wordLower = word.toLowerCase();
  
  // Look for exact matches in the dictionary
  for (const entry of dictionary) {
    if (entry.original.toLowerCase() === wordLower) {
      return entry.synonyms;
    }
    
    // Check if the word is a synonym, then return the original and other synonyms
    const synonymIndex = entry.synonyms.findIndex(s => s.toLowerCase() === wordLower);
    if (synonymIndex >= 0) {
      return [
        entry.original,
        ...entry.synonyms.filter((_, index) => index !== synonymIndex)
      ];
    }
  }
  
  return [];
}

// Suggest alternative search queries based on synonyms
export async function suggestAlternativeQueries(query: string, maxSuggestions: number = 3): Promise<string[]> {
  // Check if synonym matching is enabled
  const isEnabled = await isSynonymMatchingEnabled();
  if (!isEnabled) {
    return [];
  }
  
  const words = query.toLowerCase().split(/\s+/);
  const suggestions: string[] = [];
  
  // Get the synonym dictionary
  const synonymDictionary = await getSynonymDictionary();
  
  // Generate alternative queries by replacing one word at a time with a synonym
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length < 3) continue;
    
    for (const entry of synonymDictionary) {
      // Check if this word matches the original term
      if (entry.original.toLowerCase() === word) {
        // Generate a new query for each synonym
        for (const synonym of entry.synonyms) {
          const newWords = [...words];
          newWords[i] = synonym;
          suggestions.push(newWords.join(" "));
          
          // Break if we have enough suggestions
          if (suggestions.length >= maxSuggestions) {
            return suggestions;
          }
        }
      }
      
      // Check if this word matches any synonym
      const matchedSynonymIndex = entry.synonyms.findIndex(s => s.toLowerCase() === word);
      if (matchedSynonymIndex >= 0) {
        // Add the original term as a suggestion
        const newWords = [...words];
        newWords[i] = entry.original;
        suggestions.push(newWords.join(" "));
        
        // Add other synonyms as suggestions
        for (let j = 0; j < entry.synonyms.length; j++) {
          if (j !== matchedSynonymIndex) {
            const newWords = [...words];
            newWords[i] = entry.synonyms[j];
            suggestions.push(newWords.join(" "));
            
            // Break if we have enough suggestions
            if (suggestions.length >= maxSuggestions) {
              return suggestions;
            }
          }
        }
      }
    }
  }
  
  return suggestions;
}
