using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Tests.ManagerTests;

public class ProfileManagerTests
{
    private readonly FamilyFixture f = new();

    private static PersonRequest Person(string first, LifeStatus status = LifeStatus.Living) =>
        new() { FirstName = first, LastName = "Harlow", LifeStatus = status };

    [Fact]
    public async Task Any_member_can_add_a_placeholder()
    {
        var nate = f.Member("Nate");

        var june = await f.Profiles.CreatePerson(f.As(nate), Person("June"));

        Assert.True(june.Succeeded);
        Assert.True(june.Value!.IsPlaceholder);
        Assert.Equal(nate.Id, june.Value.AddedByProfileId);
    }

    [Fact]
    public async Task Members_edit_themselves_and_placeholders_but_not_other_members()
    {
        var nate = f.Member("Nate");
        var ana = f.Member("Ana");
        var june = f.Placeholder("June");

        Assert.True((await f.Profiles.UpdatePerson(f.As(nate), nate.Id, Person("Nathan"))).Succeeded);
        Assert.True((await f.Profiles.UpdatePerson(f.As(nate), june.Id, Person("June"))).Succeeded);
        Assert.Equal(ResultError.Forbidden, (await f.Profiles.UpdatePerson(f.As(nate), ana.Id, Person("Anna"))).Error);
        Assert.True((await f.Profiles.UpdatePerson(f.AsEmma, ana.Id, Person("Ana"))).Succeeded);
    }

    [Fact]
    public async Task People_list_says_who_can_be_edited()
    {
        var nate = f.Member("Nate");
        f.Member("Ana");
        f.Placeholder("June");

        var people = await f.Profiles.GetPeople(f.As(nate));

        Assert.True(people.Single(p => p.FirstName == "Nate").CanEdit);
        Assert.True(people.Single(p => p.FirstName == "June").CanEdit);
        Assert.False(people.Single(p => p.FirstName == "Ana").CanEdit);
    }

    [Theory]
    [InlineData("2090-01-01", null, LifeStatus.Living, "Birth date can't be in the future.")]
    [InlineData(null, "2019-08-12", LifeStatus.Living, "Only someone who has passed away can have a date of death.")]
    [InlineData("1931-03-09", "1920-01-01", LifeStatus.Deceased, "Date of death is before the birth date.")]
    public async Task Dates_have_to_make_sense(string? born, string? died, LifeStatus status, string message)
    {
        var request = Person("Walter", status);
        request.BirthDate = born is null ? null : DateOnly.Parse(born);
        request.DeathDate = died is null ? null : DateOnly.Parse(died);

        var result = await f.Profiles.CreatePerson(f.AsEmma, request);

        Assert.Equal(ResultError.Invalid, result.Error);
        Assert.Equal(message, result.Message);
    }

    [Fact]
    public async Task Profile_photo_has_to_be_from_this_family()
    {
        var request = Person("June");
        request.PhotoMediaId = f.Photo(familyId: Guid.NewGuid());

        Assert.Equal(ResultError.Invalid, (await f.Profiles.CreatePerson(f.AsEmma, request)).Error);
    }

    [Fact]
    public async Task Only_the_adder_or_an_admin_can_delete_a_placeholder()
    {
        var nate = f.Member("Nate");
        var ana = f.Member("Ana");
        var june = f.Placeholder("June", addedBy: nate.Id);

        Assert.Equal(ResultError.Forbidden, (await f.Profiles.DeletePerson(f.As(ana), june.Id)).Error);
        Assert.True((await f.Profiles.DeletePerson(f.As(nate), june.Id)).Succeeded);
    }

    [Fact]
    public async Task Someone_who_joined_cant_be_deleted()
    {
        var nate = f.Member("Nate");

        Assert.Equal(ResultError.Conflict, (await f.Profiles.DeletePerson(f.AsEmma, nate.Id)).Error);
    }

    [Fact]
    public async Task Relationships_build_the_tree()
    {
        var robert = f.Placeholder("Robert");
        var diane = f.Placeholder("Diane");

        await f.Profiles.AddRelationship(f.AsEmma, new AddRelationshipRequest { FromProfileId = robert.Id, ToProfileId = diane.Id, Type = RelationshipType.SpouseOf, Since = new DateOnly(1984, 5, 12) });
        await f.Profiles.AddRelationship(f.AsEmma, new AddRelationshipRequest { FromProfileId = robert.Id, ToProfileId = f.Emma.Id, Type = RelationshipType.ParentOf });
        await f.Profiles.AddRelationship(f.AsEmma, new AddRelationshipRequest { FromProfileId = diane.Id, ToProfileId = f.Emma.Id, Type = RelationshipType.ParentOf });

        var tree = await f.Profiles.GetTree(f.AsEmma);

        Assert.Equal(2, tree.Generations);
        Assert.Equal(1, tree.People.Single(p => p.ProfileId == f.Emma.Id).Generation);
        Assert.Equal(3, tree.Relationships.Count);
    }

    [Fact]
    public async Task Bad_relationships_are_explained()
    {
        var robert = f.Placeholder("Robert");
        var link = new AddRelationshipRequest { FromProfileId = robert.Id, ToProfileId = f.Emma.Id, Type = RelationshipType.ParentOf };
        await f.Profiles.AddRelationship(f.AsEmma, link);

        Assert.Equal(ResultError.Conflict, (await f.Profiles.AddRelationship(f.AsEmma, link)).Error);
        Assert.Equal("That would make someone their own ancestor.", (await f.Profiles.AddRelationship(f.AsEmma,
            new AddRelationshipRequest { FromProfileId = f.Emma.Id, ToProfileId = robert.Id, Type = RelationshipType.ParentOf })).Message);
        Assert.Equal(ResultError.Invalid, (await f.Profiles.AddRelationship(f.AsEmma,
            new AddRelationshipRequest { FromProfileId = robert.Id, ToProfileId = f.Emma.Id, Type = RelationshipType.ParentOf, Since = new DateOnly(2000, 1, 1) })).Error);
    }

    [Fact]
    public async Task Relationships_only_link_people_in_this_family()
    {
        var stranger = f.Db.AddProfile(Guid.NewGuid(), "Stranger");

        var result = await f.Profiles.AddRelationship(f.AsEmma,
            new AddRelationshipRequest { FromProfileId = stranger.Id, ToProfileId = f.Emma.Id, Type = RelationshipType.SpouseOf });

        Assert.Equal(ResultError.NotFound, result.Error);
    }
}
