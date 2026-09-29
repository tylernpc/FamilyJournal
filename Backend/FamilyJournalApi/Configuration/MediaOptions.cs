namespace FamilyJournalApi.Configuration;

/// <summary>
/// Bound from the "Media" section.
/// </summary>
public class MediaOptions
{
    public const string SectionName = "Media";

    // Local storage folder, relative to the app's content root unless absolute
    public string RootPath { get; set; } = "App_Data/media";

    public long MaxUploadBytes { get; set; } = 15 * 1024 * 1024;

    // How long a photo URL keeps working after the API hands it out
    public int UrlLifetimeHours { get; set; } = 6;
}
