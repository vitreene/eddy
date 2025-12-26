-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "inner" TEXT,
    "lang" TEXT,
    "capsule_id" INTEGER,
    CONSTRAINT "content_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_content" ("id", "inner", "lang", "path", "type") SELECT "id", "inner", "lang", "path", "type" FROM "content";
DROP TABLE "content";
ALTER TABLE "new_content" RENAME TO "content";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
