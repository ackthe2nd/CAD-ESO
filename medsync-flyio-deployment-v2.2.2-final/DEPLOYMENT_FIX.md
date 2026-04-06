# Deployment Fix for npm ci Issue

## Problem Resolved
The deployment was failing with npm ci because package-lock.json was missing or out of sync.

## Solution Applied
1. Updated Dockerfile to use `npm install` instead of `npm ci`
2. Removed package-lock.json dependency
3. Added .gitignore to prevent future conflicts

## Changes Made
- **Dockerfile**: Changed from `npm ci --only=production` to `npm install --only=production`
- **Added**: .gitignore file to exclude lock files
- **Removed**: package-lock.json dependency

## Deployment Command
```bash
fly deploy --ha=false
```

This will now work without npm ci conflicts.