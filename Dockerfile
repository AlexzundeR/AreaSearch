FROM mcr.microsoft.com/dotnet/core/sdk:2.1 AS build-env
WORKDIR /app

# Copy csproj and restore as distinct layers
#COPY *.csproj ./


# Copy everything else and build
COPY . ./
RUN dotnet restore
RUN dotnet publish -c Release -o ./out

# Build runtime image
FROM mcr.microsoft.com/dotnet/core/aspnet:2.1
WORKDIR /app
COPY --from=build-env /app/Area.Search.Web/out/ .
# COPY Area.Search.Web/wwwroot /app/wwwroot/
# COPY nginx.conf /etc/nginx
#ENV ASPNETCORE_URLS=http://*:$PORT
CMD ASPNETCORE_URLS=http://*:$PORT dotnet Area.Search.Web.dll
#ENTRYPOINT ["dotnet", "KingsBattle.Web.dll"]
