# Resgrid-ESO Bridge Integration Plan

## Overview
This document outlines a plan to migrate the current Node.js Resgrid-ESO Bridge to a native C# implementation that would be integrated directly into the Resgrid core codebase.

## Current Architecture (Node.js)
- **SignalR Client**: Connects to Resgrid events hub and listens for CallAdded events
- **API Client**: Makes HTTP requests to Resgrid API endpoints
- **XML Generator**: Transforms call data into ESO-compatible XML format
- **SFTP Client**: Uploads XML files to ESO's SFTP server
- **Google Sheets Logger**: Logs call data and XML uploads for auditing

## Target Architecture (C#)
- **Internal Events**: Use Resgrid's internal event system instead of SignalR
- **Direct Service Calls**: Replace API calls with direct service method calls
- **XML Generator**: Port the XML generation logic to C#
- **SFTP Client**: Use C# SFTP libraries for file uploads
- **Google Sheets Integration**: Port Google Sheets logging functionality

## Implementation Steps

### 1. Create Core Integration Classes

#### ESO Integration Service Interface
```csharp
public interface IEsoIntegrationService
{
    Task ProcessCallAsync(int callId);
    Task ExportCallToEsoAsync(Call call, CallExtraDataResultData extraData);
    Task LogToGoogleSheetsAsync(Call call, string xml, string status);
}
```

#### ESO Integration Service Implementation
```csharp
public class EsoIntegrationService : IEsoIntegrationService
{
    private readonly ICallsService _callsService;
    private readonly IPersonnelService _personnelService;
    private readonly IUnitStatesService _unitStatesService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EsoIntegrationService> _logger;
    // Additional service dependencies

    public EsoIntegrationService(
        ICallsService callsService,
        IPersonnelService personnelService,
        IUnitStatesService unitStatesService,
        IConfiguration configuration,
        ILogger<EsoIntegrationService> logger)
    {
        _callsService = callsService;
        _personnelService = personnelService;
        _unitStatesService = unitStatesService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task ProcessCallAsync(int callId)
    {
        try
        {
            _logger.LogInformation("Processing call {CallId} for ESO export", callId);
            
            // Get complete call data
            var call = await _callsService.GetCallByIdAsync(callId);
            if (call == null)
            {
                _logger.LogWarning("Call {CallId} not found", callId);
                return;
            }
            
            // Get extra call data
            var extraData = await _callsService.GetCallExtraDataAsync(callId);
            
            // Process and export to ESO
            await ExportCallToEsoAsync(call, extraData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing call {CallId} for ESO export", callId);
        }
    }

    public async Task ExportCallToEsoAsync(Call call, CallExtraDataResultData extraData)
    {
        // Generate XML from call data
        string xml = GenerateXml(call, extraData);
        
        // Save XML to temporary file
        string tempFilePath = Path.Combine(Path.GetTempPath(), $"call_{call.CallId}_{DateTime.UtcNow.Ticks}.xml");
        await File.WriteAllTextAsync(tempFilePath, xml);
        
        // Upload file to ESO via SFTP
        try
        {
            await UploadToSftpAsync(tempFilePath, call.CallId.ToString());
            await LogToGoogleSheetsAsync(call, xml, $"Call ID {call.CallId} - XML Upload Successful");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload call {CallId} to ESO", call.CallId);
            await LogToGoogleSheetsAsync(call, xml, $"Call ID {call.CallId} - Upload Failed");
        }
        finally
        {
            // Clean up temporary file
            if (File.Exists(tempFilePath))
            {
                File.Delete(tempFilePath);
            }
        }
    }

    public async Task LogToGoogleSheetsAsync(Call call, string xml, string status)
    {
        try
        {
            // Google Sheets logging implementation
            // This would use Google.Apis.Sheets.v4 library in C#
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log call {CallId} to Google Sheets", call.CallId);
        }
    }

    private string GenerateXml(Call call, CallExtraDataResultData extraData)
    {
        // XML generation logic
        // Port existing Node.js XML generation code to C#
    }

    private async Task UploadToSftpAsync(string filePath, string callId)
    {
        // SFTP upload implementation using SSH.NET or similar
    }
}
```

### 2. Event Handling Integration

#### Register Event Handler in Resgrid Core

```csharp
// In Startup.cs or similar configuration class
services.AddScoped<IEsoIntegrationService, EsoIntegrationService>();

// Register event handler
services.AddTransient<IEventHandler<CallAddedEvent>, EsoCallAddedEventHandler>();
```

#### Implement Event Handler

```csharp
public class EsoCallAddedEventHandler : IEventHandler<CallAddedEvent>
{
    private readonly IEsoIntegrationService _esoIntegrationService;
    private readonly ILogger<EsoCallAddedEventHandler> _logger;

    public EsoCallAddedEventHandler(
        IEsoIntegrationService esoIntegrationService,
        ILogger<EsoCallAddedEventHandler> logger)
    {
        _esoIntegrationService = esoIntegrationService;
        _logger = logger;
    }

    public async Task HandleAsync(CallAddedEvent @event)
    {
        try
        {
            _logger.LogInformation("ESO Integration: Handling CallAdded event for call ID {@CallId}", @event.CallId);
            await _esoIntegrationService.ProcessCallAsync(@event.CallId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling CallAdded event for call ID {@CallId}", @event.CallId);
        }
    }
}
```

### 3. XML Generation Logic

Port the existing Node.js XML generation to C# using `System.Xml.Linq`:

```csharp
private string GenerateXml(Call call, CallExtraDataResultData extraData)
{
    var doc = new XDocument(
        new XDeclaration("1.0", "UTF-8", "yes"),
        new XElement("CAD",
            new XElement("Incident",
                new XElement("CallNature", call.Nature ?? ""),
                new XElement("CallNatureDescription", call.Note ?? ""),
                new XElement("IncidentOrOnset", FormatDateTime(call.LoggedOnUtc)),
                new XElement("DispatchNotified", FormatDateTime(call.LoggedOnUtc)),
                new XElement("UnitNotifiedByDispatch", FormatDateTime(call.UnitNotifiedTime ?? call.LoggedOnUtc)),
                // ... additional elements
                GenerateUnitElements(call, extraData),
                GenerateLocationElements(call, extraData),
                GeneratePatientElements(call, extraData)
            )
        )
    );
    
    return doc.ToString();
}

private XElement GenerateUnitElements(Call call, CallExtraDataResultData extraData)
{
    // Extract unit names from dispatches and activity
    var unitNames = ExtractUnitNames(extraData);
    
    return new XElement("EmsUnit",
        new XElement("EmsUnitCallSign", string.Join(",", unitNames)),
        // ... additional unit elements
        GenerateUnitTimestamps(call, extraData)
    );
}

private List<string> ExtractUnitNames(CallExtraDataResultData extraData)
{
    var unitNames = new List<string>();
    
    // First try to extract from Activity array
    if (extraData.Data?.Activity != null)
    {
        foreach (var activity in extraData.Data.Activity)
        {
            if (activity.Type == "Unit" && !string.IsNullOrEmpty(activity.Name))
            {
                if (!unitNames.Contains(activity.Name))
                {
                    unitNames.Add(activity.Name);
                    _logger.LogDebug("Added unit name: {UnitName} from activity", activity.Name);
                }
            }
        }
    }
    
    // Then try to extract from Dispatches
    if (extraData.Data?.Dispatches != null)
    {
        foreach (var dispatch in extraData.Data.Dispatches)
        {
            if (dispatch.Type == "Unit" && !string.IsNullOrEmpty(dispatch.Name))
            {
                if (!unitNames.Contains(dispatch.Name))
                {
                    unitNames.Add(dispatch.Name);
                    _logger.LogDebug("Added unit name: {UnitName} from dispatches", dispatch.Name);
                }
            }
        }
    }
    
    return unitNames;
}

private string FormatDateTime(DateTime? dateTime)
{
    return dateTime?.ToString("yyyy-MM-ddTHH:mm:ss") ?? "";
}
```

### 4. SFTP Upload Implementation

Use SSH.NET library for SFTP uploads:

```csharp
private async Task UploadToSftpAsync(string filePath, string callId)
{
    var host = _configuration["SFTP:Host"];
    var username = _configuration["SFTP:Username"];
    var password = _configuration["SFTP:Password"];
    var remoteDir = _configuration["SFTP:RemoteDirectory"];
    
    if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
    {
        throw new InvalidOperationException("SFTP configuration missing");
    }
    
    using var client = new SftpClient(host, username, password);
    
    int retryCount = 0;
    int maxRetries = 3;
    TimeSpan retryDelay = TimeSpan.FromSeconds(5);
    
    while (retryCount < maxRetries)
    {
        try
        {
            _logger.LogInformation("Connecting to SFTP server: {Host}", host);
            client.Connect();
            
            if (!string.IsNullOrEmpty(remoteDir))
            {
                if (!client.Exists(remoteDir))
                {
                    client.CreateDirectory(remoteDir);
                }
                client.ChangeDirectory(remoteDir);
            }
            
            string remoteFilePath = $"call_{callId}_{DateTime.UtcNow.Ticks}.xml";
            
            using var fileStream = new FileStream(filePath, FileMode.Open);
            client.UploadFile(fileStream, remoteFilePath);
            
            _logger.LogInformation("Successfully uploaded call {CallId} to ESO", callId);
            break;
        }
        catch (Exception ex)
        {
            retryCount++;
            if (retryCount >= maxRetries)
            {
                throw new Exception($"SFTP upload failed after {maxRetries} attempts", ex);
            }
            
            _logger.LogWarning("SFTP upload attempt {RetryCount} failed: {ErrorMessage}. Retrying in {RetryDelay}ms...", 
                retryCount, ex.Message, retryDelay.TotalMilliseconds);
            
            await Task.Delay(retryDelay);
            retryDelay = TimeSpan.FromSeconds(retryDelay.TotalSeconds * 2); // Exponential backoff
        }
        finally
        {
            if (client.IsConnected)
            {
                client.Disconnect();
            }
        }
    }
}
```

### 5. Google Sheets Integration

Implementation using Google.Apis.Sheets.v4 library:

```csharp
public async Task LogToGoogleSheetsAsync(Call call, string xml, string status)
{
    try
    {
        var sheetId = _configuration["GoogleSheets:SheetId"];
        if (string.IsNullOrEmpty(sheetId))
        {
            _logger.LogWarning("Google Sheets logging disabled - no sheet ID configured");
            return;
        }
        
        // Initialize the Google Sheets service
        var credential = await GetGoogleCredentialAsync();
        var sheetsService = new SheetsService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Resgrid ESO Integration"
        });
        
        // Prepare log entry
        var timestamp = DateTime.UtcNow.ToString("o");
        var values = new List<object>
        {
            timestamp,
            "info",
            $"XML file uploaded to {_configuration["SFTP:Host"]} for call {call.CallId}",
            status,
            xml.Length
        };
        
        // Append to sheet
        var range = "Sheet1!A:E";
        var valueRange = new ValueRange
        {
            Values = new List<IList<object>> { values }
        };
        
        var appendRequest = sheetsService.Spreadsheets.Values.Append(valueRange, sheetId, range);
        appendRequest.ValueInputOption = SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.RAW;
        appendRequest.InsertDataOption = SpreadsheetsResource.ValuesResource.AppendRequest.InsertDataOptionEnum.INSERTROWS;
        
        var response = await appendRequest.ExecuteAsync();
        _logger.LogInformation("Successfully logged call {CallId} to Google Sheets", call.CallId);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to log call {CallId} to Google Sheets", call.CallId);
    }
}

private async Task<GoogleCredential> GetGoogleCredentialAsync()
{
    var base64ServiceAccount = _configuration["GoogleSheets:ServiceAccountJsonBase64"];
    if (!string.IsNullOrEmpty(base64ServiceAccount))
    {
        var serviceAccountBytes = Convert.FromBase64String(base64ServiceAccount);
        using var stream = new MemoryStream(serviceAccountBytes);
        return GoogleCredential.FromStream(stream)
            .CreateScoped(SheetsService.Scope.Spreadsheets);
    }
    
    var serviceAccountPath = _configuration["GoogleSheets:ServiceAccountJsonPath"];
    if (!string.IsNullOrEmpty(serviceAccountPath) && File.Exists(serviceAccountPath))
    {
        using var stream = new FileStream(serviceAccountPath, FileMode.Open, FileAccess.Read);
        return GoogleCredential.FromStream(stream)
            .CreateScoped(SheetsService.Scope.Spreadsheets);
    }
    
    throw new InvalidOperationException("Google service account credentials not found");
}
```

### 6. Configuration Changes

Add configuration in `appsettings.json`:

```json
{
  "EsoIntegration": {
    "Enabled": true,
    "SftpHost": "sftp.esosuite.net",
    "SftpUsername": "",
    "SftpPassword": "",
    "SftpDirectory": "/incoming",
    "GoogleSheetsLogEnabled": true,
    "GoogleSheetsId": ""
  }
}
```

### 7. Polling Mechanism for Redundancy

```csharp
public class EsoCallPollingService : BackgroundService
{
    private readonly IEsoIntegrationService _esoIntegrationService;
    private readonly ICallsService _callsService;
    private readonly ILogger<EsoCallPollingService> _logger;
    private readonly IConfiguration _configuration;
    
    public EsoCallPollingService(
        IEsoIntegrationService esoIntegrationService,
        ICallsService callsService,
        ILogger<EsoCallPollingService> logger,
        IConfiguration configuration)
    {
        _esoIntegrationService = esoIntegrationService;
        _callsService = callsService;
        _logger = logger;
        _configuration = configuration;
    }
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Skip if integration is disabled
        if (!_configuration.GetValue<bool>("EsoIntegration:Enabled", false))
        {
            _logger.LogInformation("ESO Integration polling disabled by configuration");
            return;
        }
        
        var pollingIntervalSeconds = _configuration.GetValue<int>("EsoIntegration:PollingIntervalSeconds", 60);
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Polling for recent calls (backup mechanism)...");
                
                // Get active calls
                var activeCalls = await _callsService.GetActiveCallsAsync();
                _logger.LogInformation("Found {Count} active calls during polling", activeCalls.Count);
                
                // Process each call
                foreach (var call in activeCalls)
                {
                    try
                    {
                        await _esoIntegrationService.ProcessCallAsync(call.CallId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing call {CallId} during polling", call.CallId);
                    }
                }
                
                _logger.LogInformation("Processed {Count} calls during polling cycle", activeCalls.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during ESO integration polling");
            }
            
            await Task.Delay(TimeSpan.FromSeconds(pollingIntervalSeconds), stoppingToken);
        }
    }
}
```

## Fixes for Issues Identified in Analysis

1. **Status Code Mappings**
   - Updated status code mapping to match Resgrid's UnitStateTypes
   - 2 = Unavailable (not Available)
   - 3 = Committed
   - 5 = Responding
   - 6 = OnScene
   - 9 = Cancelled (not Returning)

2. **API Timeouts**
   - Direct service calls eliminate API timeouts
   - Implemented timeout parameters and retry logic for SFTP uploads
   - Added proper cancellation token usage

3. **Error Handling**
   - Comprehensive try/catch blocks with proper logging
   - Detailed error messages
   - Multiple retry attempts for transient errors

4. **SignalR Connection Issues**
   - Eliminated by using Resgrid's internal event system
   - No connection issues since we're integrated directly

5. **Integration Monitoring**
   - Maintained Google Sheets logging for audit trail
   - Added detailed logging with Resgrid's native logging system

## NuGet Packages Required

- SSH.NET
- Google.Apis.Sheets.v4
- System.Xml.Linq

## Migration Benefits

1. **Reliability**: Eliminates API timeouts and connection issues
2. **Performance**: Direct service calls instead of API requests
3. **Maintainability**: Integrated into Resgrid's codebase
4. **Feature Parity**: All existing features maintained
5. **Improved Error Handling**: Native C# exception handling

## Deployment Considerations

1. **Configuration**: Updated appsettings.json with ESO integration settings
2. **Secrets Management**: Move credentials to secure storage
3. **Version Control**: Include in Resgrid's version control
4. **Testing**: Create integration tests for ESO bridge
5. **Documentation**: Update Resgrid docs with ESO integration info