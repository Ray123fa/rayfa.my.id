CREATE TABLE "Education_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "startYear" INTEGER NOT NULL,
  "endYear" INTEGER,
  "logoKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- Preserve single-year entries and ongoing education from legacy periods.
INSERT INTO "Education_new" ("id", "title", "institution", "startYear", "endYear", "logoKey", "sortOrder")
SELECT "id", "title", "institution",
  CAST(substr(trim("period"), 1, 4) AS INTEGER),
  CASE
    WHEN lower("period") LIKE '%sekarang%' OR lower("period") LIKE '%present%'
      OR lower("period") LIKE '%ongoing%' THEN NULL
    WHEN length(trim("period")) = 4 THEN CAST(trim("period") AS INTEGER)
    ELSE CAST(substr(trim("period"), -4) AS INTEGER)
  END,
  "logoKey", "sortOrder"
FROM "Education";

DROP TABLE "Education";
ALTER TABLE "Education_new" RENAME TO "Education";
