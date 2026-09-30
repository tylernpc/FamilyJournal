using FamilyJournalApi.Common;
using FamilyJournalApi.Managers.Events;
using FamilyJournalApi.Managers.Models;

namespace FamilyJournalApi.Tests.ManagerTests;

public class PostManagerTests
{
    private readonly FamilyFixture f = new();

    private async Task<PostModel> Post(FamilyCaller caller, PostRequest? request = null) =>
        (await f.Posts.CreatePost(caller, request ?? new PostRequest { Text = "Pie lesson #1" })).Value!;

    [Fact]
    public async Task A_post_needs_words_a_photo_or_a_life_event()
    {
        var empty = await f.Posts.CreatePost(f.AsEmma, new PostRequest { Text = "   " });
        var photoOnly = await f.Posts.CreatePost(f.AsEmma, new PostRequest { Photos = [new PostPhotoRequest { MediaId = f.Photo() }] });

        Assert.Equal(ResultError.Invalid, empty.Error);
        Assert.True(photoOnly.Succeeded);
    }

    [Fact]
    public async Task Creating_a_post_tells_the_family()
    {
        var june = f.Placeholder("June");

        var post = await Post(f.AsEmma, new PostRequest { Text = "Pie lesson #1 at Grandma June's", TaggedProfileIds = [june.Id] });

        var created = Assert.IsType<PostCreated>(Assert.Single(f.Events.Published));
        Assert.Equal(post.Id, created.PostId);
        Assert.Equal([june.Id], created.TaggedProfileIds);
    }

    [Fact]
    public async Task Tags_and_photos_have_to_belong_to_this_family()
    {
        var stranger = f.Db.AddProfile(Guid.NewGuid(), "Stranger");

        var badTag = await f.Posts.CreatePost(f.AsEmma, new PostRequest { Text = "Hi", TaggedProfileIds = [stranger.Id] });
        var badPhoto = await f.Posts.CreatePost(f.AsEmma, new PostRequest { Text = "Hi", Photos = [new PostPhotoRequest { MediaId = f.Photo(familyId: Guid.NewGuid()) }] });

        Assert.Equal(ResultError.Invalid, badTag.Error);
        Assert.Equal(ResultError.Invalid, badPhoto.Error);
    }

    [Theory]
    [InlineData("newJob", null, "Started at Pacheco & Reyes", true)]
    [InlineData("custom", "Hole in one", "Luis finally did it", true)]
    [InlineData("custom", null, "Luis finally did it", false)]
    [InlineData("notARealType", null, "Hmm", false)]
    public async Task Life_events_use_known_types_or_a_named_custom_one(string type, string? label, string title, bool ok)
    {
        var result = await f.Posts.CreatePost(f.AsEmma, new PostRequest
        {
            LifeEvent = new LifeEventModel { Type = type, Label = label, Title = title, Date = new DateOnly(2026, 9, 21) }
        });

        Assert.Equal(ok, result.Succeeded);
    }

    [Fact]
    public async Task Only_the_author_edits_but_admins_can_delete()
    {
        var nate = f.Member("Nate");
        var post = await Post(f.As(nate));

        Assert.Equal(ResultError.Forbidden, (await f.Posts.UpdatePost(f.AsEmma, post.Id, new PostRequest { Text = "Edited" })).Error);
        Assert.True((await f.Posts.UpdatePost(f.As(nate), post.Id, new PostRequest { Text = "Edited" })).Succeeded);
        Assert.True((await f.Posts.DeletePost(f.AsEmma, post.Id)).Succeeded);
    }

    [Fact]
    public async Task Reactions_take_any_single_emoji_and_replace_your_last_one()
    {
        var nate = f.Member("Nate");
        var post = await Post(f.AsEmma);
        f.Events.Published.Clear();

        await f.Posts.React(f.As(nate), post.Id, "🥧");
        var reactions = (await f.Posts.React(f.As(nate), post.Id, "👍🏽")).Value!;

        var mine = Assert.Single(reactions);
        Assert.Equal("👍🏽", mine.Emoji);
        Assert.Equal(2, f.Events.Published.OfType<ReactionAdded>().Count());
        Assert.Equal(ResultError.Invalid, (await f.Posts.React(f.As(nate), post.Id, "lol")).Error);
    }

    [Fact]
    public async Task Reacting_to_your_own_post_doesnt_notify_anyone()
    {
        var post = await Post(f.AsEmma);
        f.Events.Published.Clear();

        await f.Posts.React(f.AsEmma, post.Id, "❤️");

        Assert.Empty(f.Events.Published);
    }

    [Fact]
    public async Task Mentions_have_to_be_family()
    {
        var post = await Post(f.AsEmma);
        var stranger = f.Db.AddProfile(Guid.NewGuid(), "Stranger");

        var result = await f.Posts.AddComment(f.AsEmma, post.Id, new CommentRequest { Text = "Hi", MentionedProfileIds = [stranger.Id] });

        Assert.Equal(ResultError.Invalid, result.Error);
    }

    [Fact]
    public async Task The_post_author_can_delete_anyones_comment_on_it()
    {
        var nate = f.Member("Nate");
        var ana = f.Member("Ana");
        var post = await Post(f.As(nate));
        var comment = (await f.Posts.AddComment(f.As(ana), post.Id, new CommentRequest { Text = "Nice" })).Value!;

        Assert.True((await f.Posts.DeleteComment(f.As(nate), post.Id, comment.Id)).Succeeded);
    }

    [Fact]
    public async Task Feed_pages_newest_first()
    {
        for (var i = 0; i < 5; i++)
        {
            await Post(f.AsEmma, new PostRequest { Text = $"Post {i}" });
            f.Clock.Advance(TimeSpan.FromMinutes(1));
        }

        var first = (await f.Posts.GetFeed(f.AsEmma, null, null, 3)).Value!;
        var second = (await f.Posts.GetFeed(f.AsEmma, null, first.NextBefore, 3)).Value!;

        Assert.Equal(["Post 4", "Post 3", "Post 2"], first.Posts.Select(p => p.Text));
        Assert.Equal(["Post 1", "Post 0"], second.Posts.Select(p => p.Text));
        Assert.Null(second.NextBefore);
    }

    [Fact]
    public async Task Uploads_are_judged_by_their_bytes()
    {
        byte[] jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3];
        byte[] pdf = "%PDF-1.7 not a photo"u8.ToArray();

        var ok = await f.Posts.UploadPhoto(f.AsEmma, new MemoryStream(jpeg), jpeg.Length, 1200, 900, null);
        var bad = await f.Posts.UploadPhoto(f.AsEmma, new MemoryStream(pdf), pdf.Length, 1200, 900, null);
        var noSize = await f.Posts.UploadPhoto(f.AsEmma, new MemoryStream(jpeg), jpeg.Length, 0, 0, null);

        Assert.Equal("image/jpeg", ok.Value!.ContentType);
        Assert.Equal(ResultError.Invalid, bad.Error);
        Assert.Equal(ResultError.Invalid, noSize.Error);
    }

    private static PhotoCrops Portrait(double x = 0.2, double width = 0.5) =>
        new() { Portrait = new CropRect { X = x, Y = 0, Width = width, Height = 0.9 } };

    [Fact]
    public async Task Crops_are_saved_as_numbers_and_the_photo_stays_whole()
    {
        var photo = f.Photo();

        var result = await f.Posts.SetCrops(f.AsEmma, photo, Portrait());

        Assert.Equal(0.5, result.Value!.Crops!.Portrait!.Width);
        Assert.Equal(0.5, f.Db.Media[photo].Crops!.Portrait!.Width);
        Assert.Equal(1200, result.Value.Width);
    }

    [Fact]
    public async Task Crops_must_stay_inside_the_photo()
    {
        var photo = f.Photo();

        var outside = await f.Posts.SetCrops(f.AsEmma, photo, Portrait(x: 0.8, width: 0.5));
        var sliver = await f.Posts.SetCrops(f.AsEmma, photo, Portrait(width: 0.01));
        byte[] jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3];
        var upload = await f.Posts.UploadPhoto(f.AsEmma, new MemoryStream(jpeg), jpeg.Length, 1200, 900, Portrait(x: -0.2));

        Assert.Equal(ResultError.Invalid, outside.Error);
        Assert.Equal(ResultError.Invalid, sliver.Error);
        Assert.Equal(ResultError.Invalid, upload.Error);
    }

    [Fact]
    public async Task Clearing_crops_shows_the_whole_photo_again()
    {
        var photo = f.Photo();
        await f.Posts.SetCrops(f.AsEmma, photo, Portrait());

        await f.Posts.SetCrops(f.AsEmma, photo, new PhotoCrops());

        Assert.Null(f.Db.Media[photo].Crops);
    }

    [Fact]
    public async Task Only_the_uploader_an_admin_or_someone_who_can_edit_the_profile_can_reframe()
    {
        var marco = f.Member("Marco");
        var lena = f.Member("Lena");
        var june = f.Placeholder("June");
        var lenasPost = f.Photo(uploadedBy: lena.Id);
        var junesPortrait = f.Photo(uploadedBy: lena.Id);
        f.Db.Profiles[june.Id].PhotoMediaId = junesPortrait;

        var strangerOnPost = await f.Posts.SetCrops(f.As(marco), lenasPost, Portrait());
        var adminOnPost = await f.Posts.SetCrops(f.AsEmma, lenasPost, Portrait());
        // Anyone can edit a placeholder, so anyone can reframe its picture
        var memberOnPlaceholder = await f.Posts.SetCrops(f.As(marco), junesPortrait, Portrait());

        Assert.Equal(ResultError.Forbidden, strangerOnPost.Error);
        Assert.True(adminOnPost.Succeeded);
        Assert.True(memberOnPlaceholder.Succeeded);
    }

    [Fact]
    public async Task Photos_from_another_family_cant_be_reframed()
    {
        var elsewhere = f.Photo(familyId: Guid.NewGuid());

        var result = await f.Posts.SetCrops(f.AsEmma, elsewhere, Portrait());

        Assert.Equal(ResultError.NotFound, result.Error);
    }
}
