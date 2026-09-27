using MassTransit;

namespace FamilyJournalApi.Managers.Events;

// Thin adapters from the bus to NotificationManager, so the manager itself stays free of MassTransit.

public class PostCreatedConsumer(INotificationManager notifications) : IConsumer<PostCreated>
{
    public Task Consume(ConsumeContext<PostCreated> context) => notifications.Handle(context.Message);
}

public class CommentAddedConsumer(INotificationManager notifications) : IConsumer<CommentAdded>
{
    public Task Consume(ConsumeContext<CommentAdded> context) => notifications.Handle(context.Message);
}

public class ReactionAddedConsumer(INotificationManager notifications) : IConsumer<ReactionAdded>
{
    public Task Consume(ConsumeContext<ReactionAdded> context) => notifications.Handle(context.Message);
}

public class MemberJoinedConsumer(INotificationManager notifications) : IConsumer<MemberJoined>
{
    public Task Consume(ConsumeContext<MemberJoined> context) => notifications.Handle(context.Message);
}
