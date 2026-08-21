FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Nbp.Pms.Api/Nbp.Pms.Api.csproj", "src/Nbp.Pms.Api/"]
COPY ["src/Nbp.Pms.Application/Nbp.Pms.Application.csproj", "src/Nbp.Pms.Application/"]
COPY ["src/Nbp.Pms.Domain/Nbp.Pms.Domain.csproj", "src/Nbp.Pms.Domain/"]
COPY ["src/Nbp.Pms.Contracts/Nbp.Pms.Contracts.csproj", "src/Nbp.Pms.Contracts/"]
COPY ["src/Nbp.Pms.Infrastructure/Nbp.Pms.Infrastructure.csproj", "src/Nbp.Pms.Infrastructure/"]
COPY ["src/Nbp.Pms.BackgroundJobs/Nbp.Pms.BackgroundJobs.csproj", "src/Nbp.Pms.BackgroundJobs/"]

RUN dotnet restore "src/Nbp.Pms.Api/Nbp.Pms.Api.csproj"
COPY . .
WORKDIR "/src/src/Nbp.Pms.Api"
RUN dotnet build "Nbp.Pms.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Nbp.Pms.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Nbp.Pms.Api.dll"]
