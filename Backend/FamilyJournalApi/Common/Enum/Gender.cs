namespace FamilyJournalApi.Common.Enum;

/// <summary>
/// Only used to word relationships ("grandmother" vs "grandparent"). Unspecified gets neutral words.
/// </summary>
public enum Gender
{
    Unspecified = 0,

    Female = 1,

    Male = 2,

    NonBinary = 3
}
