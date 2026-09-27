using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using FamilyJournalApi.Tests.Fakes;
using Microsoft.Extensions.Time.Testing;

namespace FamilyJournalApi.Tests.ManagerTests;

public class AccountManagerTests
{
    private const string Password = "correct horse battery";

    private readonly FakeTimeProvider clock = TestCredentials.Clock();
    private readonly FakeUserAccessor users = new();
    private readonly FakeFamilyAccessor families = new();
    private readonly AccountManager manager;

    public AccountManagerTests()
    {
        manager = new AccountManager(users, families, TestCredentials.Engine(clock), clock);
    }

    private Task<AuthResult> RegisterJane(string email = "Jane@Example.com") => manager.Register(new RegisterRequest
    {
        Email = email,
        Password = Password,
        FirstName = " Jane ",
        LastName = "Smith"
    });

    private Task<AuthResult> SignIn(string password, string email = "jane@example.com") =>
        manager.SignIn(new SignInRequest { Email = email, Password = password });

    [Fact]
    public async Task Register_creates_the_account_and_signs_in()
    {
        var result = await RegisterJane();

        Assert.Null(result.Error);
        Assert.NotNull(result.Tokens);
        Assert.NotEmpty(result.Tokens.AccessToken);
        Assert.NotEmpty(result.Tokens.RefreshToken);

        var user = Assert.Single(users.Users.Values);
        Assert.Equal("Jane@Example.com", user.Email);
        Assert.Equal("Jane", user.FirstName);
        Assert.NotEqual(Password, user.PasswordHash);
    }

    [Fact]
    public async Task Register_rejects_an_email_that_differs_only_by_case()
    {
        await RegisterJane();

        var second = await RegisterJane("  JANE@example.COM ");

        Assert.Equal(AuthError.EmailTaken, second.Error);
        Assert.Single(users.Users);
    }

    [Fact]
    public async Task Sign_in_accepts_the_right_password_with_any_email_casing()
    {
        await RegisterJane();

        var result = await SignIn(Password, "JANE@EXAMPLE.COM");

        Assert.NotNull(result.Tokens);
        Assert.Equal(TestCredentials.Start, users.Users.Values.Single().LastSignInAt);
    }

    [Fact]
    public async Task Wrong_password_and_unknown_email_fail_the_same_way()
    {
        await RegisterJane();

        Assert.Equal(AuthError.InvalidCredentials, (await SignIn("wrong password")).Error);
        Assert.Equal(AuthError.InvalidCredentials, (await SignIn(Password, "nobody@example.com")).Error);
    }

    [Fact]
    public async Task Five_wrong_passwords_lock_the_account_even_against_the_right_one()
    {
        await RegisterJane();

        for (var i = 0; i < AccountManager.MaxFailedSignIns - 1; i++)
        {
            Assert.Equal(AuthError.InvalidCredentials, (await SignIn("wrong password")).Error);
        }

        var fifth = await SignIn("wrong password");
        Assert.Equal(AuthError.LockedOut, fifth.Error);
        Assert.Equal(TestCredentials.Start.Add(AccountManager.LockoutDuration), fifth.LockedOutUntil);

        Assert.Equal(AuthError.LockedOut, (await SignIn(Password)).Error);
    }

    [Fact]
    public async Task Lockout_ends_after_its_duration()
    {
        await RegisterJane();
        for (var i = 0; i < AccountManager.MaxFailedSignIns; i++)
        {
            await SignIn("wrong password");
        }

        clock.Advance(AccountManager.LockoutDuration);

        Assert.NotNull((await SignIn(Password)).Tokens);
        Assert.Equal(0, users.Users.Values.Single().FailedSignInCount);
    }

    [Fact]
    public async Task A_successful_sign_in_resets_the_failure_count()
    {
        await RegisterJane();
        await SignIn("wrong password");
        await SignIn("wrong password");

        await SignIn(Password);

        Assert.Equal(0, users.Users.Values.Single().FailedSignInCount);
    }

    [Fact]
    public async Task Refresh_rotates_to_a_new_token()
    {
        var first = (await RegisterJane()).Tokens!;

        var second = await manager.Refresh(first.RefreshToken);

        Assert.NotNull(second.Tokens);
        Assert.NotEqual(first.RefreshToken, second.Tokens.RefreshToken);
        Assert.NotNull((await manager.Refresh(second.Tokens.RefreshToken)).Tokens);
    }

    [Fact]
    public async Task Reusing_an_old_refresh_token_ends_the_whole_session()
    {
        var first = (await RegisterJane()).Tokens!;
        var second = (await manager.Refresh(first.RefreshToken)).Tokens!;

        // Someone replays the token that was already rotated out
        var replay = await manager.Refresh(first.RefreshToken);
        Assert.Equal(AuthError.InvalidRefreshToken, replay.Error);

        // ...so the legitimate newer token stops working too
        Assert.Equal(AuthError.InvalidRefreshToken, (await manager.Refresh(second.RefreshToken)).Error);
    }

    [Fact]
    public async Task Reuse_only_ends_that_session_not_other_devices()
    {
        var phone = (await RegisterJane()).Tokens!;
        var laptop = (await SignIn(Password)).Tokens!;

        await manager.Refresh(phone.RefreshToken);
        await manager.Refresh(phone.RefreshToken);

        Assert.NotNull((await manager.Refresh(laptop.RefreshToken)).Tokens);
    }

    [Fact]
    public async Task Expired_refresh_token_is_rejected()
    {
        var tokens = (await RegisterJane()).Tokens!;

        clock.Advance(TimeSpan.FromDays(30));

        Assert.Equal(AuthError.InvalidRefreshToken, (await manager.Refresh(tokens.RefreshToken)).Error);
    }

    [Fact]
    public async Task Unknown_refresh_token_is_rejected()
    {
        Assert.Equal(AuthError.InvalidRefreshToken, (await manager.Refresh("not-a-real-token")).Error);
    }

    [Fact]
    public async Task Sign_out_ends_the_session()
    {
        var tokens = (await RegisterJane()).Tokens!;

        await manager.SignOut(tokens.RefreshToken);

        Assert.Equal(AuthError.InvalidRefreshToken, (await manager.Refresh(tokens.RefreshToken)).Error);
    }

    [Fact]
    public async Task Sign_out_with_an_unknown_token_does_nothing()
    {
        await manager.SignOut("not-a-real-token");
    }

    [Fact]
    public async Task Account_lists_the_users_families()
    {
        await RegisterJane();
        var user = users.Users.Values.Single();
        var familyId = Guid.NewGuid();
        families.FamiliesByUser[user.Id] =
        [
            new UserFamilyDto
            {
                FamilyId = familyId,
                FamilyName = "Harlow Family",
                ProfileId = Guid.NewGuid(),
                Role = MemberRole.Admin,
                JoinedAt = TestCredentials.Start
            }
        ];

        var account = await manager.GetAccount(user.Id);

        Assert.NotNull(account);
        Assert.Equal("Jane", account.FirstName);
        var family = Assert.Single(account.Families);
        Assert.Equal(familyId, family.FamilyId);
        Assert.Equal(MemberRole.Admin, family.Role);
    }

    [Fact]
    public async Task Account_for_a_missing_user_is_null()
    {
        Assert.Null(await manager.GetAccount(Guid.NewGuid()));
    }
}
