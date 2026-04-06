/**
 * Historic Call Data Fetcher for Resgrid
 * Provides robust methods to fetch call data by date ranges or specific call IDs
 */

require('dotenv').config();
const { getApiToken } = require('./src/token-manager');
const { getCallExtraData } = require('./src/resgrid-api');
const axios = require('axios');

/**
 * Fetch calls from Resgrid using multiple endpoint strategies
 */
class HistoricCallFetcher {
  constructor() {
    this.token = null;
  }

  async initialize() {
    this.token = await getApiToken();
    console.log('✅ Initialized with Resgrid API token');
  }

  /**
   * Fetch calls by date range using multiple fallback strategies
   */
  async fetchCallsByDateRange(startDate, endDate) {
    if (!this.token) await this.initialize();

    console.log(`Fetching calls from ${startDate} to ${endDate}...`);

    const strategies = [
      {
        name: 'GetCalls with date parameters',
        execute: () => this.tryGetCallsWithDates(startDate, endDate)
      },
      {
        name: 'GetCallsForDate endpoint',
        execute: () => this.tryGetCallsForDate(startDate, endDate)
      },
      {
        name: 'GetCallsByDate endpoint',
        execute: () => this.tryGetCallsByDate(startDate)
      },
      {
        name: 'GetCallHistory endpoint',
        execute: () => this.tryGetCallHistory()
      },
      {
        name: 'GetActiveCalls fallback',
        execute: () => this.tryGetActiveCalls()
      },
      {
        name: 'GetCalls no parameters',
        execute: () => this.tryGetCallsBasic()
      }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`Trying: ${strategy.name}...`);
        const calls = await strategy.execute();
        
        if (calls && calls.length > 0) {
          console.log(`✅ ${strategy.name} returned ${calls.length} calls`);
          
          // Filter by date range if we got unfiltered results
          const filteredCalls = this.filterCallsByDateRange(calls, startDate, endDate);
          console.log(`Filtered to ${filteredCalls.length} calls in date range`);
          
          return filteredCalls;
        }
      } catch (error) {
        console.log(`❌ ${strategy.name} failed: ${error.message}`);
      }
    }

    throw new Error('All call fetching strategies failed');
  }

  /**
   * Strategy 1: GetCalls with date parameters (using correct API specification)
   */
  async tryGetCallsWithDates(startDate, endDate) {
    // Try with both parameter names since API docs show startDate/endDate as query params
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCalls', {
      headers: { 'Authorization': `Bearer ${this.token}` },
      params: { 
        startDate: startDate,
        endDate: endDate 
      }
    });

    return this.extractCallsFromResponse(response);
  }

  /**
   * Strategy 2: GetCallsForDate endpoint
   */
  async tryGetCallsForDate(startDate, endDate) {
    const url = `https://api.resgrid.com/api/v4/Calls/GetCallsForDate?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return this.extractCallsFromResponse(response);
  }

  /**
   * Strategy 3: GetCallsByDate endpoint
   */
  async tryGetCallsByDate(startDate) {
    const url = `https://api.resgrid.com/api/v4/Calls/GetCallsByDate?startDate=${encodeURIComponent(startDate)}`;
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return this.extractCallsFromResponse(response);
  }

  /**
   * Strategy 4: GetActiveCalls fallback
   */
  async tryGetActiveCalls() {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return this.extractCallsFromResponse(response);
  }

  /**
   * Strategy 5: GetCallHistory endpoint
   */
  async tryGetCallHistory() {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCallHistory', {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return this.extractCallsFromResponse(response);
  }

  /**
   * Strategy 6: GetCalls with no parameters
   */
  async tryGetCallsBasic() {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCalls', {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    return this.extractCallsFromResponse(response);
  }

  /**
   * Extract calls from API response handling different response formats
   */
  extractCallsFromResponse(response) {
    if (response.data) {
      // Handle paginated response format
      if (response.data.Data && Array.isArray(response.data.Data)) {
        return response.data.Data;
      }
      
      // Handle direct array response
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      // Handle single call response
      if (response.data.CallId) {
        return response.data;
      }
      
      // Handle GetCallHistory response structure
      if (response.data.Items && Array.isArray(response.data.Items)) {
        return response.data.Items;
      }

      // Handle other possible response structures
      if (response.data.Results && Array.isArray(response.data.Results)) {
        return response.data.Results;
      }

      // Handle nested data response
      if (response.data.data) {
        return response.data.data;
      }

      // Return single object if it contains call data
      if (typeof response.data === 'object' && response.data !== null) {
        return response.data;
      }
    }
    
    return [];
  }

  /**
   * Filter calls by date range
   */
  filterCallsByDateRange(calls, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return calls.filter(call => {
      const callDate = new Date(call.LoggedOn || call.LoggedOnUtc || call.DispatchedOn);
      return callDate >= start && callDate <= end;
    });
  }

  /**
   * Find a specific call by ID using direct API call
   */
  async findCallById(callId) {
    if (!this.token) await this.initialize();

    console.log(`Searching for Call ID: ${callId}...`);

    // Try direct call endpoints first using correct parameter structure
    const directEndpoints = [
      {
        url: `https://api.resgrid.com/api/v4/Calls/GetCall`,
        params: { callId: parseInt(callId) },
        name: 'GetCall',
        expectsCallData: true
      },
      {
        url: `https://api.resgrid.com/api/v4/Calls/GetCalls`,
        params: { callId: parseInt(callId) },
        name: 'GetCalls with callId',
        expectsCallData: true
      }
    ];

    for (const endpoint of directEndpoints) {
      try {
        console.log(`Trying ${endpoint.name}...`);
        const response = await axios.get(endpoint.url, {
          headers: { 'Authorization': `Bearer ${this.token}` },
          params: endpoint.params
        });

        const call = this.extractCallsFromResponse(response);
        if (call && (call.CallId || (Array.isArray(call) && call.length > 0))) {
          const targetCall = Array.isArray(call) ? call[0] : call;
          console.log(`✅ Found Call ${callId} via ${endpoint.name}: ${targetCall.Name}`);
          return targetCall;
        }
      } catch (error) {
        console.log(`${endpoint.name} failed: ${error.message}`);
      }
    }

    // Fallback: search through recent calls
    try {
      console.log('Falling back to date range search...');
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));

      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();

      const calls = await this.fetchCallsByDateRange(startDateStr, endDateStr);
      const targetCall = calls.find(call => call.CallId.toString() === callId.toString());

      if (targetCall) {
        console.log(`✅ Found Call ${callId}: ${targetCall.Name}`);
        return targetCall;
      } else {
        console.log(`❌ Call ${callId} not found in recent calls`);
        console.log('Available calls:');
        calls.slice(0, 5).forEach(call => {
          console.log(`  - Call ${call.CallId}: ${call.Name || 'Unknown'} (${call.LoggedOn})`);
        });
        if (calls.length > 5) {
          console.log(`  ... and ${calls.length - 5} more calls`);
        }
        return null;
      }
    } catch (error) {
      console.error(`Failed to search for Call ${callId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get call with extra data (full call details)
   */
  async getCallWithExtraData(callId) {
    const call = await this.findCallById(callId);
    if (!call) return null;

    console.log(`Fetching extra data for Call ${callId}...`);
    const extraData = await getCallExtraData(callId);

    return {
      call,
      extraData
    };
  }

  /**
   * Get recent calls (last N days)
   */
  async getRecentCalls(days = 7) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    return await this.fetchCallsByDateRange(startDateStr, endDateStr);
  }

  /**
   * Get calls for a specific date
   */
  async getCallsForDate(date) {
    const startDate = `${date}T00:00:00.000Z`;
    const endDate = `${date}T23:59:59.999Z`;

    return await this.fetchCallsByDateRange(startDate, endDate);
  }
}

/**
 * Test the historic call fetcher
 */
async function testHistoricCallFetcher() {
  console.log('='.repeat(60));
  console.log('TESTING HISTORIC CALL FETCHER');
  console.log('='.repeat(60));

  const fetcher = new HistoricCallFetcher();

  try {
    // Test 1: Get calls for today
    console.log('\nTest 1: Getting calls for today...');
    const today = new Date().toISOString().split('T')[0];
    const todayCalls = await fetcher.getCallsForDate(today);
    console.log(`Found ${todayCalls.length} calls for ${today}`);

    // Test 2: Get recent calls (last 7 days)
    console.log('\nTest 2: Getting recent calls (last 7 days)...');
    const recentCalls = await fetcher.getRecentCalls(7);
    console.log(`Found ${recentCalls.length} calls in last 7 days`);

    // Test 3: Search for Call 201108
    console.log('\nTest 3: Searching for Call 201108...');
    const call201108 = await fetcher.findCallById('201108');
    if (call201108) {
      console.log(`✅ Found Call 201108: ${call201108.Name}`);
    } else {
      console.log('❌ Call 201108 not found');
    }

    // Test 4: Get call with extra data for any available call
    console.log('\nTest 4: Getting full call data with extra information...');
    if (recentCalls.length > 0) {
      const testCallId = recentCalls[0].CallId;
      const fullCallData = await fetcher.getCallWithExtraData(testCallId);
      if (fullCallData) {
        console.log(`✅ Retrieved full data for Call ${testCallId}`);
        console.log(`   Activities: ${fullCallData.extraData?.Data?.Activity?.length || 0}`);
        console.log(`   Dispatches: ${fullCallData.extraData?.Data?.Dispatches?.length || 0}`);
      }
    }

    console.log('\n✅ Historic call fetcher test completed successfully');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60));
}

module.exports = { HistoricCallFetcher };

// Run test if called directly
if (require.main === module) {
  testHistoricCallFetcher().catch(console.error);
}