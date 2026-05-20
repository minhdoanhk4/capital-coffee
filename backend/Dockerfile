# Build stage - dùng .NET 10 SDK preview
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY backend.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app/publish .

# Render sets PORT env variable dynamically
ENV ASPNETCORE_URLS=http://+:${PORT:-5000}
EXPOSE 5000

ENTRYPOINT ["dotnet", "backend.dll"]
