# System Flow Diagram - Resgrid-ESO Bridge

## Data Flow Architecture

```
┌─────────────┐    SignalR     ┌──────────────┐    Processing    ┌─────────────┐
│   Resgrid   │◄──────────────►│  Bridge      │◄────────────────►│  Internal   │
│   Events    │    WebSocket   │  Service     │    Pipeline      │  Queue      │
└─────────────┘                └──────────────┘                  └─────────────┘
                                       │
                               ┌───────┼───────┐
                               │       │       │
                               ▼       ▼       ▼
                        ┌─────────┐ ┌────────┐ ┌─────────┐
                        │   XML   │ │  SFTP  │ │ Google  │
                        │Generator│ │ Client │ │ Sheets  │
                        └─────────┘ └────────┘ └─────────┘
                               │       │       │
                               ▼       ▼       ▼
                        ┌─────────┐ ┌────────┐ ┌─────────┐
                        │ESO XML  │ │  ESO   │ │ Call    │
                        │Structure│ │ Server │ │ Data    │
                        └─────────┘ └────────┘ └─────────┘
```

## Location Column Processing Flow

```
Incident Details Input:
"EVENT: Other - EMERGENCY - INCIDENT TYPE: MEDICAL EMERGENCY - LOCATION: Parking lot - 6411 Sepulveda Blvd Ste 2E, Van Nuys, CA 91411, USA"
                                    │
                                    ▼
                        extractLocationFromIncidentDetails()
                                    │
                            ┌───────┼───────┐
                            │               │
                            ▼               ▼
                    Primary Pattern      Fallback Pattern
                    /LOCATION:\s*([^-\n\r]+?)(?:\s*-\s*(?:\d|\w+\s+\w+|\w+,|\w+\s+\w+\s+\w+|ALERTS))/i
                            │               │
                            ▼               ▼
                    "Parking lot"      Address Filter
                            │               │
                            └───────┬───────┘
                                    ▼
                            Clean & Validate
                                    │
                                    ▼
                            Google Sheets Column I
                            "Parking lot"
```

## Component Interaction Matrix

| Component | Resgrid API | Google Sheets | ESO SFTP | SignalR | Local Storage |
|-----------|-------------|---------------|----------|---------|---------------|
| Listener  | ✓ Read      | ✓ Log         | -        | ✓ Event | ✓ Cache       |
| XML Gen   | ✓ Data      | ✓ Status      | ✓ Output | -       | ✓ Temp        |
| SFTP      | -           | ✓ Status      | ✓ Upload | -       | ✓ Files       |
| Sheets    | ✓ Enrich    | ✓ Write       | -        | -       | -             |
| Monitor   | ✓ Health    | ✓ Log         | ✓ Verify | ✓ Status| ✓ Metrics     |

## Error Handling Flow

```
┌─────────────┐    Error     ┌──────────────┐    Retry      ┌─────────────┐
│ Operation   │─────────────►│ Error        │──────────────►│ Retry       │
│ Attempt     │              │ Detection    │               │ Logic       │
└─────────────┘              └──────────────┘               └─────────────┘
                                     │                              │
                                     ▼                              │
                              ┌──────────────┐                     │
                              │ Log Error    │                     │
                              │ to Sheets    │                     │
                              └──────────────┘                     │
                                     │                              │
                                     ▼                              │
                              ┌──────────────┐                     │
                              │ Graceful     │◄────────────────────┘
                              │ Degradation  │
                              └──────────────┘
```