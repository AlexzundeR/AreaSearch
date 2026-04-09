#!/bin/bash
# Production build script for Area Search Web
# Run from project root: ./build.sh

set -e

TAG="${1:-latest}"

echo "=== Building Area Search Web - Production ==="

# Step 1: Install npm dependencies
echo "=== Step 1: Installing npm dependencies ==="
cd Area.Search.Web
npm install
cd ..

# Step 2: Build Angular frontend
echo "=== Step 2: Building Angular frontend (Production) ==="
cd Area.Search.Web
npm run build:prod
cd ..

# Step 3: Build .NET application
echo "=== Step 3: Building .NET application (Release) ==="
dotnet publish Area.Search.Web/Area.Search.Web.csproj -c Release -o .build --no-restore

# Step 4: Create Docker image
echo "=== Step 4: Building Docker image ==="
docker build -f Dockerfile.prod -t "area-search:$TAG" -t "area-search:latest" .

# Step 5: Save Docker image
echo "=== Step 5: Saving Docker image to archive ==="
docker save -o "area-search-$TAG.tar" "area-search:$TAG" "area-search:latest"

echo "=== Build Complete ==="
echo ""

echo "=== TRANSFER TO SERVER ==="
echo ""
echo "# Copy archive to server (replace <port> with your SSH port):"
echo "scp -P <port> area-search-$TAG.tar user@server:/path/"
echo ""
echo "# On server, load image:"
echo "docker load -i area-search-$TAG.tar"
echo ""
echo "# Run container:"
echo "docker run -d -p 80:8080 --name area-search area-search:latest"