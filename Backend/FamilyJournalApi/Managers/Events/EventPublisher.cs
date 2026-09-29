using MassTransit;

namespace FamilyJournalApi.Managers.Events;

/// <summary>
/// How managers announce what happened. Hides the message transport (MassTransit in-memory today).
/// </summary>
public interface IEventPublisher
{
    Task Publish<T>(T message) where T : class;
}

public class MassTransitEventPublisher(IPublishEndpoint publishEndpoint) : IEventPublisher
{
    public Task Publish<T>(T message) where T : class => publishEndpoint.Publish(message);
}
