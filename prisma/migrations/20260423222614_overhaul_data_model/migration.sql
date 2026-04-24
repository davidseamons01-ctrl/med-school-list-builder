/*
  Warnings:

  - Added the required column `category` to the `SchoolFact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `SchoolFact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `SchoolResource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider` to the `SchoolResource` table without a default value. This is not possible if the table is not empty.
  - Made the column `label` on table `SchoolResource` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "School" ADD COLUMN "admissionsUrl" TEXT;
ALTER TABLE "School" ADD COLUMN "campusAddress" TEXT;
ALTER TABLE "School" ADD COLUMN "countyName" TEXT;
ALTER TABLE "School" ADD COLUMN "lastVerifiedAt" DATETIME;
ALTER TABLE "School" ADD COLUMN "residencyBiasNotes" TEXT;
ALTER TABLE "School" ADD COLUMN "searchAliasesJson" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SchoolFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "valueType" TEXT NOT NULL DEFAULT 'number',
    "unit" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "sourceUrl" TEXT,
    "retrievedAt" DATETIME,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolFact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SchoolFact" ("createdAt", "id", "key", "notes", "retrievedAt", "schoolId", "sourceType", "sourceUrl", "updatedAt", "valueJson") SELECT "createdAt", "id", "key", "notes", "retrievedAt", "schoolId", "sourceType", "sourceUrl", "updatedAt", "valueJson" FROM "SchoolFact";
DROP TABLE "SchoolFact";
ALTER TABLE "new_SchoolFact" RENAME TO "SchoolFact";
CREATE INDEX "SchoolFact_schoolId_category_idx" ON "SchoolFact"("schoolId", "category");
CREATE INDEX "SchoolFact_schoolId_key_idx" ON "SchoolFact"("schoolId", "key");
CREATE UNIQUE INDEX "SchoolFact_schoolId_key_key" ON "SchoolFact"("schoolId", "key");
CREATE TABLE "new_SchoolResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "isSeeded" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SchoolResource" ("createdAt", "id", "kind", "label", "schoolId", "url") SELECT "createdAt", "id", "kind", "label", "schoolId", "url" FROM "SchoolResource";
DROP TABLE "SchoolResource";
ALTER TABLE "new_SchoolResource" RENAME TO "SchoolResource";
CREATE INDEX "SchoolResource_schoolId_category_idx" ON "SchoolResource"("schoolId", "category");
CREATE INDEX "SchoolResource_schoolId_kind_idx" ON "SchoolResource"("schoolId", "kind");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
