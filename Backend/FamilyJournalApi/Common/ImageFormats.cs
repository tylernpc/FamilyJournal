namespace FamilyJournalApi.Common;

/// <summary>
/// Identifies uploads by their first bytes rather than trusting the file name or declared type.
/// </summary>
public static class ImageFormats
{
    public const int HeaderLength = 12;

    // Raw bytes: a u8 string literal would UTF-8 encode 0x89 as two bytes
    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    public static readonly IReadOnlyDictionary<string, string> Extensions = new Dictionary<string, string>
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/gif"] = ".gif",
        ["image/webp"] = ".webp",
        ["image/heic"] = ".heic",
    };

    /// <summary>
    /// The image type these bytes start with, or null if it isn't a supported image.
    /// </summary>
    public static string? Detect(ReadOnlySpan<byte> header)
    {
        if (header.Length < HeaderLength)
        {
            return null;
        }

        if (header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (header.StartsWith(PngSignature))
        {
            return "image/png";
        }

        if (header.StartsWith("GIF87a"u8) || header.StartsWith("GIF89a"u8))
        {
            return "image/gif";
        }

        if (header.StartsWith("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
        {
            return "image/webp";
        }

        // iPhone photos: an ISO media box whose brand is one of the HEIF brands
        if (header[4..8].SequenceEqual("ftyp"u8))
        {
            var brand = header[8..12];
            if (brand.SequenceEqual("heic"u8) || brand.SequenceEqual("heix"u8) ||
                brand.SequenceEqual("mif1"u8) || brand.SequenceEqual("hevc"u8))
            {
                return "image/heic";
            }
        }

        return null;
    }
}
