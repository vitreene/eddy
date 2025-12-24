-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "referenceId" INTEGER,
    "path" TEXT,
    "content" TEXT,
    "lang" TEXT,
    "capsule_id" INTEGER,
    CONSTRAINT "media_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_media" ("content", "id", "lang", "path", "referenceId", "type") SELECT "content", "id", "lang", "path", "referenceId", "type" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
CREATE UNIQUE INDEX "media_capsule_id_key" ON "media"("capsule_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
