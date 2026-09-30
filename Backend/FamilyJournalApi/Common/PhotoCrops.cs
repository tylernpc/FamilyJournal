using System.Text.Json;
using System.Text.Json.Serialization;

namespace FamilyJournalApi.Common;

/// <summary>
/// A rectangle inside a photo, as fractions of its width and height (0 to 1),
/// so it holds up at any size the photo is shown at.
/// </summary>
public class CropRect
{
    public double X { get; set; }

    public double Y { get; set; }

    public double Width { get; set; }

    public double Height { get; set; }
}

/// <summary>
/// The named ways one uploaded photo is framed. The original is kept whole; each crop is just numbers,
/// and anything left out shows the whole photo. Stored as JSON on the Media row.
/// </summary>
public class PhotoCrops
{
    // In a post
    public CropRect? Post { get; set; }

    // The tree's portrait cards
    public CropRect? Portrait { get; set; }

    // Round avatars; without it they use the middle of the portrait
    public CropRect? Avatar { get; set; }

    // Anything smaller than this is a mistake, not a crop
    private const double MinimumSide = 0.05;

    // Rounding slack, since fractions come from the browser's floating point
    private const double Slack = 0.0005;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    [JsonIgnore]
    public bool IsEmpty => Post is null && Portrait is null && Avatar is null;

    /// <summary>
    /// Why these crops can't be saved, or null when they're fine.
    /// </summary>
    public string? Problem()
    {
        foreach (var (name, rect) in new[] { ("post", Post), ("portrait", Portrait), ("avatar", Avatar) })
        {
            if (rect is null)
            {
                continue;
            }

            var numbers = new[] { rect.X, rect.Y, rect.Width, rect.Height };

            if (numbers.Any(n => double.IsNaN(n) || double.IsInfinity(n)) ||
                rect.X < -Slack || rect.Y < -Slack ||
                rect.X + rect.Width > 1 + Slack || rect.Y + rect.Height > 1 + Slack)
            {
                return $"The {name} crop has to stay inside the photo.";
            }

            if (rect.Width < MinimumSide || rect.Height < MinimumSide)
            {
                return $"The {name} crop is too small.";
            }
        }

        return null;
    }

    public static string? Serialize(PhotoCrops? crops) =>
        crops is null || crops.IsEmpty ? null : JsonSerializer.Serialize(crops, Json);

    public static PhotoCrops? Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<PhotoCrops>(json, Json);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
