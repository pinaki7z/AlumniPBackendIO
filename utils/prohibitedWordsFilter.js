// utils/prohibitedWordsFilter.js
const ProhibitedKeyword = require("../models/prohibitedKeywordsSchema");

/**
 * Filter prohibited words from text and replace with asterisks
 * @param {String} text - The text to filter
 * @returns {Promise<String>} - Filtered text with prohibited words replaced by asterisks
 */
const filterProhibitedWords = async (text) => {
  try {
    if (!text || typeof text !== 'string') {
      return text;
    }

    // Get all active prohibited keywords from database
    const prohibitedKeywords = await ProhibitedKeyword.find({ 
      isActive: true 
    }).select('keyword');

    if (!prohibitedKeywords || prohibitedKeywords.length === 0) {
      return text;
    }

    let filteredText = text;

    // Sort keywords by length (longest first) to handle overlapping matches
    const sortedKeywords = prohibitedKeywords
      .map(item => item.keyword.toLowerCase())
      .sort((a, b) => b.length - a.length);

    // Replace each prohibited word with asterisks
    sortedKeywords.forEach(keyword => {
      // Create case-insensitive regex with word boundaries
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      
      // Replace with asterisks of same length
      filteredText = filteredText.replace(regex, (match) => {
        return '*'.repeat(match.length);
      });
    });

    return filteredText;

  } catch (error) {
    console.error('Error filtering prohibited words:', error);
    // Return original text if filtering fails
    return text;
  }
};

/**
 * Filter prohibited words from multiple text fields in an object
 * @param {Object} data - Object containing text fields to filter
 * @param {Array} fields - Array of field names to filter
 * @returns {Promise<Object>} - Object with filtered text fields
 */
const filterObjectFields = async (data, fields = []) => {
  try {
    const filteredData = { ...data };

    for (const field of fields) {
      if (filteredData[field] && typeof filteredData[field] === 'string') {
        filteredData[field] = await filterProhibitedWords(filteredData[field]);
      }
    }

    return filteredData;
  } catch (error) {
    console.error('Error filtering object fields:', error);
    return data;
  }
};

/**
 * Check if text contains prohibited words (without filtering)
 * @param {String} text - The text to check
 * @returns {Promise<Object>} - Object with containsProhibited boolean and found words array
 */
const checkForProhibitedWords = async (text) => {
  try {
    if (!text || typeof text !== 'string') {
      return { containsProhibited: false, foundWords: [] };
    }

    const prohibitedKeywords = await ProhibitedKeyword.find({ 
      isActive: true 
    }).select('keyword severity');

    if (!prohibitedKeywords || prohibitedKeywords.length === 0) {
      return { containsProhibited: false, foundWords: [] };
    }

    const foundWords = [];
    const lowerText = text.toLowerCase();

    prohibitedKeywords.forEach(item => {
      const keyword = item.keyword.toLowerCase();
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      
      if (regex.test(lowerText)) {
        foundWords.push({
          word: keyword,
          severity: item.severity
        });
      }
    });

    return {
      containsProhibited: foundWords.length > 0,
      foundWords
    };

  } catch (error) {
    console.error('Error checking for prohibited words:', error);
    return { containsProhibited: false, foundWords: [] };
  }
};

module.exports = {
  filterProhibitedWords,
  filterObjectFields,
  checkForProhibitedWords
};
