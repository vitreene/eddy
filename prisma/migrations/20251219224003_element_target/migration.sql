/*
  Warnings:

  - You are about to drop the column `order` on the `decor` table. All the data in the column will be lost.
  - You are about to drop the column `target_id` on the `decor` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "element_target" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER,
    "target_id" INTEGER NOT NULL,
    "element_id" INTEGER NOT NULL,
    CONSTRAINT "element_target_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "element_target_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "capsule_element" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_capsule_element" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "capsule_id" INTEGER NOT NULL,
    "decor_id" INTEGER,
    CONSTRAINT "capsule_element_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "capsule_element_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "capsule_element_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_capsule_element" ("capsule_id", "id", "media_id", "order") SELECT "capsule_id", "id", "media_id", "order" FROM "capsule_element";
DROP TABLE "capsule_element";
ALTER TABLE "new_capsule_element" RENAME TO "capsule_element";
CREATE UNIQUE INDEX "capsule_element_decor_id_key" ON "capsule_element"("decor_id");
CREATE TABLE "new_decor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "style" TEXT,
    "className" TEXT,
    "based_upon" INTEGER,
    CONSTRAINT "decor_based_upon_fkey" FOREIGN KEY ("based_upon") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_decor" ("based_upon", "className", "id", "name", "style") SELECT "based_upon", "className", "id", "name", "style" FROM "decor";
DROP TABLE "decor";
ALTER TABLE "new_decor" RENAME TO "decor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
