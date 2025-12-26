-- CreateTable
CREATE TABLE "scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'Scène',
    "capsule_id" INTEGER,
    "decor_id" INTEGER,
    "theme_id" INTEGER,
    CONSTRAINT "scene_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "theme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scene_capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scene_id" INTEGER NOT NULL,
    "capsule_id" INTEGER NOT NULL,
    CONSTRAINT "scene_capsule_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_capsule_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scene_content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "events" TEXT NOT NULL,
    "content_id" INTEGER NOT NULL,
    "scene_id" INTEGER NOT NULL,
    "decor_id" INTEGER,
    CONSTRAINT "scene_content_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_content_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_content_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "grid" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "content_id" INTEGER NOT NULL,
    "capsule_id" INTEGER NOT NULL,
    "decor_id" INTEGER,
    CONSTRAINT "item_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "inner" TEXT,
    "lang" TEXT
);

-- CreateTable
CREATE TABLE "event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "duration" INTEGER,
    "delay" INTEGER,
    "item_id" INTEGER,
    "decor_id" INTEGER,
    CONSTRAINT "event_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "event_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "decor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "style" TEXT,
    "className" TEXT,
    "based_upon" INTEGER,
    CONSTRAINT "decor_based_upon_fkey" FOREIGN KEY ("based_upon") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "item_target" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER,
    "target_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    CONSTRAINT "item_target_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_target_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "custom" TEXT,
    "generated" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_capsule_id_key" ON "scene"("capsule_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_decor_id_key" ON "scene"("decor_id");

-- CreateIndex
CREATE UNIQUE INDEX "scene_theme_id_key" ON "scene"("theme_id");

-- CreateIndex
CREATE UNIQUE INDEX "item_decor_id_key" ON "item"("decor_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_decor_id_key" ON "event"("decor_id");
