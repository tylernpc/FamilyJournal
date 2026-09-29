using System.Text.Json.Serialization;
using FamilyJournalApi.Accessors;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Events;
using MassTransit;
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

        // The OpenAPI document reads these options rather than the controllers' ones above, so they
        // repeat the enum names and say numbers are plain numbers (the web app generates its types from it)
        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            options.SerializerOptions.NumberHandling = JsonNumberHandling.Strict;
        });

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
    public static IServiceCollection AddFamilyJournal(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton(TimeProvider.System);

        services.AddOptions<MediaOptions>().Bind(configuration.GetSection(MediaOptions.SectionName));

        // Managers
        services.AddScoped<IAccountManager, AccountManager>();
        services.AddScoped<IFamilyManager, FamilyManager>();
        services.AddScoped<IProfileManager, ProfileManager>();
        services.AddScoped<IPostManager, PostManager>();
        services.AddScoped<INotificationManager, NotificationManager>();

        // Engines
        services.AddScoped<ICredentialEngine, CredentialEngine>();
        services.AddScoped<ITreeEngine, TreeEngine>();

        // Accessors
        services.AddScoped<IFamilyAccessor, FamilyAccessor>();
        services.AddScoped<IUserAccessor, UserAccessor>();
        services.AddScoped<IProfileAccessor, ProfileAccessor>();
        services.AddScoped<IRelationshipAccessor, RelationshipAccessor>();
        services.AddScoped<IPostAccessor, PostAccessor>();
        services.AddScoped<IMediaAccessor, MediaAccessor>();
        services.AddScoped<INotificationAccessor, NotificationAccessor>();

        return services;
    }

    /// <summary>
    /// Events between managers. In-memory for now; switching to RabbitMQ or Azure Service Bus
    /// only changes the transport line below.
    /// </summary>
    public static IServiceCollection AddEventBus(this IServiceCollection services)
    {
        services.AddScoped<IEventPublisher, MassTransitEventPublisher>();

        services.AddMassTransit(bus =>
        {
            bus.AddConsumer<PostCreatedConsumer>();
            bus.AddConsumer<CommentAddedConsumer>();
            bus.AddConsumer<ReactionAddedConsumer>();
            bus.AddConsumer<MemberJoinedConsumer>();

            bus.UsingInMemory((context, transport) =>
            {
                // A notification failing to save shouldn't vanish on the first hiccup
                transport.UseMessageRetry(retry => retry.Interval(3, TimeSpan.FromSeconds(1)));
                transport.ConfigureEndpoints(context);
            });
        });

        return services;
    }
}
