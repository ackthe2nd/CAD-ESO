/**
 * Utils for mapping Resgrid priority values to ESO codes
 */

// Define constants for ESO response mode codes
const ESO_RESPONSE_LIGHTS_SIRENS = '390';      // Lights & sirens
const ESO_RESPONSE_NON_LIGHTS_SIRENS = '395';  // Non-lights & sirens
const DEFAULT_RESPONSE_MODE = ESO_RESPONSE_LIGHTS_SIRENS;

/**
 * Maps Resgrid Priority.Id values to ESO ResponseModeToScene codes
 * Updated to fix emergency vs non-emergency mapping
 * 
 * @param {number|string} priorityId - The Resgrid Priority.Id
 * @param {string} nature - Optional nature string to detect non-emergency keywords
 * @returns {string} - The ESO ResponseModeToScene code
 */
function mapPriorityToEsoCode(priorityId, nature) {
  // Convert to string for comparison
  const priorityIdStr = String(priorityId);
  
  // First check if nature contains non-emergency keywords
  if (nature && typeof nature === 'string') {
    // Check if nature includes "Non-Emergency" or other keywords
    if (/non.?emergency|non.?urgent|routine|scheduled/i.test(nature)) {
      return ESO_RESPONSE_NON_LIGHTS_SIRENS; // Non-emergency (395)
    }
  }
  
  // Map priority based on specified values
  switch (priorityIdStr) {
    case '1559': // Non-emergency priority
      return ESO_RESPONSE_NON_LIGHTS_SIRENS;
      
    case '1560': // Emergency priority
      return ESO_RESPONSE_LIGHTS_SIRENS;
      
    default:
      // For any other or missing value, default to lights & sirens
      return DEFAULT_RESPONSE_MODE;
  }
}

module.exports = {
  mapPriorityToEsoCode,
  ESO_RESPONSE_LIGHTS_SIRENS,
  ESO_RESPONSE_NON_LIGHTS_SIRENS,
  DEFAULT_RESPONSE_MODE
};