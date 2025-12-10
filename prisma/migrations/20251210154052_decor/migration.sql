-- AlterTable
ALTER TABLE "media" ADD COLUMN "referenceId" INTEGER;

-- CreateTable
CREATE TABLE "decor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "style" TEXT,
    "className" TEXT,
    "target_id" INTEGER,
    "order" INTEGER,
    "sceneId" INTEGER,
    "based_upon" INTEGER,
    CONSTRAINT "decor_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scene" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "decor_based_upon_fkey" FOREIGN KEY ("based_upon") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "custom" TEXT,
    "generated" TEXT,
    "sceneId" INTEGER,
    CONSTRAINT "theme_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scene" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "scene_id" INTEGER NOT NULL,
    "decor_id" INTEGER,
    CONSTRAINT "capsule_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "capsule_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_capsule" ("id", "scene_id", "type") SELECT "id", "scene_id", "type" FROM "capsule";
DROP TABLE "capsule";
ALTER TABLE "new_capsule" RENAME TO "capsule";
CREATE UNIQUE INDEX "capsule_decor_id_key" ON "capsule"("decor_id");
CREATE TABLE "new_event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "duration" INTEGER,
    "element_id" INTEGER,
    "capsule_id" INTEGER,
    "decor_id" INTEGER,
    CONSTRAINT "event_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "capsule_element" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_event" ("action", "capsule_id", "duration", "element_id", "id", "name", "ref") SELECT "action", "capsule_id", "duration", "element_id", "id", "name", "ref" FROM "event";
DROP TABLE "event";
ALTER TABLE "new_event" RENAME TO "event";
CREATE UNIQUE INDEX "event_decor_id_key" ON "event"("decor_id");
CREATE TABLE "new_scene_media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "events" TEXT NOT NULL,
    "media_id" INTEGER NOT NULL,
    "scene_id" INTEGER NOT NULL,
    "decor_id" INTEGER,
    CONSTRAINT "scene_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_media_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_media_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_scene_media" ("events", "id", "media_id", "order", "scene_id") SELECT "events", "id", "media_id", "order", "scene_id" FROM "scene_media";
DROP TABLE "scene_media";
ALTER TABLE "new_scene_media" RENAME TO "scene_media";
CREATE UNIQUE INDEX "scene_media_decor_id_key" ON "scene_media"("decor_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
