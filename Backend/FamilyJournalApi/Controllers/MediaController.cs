using FamilyJournalApi.Managers;
using FamilyJournalApi.Managers.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FamilyJournalApi.Controllers;

/// <summary>
/// Photo uploads, for posts and profile pictures.
/// </summary>
public class MediaController(IPostManager postManager) : FamilyControllerBase
{
    // A little over the 15 MB photo limit, for the form's own overhead
    private const long MaxRequestBytes = 16 * 1024 * 1024;

    /// <param name="file">The photo (JPEG, PNG, GIF, WebP or HEIC)</param>
    /// <param name="width">Pixel width, as the browser reports it</param>
    /// <param name="height">Pixel height</param>
    [HttpPost("media")]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    [ProducesResponseType<MediaModel>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MediaModel>> Upload(IFormFile file, [FromForm] int width, [FromForm] int height)
    {
        await using var content = file.OpenReadStream();

        return Respond(await postManager.UploadPhoto(Caller, content, file.Length, width, height));
    }
}

/// <summary>
/// Serves photos by signed URL, so img tags can load them without a sign-in header.
/// </summary>
[ApiController]
[Route("api/media")]
public class MediaFilesController(IPostManager postManager) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("{mediaId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid mediaId, long expires, string sig)
    {
        var photo = await postManager.OpenPhoto(mediaId, expires, sig ?? string.Empty);

        if (photo is null)
        {
            return NotFound();
        }

        // Private: family photos shouldn't sit in shared caches. The URL itself expires.
        Response.Headers.CacheControl = "private, max-age=3600";

        return File(photo.Content, photo.ContentType);
    }
}
