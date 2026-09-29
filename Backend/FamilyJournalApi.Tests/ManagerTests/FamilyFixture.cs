using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Configuration;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using FamilyJournalApi.Tests.Fakes;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace FamilyJournalApi.Tests.ManagerTests;

/// <summary>
/// Every manager wired to the same in-memory family, with Emma as its admin.
/// </summary>
public class FamilyFixture
{
    public FakeTimeProvider Clock { get; } = TestCredentials.Clock();
    public FakeDatabase Db { get; } = new();
    public FakeUserAccessor Users { get; } = new();
    public FakeNotificationAccessor NotificationStore { get; } = new();
    public FakeEventPublisher Events { get; } = new();

    public FamilyManager Families { get; }
    public ProfileManager Profiles { get; }
    public PostManager Posts { get; }
    public NotificationManager Notifications { get; }

    public Guid FamilyId { get; }
    public ProfileDto Emma { get; }

    public FamilyFixture()
    {
        var familyAccessor = new FakeFamilyAccessor(Db);
        var profileAccessor = new FakeProfileAccessor(Db);
        var mediaAccessor = new FakeMediaAccessor(Db);

        Families = new FamilyManager(familyAccessor, Users, profileAccessor, mediaAccessor, TestCredentials.Engine(Clock), Events, Clock);
        Profiles = new ProfileManager(profileAccessor, new FakeRelationshipAccessor(Db), mediaAccessor, new TreeEngine(), Clock);
        Posts = new PostManager(new FakePostAccessor(Db), profileAccessor, mediaAccessor, Events, Options.Create(new MediaOptions()), Clock);
        Notifications = new NotificationManager(NotificationStore, familyAccessor);

        (FamilyId, Emma) = Db.AddFamily();
    }

    public FamilyCaller AsEmma => new(FamilyId, Emma.Id, Common.Enum.MemberRole.Admin);

    public FamilyCaller As(ProfileDto profile) =>
        new(FamilyId, profile.Id, Db.Members.Single(m => m.ProfileId == profile.Id).Role);

    public ProfileDto Member(string name) => Db.AddMember(FamilyId, name);

    public ProfileDto Placeholder(string name, Guid? addedBy = null) => Db.AddProfile(FamilyId, name, addedBy: addedBy ?? Emma.Id);

    // An uploaded photo, in this family unless another is given
    public Guid Photo(Guid? familyId = null)
    {
        var id = Guid.NewGuid();
        Db.Media[id] = new MediaDto { Id = id, FamilyId = familyId ?? FamilyId, Width = 1200, Height = 900 };
        return id;
    }
}
