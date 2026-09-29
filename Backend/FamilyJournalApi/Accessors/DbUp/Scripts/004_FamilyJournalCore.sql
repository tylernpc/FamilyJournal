-- Everything the app shows: full profiles, photos, tagged posts with life events,
-- comment mentions, richer notifications, and invites that can target a placeholder.

-- Profiles ------------------------------------------------------------------

ALTER TABLE Profiles ADD
    FirstName           nvarchar(100)       NOT NULL CONSTRAINT DF_Profiles_FirstName DEFAULT N'',
    LastName            nvarchar(100)       NOT NULL CONSTRAINT DF_Profiles_LastName DEFAULT N'',
    MaidenName          nvarchar(100)       NULL,
    Gender              int                 NOT NULL CONSTRAINT DF_Profiles_Gender DEFAULT 0,
    Bio                 nvarchar(1000)      NULL,
    Location            nvarchar(200)       NULL,
    PhotoMediaId        uniqueidentifier    NULL,
    AddedByProfileId    uniqueidentifier    NULL;
GO

-- Split existing display names: first word is the first name, the rest the last name.
UPDATE Profiles SET
    FirstName = CASE WHEN CHARINDEX(N' ', DisplayName) > 0
                     THEN LEFT(DisplayName, CHARINDEX(N' ', DisplayName) - 1)
                     ELSE DisplayName END,
    LastName  = CASE WHEN CHARINDEX(N' ', DisplayName) > 0
                     THEN LTRIM(SUBSTRING(DisplayName, CHARINDEX(N' ', DisplayName) + 1, 200))
                     ELSE N'' END;

ALTER TABLE Profiles DROP COLUMN DisplayName;

-- Birthdays and anniversaries are calendar dates, not instants.
ALTER TABLE Profiles ALTER COLUMN BirthDate date NULL;
ALTER TABLE Profiles ALTER COLUMN DeathDate date NULL;

ALTER TABLE Profiles ADD CONSTRAINT FK_Profiles_AddedBy FOREIGN KEY (AddedByProfileId) REFERENCES Profiles(Id);
GO

-- Relationships -------------------------------------------------------------

-- For spouses: the wedding date. Unused for parent/child.
ALTER TABLE Relationships ADD Since date NULL;
GO

-- Media ---------------------------------------------------------------------

-- Uploaded photos. The bytes live in media storage under StorageKey; this row is what the app references.
CREATE TABLE Media (
    Id                      uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FamilyId                uniqueidentifier    NOT NULL,
    UploadedByProfileId     uniqueidentifier    NOT NULL,
    ContentType             nvarchar(100)       NOT NULL,
    ByteSize                bigint              NOT NULL,
    Width                   int                 NOT NULL,
    Height                  int                 NOT NULL,
    StorageKey              nvarchar(300)       NOT NULL,
    CreatedAt               datetimeoffset      NOT NULL,
    CONSTRAINT FK_Media_Families FOREIGN KEY (FamilyId)            REFERENCES Families(Id),
    CONSTRAINT FK_Media_Profiles FOREIGN KEY (UploadedByProfileId) REFERENCES Profiles(Id)
);

ALTER TABLE Profiles ADD CONSTRAINT FK_Profiles_Media FOREIGN KEY (PhotoMediaId) REFERENCES Media(Id);
GO

-- Posts ---------------------------------------------------------------------

-- Photos move to PostPhotos (a post can have several).
ALTER TABLE Posts DROP COLUMN MediaUrl;

-- LifeEventType is a key like "newJob", or "custom" with LifeEventLabel naming it.
ALTER TABLE Posts ADD
    LifeEventType       nvarchar(40)        NULL,
    LifeEventLabel      nvarchar(40)        NULL,
    LifeEventTitle      nvarchar(80)        NULL,
    LifeEventDate       date                NULL;

-- The feed reads newest first within a family.
CREATE INDEX IX_Posts_FamilyId_CreatedAt ON Posts (FamilyId, CreatedAt DESC, Id DESC);

CREATE TABLE PostPhotos (
    PostId          uniqueidentifier    NOT NULL,
    MediaId         uniqueidentifier    NOT NULL,
    SortOrder       int                 NOT NULL,
    AltText         nvarchar(300)       NULL,
    CONSTRAINT PK_PostPhotos PRIMARY KEY (PostId, MediaId),
    CONSTRAINT FK_PostPhotos_Posts FOREIGN KEY (PostId)  REFERENCES Posts(Id),
    CONSTRAINT FK_PostPhotos_Media FOREIGN KEY (MediaId) REFERENCES Media(Id)
);

-- People a post is about or with.
CREATE TABLE PostTags (
    PostId          uniqueidentifier    NOT NULL,
    ProfileId       uniqueidentifier    NOT NULL,
    CONSTRAINT PK_PostTags PRIMARY KEY (PostId, ProfileId),
    CONSTRAINT FK_PostTags_Posts    FOREIGN KEY (PostId)    REFERENCES Posts(Id),
    CONSTRAINT FK_PostTags_Profiles FOREIGN KEY (ProfileId) REFERENCES Profiles(Id)
);

CREATE INDEX IX_PostTags_ProfileId ON PostTags (ProfileId);

-- Comments ------------------------------------------------------------------

CREATE INDEX IX_Comments_PostId ON Comments (PostId, CreatedAt);

CREATE TABLE CommentMentions (
    CommentId       uniqueidentifier    NOT NULL,
    ProfileId       uniqueidentifier    NOT NULL,
    CONSTRAINT PK_CommentMentions PRIMARY KEY (CommentId, ProfileId),
    CONSTRAINT FK_CommentMentions_Comments FOREIGN KEY (CommentId) REFERENCES Comments(Id),
    CONSTRAINT FK_CommentMentions_Profiles FOREIGN KEY (ProfileId) REFERENCES Profiles(Id)
);
GO

-- Notifications -------------------------------------------------------------

-- Explicit columns replace the untyped ReferenceId.
ALTER TABLE Notifications DROP COLUMN ReferenceId;

ALTER TABLE Notifications ADD
    ActorProfileId      uniqueidentifier    NULL,
    PostId              uniqueidentifier    NULL,
    Emoji               nvarchar(32)        NULL,
    Preview             nvarchar(200)       NULL;
GO

ALTER TABLE Notifications ADD
    CONSTRAINT FK_Notifications_Actor FOREIGN KEY (ActorProfileId) REFERENCES Profiles(Id),
    CONSTRAINT FK_Notifications_Posts FOREIGN KEY (PostId)         REFERENCES Posts(Id);

CREATE INDEX IX_Notifications_Recipient ON Notifications (RecipientProfileId, CreatedAt DESC);
GO

-- Invites -------------------------------------------------------------------

-- Only a SHA-256 hash of the invite token is stored, like refresh tokens.
EXEC sp_rename 'Invites.Token', 'TokenHash', 'COLUMN';
EXEC sp_rename 'Invites.UX_Invites_Token', 'UX_Invites_TokenHash', 'INDEX';

-- ProfileId: the placeholder this invite lets someone claim, if any.
ALTER TABLE Invites ADD
    ProfileId               uniqueidentifier    NULL,
    InvitedByProfileId      uniqueidentifier    NULL,
    RevokedAt               datetimeoffset      NULL;
GO

ALTER TABLE Invites ADD
    CONSTRAINT FK_Invites_Profiles  FOREIGN KEY (ProfileId)          REFERENCES Profiles(Id),
    CONSTRAINT FK_Invites_InvitedBy FOREIGN KEY (InvitedByProfileId) REFERENCES Profiles(Id);
GO
