-- Remove only the unused slug column; preserve all other project data.
DROP INDEX "Project_slug_key";
ALTER TABLE "Project" DROP COLUMN "slug";
