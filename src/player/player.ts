import { createTimeline, Timeline } from "animejs";
import { ID, MapEvent, MediaStatus, Perso } from "../types";
import { Change } from "./deps/static-changes";
import { createElements } from "./deps/create-elements";
import { initMedias } from "./deps/init-medias";
import { setStaticChanges } from "./deps/static-changes";
import { createScene } from "./deps/create-scene";
import { onUpdateTimeLine } from "./deps/on-update";
import { PubSub } from "./deps/pubsub";

const tmDefaults = {
  autoplay: true,
  loop: 1,
  alternate: true,
  onLoop: () => console.log("///////LOOP"),
};

export class Player {
  timeLine: Timeline;
  eventtimes: MapEvent;
  render: HTMLElement;
  $elements = new Map<ID, HTMLElement>();
  mediaStatus = new Map<ID, MediaStatus>();
  persos = new Map<ID, Perso>();
  persoChanges = new Map<ID, Record<number, Change>>();
  updatesTM = new PubSub();

  constructor({
    render,
    persos,
    eventtimes,
  }: {
    render: HTMLElement;
    persos: Map<ID, Perso>;
    eventtimes: MapEvent;
  }) {
    if (this.render) return this;
    this.render = render;
    this.persos = persos;
    this.eventtimes = eventtimes;

    this.createElements = createElements.bind(this);
    this.initMedias = initMedias.bind(this);
    this.setStaticChanges = setStaticChanges.bind(this);
    this.createScene = createScene.bind(this);
    this.onUpdateTM = this.onUpdateTM.bind(this);

    this.init();
  }

  private init() {
    this.timeLine = createTimeline(tmDefaults);
    this.createElements();
    this.initMedias();
    this.setStaticChanges();
    this.createScene();
    this.onUpdateTM();
    const onUpdate = onUpdateTimeLine.bind(this)();
    this.updatesTM.subscribe(onUpdate);
  }

  private onUpdateTM() {
    this.timeLine.onUpdate = (self: Timeline) => this.updatesTM.forEach((up) => up(self));
  }
  private createElements: () => void;
  private initMedias: () => void;
  private setStaticChanges: () => void;
  private createScene: () => void;

  telco = () => {
    return {
      seek: this.seek,
      pause: () => this.timeLine.pause(),
      play: this.play,
      duration: this.timeLine.duration,
      susbscribe: (up: Function) => this.updatesTM.subscribe(up),
    };
  };

  private seek = (time: number) => {
    /* 
		seek : pour chaque media , 
		calculer le deplacement relatif 
		*/
    this.timeLine.seek(time);

    console.log(this.mediaStatus);
    // Ajouter changes à mediaStatus
    this.mediaStatus.forEach((ms) => {
      const currentime = ms.change.offset + (time - ms.change.changeAt);
      (ms.node as HTMLVideoElement).currentTime = currentime / 1000;
      ms.node[ms.status]();
    });

    return this.timeLine;
  };

  private play = () => {
    this.timeLine.play();

    this.mediaStatus.forEach((ms) => {
      const video = ms.node as HTMLVideoElement;
      const currenTime = ms.change.offset ?? 0;
      video.currentTime = currenTime;
      video.play();
    });

    return this.timeLine;
  };
}

/* 
comment faire si j'alterne des play et pause pour un media durant la lecture ?
en lecture normale, pas de souci particulier
mais : comment maintenir l'état quand on seek ? 

au ssek :
- mise à jour du statut play | pause 
startAt doit contenir le temps ou doit rependre la video mais :
- cette mais valeur est ajoutée à la lecture , ici ce n'est pas pertinent,
- startAt marche pas ; il faudrait dire "offset" et indiquer aussi a quel moment de la timeline cette valeur a été fixée 
offset peut aussi etre défini dans l'action du perso, pour commencer une video à 2 secondes par exemple. 


exemple 
timeline : 10s
video : 6s

-- à 0s : video :pause , offset 0 
à 2s : video : play, offset : 3s
à 4s : video : pause
à 6s : video : play 

? position video à 8s sur la tm ? 
->  7s , > 6s == 6s 

à la préparation : à chaque action media, calculer offset s'il n'est pas défini 
prop "changeAt" pour définir à quel moment l'action à eu lieu

le positionnemnt de la video serait :
offset + (currentime - changeAt )

ces valeurs sont fixées au lancement de la scene.  
des valeurs légerement différentes peuvent etre mesurées au runtime ; placer ces valeurs dans une autre prop (startAt)

*/
