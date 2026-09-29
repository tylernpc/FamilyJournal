-- Accounts are global; a user joins families through a Profile in each one (Profiles.UserId).

CREATE TABLE Users (
    Id                  uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Email               nvarchar(320)       NOT NULL,
    NormalizedEmail     nvarchar(320)       NOT NULL,
    PasswordHash        nvarchar(max)       NOT NULL,
    FirstName           nvarchar(100)       NOT NULL,
    LastName            nvarchar(100)       NOT NULL,
    FailedSignInCount   int                 NOT NULL DEFAULT 0,
    LockoutEndsAt       datetimeoffset      NULL,
    LastSignInAt        datetimeoffset      NULL,
    CreatedAt           datetimeoffset      NOT NULL
);

CREATE UNIQUE INDEX UX_Users_NormalizedEmail ON Users (NormalizedEmail);

-- Only a SHA-256 hash of each refresh token is stored. Tokens rotate on every use;
-- all tokens from one sign-in share a ChainId so a replayed token can revoke the whole session.
CREATE TABLE RefreshTokens (
    Id                  uniqueidentifier    NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId              uniqueidentifier    NOT NULL,
    ChainId             uniqueidentifier    NOT NULL,
    TokenHash           nvarchar(64)        NOT NULL,
    ExpiresAt           datetimeoffset      NOT NULL,
    CreatedAt           datetimeoffset      NOT NULL,
    RevokedAt           datetimeoffset      NULL,
    ReplacedByTokenId   uniqueidentifier    NULL,
    CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE UNIQUE INDEX UX_RefreshTokens_TokenHash ON RefreshTokens (TokenHash);
CREATE INDEX IX_RefreshTokens_ChainId ON RefreshTokens (ChainId);

-- Profiles.UserId existed before accounts did; now it points at a real user.
ALTER TABLE Profiles ADD CONSTRAINT FK_Profiles_Users FOREIGN KEY (UserId) REFERENCES Users(Id);

-- A user has at most one profile per family.
CREATE UNIQUE INDEX UX_Profiles_FamilyId_UserId ON Profiles (FamilyId, UserId) WHERE UserId IS NOT NULL;
