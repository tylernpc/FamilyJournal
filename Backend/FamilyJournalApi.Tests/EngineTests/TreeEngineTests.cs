using FamilyJournalApi.Common.Enum;
using FamilyJournalApi.Engines;
using FamilyJournalApi.Engines.Contracts;

namespace FamilyJournalApi.Tests.EngineTests;

public class TreeEngineTests
{
    private readonly TreeEngine engine = new();

    // The Harlows from the UI mock: four generations with in-laws marrying in
    private static readonly Guid Walter = Guid.NewGuid(), June = Guid.NewGuid();
    private static readonly Guid Robert = Guid.NewGuid(), Diane = Guid.NewGuid(), Carol = Guid.NewGuid(), Luis = Guid.NewGuid();
    private static readonly Guid Emma = Guid.NewGuid(), Sam = Guid.NewGuid(), Nate = Guid.NewGuid(), Ana = Guid.NewGuid();
    private static readonly Guid Iris = Guid.NewGuid(), Theo = Guid.NewGuid();

    private static readonly Guid[] Everyone = [Walter, June, Robert, Diane, Carol, Luis, Emma, Sam, Nate, Ana, Iris, Theo];

    private static RelationshipLink Parent(Guid parent, Guid child) => new(parent, child, RelationshipType.ParentOf);

    private static RelationshipLink Spouse(Guid a, Guid b) => new(a, b, RelationshipType.SpouseOf);

    private static readonly RelationshipLink[] Harlows =
    [
        Spouse(Walter, June),
        Parent(Walter, Robert), Parent(June, Robert),
        Parent(Walter, Carol), Parent(June, Carol),
        Spouse(Robert, Diane),
        Parent(Robert, Emma), Parent(Diane, Emma),
        Parent(Robert, Nate), Parent(Diane, Nate),
        Spouse(Carol, Luis),
        Parent(Carol, Ana), Parent(Luis, Ana),
        Spouse(Emma, Sam),
        Parent(Emma, Iris), Parent(Sam, Iris),
        Parent(Emma, Theo), Parent(Sam, Theo),
    ];

    [Fact]
    public void Generations_follow_parents_and_in_laws_line_up_with_their_spouse()
    {
        var tree = engine.Build(Everyone, Harlows);
        int Gen(Guid id) => tree.Nodes.Single(n => n.ProfileId == id).Generation;

        Assert.Equal(4, tree.Generations);
        Assert.Equal(0, Gen(Walter));
        Assert.Equal(0, Gen(June));
        Assert.Equal(1, Gen(Robert));
        Assert.Equal(1, Gen(Diane));
        Assert.Equal(1, Gen(Luis));
        Assert.Equal(2, Gen(Emma));
        Assert.Equal(2, Gen(Sam));
        Assert.Equal(3, Gen(Theo));
    }

    [Fact]
    public void Siblings_are_inferred_from_shared_parents_and_cousins_are_not_siblings()
    {
        var tree = engine.Build(Everyone, Harlows);
        var emma = tree.Nodes.Single(n => n.ProfileId == Emma);

        Assert.Equal([Nate], emma.SiblingIds);
        Assert.DoesNotContain(Ana, emma.SiblingIds);
        Assert.Equal([Sam], emma.SpouseIds);
        Assert.Equal(new[] { Iris, Theo }.Order(), emma.ChildIds.Order());
        Assert.Equal(2, emma.ParentIds.Count);
    }

    [Fact]
    public void Someone_with_no_links_is_in_the_top_row()
    {
        var loner = Guid.NewGuid();

        var tree = engine.Build([.. Everyone, loner], Harlows);

        Assert.Equal(0, tree.Nodes.Single(n => n.ProfileId == loner).Generation);
    }

    [Fact]
    public void Empty_family_has_no_generations()
    {
        Assert.Equal(0, engine.Build([], []).Generations);
    }

    [Fact]
    public void Linking_someone_to_themselves_is_rejected()
    {
        Assert.Equal(RelationshipCheck.SameProfile, engine.CheckNewLink(Harlows, Emma, Emma, RelationshipType.SpouseOf));
    }

    [Fact]
    public void A_third_parent_is_rejected()
    {
        Assert.Equal(RelationshipCheck.TooManyParents, engine.CheckNewLink(Harlows, Nate, Iris, RelationshipType.ParentOf));
    }

    [Fact]
    public void Making_someone_their_own_ancestor_is_rejected()
    {
        // Theo can't be Walter's parent: Walter is already Theo's great-grandfather
        Assert.Equal(RelationshipCheck.AncestryLoop, engine.CheckNewLink(Harlows, Theo, Walter, RelationshipType.ParentOf));
    }

    [Fact]
    public void Marrying_your_own_ancestor_is_rejected()
    {
        Assert.Equal(RelationshipCheck.ConflictsWithExisting, engine.CheckNewLink(Harlows, Iris, June, RelationshipType.SpouseOf));
    }

    [Fact]
    public void Spouses_cant_also_be_parent_and_child()
    {
        Assert.Equal(RelationshipCheck.ConflictsWithExisting, engine.CheckNewLink(Harlows, Emma, Sam, RelationshipType.ParentOf));
    }

    [Fact]
    public void A_normal_new_child_is_fine()
    {
        var baby = Guid.NewGuid();

        Assert.Equal(RelationshipCheck.Ok, engine.CheckNewLink(Harlows, Nate, baby, RelationshipType.ParentOf));
    }
}
