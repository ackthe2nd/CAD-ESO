# Auto-Closure Feature - MEDsync EMS Suite

## Overview
The Auto-Closure feature automatically closes emergency calls when all responding units become inactive for a configurable timeout period. This prevents calls from remaining open indefinitely and ensures accurate call lifecycle management.

## How It Works

### Basic Operation
1. **Call Monitoring**: New active calls are automatically added to monitoring
2. **System-Wide Unit Tracking**: System monitors ALL units in the system, not just those assigned to calls
3. **Activity Timer**: Each call has an activity timer that resets when any unit changes status
4. **Timeout Check**: After the configured timeout period, system checks if ALL units in the system are inactive
5. **Automatic Closure**: If ALL system units are Out of Service (Status 10), the call is automatically closed

### Integration with MEDsync
- **SignalR Events**: Responds to real-time unit status changes
- **Polling Mechanism**: Works with existing call polling for backup monitoring
- **Google Sheets Logging**: All auto-closure activities are logged
- **XML Generation**: Generates final XML with proper closure timestamps
- **Web Monitoring**: Provides `/auto-closure` endpoint for status monitoring

## Configuration Options

### Default Configuration
```javascript
{
  enableAutoClose: true,
  timeoutMinutes: 30,              // Close after 30 minutes of inactivity
  checkIntervalMinutes: 5,         // Check every 5 minutes
  closureStatuses: [4, 10],        // Status 4 = Out of Service (primary), Status 10 = legacy
  requireAllUnitsInactive: true,   // ALL system units must be out of service
  notifyOnClosure: true            // Log closure notifications
}
```

### Configuration Profiles

#### Conservative (Recommended)
- **Timeout**: 30 minutes
- **Check Interval**: 5 minutes
- **Use Case**: Standard emergency operations with adequate time for manual closure

#### Aggressive
- **Timeout**: 15 minutes
- **Check Interval**: 2 minutes
- **Use Case**: High-volume operations requiring quick call turnover

#### Relaxed
- **Timeout**: 60 minutes
- **Check Interval**: 10 minutes
- **Use Case**: Complex operations or training scenarios

## Unit Status Codes

### Closure Statuses (Trigger Auto-Closure)
- **Status 4**: Out of Service (primary trigger for closure)
- **Status 10**: Out of Service (legacy support)
- **Status Text**: "Out of Service" text recognition (handles undefined status IDs)

### Active Statuses (Prevent Auto-Closure)
- **Status 1**: Dispatched
- **Status 3**: En Route
- **Status 4**: On Scene
- **Status 5**: At Patient
- **Status 6**: Transport
- **Status 7**: At Hospital

## Monitoring and Logging

### System Logs
```
2025-06-19 10:30:00 [info]: Auto-closing call 202001: Medical Emergency
2025-06-19 10:30:00 [info]: Auto-Closure Summary for Call 202001:
2025-06-19 10:30:00 [info]:   Title: Medical Emergency - Chest Pain
2025-06-19 10:30:00 [info]:   Total Duration: 45.2 minutes
2025-06-19 10:30:00 [info]:   Timeout Period: 30 minutes
2025-06-19 10:30:00 [info]:   Final Unit Statuses:
2025-06-19 10:30:00 [info]:     Unit 8826: Available (Status 2)
```

### Google Sheets Integration
- Auto-closure events logged to main system logs
- Call data updated with closure timestamps
- XML generation status tracked
- ESO upload confirmation recorded

### Web Monitoring Endpoint
**URL**: `/auto-closure`

**Response Example**:
```json
{
  "success": true,
  "autoClosure": {
    "isRunning": true,
    "monitoredCalls": 3,
    "config": {
      "timeoutMinutes": 30,
      "checkIntervalMinutes": 5,
      "closureStatuses": [2, 8, 9]
    },
    "callDetails": [
      {
        "callId": "202001",
        "title": "Medical Emergency",
        "unitCount": 1,
        "timeSinceActivity": 25.5,
        "checkCount": 5
      }
    ]
  }
}
```

## Implementation Details

### Call Lifecycle Integration
1. **New Call Processing**: `processCallAdded()` adds active calls to monitoring
2. **Unit Status Updates**: `UnitStatusSet` events reset activity timers
3. **Manual Closure**: System removes calls from monitoring when manually closed
4. **Closure Detection**: Existing closure detection prevents duplicate processing

### Error Handling
- **API Failures**: Graceful handling of Resgrid API errors
- **Network Issues**: Retry mechanisms for connectivity problems
- **Invalid Data**: Validation prevents processing of malformed call data
- **System Shutdown**: Proper cleanup during service termination

### Performance Considerations
- **Memory Efficient**: Minimal memory footprint for call tracking
- **Scalable**: Handles multiple concurrent calls effectively
- **Non-Blocking**: Asynchronous processing prevents service delays
- **Configurable**: Adjustable intervals prevent system overload

## Testing and Validation

### Test Script
Run the test script to see auto-closure in action:
```bash
node test-auto-closure-feature.js
```

### Manual Testing
1. Create a test call with responding units
2. Monitor via `/auto-closure` endpoint
3. Wait for timeout period
4. Verify automatic closure occurs
5. Check Google Sheets for logging

### Production Validation
- Monitor system logs for auto-closure events
- Verify XML generation includes closure timestamps
- Confirm ESO upload success for auto-closed calls
- Check Google Sheets for accurate record keeping

## Troubleshooting

### Common Issues

#### Auto-Closure Not Working
- **Check Configuration**: Verify `enableAutoClose: true`
- **Unit Status**: Ensure units reach closure statuses
- **Timeout Period**: Confirm sufficient time has elapsed
- **System Logs**: Review logs for error messages

#### Premature Closure
- **Increase Timeout**: Extend `timeoutMinutes` setting
- **Check Unit Statuses**: Verify correct status mapping
- **Activity Updates**: Ensure unit changes reset timers

#### Missing Logs
- **Google Sheets**: Verify service account permissions
- **System Logging**: Check logger configuration
- **Network Issues**: Confirm external service connectivity

### Debugging Commands
```bash
# Check auto-closure status
curl https://your-app.fly.dev/auto-closure

# Monitor system logs
fly logs -a your-app

# Test auto-closure feature
node test-auto-closure-feature.js
```

## Security Considerations

### API Access
- Auto-closure uses existing Resgrid API authentication
- No additional credentials required
- Respects existing API rate limits

### Data Protection
- No sensitive data stored in memory
- All API calls use encrypted connections
- Logging respects privacy requirements

### Access Control
- Feature controlled by configuration settings
- Web endpoint requires no authentication (status only)
- Administrative control via application deployment

## Future Enhancements

### Planned Features
- **Notification System**: Email/SMS alerts for auto-closures
- **Advanced Rules**: Complex closure conditions based on call type
- **Analytics Dashboard**: Historical auto-closure statistics
- **Integration APIs**: Webhook support for external systems

### Configuration Extensions
- **Time-based Rules**: Different timeouts by time of day
- **Call Type Specific**: Varying timeouts by incident type
- **Unit Type Awareness**: Different rules for different unit types
- **Geographic Zones**: Location-based auto-closure rules

## Support and Maintenance

### Monitoring Requirements
- Regular review of auto-closure logs
- Performance monitoring for check intervals
- API response time monitoring
- Google Sheets integration verification

### Maintenance Tasks
- Periodic configuration review
- System performance optimization
- Log rotation and cleanup
- API credential rotation

### Support Resources
- System documentation in this guide
- Test scripts for validation
- Monitoring endpoints for diagnostics
- Comprehensive logging for troubleshooting

## Conclusion

The Auto-Closure feature provides intelligent call lifecycle management by automatically closing calls when all responding units become inactive. This ensures accurate record keeping, prevents indefinitely open calls, and maintains system efficiency while respecting operational requirements and providing comprehensive monitoring capabilities.

The feature integrates seamlessly with existing MEDsync components and provides extensive configurability to meet diverse operational needs while maintaining high reliability and performance standards.