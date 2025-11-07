PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

INSERT INTO media VALUES(1,'img','assets/28970388742_2f75d527d6_z.jpg',NULL,NULL);
INSERT INTO media VALUES(2,'img','assets/28999069391_5893263112_z.jpg',NULL,NULL);
INSERT INTO media VALUES(3,'sound','/assets/1_7b_e.mp3',NULL,'fr');


INSERT INTO capsule VALUES(1,'background',1);
INSERT INTO capsule VALUES(2,'listing',1);

INSERT INTO capsule_element VALUES(1,1,1,1);
INSERT INTO capsule_element VALUES(2,2,2,1);

INSERT INTO scene_media VALUES(1,1,'[{"text":" Vous","start":0,"end":0.26,"id":"3-000-Vous"},{"text":" l","start":0.26,"end":0.38,"id":"3-001-l"},{"text":"''avez","start":0.38,"end":0.5,"id":"3-002-avez"},{"text":" donc","start":0.5,"end":0.66,"id":"3-003-donc"},{"text":" vu","start":0.66,"end":0.92,"id":"3-004-vu"},{"text":" l","start":0.92,"end":1.32,"id":"3-005-l"},{"text":"''électricité","start":1.32,"end":1.78,"id":"3-006-lectricit"},{"text":" présente","start":1.78,"end":2.24,"id":"3-007-prsente"},{"text":" des","start":2.24,"end":2.42,"id":"3-008-des"},{"text":" risques.","start":2.42,"end":3.22,"id":"3-009-risques"},{"text":" Si","start":3.4,"end":3.56,"id":"3-010-Si"},{"text":" nous","start":3.56,"end":3.72,"id":"3-011-nous"},{"text":" connaissons","start":3.72,"end":4.16,"id":"3-012-connaissons"},{"text":" ces","start":4.16,"end":4.38,"id":"3-013-ces"},{"text":" risques,","start":4.38,"end":4.96,"id":"3-014-risques"},{"text":" nous","start":4.96,"end":5.04,"id":"3-015-nous"},{"text":" pouvons","start":5.04,"end":5.32,"id":"3-016-pouvons"},{"text":" les","start":5.32,"end":5.44,"id":"3-017-les"},{"text":" prévenir.","start":5.44,"end":6.16,"id":"3-018-prvenir"},{"text":" C","start":6.46,"end":6.58,"id":"3-019-C"},{"text":"''est","start":6.58,"end":6.62,"id":"3-020-est"},{"text":" pourquoi","start":6.62,"end":6.86,"id":"3-021-pourquoi"},{"text":" il","start":6.86,"end":7.02,"id":"3-022-il"},{"text":" est","start":7.02,"end":7.12,"id":"3-023-est"},{"text":" essentiel","start":7.12,"end":7.62,"id":"3-024-essentiel"},{"text":" d","start":7.62,"end":7.82,"id":"3-025-d"},{"text":"''évaluer","start":7.82,"end":8.1,"id":"3-026-valuer"},{"text":" le","start":8.1,"end":8.24,"id":"3-027-le"},{"text":" risque","start":8.24,"end":8.52,"id":"3-028-risque"},{"text":" électrique","start":8.52,"end":8.92,"id":"3-029-lectrique"},{"text":" dans","start":8.92,"end":9.12,"id":"3-030-dans"},{"text":" le","start":9.12,"end":9.24,"id":"3-031-le"},{"text":" travail","start":9.24,"end":9.54,"id":"3-032-travail"},{"text":" que","start":9.54,"end":9.78,"id":"3-033-que"},{"text":" vous","start":9.78,"end":9.92,"id":"3-034-vous"},{"text":" effectuez.","start":9.92,"end":10.84,"id":"3-035-effectuez"},{"text":" Cette","start":11.18,"end":11.44,"id":"3-036-Cette"},{"text":" évaluation","start":11.44,"end":11.82,"id":"3-037-valuation"},{"text":" des","start":11.82,"end":12.1,"id":"3-038-des"},{"text":" risques","start":12.1,"end":12.38,"id":"3-039-risques"},{"text":" en","start":12.38,"end":12.5,"id":"3-040-en"},{"text":" général","start":12.5,"end":12.88,"id":"3-041-gnral"},{"text":" est","start":12.88,"end":13.24,"id":"3-042-est"},{"text":" du","start":13.24,"end":13.38,"id":"3-043-du"},{"text":" risque","start":13.38,"end":13.66,"id":"3-044-risque"},{"text":" électrique","start":13.66,"end":14.04,"id":"3-045-lectrique"},{"text":" en","start":14.04,"end":14.24,"id":"3-046-en"},{"text":" particulier","start":14.24,"end":14.7,"id":"3-047-particulier"},{"text":" et","start":14.7,"end":15.2,"id":"3-048-et"},{"text":" obligatoire.","start":15.2,"end":16.32,"id":"3-049-obligatoire"},{"text":" Nous","start":16.6,"end":16.68,"id":"3-050-Nous"},{"text":" allons","start":16.68,"end":16.9,"id":"3-051-allons"},{"text":" en","start":16.9,"end":17.1,"id":"3-052-en"},{"text":" parler.","start":17.1,"end":21.42,"id":"3-053-parler"}]',3,1);

INSERT INTO scene VALUES(1,'Scène');

INSERT INTO event (name, action,ref, duration, element_id) VALUES('3-018-prvenir','outro','fondu',0,2);
INSERT INTO event (name, action,ref, duration, element_id) VALUES('3-000-Vous','intro','fondu',0,1);
INSERT INTO event (name, action,ref, duration, element_id) VALUES('3-006-lectricit','outro','fondu',0,1);
INSERT INTO event (name, action,ref, duration, element_id) VALUES('3-009-risques','intro','fondu',0,2);


COMMIT;
