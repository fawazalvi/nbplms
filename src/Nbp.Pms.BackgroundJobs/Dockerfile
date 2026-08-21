FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/Nbp.Pms.BackgroundJobs/Nbp.Pms.BackgroundJobs.csproj", "src/Nbp.Pms.BackgroundJobs/"]
COPY ["src/Nbp.Pms.Application/Nbp.Pms.Application.csproj", "src/Nbp.Pms.Application/"]
COPY ["src/Nbp.Pms.Domain/Nbp.Pms.Domain.csproj", "src/Nbp.Pms.Domain/"]
COPY ["src/Nbp.Pms.Contracts/Nbp.Pms.Contracts.csproj", "src/Nbp.Pms.Contracts/"]
COPY ["src/Nbp.Pms.Infrastructure/Nbp.Pms.Infrastructure.csproj", "src/Nbp.Pms.Infrastructure/"]

RUN dotnet restore "src/Nbp.Pms.BackgroundJobs/Nbp.Pms.BackgroundJobs.csproj"
COPY . .
WORKDIR "/src/src/Nbp.Pms.BackgroundJobs"
RUN dotnet build "Nbp.Pms.BackgroundJobs.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Nbp.Pms.BackgroundJobs.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Nbp.Pms.BackgroundJobs.dll"]
