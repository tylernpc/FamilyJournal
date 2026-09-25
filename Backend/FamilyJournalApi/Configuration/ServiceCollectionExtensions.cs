using System.Text.Json.Serialization;
using FamilyJournalApi.Accessors;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Managers;
using Microsoft.EntityFrameworkCore;

namespace FamilyJournalApi.Configuration;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Controllers, JSON conventions, and OpenAPI.
    /// </summary>
    public static IServiceCollection AddApiControllers(this IServiceCollection services)
    {
        services.AddControllers()
            // enums go over the wire as names ("Admin"), not numbers (0)
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        services.AddOpenApi();

        return services;
    }

    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<DatabaseContext>(options => options
            .UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        return services;
    }

    /// <summary>
    /// iDesign layers: register new managers, engines, and accessors here.
    /// </summary>
    public static IServiceCollection AddFamilyJournal(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);

        // Managers
        services.AddScoped<IFamilyManager, FamilyManager>();

        // Engines
        services.AddScoped<ITreeEngine, TreeEngine>();

        // Accessors
        services.AddScoped<IFamilyAccessor, FamilyAccessor>();

        return services;
    }
}
