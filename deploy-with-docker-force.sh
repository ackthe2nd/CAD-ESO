#!/bin/bash

# Force Docker deployment for Fly.io
# This script ensures Fly.io uses Docker instead of buildpacks

echo "Forcing Docker deployment to resolve buildpack sunset error..."

# Clear any cached build configuration
flyctl deploy --app resgrid2eso --strategy docker --dockerfile Dockerfile --build-arg NODE_ENV=production

echo "Docker deployment completed!"