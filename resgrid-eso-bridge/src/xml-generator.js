const { create } = require('xmlbuilder2');
const { config } = require('./config');
const { logger } = require('./logger');

/**
 * Generates an XML representation of a call for ESO
 * @param {Object} callData - The call data to include in the XML
 * @param {string} callData.CallId - The ID of the call
 * @param {string} callData.Timestamp - The timestamp of the call
 * @param {string} callData.Nature - The nature of the call
 * @param {string} callData.Address - The address of the call
 * @param {string} callData.UnitsCsv - Comma-separated unit names
 * @param {string} callData.Notes - Additional notes for the call
 * @returns {string} - The XML representation as a string
 */
function generateXML(callData) {
  try {
    logger.info(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Validate required fields
    if (!callData.CallId) {
      throw new Error('CallId is required for XML generation');
    }
    
    // Create XML document
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt(config.esoGuid).up()
        .ele('IncidentNumber').txt(callData.CallId).up()
        .ele('IncidentOrOnset').txt(callData.Timestamp || new Date().toISOString()).up()
        .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up()
        .ele('VehicleDispatchLocation').txt(callData.Address || '').up()
        .ele('EmsUnitCallSign').txt(callData.UnitsCsv || '').up()
        .ele('CadDispatchText').txt(callData.Notes || '').up()
      .doc();
    
    // Convert to string
    const xmlString = doc.end({ prettyPrint: true });
    logger.info(`Successfully generated XML for Call ID: ${callData.CallId}`);
    
    return xmlString;
  } catch (error) {
    logger.error(`Error generating XML for Call ID: ${callData.CallId}: ${error.message}`, { error });
    throw error;
  }
}

module.exports = { generateXML };
