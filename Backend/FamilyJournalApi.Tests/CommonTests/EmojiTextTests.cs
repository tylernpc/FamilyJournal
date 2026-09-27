using FamilyJournalApi.Common;

namespace FamilyJournalApi.Tests.CommonTests;

public class EmojiTextTests
{
    [Theory]
    [InlineData("❤️")]
    [InlineData("👍")]
    [InlineData("👍🏽")]            // skin tone
    [InlineData("👨‍👩‍👧")]          // ZWJ family
    [InlineData("🏳️‍🌈")]           // ZWJ flag
    [InlineData("🇺🇸")]            // regional indicator pair
    [InlineData("#️⃣")]            // keycap
    [InlineData("🥧")]
    [InlineData("🕯️")]
    public void Accepts_single_emoji(string emoji)
    {
        Assert.True(EmojiText.IsSingleEmoji(emoji));
    }

    [Theory]
    [InlineData("")]
    [InlineData("lol")]
    [InlineData("a")]
    [InlineData("1")]
    [InlineData("<")]
    [InlineData("^")]
    [InlineData("❤️❤️")]           // two emoji
    [InlineData("👍 ")]
    [InlineData("<script>")]
    [InlineData("é")]
    public void Rejects_text_and_multiple_emoji(string value)
    {
        Assert.False(EmojiText.IsSingleEmoji(value));
    }

    [Fact]
    public void Rejects_null()
    {
        Assert.False(EmojiText.IsSingleEmoji(null));
    }
}
