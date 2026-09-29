-- Reactions store any emoji as its Unicode string instead of a fixed ReactionType.
-- 32 UTF-16 units covers ZWJ sequences like family and skin-tone emoji.

ALTER TABLE Reactions ADD Emoji nvarchar(32) NULL;
GO

-- Carry existing rows over from the old enum (Like, Love, Haha, Sad, Wow).
UPDATE Reactions
SET Emoji = CASE Type
    WHEN 0 THEN N'👍'
    WHEN 1 THEN N'❤️'
    WHEN 2 THEN N'😂'
    WHEN 3 THEN N'😢'
    WHEN 4 THEN N'😮'
    ELSE N'❤️'
END;
GO

ALTER TABLE Reactions ALTER COLUMN Emoji nvarchar(32) NOT NULL;
ALTER TABLE Reactions DROP COLUMN Type;
GO
