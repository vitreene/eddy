PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS "event" (
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
INSERT INTO event VALUES(1,'3-053-parler','outro','fondu zoom in',0,NULL,2,NULL);
INSERT INTO event VALUES(2,'3-004-vu','intro','balayage haut',0,NULL,1,NULL);
INSERT INTO event VALUES(3,'3-009-risques','outro','balayage bas',0,NULL,1,NULL);
INSERT INTO event VALUES(4,'3-050-Nous','intro','fondu zoom out',0,NULL,2,NULL);
INSERT INTO event VALUES(5,'3-006-lectricit','intro','fondu zoom in',NULL,NULL,3,NULL);
INSERT INTO event VALUES(6,'3-023-est','outro','fondu',NULL,NULL,3,NULL);


CREATE TABLE IF NOT EXISTS "scene_content" (
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
INSERT INTO scene_content VALUES(1,1,'[{"text":" Vous","start":0,"end":0.26,"name":"3-000-Vous"},{"text":" l","start":0.26,"end":0.38,"name":"3-001-l"},{"text":"''avez","start":0.38,"end":0.5,"name":"3-002-avez"},{"text":" donc","start":0.5,"end":0.66,"name":"3-003-donc"},{"text":" vu","start":0.66,"end":0.92,"name":"3-004-vu"},{"text":" l","start":0.92,"end":1.32,"name":"3-005-l"},{"text":"''électricité","start":1.32,"end":1.78,"name":"3-006-lectricit"},{"text":" présente","start":1.78,"end":2.24,"name":"3-007-prsente"},{"text":" des","start":2.24,"end":2.42,"name":"3-008-des"},{"text":" risques.","start":2.42,"end":3.22,"name":"3-009-risques"},{"text":" Si","start":3.4,"end":3.56,"name":"3-010-Si"},{"text":" nous","start":3.56,"end":3.72,"name":"3-011-nous"},{"text":" connaissons","start":3.72,"end":4.16,"name":"3-012-connaissons"},{"text":" ces","start":4.16,"end":4.38,"name":"3-013-ces"},{"text":" risques,","start":4.38,"end":4.96,"name":"3-014-risques"},{"text":" nous","start":4.96,"end":5.04,"name":"3-015-nous"},{"text":" pouvons","start":5.04,"end":5.32,"name":"3-016-pouvons"},{"text":" les","start":5.32,"end":5.44,"name":"3-017-les"},{"text":" prévenir.","start":5.44,"end":6.16,"name":"3-018-prvenir"},{"text":" C","start":6.46,"end":6.58,"name":"3-019-C"},{"text":"''est","start":6.58,"end":6.62,"name":"3-020-est"},{"text":" pourquoi","start":6.62,"end":6.86,"name":"3-021-pourquoi"},{"text":" il","start":6.86,"end":7.02,"name":"3-022-il"},{"text":" est","start":7.02,"end":7.12,"name":"3-023-est"},{"text":" essentiel","start":7.12,"end":7.62,"name":"3-024-essentiel"},{"text":" d","start":7.62,"end":7.82,"name":"3-025-d"},{"text":"''évaluer","start":7.82,"end":8.1,"name":"3-026-valuer"},{"text":" le","start":8.1,"end":8.24,"name":"3-027-le"},{"text":" risque","start":8.24,"end":8.52,"name":"3-028-risque"},{"text":" électrique","start":8.52,"end":8.92,"name":"3-029-lectrique"},{"text":" dans","start":8.92,"end":9.12,"name":"3-030-dans"},{"text":" le","start":9.12,"end":9.24,"name":"3-031-le"},{"text":" travail","start":9.24,"end":9.54,"name":"3-032-travail"},{"text":" que","start":9.54,"end":9.78,"name":"3-033-que"},{"text":" vous","start":9.78,"end":9.92,"name":"3-034-vous"},{"text":" effectuez.","start":9.92,"end":10.84,"name":"3-035-effectuez"},{"text":" Cette","start":11.18,"end":11.44,"name":"3-036-Cette"},{"text":" évaluation","start":11.44,"end":11.82,"name":"3-037-valuation"},{"text":" des","start":11.82,"end":12.1,"name":"3-038-des"},{"text":" risques","start":12.1,"end":12.38,"name":"3-039-risques"},{"text":" en","start":12.38,"end":12.5,"name":"3-040-en"},{"text":" général","start":12.5,"end":12.88,"name":"3-041-gnral"},{"text":" est","start":12.88,"end":13.24,"name":"3-042-est"},{"text":" du","start":13.24,"end":13.38,"name":"3-043-du"},{"text":" risque","start":13.38,"end":13.66,"name":"3-044-risque"},{"text":" électrique","start":13.66,"end":14.04,"name":"3-045-lectrique"},{"text":" en","start":14.04,"end":14.24,"name":"3-046-en"},{"text":" particulier","start":14.24,"end":14.7,"name":"3-047-particulier"},{"text":" et","start":14.7,"end":15.2,"name":"3-048-et"},{"text":" obligatoire.","start":15.2,"end":16.32,"name":"3-049-obligatoire"},{"text":" Nous","start":16.6,"end":16.68,"name":"3-050-Nous"},{"text":" allons","start":16.68,"end":16.9,"name":"3-051-allons"},{"text":" en","start":16.9,"end":17.1,"name":"3-052-en"},{"text":" parler.","start":17.1,"end":21.42,"name":"3-053-parler"}]',3,1,NULL);


CREATE TABLE IF NOT EXISTS "theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "custom" TEXT,
    "generated" TEXT
);


CREATE TABLE IF NOT EXISTS "item_target" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER,

    "target_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    CONSTRAINT "item_target_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_target_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order" INTEGER NOT NULL,
   
    "content_id" INTEGER NOT NULL,
    "capsule_id" INTEGER NOT NULL,
    "decor_id" INTEGER,
    CONSTRAINT "item_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO item VALUES(1,2500,1,2,NULL);
INSERT INTO item VALUES(2,5000,2,2,4);
INSERT INTO item VALUES(3,2000,2,3,NULL);
INSERT INTO item VALUES(4,3000,4,3,NULL);
INSERT INTO item VALUES(5,2000,5,1,NULL);
INSERT INTO item VALUES(6,1000,6,1,NULL);


CREATE TABLE IF NOT EXISTS "decor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "style" TEXT,
    "className" TEXT,
    "based_upon" INTEGER,
    CONSTRAINT "decor_based_upon_fkey" FOREIGN KEY ("based_upon") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO decor VALUES(1,NULL,'{"fontFamily":"Inter","fontSize":"24px","color":"#F40505","fontWeight":"bold"}',NULL,NULL);
INSERT INTO decor VALUES(2,NULL,'{"fontFamily":"Inter","fontSize":"29px","color":"#DD1111","fontStyle":"italic","backgroundColor":"#FF0000"}',NULL,NULL);
INSERT INTO decor VALUES(3,NULL,'{"fontFamily":"Inter","fontSize":"29px","color":"#DD1111","fontStyle":"italic","backgroundColor":"#10E499","fontWeight":"normal"}',NULL,NULL);
INSERT INTO decor VALUES(4,NULL,'{"fontFamily":"Inter","fontSize":"16px","color":"#222222","backgroundColor":"#DD11AA"}',NULL,NULL);


CREATE TABLE IF NOT EXISTS "capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "grid" TEXT
);
INSERT INTO capsule VALUES(1,'__MAIN__',NULL,NULL);
INSERT INTO capsule VALUES(2,'listing',NULL,NULL);
INSERT INTO capsule VALUES(3,'background',NULL,NULL);


CREATE TABLE IF NOT EXISTS "scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL DEFAULT 'Scène',
    
    "capsule_id" INTEGER,
    "decor_id" INTEGER,
    "theme_id" INTEGER,
    CONSTRAINT "scene_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_decor_id_fkey" FOREIGN KEY ("decor_id") REFERENCES "decor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "scene_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "theme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO scene VALUES(1,'Scène 1',1,NULL,NULL);


CREATE TABLE IF NOT EXISTS "content" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "inner" TEXT,
    "lang" TEXT,

    "capsule_id" INTEGER,
    CONSTRAINT "content_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO content VALUES(1,'img','assets/28970388742_2f75d527d6_z.jpg',NULL,NULL,NULL);
INSERT INTO content VALUES(2,'img','assets/28999069391_5893263112_z.jpg',NULL,NULL,NULL);
INSERT INTO content VALUES(3,'sound','/assets/1_7b_e.mp3',NULL,'fr',NULL);
INSERT INTO content VALUES(4,'text',NULL,'je suis content','fr',NULL);
INSERT INTO content VALUES(5,'capsule',NULL,NULL,NULL,2);
INSERT INTO content VALUES(6,'capsule',NULL,NULL,NULL,3);

CREATE TABLE IF NOT EXISTS "scene_capsule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scene_id" INTEGER NOT NULL,
    "capsule_id" INTEGER NOT NULL,

    CONSTRAINT "scene_capsule_scene_id_fkey" FOREIGN KEY ("scene_id") REFERENCES "scene" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scene_capsule_capsule_id_fkey" FOREIGN KEY ("capsule_id") REFERENCES "capsule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO scene_capsule VALUES(0,1,1);
INSERT INTO scene_capsule VALUES(1,1,2);
INSERT INTO scene_capsule VALUES(2,1,3);


CREATE UNIQUE INDEX "event_decor_id_key" ON "event"("decor_id");
CREATE UNIQUE INDEX "item_decor_id_key" ON "item"("decor_id");
CREATE UNIQUE INDEX "scene_capsule_id_key" ON "scene"("capsule_id");
CREATE UNIQUE INDEX "scene_decor_id_key" ON "scene"("decor_id");
CREATE UNIQUE INDEX "scene_theme_id_key" ON "scene"("theme_id");
CREATE UNIQUE INDEX "content_capsule_id_key" ON "content"("capsule_id");
COMMIT;

