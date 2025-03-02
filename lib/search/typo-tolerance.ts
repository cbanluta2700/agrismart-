// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Function to check for similarity between two words
export function isSimilar(word1: string, word2: string, maxDistance: number = 2): boolean {
  // Special case for very short words - require exact match
  if (word1.length < 3 || word2.length < 3) {
    return word1 === word2;
  }
  
  // For longer words, allow for typos based on word length
  const distance = levenshteinDistance(word1.toLowerCase(), word2.toLowerCase());
  
  // Adjust max distance based on word length for more accuracy
  const lengthBasedMaxDistance = Math.floor(Math.max(word1.length, word2.length) / 4);
  const adjustedMaxDistance = Math.min(maxDistance, Math.max(1, lengthBasedMaxDistance));
  
  return distance <= adjustedMaxDistance;
}

// Function to find similar words in a list
export function findSimilarWords(query: string, wordList: string[]): string[] {
  const queryWords = query.toLowerCase().split(/\s+/);
  const results: string[] = [];
  
  for (const word of wordList) {
    // Skip very short words
    if (word.length < 3) continue;
    
    const wordLower = word.toLowerCase();
    
    // Check if any query word is similar to the current word
    const hasSimilarWord = queryWords.some(queryWord => 
      queryWord.length >= 3 && isSimilar(queryWord, wordLower)
    );
    
    if (hasSimilarWord && !results.includes(word)) {
      results.push(word);
    }
  }
  
  return results;
}

// Apply typo tolerance to a search query
export function applyTypoTolerance(
  query: string, 
  searchableContent: { id: string; text: string }[],
  options?: { maxDistance?: number; minWordLength?: number }
): string[] {
  const { maxDistance = 2, minWordLength = 3 } = options || {};
  const queryWords = query.toLowerCase().split(/\s+/);
  const matchedIds = new Set<string>();
  
  for (const item of searchableContent) {
    const itemWords = item.text.toLowerCase().split(/\s+/);
    
    // Check for word similarity
    let matchScore = 0;
    
    for (const queryWord of queryWords) {
      // Skip very short words
      if (queryWord.length < minWordLength) continue;
      
      for (const itemWord of itemWords) {
        if (itemWord.length < minWordLength) continue;
        
        if (isSimilar(queryWord, itemWord, maxDistance)) {
          matchScore++;
          break; // Match found for this query word, move to next
        }
      }
    }
    
    // If we have matches for at least one meaningful word, include this item
    if (matchScore > 0) {
      matchedIds.add(item.id);
    }
  }
  
  return Array.from(matchedIds);
}

// Generate spelling suggestions
export function generateSpellingSuggestions(
  query: string,
  dictionary: string[],
  maxSuggestions: number = 3
): string[] {
  const queryWords = query.toLowerCase().split(/\s+/);
  const suggestions: string[] = [];
  
  for (const word of queryWords) {
    if (word.length < 3) continue; // Skip very short words
    
    const wordSuggestions: Array<{word: string; distance: number}> = [];
    
    for (const dictWord of dictionary) {
      if (dictWord.length < 3) continue;
      
      const distance = levenshteinDistance(word, dictWord);
      
      // Only consider words with reasonable distance
      if (distance <= Math.max(2, Math.floor(word.length / 3))) {
        wordSuggestions.push({ word: dictWord, distance });
      }
    }
    
    // Sort by distance (closest first)
    wordSuggestions.sort((a, b) => a.distance - b.distance);
    
    // Take top suggestions
    const topSuggestions = wordSuggestions
      .slice(0, maxSuggestions)
      .map(item => item.word);
    
    suggestions.push(...topSuggestions);
  }
  
  // Remove duplicates and return
  return [...new Set(suggestions)];
}
