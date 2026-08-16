'use strict';

/**
 * Calculate Levenshtein distance between two strings
 * Used for typo detection and correction
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score (0-1) between two strings
 */
function similarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Find suggested corrections for a search term
 * @param {string} searchTerm - The misspelled search term
 * @param {Array<string>} vocabulary - Array of correct words to compare against
 * @param {number} threshold - Minimum similarity score (0-1)
 * @returns {Array<{word: string, score: number}>} Suggested corrections
 */
function findSuggestions(searchTerm, vocabulary, threshold = 0.6) {
  const term = searchTerm.toLowerCase().trim();
  
  const suggestions = vocabulary
    .map(word => ({
      word: word.toLowerCase(),
      score: similarity(term, word.toLowerCase())
    }))
    .filter(item => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 suggestions

  return suggestions;
}

/**
 * Extract search keywords from items for vocabulary building
 * @param {Array} items - Array of items with name and description
 * @returns {Array<string>} Unique keywords
 */
function extractKeywords(items) {
  const keywords = new Set();
  
  items.forEach(item => {
    // Extract words from name
    if (item.name) {
      item.name.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }
    
    // Extract words from description
    if (item.description) {
      item.description.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }
    
    // Add category
    if (item.category) {
      keywords.add(item.category.toLowerCase());
    }
  });
  
  return Array.from(keywords);
}

/**
 * Common product categories and keywords for suggestions
 */
const COMMON_KEYWORDS = [
  // Electronics
  'phone', 'laptop', 'computer', 'tablet', 'iphone', 'samsung', 'macbook',
  'headphones', 'speaker', 'camera', 'tv', 'monitor', 'keyboard', 'mouse',
  'playstation', 'xbox', 'nintendo', 'console', 'ipad',
  
  // Furniture
  'sofa', 'chair', 'table', 'bed', 'mattress', 'desk', 'cabinet', 'shelf',
  'wardrobe', 'dresser', 'couch', 'dining', 'bookshelf',
  
  // Clothing
  'shoes', 'shirt', 'pants', 'dress', 'jacket', 'jeans', 'sneakers',
  'boots', 'coat', 'sweater', 'suit', 'hoodie', 'tshirt',
  
  // Vehicles
  'car', 'bike', 'bicycle', 'motorcycle', 'scooter', 'vehicle',
  'toyota', 'honda', 'nissan', 'mazda', 'subaru',
  
  // Appliances
  'fridge', 'refrigerator', 'washing', 'machine', 'oven', 'microwave',
  'dishwasher', 'dryer', 'cooker', 'blender', 'toaster',
  
  // Sports & Outdoors
  'bicycle', 'treadmill', 'weights', 'gym', 'tennis', 'football', 'basketball',
  'camping', 'tent', 'backpack', 'hiking',
  
  // Books & Media
  'book', 'textbook', 'novel', 'magazine', 'comic', 'game', 'dvd', 'cd',
  
  // Baby & Kids
  'stroller', 'crib', 'toys', 'baby', 'children', 'kids', 'playpen',
  
  // Other
  'tools', 'drill', 'saw', 'hammer', 'garden', 'lawn', 'mower',
  'jewelry', 'watch', 'ring', 'necklace', 'bracelet'
];

module.exports = {
  levenshteinDistance,
  similarity,
  findSuggestions,
  extractKeywords,
  COMMON_KEYWORDS
};
