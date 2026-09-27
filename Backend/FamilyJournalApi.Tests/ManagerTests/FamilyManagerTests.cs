using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Events;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Tests.ManagerTests;

public class FamilyManagerTests
{
    private readonly FamilyFixture f = new();

    private async Task<Guid> RegisteredUser(string first = "June", string last = "Harlow")
    {
        var user = await f.Users.CreateUser($"{first}@example.com", $"{first}@EXAMPLE.COM".ToUpperInvariant(), "hash", first, last, TestCredentials.Start);
        return user!.Id;
    }

    [Fact]
    public async Task Only_admins_can_rename_the_family()
    {
        var nate = f.Member("Nate");

        var denied = await f.Families.RenameFamily(f.As(nate), new RenameFamilyRequest { Name = "Nate's Family" });
        var renamed = await f.Families.RenameFamily(f.AsEmma, new RenameFamilyRequest { Name = " The Harlows " });

        Assert.Equal(ResultError.Forbidden, denied.Error);
        Assert.Equal("The Harlows", renamed.Value!.Name);
    }

    [Fact]
    public async Task The_last_admin_cant_step_down()
    {
        var result = await f.Families.SetRole(f.AsEmma, f.Emma.Id, MemberRole.Member);

        Assert.Equal(ResultError.Conflict, result.Error);
    }

    [Fact]
    public async Task An_admin_can_step_down_once_someone_else_is_admin()
    {
        var nate = f.Member("Nate");
        await f.Families.SetRole(f.AsEmma, nate.Id, MemberRole.Admin);

        var result = await f.Families.SetRole(f.AsEmma, f.Emma.Id, MemberRole.Member);

        Assert.True(result.Succeeded);
        Assert.Equal(MemberRole.Member, result.Value!.Role);
    }

    [Fact]
    public async Task Members_can_invite_members_but_not_admins()
    {
        var nate = f.Member("Nate");

        Assert.True((await f.Families.CreateInvite(f.As(nate), new CreateInviteRequest())).Succeeded);
        Assert.Equal(ResultError.Forbidden,
            (await f.Families.CreateInvite(f.As(nate), new CreateInviteRequest { Role = MemberRole.Admin })).Error);
    }

    [Fact]
    public async Task Invites_cant_target_someone_who_joined_or_passed_away()
    {
        var nate = f.Member("Nate");
        var walter = f.Db.AddProfile(f.FamilyId, "Walter", lifeStatus: LifeStatus.Deceased);

        Assert.Equal(ResultError.Conflict, (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest { ProfileId = nate.Id })).Error);
        Assert.Equal(ResultError.Invalid, (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest { ProfileId = walter.Id })).Error);
    }

    [Fact]
    public async Task Accepting_an_invite_for_a_placeholder_claims_it()
    {
        var june = f.Placeholder("June");
        var link = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest { ProfileId = june.Id })).Value!;
        var userId = await RegisteredUser();

        var joined = await f.Families.AcceptInvite(userId, link.Token, new AcceptInviteRequest());

        Assert.True(joined.Succeeded);
        Assert.Equal(june.Id, joined.Value!.ProfileId);
        Assert.Equal(userId, f.Db.Profiles[june.Id].UserId);
        Assert.Contains(f.Events.Published, e => e is MemberJoined m && m.ProfileId == june.Id);
    }

    [Fact]
    public async Task Accepting_without_a_placeholder_creates_a_profile_from_the_account_name()
    {
        var link = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;
        var userId = await RegisteredUser("Marco", "Rossi");

        var joined = (await f.Families.AcceptInvite(userId, link.Token, new AcceptInviteRequest())).Value!;

        Assert.Equal("Marco", f.Db.Profiles[joined.ProfileId].FirstName);
        Assert.Equal(MemberRole.Member, joined.Role);
    }

    [Fact]
    public async Task An_invite_link_works_once()
    {
        var link = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;
        await f.Families.AcceptInvite(await RegisteredUser("Marco"), link.Token, new AcceptInviteRequest());

        var second = await f.Families.AcceptInvite(await RegisteredUser("Ana"), link.Token, new AcceptInviteRequest());

        Assert.Equal(ResultError.NotFound, second.Error);
        Assert.Null(await f.Families.PreviewInvite(link.Token));
    }

    [Fact]
    public async Task Expired_and_revoked_invites_stop_working()
    {
        var expiring = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;
        var revoked = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;
        await f.Families.RevokeInvite(f.AsEmma, revoked.Invite.Id);

        Assert.Null(await f.Families.PreviewInvite(revoked.Token));

        f.Clock.Advance(FamilyManager.InviteLifetime);
        Assert.Null(await f.Families.PreviewInvite(expiring.Token));
    }

    [Fact]
    public async Task Resending_replaces_the_link()
    {
        var first = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;

        var second = (await f.Families.ResendInvite(f.AsEmma, first.Invite.Id)).Value!;

        Assert.NotEqual(first.Token, second.Token);
        Assert.Null(await f.Families.PreviewInvite(first.Token));
        Assert.NotNull(await f.Families.PreviewInvite(second.Token));
    }

    [Fact]
    public async Task Only_the_inviter_or_an_admin_can_cancel_an_invite()
    {
        var nate = f.Member("Nate");
        var ana = f.Member("Ana");
        var link = (await f.Families.CreateInvite(f.As(nate), new CreateInviteRequest())).Value!;

        Assert.Equal(ResultError.Forbidden, (await f.Families.RevokeInvite(f.As(ana), link.Invite.Id)).Error);
        Assert.True((await f.Families.RevokeInvite(f.As(nate), link.Invite.Id)).Succeeded);
    }

    [Fact]
    public async Task Preview_offers_living_adult_placeholders_to_claim()
    {
        var june = f.Placeholder("June");
        f.Db.Profiles[june.Id].BirthDate = new DateOnly(1934, 7, 19);
        var iris = f.Placeholder("Iris");
        f.Db.Profiles[iris.Id].BirthDate = new DateOnly(2019, 6, 3);
        f.Db.AddProfile(f.FamilyId, "Walter", lifeStatus: LifeStatus.Deceased);
        var link = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;

        var preview = await f.Families.PreviewInvite(link.Token);

        Assert.Equal("Harlow Family", preview!.FamilyName);
        Assert.Equal("Emma Okafor", preview.InvitedByName);
        Assert.Equal(["June"], preview.ClaimableProfiles.Select(p => p.FirstName));
    }

    [Fact]
    public async Task Someone_already_in_the_family_cant_join_again()
    {
        var userId = await RegisteredUser("Marco");
        var first = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;
        var second = (await f.Families.CreateInvite(f.AsEmma, new CreateInviteRequest())).Value!;
        await f.Families.AcceptInvite(userId, first.Token, new AcceptInviteRequest());

        var again = await f.Families.AcceptInvite(userId, second.Token, new AcceptInviteRequest());

        Assert.Equal(ResultError.Conflict, again.Error);
        Assert.NotNull(await f.Families.PreviewInvite(second.Token));
    }
}
