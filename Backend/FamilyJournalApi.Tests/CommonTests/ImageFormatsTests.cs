using System.Text;
using FamilyJournalApi.Common;

namespace FamilyJournalApi.Tests.CommonTests;

public class ImageFormatsTests
{
    private static byte[] Pad(params byte[] start) => [.. start, .. new byte[Math.Max(0, ImageFormats.HeaderLength - start.Length)]];

    [Fact]
    public void Detects_jpeg() => Assert.Equal("image/jpeg", ImageFormats.Detect(Pad(0xFF, 0xD8, 0xFF, 0xE0)));

    [Fact]
    public void Detects_png() => Assert.Equal("image/png", ImageFormats.Detect(Pad(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)));

    [Fact]
    public void Detects_gif() => Assert.Equal("image/gif", ImageFormats.Detect(Pad(Encoding.ASCII.GetBytes("GIF89a"))));

    [Fact]
    public void Detects_webp() => Assert.Equal("image/webp", ImageFormats.Detect(Encoding.ASCII.GetBytes("RIFF\0\0\0\0WEBP")));

    [Fact]
    public void Detects_iphone_heic() => Assert.Equal("image/heic", ImageFormats.Detect([0, 0, 0, 0x18, .. Encoding.ASCII.GetBytes("ftypheic")]));

    [Fact]
    public void Rejects_a_pdf_renamed_to_jpg() => Assert.Null(ImageFormats.Detect(Pad(Encoding.ASCII.GetBytes("%PDF-1.7"))));

    [Fact]
    public void Rejects_too_few_bytes() => Assert.Null(ImageFormats.Detect([0xFF, 0xD8, 0xFF]));
}
