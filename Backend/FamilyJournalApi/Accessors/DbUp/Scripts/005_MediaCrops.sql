-- Photos keep their original upload; how each place frames it (post, portrait, avatar) is stored as
-- JSON crop rectangles, e.g. {"portrait":{"x":0.1,"y":0.05,"width":0.6,"height":0.78}}.
-- NULL means every place shows the whole photo, which is what existing rows get.

ALTER TABLE Media ADD Crops NVARCHAR(MAX) NULL;
GO

ALTER TABLE Media ADD CONSTRAINT CK_Media_Crops_IsJson CHECK (Crops IS NULL OR ISJSON(Crops) = 1);
GO
