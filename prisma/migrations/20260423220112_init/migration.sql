-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT,
    "lat" REAL,
    "lng" REAL,
    "control" TEXT NOT NULL DEFAULT 'PRIVATE',
    "websiteUrl" TEXT,
    "studentAffairsUrl" TEXT,
    "financialAidUrl" TEXT,
    "secondaryPromptsUrl" TEXT,
    "countyFips" TEXT,
    "missionTagNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SchoolFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolFact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicantProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT,
    "statsJson" TEXT NOT NULL,
    "prefsJson" TEXT NOT NULL,
    "weightsJson" TEXT NOT NULL,
    "warsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SchoolList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "profileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolList_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ApplicantProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolListEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "tierOverride" BOOLEAN NOT NULL DEFAULT false,
    "applyStatus" TEXT NOT NULL DEFAULT 'NONE',
    "compositeScore" REAL,
    "scoreBreakdownJson" TEXT,
    "notes" TEXT,
    "checklistJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolListEntry_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SchoolList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchoolListEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolResource_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE INDEX "SchoolFact_schoolId_key_idx" ON "SchoolFact"("schoolId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolFact_schoolId_key_key" ON "SchoolFact"("schoolId", "key");

-- CreateIndex
CREATE INDEX "SchoolListEntry_listId_tier_idx" ON "SchoolListEntry"("listId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolListEntry_listId_schoolId_key" ON "SchoolListEntry"("listId", "schoolId");

-- CreateIndex
CREATE INDEX "SchoolResource_schoolId_kind_idx" ON "SchoolResource"("schoolId", "kind");
