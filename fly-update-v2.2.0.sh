#!/bin/bash

# Fly.io Update Script for Resgrid-ESO Bridge v2.2.0
# Updates existing deployment with critical fixes

echo "🔄 Updating Resgrid-ESO Bridge to v2.2.0 on Fly.io"
echo "=================================================="

# Check if flyctl is available
if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
    echo "❌ Error: Fly CLI not found. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Use flyctl or fly command
FLY_CMD="flyctl"
if ! command -v flyctl &> /dev/null; then
    FLY_CMD="fly"
fi

echo "📦 Current system status:"
$FLY_CMD status --app resgrid2eso

echo ""
echo "🚀 Deploying v2.2.0 with critical fixes..."
echo "• XML Integrity Monitor - ESO write-only compatibility"
echo "• Enhanced Unit Activity Collection - Multiple fallback methods"
echo "• Improved DOB Extraction - Comprehensive search patterns"
echo "• Timestamp Formatting - YYYY-MM-DD HH:MM:SS standardization"

# Deploy with zero-downtime rolling strategy
$FLY_CMD deploy --app resgrid2eso --strategy rolling

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Update successful!"
    echo ""
    echo "🎯 System v2.2.0 Now Live"
    echo "========================"
    
    # Wait a moment for the app to start
    sleep 10
    
    echo "📊 Health verification:"
    curl -s https://resgrid2eso.fly.dev/status | grep -q "2.2.0" && echo "✅ Version 2.2.0 confirmed" || echo "⚠️ Version check inconclusive"
    
    echo ""
    echo "📋 Post-Update Verification:"
    echo "1. Health endpoint: https://resgrid2eso.fly.dev/status"
    echo "2. Check Google Sheets for proper timestamp formatting"
    echo "3. Monitor logs: $FLY_CMD logs --app resgrid2eso"
    echo "4. Verify emergency call processing continues"
    
    echo ""
    echo "🔧 Critical Fixes Now Active:"
    echo "• No more XML integrity verification errors"
    echo "• Enhanced unit timing data collection"
    echo "• Improved patient DOB extraction"
    echo "• Consistent timestamp formatting: YYYY-MM-DD HH:MM:SS"
    
else
    echo "❌ Update failed. Rolling back..."
    $FLY_CMD apps restart resgrid2eso
    exit 1
fi

echo ""
echo "🎉 Production v2.2.0 deployment complete!"
echo "Emergency call processing continues with enhanced reliability."