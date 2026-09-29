using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers.Events;

namespace FamilyJournalApi.Tests.ManagerTests;

public class NotificationManagerTests
{
    private readonly FamilyFixture f = new();

    private List<(Guid Recipient, NotificationType Type)> Sent() =>
        f.NotificationStore.Notifications.Select(n => (n.RecipientProfileId, n.Type)).ToList();

    [Fact]
    public async Task A_new_post_notifies_everyone_else_and_tagged_people_get_the_personal_version()
    {
        var nate = f.Member("Nate");
        var ana = f.Member("Ana");

        await f.Notifications.Handle(new PostCreated(f.FamilyId, Guid.NewGuid(), f.Emma.Id, [ana.Id], "Pie lesson", TestCredentials.Start));

        Assert.Equal(
            new[] { (nate.Id, NotificationType.PostCreated), (ana.Id, NotificationType.MemberTagged) }.Order(),
            Sent().Order());
    }

    [Fact]
    public async Task Placeholders_never_get_notifications()
    {
        var june = f.Placeholder("June");

        await f.Notifications.Handle(new PostCreated(f.FamilyId, Guid.NewGuid(), f.Emma.Id, [june.Id], "Pie lesson", TestCredentials.Start));

        Assert.Empty(Sent());
    }

    [Fact]
    public async Task A_comment_notifies_the_post_author_and_mentioned_people_once_each()
    {
        var nate = f.Member("Nate");
        var ana = f.Member("Ana");
        var diego = f.Member("Diego");

        // Ana comments on Emma's post and mentions Nate and Emma
        await f.Notifications.Handle(new CommentAdded(f.FamilyId, Guid.NewGuid(), Guid.NewGuid(), ana.Id, f.Emma.Id, [nate.Id, f.Emma.Id], "Nice", TestCredentials.Start));

        var sent = Sent();
        Assert.Contains((nate.Id, NotificationType.Mentioned), sent);
        Assert.Contains((f.Emma.Id, NotificationType.Mentioned), sent);
        Assert.DoesNotContain(sent, s => s.Recipient == diego.Id || s.Recipient == ana.Id);
        Assert.Equal(2, sent.Count);
    }

    [Fact]
    public async Task A_reaction_notifies_only_the_post_author_with_the_emoji()
    {
        var nate = f.Member("Nate");
        f.Member("Ana");

        await f.Notifications.Handle(new ReactionAdded(f.FamilyId, Guid.NewGuid(), nate.Id, f.Emma.Id, "🥧", TestCredentials.Start));

        var notification = Assert.Single(f.NotificationStore.Notifications);
        Assert.Equal(f.Emma.Id, notification.RecipientProfileId);
        Assert.Equal("🥧", notification.Emoji);
        Assert.Equal(nate.Id, notification.ActorProfileId);
    }

    [Fact]
    public async Task Changing_a_reaction_replaces_the_unread_notification()
    {
        var nate = f.Member("Nate");
        var postId = Guid.NewGuid();

        await f.Notifications.Handle(new ReactionAdded(f.FamilyId, postId, nate.Id, f.Emma.Id, "🥧", TestCredentials.Start));
        await f.Notifications.Handle(new ReactionAdded(f.FamilyId, postId, nate.Id, f.Emma.Id, "👍🏽", TestCredentials.Start.AddMinutes(1)));

        Assert.Equal("👍🏽", Assert.Single(f.NotificationStore.Notifications).Emoji);
    }

    [Fact]
    public async Task Someone_joining_is_announced_to_everyone_else()
    {
        var nate = f.Member("Nate");
        var june = f.Member("June");

        await f.Notifications.Handle(new MemberJoined(f.FamilyId, june.Id, TestCredentials.Start));

        Assert.Equal(new[] { f.Emma.Id, nate.Id }.Order(), Sent().Select(s => s.Recipient).Order());
    }

    [Fact]
    public async Task Marking_read_updates_the_unread_count()
    {
        var nate = f.Member("Nate");
        await f.Notifications.Handle(new PostCreated(f.FamilyId, Guid.NewGuid(), nate.Id, [], "One", TestCredentials.Start));
        await f.Notifications.Handle(new PostCreated(f.FamilyId, Guid.NewGuid(), nate.Id, [], "Two", TestCredentials.Start.AddMinutes(1)));

        var before = await f.Notifications.GetNotifications(f.AsEmma, null, 30);
        await f.Notifications.MarkRead(f.AsEmma, [before.Notifications[0].Id]);
        var after = await f.Notifications.GetNotifications(f.AsEmma, null, 30);

        Assert.Equal(2, before.UnreadCount);
        Assert.Equal(1, after.UnreadCount);
        Assert.Equal("Two", after.Notifications[0].Preview);
    }
}
