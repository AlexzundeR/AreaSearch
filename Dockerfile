FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY Area.Search.Web/*.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o ./out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build-env /app/Area.Search.Web/out/ .
ENV ASPNETCORE_URLS=http://*:$PORT
ENTRYPOINT ["dotnet", "Area.Search.Web.dll"]
