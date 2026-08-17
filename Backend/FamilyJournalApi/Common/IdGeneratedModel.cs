namespace FamilyJournalApi.Common;

public abstract class IdGeneratedModel
{
    public Guid Id { get; set; } = Guid.NewGuid();
}
