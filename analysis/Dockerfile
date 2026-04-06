FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /source

# Copy csproj and restore as distinct layers
COPY *.sln .
COPY Common/Resgrid/Resgrid.csproj Common/Resgrid/
COPY Core/Resgrid.Config/Resgrid.Config.csproj Core/Resgrid.Config/
COPY Core/Resgrid.Framework/Resgrid.Framework.csproj Core/Resgrid.Framework/
COPY Core/Resgrid.Localization/Resgrid.Localization.csproj Core/Resgrid.Localization/
COPY Core/Resgrid.Model/Resgrid.Model.csproj Core/Resgrid.Model/
COPY Core/Resgrid.Services/Resgrid.Services.csproj Core/Resgrid.Services/
COPY Providers/Resgrid.Providers.ApiClient/Resgrid.Providers.ApiClient.csproj Providers/Resgrid.Providers.ApiClient/
COPY Providers/Resgrid.Providers.Bus/Resgrid.Providers.Bus.csproj Providers/Resgrid.Providers.Bus/
COPY Providers/Resgrid.Providers.Cache/Resgrid.Providers.Cache.csproj Providers/Resgrid.Providers.Cache/
# Add other project references as needed
COPY Web/Resgrid.Web.Services/Resgrid.Web.Services.csproj Web/Resgrid.Web.Services/

RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish Web/Resgrid.Web.Services/Resgrid.Web.Services.csproj -c Release -o /app

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app ./

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose the port
EXPOSE 8080

# Start the application
ENTRYPOINT ["dotnet", "Resgrid.Web.Services.dll"]