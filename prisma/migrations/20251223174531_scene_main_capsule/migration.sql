/*
  Warnings:

  - You are about to drop the column `decor_id` on the `capsule` table. All the data in the column will be lost.
  - You are about to drop the column `scene_id` on the `capsule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "scene_media_decor_id_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "decorId" INTEGER,
    CONSTRAINT "capsule_decorId_fkey" FOREIGN KEY ("decorId") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_capsule" ("id", "type") SELECT "id", "type" FROM "capsule";
DROP TABLE "capsule";
ALTER TABLE "new_capsule" RENAME TO "capsule";
CREATE TABLE "new_scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'Scène',
    "capsule_id" INTEGER,
    "decor_id" INTEGER,
    "theme_id" INTEGER,
    CONSTRAINT "scene_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "theme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_scene" ("decor_id", "id", "theme_id", "title") SELECT "decor_id", "id", "theme_id", "title" FROM "scene";
DROP TABLE "scene";
ALTER TABLE "new_scene" RENAME TO "scene";
CREATE UNIQUE INDEX "scene_capsule_id_key" ON "scene"("capsule_id");
CREATE UNIQUE INDEX "scene_decor_id_key" ON "scene"("decor_id");
CREATE UNIQUE INDEX "scene_theme_id_key" ON "scene"("theme_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
