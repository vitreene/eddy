-- CreateTable
CREATE TABLE "scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'Scène'
);

-- CreateTable
CREATE TABLE "scene_media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "events" TEXT NOT NULL,
    "media_id" INTEGER NOT NULL,
    "scene_id" INTEGER NOT NULL,
    CONSTRAINT "scene_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_media_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "content" TEXT,
    "lang" TEXT
);

-- CreateTable
CREATE TABLE "capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "scene_id" INTEGER NOT NULL,
    CONSTRAINT "capsule_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "capsule_element" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "capsule_id" INTEGER NOT NULL,
    CONSTRAINT "capsule_element_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "capsule_element_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "event" (
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "duration" INTEGER,
    "element_id" INTEGER NOT NULL,

    PRIMARY KEY ("element_id", "action"),
    CONSTRAINT "event_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "capsule_element" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
