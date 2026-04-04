#!/bin/bash
# Production build script for Area Search Web

set -e

echo "=== Building Area Search Web - Production ==="

# Navigate to web project
cd Area.Search.Web

echo "=== Step 1: Installing npm dependencies ==="
npm install --save-dev

echo "=== Step 2: Building Angular application ==="
npm run build:prod

echo "=== Step 3: Building .NET application ==="
cd ..
dotnet publish Area.Search.Web/Area.Search.Web.csproj -c Release -o ./publish

echo "=== Build Complete ==="
echo "Output: ./publish"

# Optional: Build Docker image
# docker build . -t area-search:latest-2023 -t area-search:latest