-- Remove profile fields unused by the public pages.
ALTER TABLE "Profile" DROP COLUMN "headline";
ALTER TABLE "Profile" DROP COLUMN "rotatingTitles";
ALTER TABLE "Profile" DROP COLUMN "photoKey";
ALTER TABLE "Profile" DROP COLUMN "available";
ALTER TABLE "Profile" DROP COLUMN "availabilityNote";
