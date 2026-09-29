using System.Globalization;
using System.Text;

namespace FamilyJournalApi.Common;

public static class EmojiText
{
    public const int MaxLength = 32;

    /// <summary>
    /// True for a single emoji, including skin tones, flags, keycaps and ZWJ sequences like 👨‍👩‍👧.
    /// Rejects text, so a reaction can't be "lol" or a script tag.
    /// </summary>
    public static bool IsSingleEmoji(string? value)
    {
        if (string.IsNullOrEmpty(value) || value.Length > MaxLength)
        {
            return false;
        }

        // One user-perceived character
        if (new StringInfo(value).LengthInTextElements != 1)
        {
            return false;
        }

        var sawPictograph = false;

        foreach (var rune in value.EnumerateRunes())
        {
            var code = rune.Value;

            if (IsJoinerOrModifier(code))
            {
                continue;
            }

            // Keycap bases (#, *, 0-9) only count when followed by the keycap mark, which is checked below
            if (code is '#' or '*' or >= '0' and <= '9')
            {
                continue;
            }

            // Plain ASCII punctuation like ^ or < is never an emoji
            if (code < 0x80)
            {
                return false;
            }

            var category = Rune.GetUnicodeCategory(rune);
            if (category is UnicodeCategory.OtherSymbol or UnicodeCategory.ModifierSymbol)
            {
                sawPictograph = true;
                continue;
            }

            return false;
        }

        return sawPictograph || value.Contains('⃣');
    }

    private static bool IsJoinerOrModifier(int code) =>
        code is 0x200D                      // zero-width joiner
            or 0xFE0F or 0xFE0E             // emoji / text presentation selectors
            or 0x20E3                       // combining enclosing keycap
            or (>= 0x1F3FB and <= 0x1F3FF)  // skin tones
            or (>= 0xE0020 and <= 0xE007F); // tag sequences (subdivision flags)
}
