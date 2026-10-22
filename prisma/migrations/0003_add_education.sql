CREATE TABLE "Education" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "logoKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);
