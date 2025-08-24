import lottie, { AnimationItem } from 'lottie-web';

import { P, PersoMediaDef, PersoVideoDef } from '../../types';
import { Player } from '../player';

export function initMedias(this: Player) {
	const lotties: Array<PersoMediaDef> = [];
	const videos: Array<PersoVideoDef> = [];
	this.persos.forEach((p) => {
		switch (p.type) {
			case P.LOTTIE:
				lotties.push(p as PersoMediaDef);
				break;
			case P.VIDEO:
				videos.push(p as PersoVideoDef);
				break;
			default:
				break;
		}
	});

	lotties.forEach((l) => {
		l.media = lottie.loadAnimation({
			container: this.$elements.get(l.initial.id),
			renderer: 'svg',
			loop: false,
			autoplay: false,
			animationData: l.media,
		});
	});

	videos.forEach((v) => {
		this.mediaStatus.set(v.initial.id, {
			node: v.media,
			startAt: 0,
			status: v.initial.media?.action || 'pause',
		});

		if (!v.initial.master) return;
		/*
		synchroniser les pistes si diff trop importantes
		utiliser le speed général pour éviter des sauts de temps brusques 
		*/
		// v.media.playbackRate = 0.25;

		(v.media as HTMLVideoElement).ontimeupdate = () => {
			const start = this.mediaStatus.get(v.initial.id).startAt;

			const diff =
				v.media.currentTime * 1000 + start - this.timeLine.currentTime;
			if (diff > 60) {
				const speed =
					Math.round(
						((v.media.currentTime * 1000 + start) / this.timeLine.currentTime) *
							100
					) / 100;
				this.timeLine.speed = speed;
				console.log('speed', speed);
			}
		};

		// (v.media as HTMLVideoElement).onended = () => {
		// 	this.mediaStatus.set(v.initial.id, {
		// 		node: v.media,
		// 		startAt: 0,
		// 		status: 'pause',
		// 	});
		// };
	});
}
