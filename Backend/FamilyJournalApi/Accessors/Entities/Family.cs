using FamilyJournalApi.Common;

namespace FamilyJournalApi.Accessors.Entities;

public class Family : IdGeneratedModel
{
    public string Name { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<FamilyMember> Members { get; set; } = new List<FamilyMember>();

    public ICollection<Invite> Invites { get; set; } = new List<Invite>();

    public ICollection<Post> Posts { get; set; } = new List<Post>();
}
