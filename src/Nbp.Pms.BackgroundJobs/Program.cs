using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Nbp.Pms.BackgroundJobs;

public class Program
{
    public static async Task Main(string[] args)
    {
        var host = Host.CreateDefaultBuilder(args)
            .ConfigureLogging(logging =>
            {
                logging.ClearProviders();
                logging.AddConsole();
            })
            .ConfigureServices((hostContext, services) =>
            {
                // Background job worker service registration
            })
            .Build();

        var logger = host.Services.GetService(typeof(ILogger<Program>)) as ILogger<Program>;
        logger?.LogInformation("NBP PMS Background Worker Host Started Successfully.");

        await host.RunAsync();
    }
}
