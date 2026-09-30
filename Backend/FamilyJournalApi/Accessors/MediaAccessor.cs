using System.Security.Cryptography;
using System.Text;
using FamilyJournalApi.Accessors.DTOs;
using FamilyJournalApi.Accessors.Entities;
using FamilyJournalApi.Common;
using FamilyJournalApi.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FamilyJournalApi.Accessors;

public class MediaAccessor(
    DatabaseContext db,
    IOptions<MediaOptions> mediaOptions,
    IOptions<JwtOptions> jwtOptions,
    IWebHostEnvironment environment) : IMediaAccessor
{
    private readonly MediaOptions options = mediaOptions.Value;

    // Separate from the JWT key's own use: same secret, different purpose
    private readonly byte[] urlKey = SHA256.HashData(Encoding.UTF8.GetBytes("media-url:" + jwtOptions.Value.SigningKey));

    private string Root => Path.IsPathRooted(options.RootPath)
        ? options.RootPath
        : Path.Combine(environment.ContentRootPath, options.RootPath);

    public async Task<MediaDto> SaveMedia(Guid familyId, Guid uploadedByProfileId, Stream content, string contentType, int width, int height, PhotoCrops? crops, DateTimeOffset createdAt)
    {
        var media = new Media
        {
            FamilyId = familyId,
            UploadedByProfileId = uploadedByProfileId,
            ContentType = contentType,
            Width = width,
            Height = height,
            Crops = PhotoCrops.Serialize(crops),
            CreatedAt = createdAt
        };
        media.StorageKey = $"{familyId:N}/{media.Id:N}{ImageFormats.Extensions[contentType]}";

        var path = PathFor(media.StorageKey);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using (var file = File.Create(path))
        {
            await content.CopyToAsync(file);
            media.ByteSize = file.Length;
        }

        db.Media.Add(media);

        try
        {
            await db.SaveChangesAsync();
        }
        catch
        {
            // Don't leave an orphaned file behind a failed row
            File.Delete(path);
            throw;
        }

        return ToDto(media);
    }

    public async Task<MediaDto?> GetMedia(Guid mediaId)
    {
        var media = await db.Media.AsNoTracking().SingleOrDefaultAsync(m => m.Id == mediaId);

        return media is null ? null : ToDto(media);
    }

    public async Task<List<MediaDto>> GetMediaInFamily(Guid familyId, IEnumerable<Guid> mediaIds)
    {
        var ids = mediaIds.Distinct().ToList();

        var media = await db.Media
            .AsNoTracking()
            .Where(m => m.FamilyId == familyId && ids.Contains(m.Id))
            .ToListAsync();

        return media.Select(ToDto).ToList();
    }

    public async Task SetCrops(Guid mediaId, PhotoCrops? crops)
    {
        var json = PhotoCrops.Serialize(crops);
        await db.Media.Where(m => m.Id == mediaId).ExecuteUpdateAsync(set => set.SetProperty(m => m.Crops, json));
    }

    public Stream OpenRead(string storageKey) => File.OpenRead(PathFor(storageKey));

    public string GetSignedUrl(Guid mediaId, DateTimeOffset now)
    {
        // Round the expiry up to the hour so the same photo keeps the same URL for a while (browser cache hits)
        var lifetime = TimeSpan.FromHours(options.UrlLifetimeHours).TotalSeconds;
        var expires = (long)(Math.Ceiling((now.ToUnixTimeSeconds() + lifetime) / 3600) * 3600);

        return $"/api/media/{mediaId}?expires={expires}&sig={Sign(mediaId, expires)}";
    }

    public bool IsValidSignature(Guid mediaId, long expiresAtUnix, string signature, DateTimeOffset now)
    {
        if (expiresAtUnix < now.ToUnixTimeSeconds())
        {
            return false;
        }

        var expected = Encoding.ASCII.GetBytes(Sign(mediaId, expiresAtUnix));
        var actual = Encoding.ASCII.GetBytes(signature);

        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    private string Sign(Guid mediaId, long expires) =>
        Base64UrlEncode(HMACSHA256.HashData(urlKey, Encoding.UTF8.GetBytes($"{mediaId:N}.{expires}")));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private string PathFor(string storageKey)
    {
        var root = Path.GetFullPath(Root) + Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(Path.Combine(root, storageKey));

        // Storage keys are generated here, but never let one point outside the media folder
        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Storage key escapes the media folder.");
        }

        return path;
    }

    private static MediaDto ToDto(Media media) => new()
    {
        Id = media.Id,
        FamilyId = media.FamilyId,
        UploadedByProfileId = media.UploadedByProfileId,
        ContentType = media.ContentType,
        ByteSize = media.ByteSize,
        Width = media.Width,
        Height = media.Height,
        StorageKey = media.StorageKey,
        Crops = PhotoCrops.Parse(media.Crops),
        CreatedAt = media.CreatedAt
    };
}
