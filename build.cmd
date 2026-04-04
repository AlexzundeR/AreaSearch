@echo off
REM Production build script for Area Search Web

echo === Building Area Search Web - Production ===

cd Area.Search.Web

echo === Step 1: Installing npm dependencies ===
call npm install

echo === Step 2: Building Angular application ===
call npm run build:prod

cd ..

echo === Step 3: Building .NET application ===
call dotnet publish Area.Search.Web/Area.Search.Web.csproj -c Release -o ./publish

echo === Build Complete ===
echo Output: ./publish

REM Optional: Build Docker image
REM docker build . -t area-search:latest-2023 -t area-search:latest