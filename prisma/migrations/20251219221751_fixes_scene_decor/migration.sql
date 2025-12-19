/*
  Warnings:

  - You are about to drop the column `sceneId` on the `decor` table. All the data in the column will be lost.
  - You are about to drop the column `sceneId` on the `theme` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_decor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "style" TEXT,
    "className" TEXT,
    "target_id" INTEGER,
    "order" INTEGER,
    "based_upon" INTEGER,
    CONSTRAINT "decor_based_upon_fkey" FOREIGN KEY ("based_upon") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_decor" ("based_upon", "className", "id", "name", "order", "style", "target_id") SELECT "based_upon", "className", "id", "name", "order", "style", "target_id" FROM "decor";
DROP TABLE "decor";
ALTER TABLE "new_decor" RENAME TO "decor";
CREATE TABLE "new_scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'Scène',
    "decor_id" INTEGER,
    "theme_id" INTEGER,
    CONSTRAINT "scene_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "theme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_scene" ("id", "title") SELECT "id", "title" FROM "scene";
DROP TABLE "scene";
ALTER TABLE "new_scene" RENAME TO "scene";
CREATE UNIQUE INDEX "scene_decor_id_key" ON "scene"("decor_id");
CREATE UNIQUE INDEX "scene_theme_id_key" ON "scene"("theme_id");
CREATE TABLE "new_theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "custom" TEXT,
    "generated" TEXT
);
INSERT INTO "new_theme" ("custom", "generated", "id", "name") SELECT "custom", "generated", "id", "name" FROM "theme";
DROP TABLE "theme";
ALTER TABLE "new_theme" RENAME TO "theme";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
