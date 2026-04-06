FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /source

# Copy solution file first
COPY *.sln .

# Copy all project files
COPY Common/Resgrid/*.csproj Common/Resgrid/
COPY Core/Resgrid.Config/*.csproj Core/Resgrid.Config/
COPY Core/Resgrid.Framework/*.csproj Core/Resgrid.Framework/
COPY Core/Resgrid.Localization/*.csproj Core/Resgrid.Localization/
COPY Core/Resgrid.Model/*.csproj Core/Resgrid.Model/
COPY Core/Resgrid.Services/*.csproj Core/Resgrid.Services/
COPY Providers/Resgrid.Providers.ApiClient/*.csproj Providers/Resgrid.Providers.ApiClient/
COPY Providers/Resgrid.Providers.Bus/*.csproj Providers/Resgrid.Providers.Bus/
COPY Providers/Resgrid.Providers.Cache/*.csproj Providers/Resgrid.Providers.Cache/
COPY Providers/Resgrid.Providers.EmailProvider/*.csproj Providers/Resgrid.Providers.EmailProvider/
COPY Providers/Resgrid.Providers.Geo/*.csproj Providers/Resgrid.Providers.Geo/
COPY Repositories/Resgrid.Repositories.DataRepository/*.csproj Repositories/Resgrid.Repositories.DataRepository/
COPY Web/Resgrid.WebCore/*.csproj Web/Resgrid.WebCore/
COPY Web/Resgrid.Web.Services/*.csproj Web/Resgrid.Web.Services/

# Restore as distinct layers
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish Web/Resgrid.Web.Services/Resgrid.Web.Services.csproj -c Release -o /app

# Final stage/image
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /app
COPY --from=build /app ./

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port
EXPOSE 8080

# Start the application
ENTRYPOINT ["dotnet", "Resgrid.Web.Services.dll"]