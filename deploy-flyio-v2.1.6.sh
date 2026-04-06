#!/bin/bash
# Deploy Fly.io Version 2.1.6 with Call Closure Detection and Timestamp Formatting

echo "Deploying Resgrid-ESO Bridge v2.1.6 to Fly.io production..."

# Navigate to deployment directory
cd flyio-update

# Create deployment manifest
cat > flyio-deploy.json << 'EOF'
{
  "version": "2.1.6",
  "features": [
    "Call closure detection via SignalR",
    "Google Sheets timestamp formatting (6/9/2025 1:49:43)",
    "Enhanced SignalR event handling",
    "Unit status change monitoring",
    "Improved call state change detection"
  ],
  "deployment_date": "2025-06-09"
}
EOF

echo "Created deployment manifest for v2.1.6"
echo ""
echo "Changes included:"
echo "✓ CallClosed event handler added"
echo "✓ CallStateChanged processing enhanced"
echo "✓ UnitStatusSet event monitoring"
echo "✓ Google Sheets timestamp formatting"
echo "✓ Real-time call closure detection"
echo ""
echo "Ready to deploy to production:"
echo "cd flyio-update && fly deploy --app resgrid2eso"
echo ""
echo "Expected improvements:"
echo "- Immediate detection of call closures"
echo "- Automatic final XML generation with closure data"
echo "- Readable timestamps in Google Sheets"
echo "- Enhanced unit status monitoring"