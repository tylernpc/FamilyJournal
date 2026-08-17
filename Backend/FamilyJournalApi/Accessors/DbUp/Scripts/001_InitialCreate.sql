CREATE TABLE Families (
    Id              uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name            nvarchar(200)       NOT NULL,
    CreatedAt       datetimeoffset      NOT NULL
);

CREATE TABLE Profiles (
    Id              uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FamilyId        uniqueidentifier    NOT NULL,
    DisplayName     nvarchar(200)       NOT NULL,
    UserId          uniqueidentifier    NULL,
    IsPlaceholder   bit                 NOT NULL DEFAULT 0,
    LifeStatus      int                 NOT NULL DEFAULT 0,
    BirthDate       datetimeoffset      NULL,
    DeathDate       datetimeoffset      NULL,
    CreatedAt       datetimeoffset      NOT NULL,
    CONSTRAINT FK_Profiles_Families FOREIGN KEY (FamilyId) REFERENCES Families(Id)
);

CREATE TABLE FamilyMembers (
    FamilyId        uniqueidentifier    NOT NULL,
    ProfileId       uniqueidentifier    NOT NULL,
    Role            int                 NOT NULL DEFAULT 1,
    JoinedAt        datetimeoffset      NOT NULL,
    CONSTRAINT PK_FamilyMembers PRIMARY KEY (FamilyId, ProfileId),
    CONSTRAINT FK_FamilyMembers_Families FOREIGN KEY (FamilyId) REFERENCES Families(Id),
    CONSTRAINT FK_FamilyMembers_Profiles FOREIGN KEY (ProfileId) REFERENCES Profiles(Id)
);

CREATE TABLE Relationships (
    Id                  uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FamilyId            uniqueidentifier    NOT NULL,
    FromProfileId       uniqueidentifier    NOT NULL,
    ToProfileId         uniqueidentifier    NOT NULL,
    Type                int                 NOT NULL,
    PairLowProfileId    AS (CASE WHEN FromProfileId < ToProfileId THEN FromProfileId ELSE ToProfileId END) PERSISTED,
    PairHighProfileId   AS (CASE WHEN FromProfileId < ToProfileId THEN ToProfileId ELSE FromProfileId END) PERSISTED,
    CONSTRAINT FK_Relationships_Families    FOREIGN KEY (FamilyId)      REFERENCES Families(Id),
    CONSTRAINT FK_Relationships_FromProfile FOREIGN KEY (FromProfileId)  REFERENCES Profiles(Id),
    CONSTRAINT FK_Relationships_ToProfile   FOREIGN KEY (ToProfileId)    REFERENCES Profiles(Id)
);

-- Blocks both exact duplicates (A->B twice) and reverse-direction duplicates (A->B and B->A)
-- of the same relationship type within a family, regardless of which side is From/To.
CREATE UNIQUE INDEX UX_Relationships_FamilyId_Pair_Type ON Relationships (FamilyId, PairLowProfileId, PairHighProfileId, Type);

CREATE TABLE Posts (
    Id              uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FamilyId        uniqueidentifier    NOT NULL,
    AuthorProfileId uniqueidentifier    NOT NULL,
    Content         nvarchar(max)       NOT NULL,
    MediaUrl        nvarchar(500)       NULL,
    IsLifeEvent     bit                 NOT NULL DEFAULT 0,
    CreatedAt       datetimeoffset      NOT NULL,
    UpdatedAt       datetimeoffset      NULL,
    CONSTRAINT FK_Posts_Families FOREIGN KEY (FamilyId)         REFERENCES Families(Id),
    CONSTRAINT FK_Posts_Profiles FOREIGN KEY (AuthorProfileId)  REFERENCES Profiles(Id)
);

CREATE TABLE Comments (
    Id              uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    PostId          uniqueidentifier    NOT NULL,
    AuthorProfileId uniqueidentifier    NOT NULL,
    Content         nvarchar(max)       NOT NULL,
    CreatedAt       datetimeoffset      NOT NULL,
    CONSTRAINT FK_Comments_Posts    FOREIGN KEY (PostId)            REFERENCES Posts(Id),
    CONSTRAINT FK_Comments_Profiles FOREIGN KEY (AuthorProfileId)   REFERENCES Profiles(Id)
);

CREATE TABLE Reactions (
    Id              uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    PostId          uniqueidentifier    NOT NULL,
    ProfileId       uniqueidentifier    NOT NULL,
    Type            int                 NOT NULL,
    CreatedAt       datetimeoffset      NOT NULL,
    CONSTRAINT FK_Reactions_Posts    FOREIGN KEY (PostId)     REFERENCES Posts(Id),
    CONSTRAINT FK_Reactions_Profiles FOREIGN KEY (ProfileId)  REFERENCES Profiles(Id)
);

CREATE UNIQUE INDEX UX_Reactions_PostId_ProfileId ON Reactions (PostId, ProfileId);

CREATE TABLE Notifications (
    Id                  uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    RecipientProfileId  uniqueidentifier    NOT NULL,
    Type                int                 NOT NULL,
    ReferenceId         uniqueidentifier    NULL,
    IsRead              bit                 NOT NULL DEFAULT 0,
    CreatedAt           datetimeoffset      NOT NULL,
    CONSTRAINT FK_Notifications_Profiles FOREIGN KEY (RecipientProfileId) REFERENCES Profiles(Id)
);

CREATE TABLE Invites (
    Id          uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FamilyId    uniqueidentifier    NOT NULL,
    Token       nvarchar(100)       NOT NULL,
    Email       nvarchar(300)       NULL,
    Role        int                 NOT NULL DEFAULT 1,
    ExpiresAt   datetimeoffset      NOT NULL,
    ClaimedAt   datetimeoffset      NULL,
    CreatedAt   datetimeoffset      NOT NULL,
    CONSTRAINT FK_Invites_Families FOREIGN KEY (FamilyId) REFERENCES Families(Id)
);

CREATE UNIQUE INDEX UX_Invites_Token ON Invites (Token);
