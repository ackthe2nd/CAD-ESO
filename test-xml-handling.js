/**
 * Test script to verify HTML stripping and patient conditional display
 */
const { generateXML } = require('./src/xml-generator');

function testHTMLStripping() {
  console.log("==== TESTING HTML TAG STRIPPING ====");
  
  // Test call data with HTML tags
  const callWithHTML = {
    Data: {
      CallId: "123456",
      Name: "<p>TEST CALL</p>",
      Nature: "<p>nature of the call</p>",
      Note: "<div>notes with <strong>formatting</strong></div>",
      Address: "123 Main St, <span>Anytown</span>, CA 12345"
    }
  };
  
  const xml = generateXML(callWithHTML, {}, true);
  console.log(xml);
  
  // Check if HTML was stripped
  if (xml.includes("<p>") || xml.includes("</p>") || xml.includes("<div>") || xml.includes("</div>")) {
    console.log("❌ FAILED: HTML tags were not stripped from the XML");
  } else {
    console.log("✅ SUCCESS: HTML tags were properly stripped from the XML");
  }
  
  console.log("\n");
}

function testPatientConditional() {
  console.log("==== TESTING PATIENT INFO CONDITIONAL LOGIC ====");
  
  // Test 1: Call with "I am the patient" - Should include patient info
  const callWithPatient = {
    Data: {
      CallId: "123456",
      Name: "TEST CALL",
      Nature: "Medical Emergency - I am the patient",
      ContactName: "John Doe",
      ExternalId: "1990-05-15"
    }
  };
  
  const xmlWithPatient = generateXML(callWithPatient, {}, true);
  console.log("Test 1: Call with 'I am the patient' phrase");
  console.log(xmlWithPatient);
  
  // Test 2: Call without "I am the patient" - Should NOT include patient info
  const callWithoutPatient = {
    Data: {
      CallId: "123456",
      Name: "TEST CALL",
      Nature: "Medical Emergency",
      ContactName: "John Doe",
      ExternalId: "1990-05-15"
    }
  };
  
  const xmlWithoutPatient = generateXML(callWithoutPatient, {}, true);
  console.log("\nTest 2: Call without 'I am the patient' phrase");
  console.log(xmlWithoutPatient);
  
  // Check patient info presence
  const hasPatientInfoWithPhrase = 
    xmlWithPatient.includes("<PatientFirstName>John</PatientFirstName>") && 
    xmlWithPatient.includes("<PatientLastName>Doe</PatientLastName>");
  
  const hasPatientInfoWithoutPhrase = 
    xmlWithoutPatient.includes("<PatientFirstName>John</PatientFirstName>") && 
    xmlWithoutPatient.includes("<PatientLastName>Doe</PatientLastName>");
  
  if (hasPatientInfoWithPhrase && !hasPatientInfoWithoutPhrase) {
    console.log("✅ SUCCESS: Patient info correctly included only when 'I am the patient' is present");
  } else {
    console.log("❌ FAILED: Patient info conditional logic is not working correctly");
    console.log(`With phrase: ${hasPatientInfoWithPhrase ? "Has patient info" : "No patient info"}`);
    console.log(`Without phrase: ${hasPatientInfoWithoutPhrase ? "Has patient info" : "No patient info"}`);
  }
}

// Run tests
testHTMLStripping();
testPatientConditional();