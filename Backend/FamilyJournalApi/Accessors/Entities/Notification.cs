using FamilyJournalApi.Common;
using FamilyJournalApi.Common.Enum;

namespace FamilyJournalApi.Accessors.Entities;

public class Notification : IdGeneratedModel
{
    public Guid RecipientProfileId { get; set; }

    public NotificationType Type { get; set; }

    public Guid? ReferenceId { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public Profile RecipientProfile { get; set; }
}
