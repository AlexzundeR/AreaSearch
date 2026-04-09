# Production build script for Area Search Web
# Run from project root: .\build.ps1

param(
    [string]$Tag = "latest",
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

Write-Host "=== Building Area Search Web - Production ===" -ForegroundColor Cyan

# Step 1: Install dependencies and build Angular frontend
Write-Host "=== Step 1: Installing npm dependencies ===" -ForegroundColor Yellow
Push-Location Area.Search.Web
try {
    npm install
}
finally {
    Pop-Location
}

Write-Host "=== Step 2: Building Angular frontend (Production) ===" -ForegroundColor Yellow
Push-Location Area.Search.Web
try {
    npm run build:prod
}
finally {
    Pop-Location
}

# Step 2: Build .NET application
Write-Host "=== Step 3: Building .NET application (Release) ===" -ForegroundColor Yellow
dotnet publish Area.Search.Web/Area.Search.Web.csproj -c Release -o .build --no-restore

# Step 3: Create Docker image
if (-not $SkipDocker) {
    Write-Host "=== Step 4: Building Docker image ===" -ForegroundColor Yellow
    
    $ImageName = "area-search:$Tag"
    $ImageNameLatest = "area-search:latest"
    
    docker build -f Dockerfile.prod -t $ImageName -t $ImageNameLatest .
    
    Write-Host "=== Step 5: Saving Docker image to archive ===" -ForegroundColor Yellow
    
    $ArchiveName = "area-search-$Tag.tar"
    docker save -o $ArchiveName $ImageName $ImageNameLatest
    
    $size = (Get-Item $ArchiveName).Length / 1MB
    Write-Host "Image saved: $ArchiveName ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
}

Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host ""

# Transfer instructions
@"
=== TRANSFER TO SERVER ===

# Copy archive to server (replace <port> with your SSH port):
scp -P <port> area-search-$Tag.tar user@server:/path/

# On server, load image:
docker load -i area-search-$Tag.tar

# Run container:
docker run -d -p 80:8080 --name area-search area-search:latest

# Example with custom port mapping:
docker run -d -p 8080:80 --name area-search area-search:latest

"@