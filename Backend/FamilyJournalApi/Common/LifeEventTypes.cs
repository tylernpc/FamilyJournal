namespace FamilyJournalApi.Common;

/// <summary>
/// The life event keys the app offers. Mirrors familyjournalapp/src/lib/life-events.ts;
/// add a key in both places. "custom" events carry their own label.
/// </summary>
public static class LifeEventTypes
{
    public const string Custom = "custom";

    public static readonly IReadOnlySet<string> Known = new HashSet<string>(StringComparer.Ordinal)
    {
        // Family
        "birth", "expecting", "adoption", "engagement", "marriage", "anniversary", "birthday", "reunion",
        // Growing up
        "firstSteps", "firstWords", "firstDayOfSchool", "lostTooth", "learnedToRide", "driversLicense", "prom", "quinceanera",
        // School & work
        "graduation", "newJob", "promotion", "newBusiness", "award", "retirement",
        // Home & life
        "newHome", "moved", "newPet", "trip", "firstCar", "militaryService", "homecoming", "citizenship",
        // Faith & tradition
        "baptism", "firstCommunion", "confirmation", "barMitzvah", "batMitzvah",
        // Health & milestones
        "recovery", "raceFinished", "sobriety",
        // Remembrance
        "memorial", "passing",
    };

    public static bool IsValid(string type) => type == Custom || Known.Contains(type);
}
