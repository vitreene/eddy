import { utils, animate, Timeline } from 'animejs';

export function move(timeLine: Timeline, $el: HTMLElement, a) {
	if ('move' in a) {
		switch (typeof a.move) {
			case 'string':
				const [parent] = utils.$(a.move);
				parent.appendChild($el);
				break;
			case 'boolean': {
				if ('className' in a) {
					const old = getAbsoluteCoords($el);
					setClassNames(timeLine, $el, a);
					const nex = getAbsoluteCoords($el);

					const px = utils.get($el, 'x', false);
					const py = utils.get($el, 'y', false);

					const dx = old.x - nex.x;
					const dy = old.y - nex.y;

					const res = getTransform($el)
						.invertSelf()
						.transformPoint(new DOMPoint(dx, dy));
					console.log('***transition****');

					const transition = animate($el, {
						composition: 'replace',
						x: { from: res.x, to: 0 + px },
						y: { from: res.y, to: 0 + py },

						width: { from: old.width, to: nex.width },
						height: { from: old.height, to: nex.height },

						duration: 1000,
						onComplete(self) {
							utils.cleanInlineStyles(self), self.cancel();
						},
					});

					// timeLine.sync(transition, '+0');
				}
			}
			default:
				break;
		}
	}
}

export function setClassNames(timeLine: Timeline, $el: HTMLElement, a) {
	if ('className' in a) {
		switch (typeof a.className) {
			case 'string':
				a.className.split(' ').forEach((c: string) => $el.classList.add(c));
				break;
			case 'object': {
				for (const action in a.className) {
					switch (action) {
						case 'add':
							a.className.add
								.split(' ')
								.forEach((c: string) => $el.classList.add(c));
							break;
						case 'remove':
							a.className.remove
								.split(' ')
								.forEach((c: string) => $el.classList.remove(c));
					}
				}
			}

			default:
				break;
		}
	}
}

function getAbsoluteCoords($el: HTMLElement) {
	const coords = {
		x: 0,
		y: 0,
	};

	traverse($el);
	const res = coords;
	return {
		x: res.x,
		y: res.y,
		width: $el.offsetWidth,
		height: $el.offsetHeight,
	};

	function traverse(element: HTMLElement) {
		coords.x += element.offsetLeft;
		coords.y += element.offsetTop;
		if (element.offsetParent instanceof HTMLElement) {
			traverse(element.offsetParent);
		}
	}
}

function getTransform(element: HTMLElement) {
	const style = window.getComputedStyle(element);
	return style.transform !== 'none'
		? new DOMMatrix(style.transform)
		: new DOMMatrix();
}

/* 
move est appliqué trop de fois, il ne doit l'etre qu'un seule fois?
plusieurspossibilités :
- pre calcul avant de lancer la lecture,
- update pas à pas ,
- controle d'unicité.


todo :
- le test de position doit etre joué à chaque extrémité de la transition, pour qu'elle soit lue en cas de reverse.

c'est un callback ponctuel a l'entrée et la sortie de la transition.
la transition est jouée étape par étape  dans l'update de la timeline.

mettre en cache le calcul de position ? 
-> attention le contexte donné est celui d'un changement de className. il peut y en avoir d'autres ? 
-> si on ne connait pas à l'avance l'état "start", il faudra réaliser le test à chaque fois.
-> le cache est invalidé en cas de changement de size, mais il peut exister d'autres contestes dans le composant list ( ajout, rerait, deplacement)

l'interpolation est préparée, et jouée à chaque update de la timeline.
un test permet de savoir si la transition est en cours ou achevée
 start =< currentime =< end



 plus généralement :
 les set attributs (class et autes ) se font dans la direction montante mais pas descendante. 
 il faudrait un équivalent qui permette à seek de refleter l'état des attributs d'un element. 

 comme ce sont des evenements ponctuels, on pourrait cumuler dans u state les états  à chaque fois qu'ils sont modifiés 
 si currentime > dernière modif, appliquer la dernière modif
 une passe sur la scene pour créer le state
plutot de des seuils, penser range :
voir dans quel range se situe currentime. s'il a changé, alors faire evoluer les attributs pour refleter l'état. marche dans les deux sens ! 

tester à chaque update du coup 
- comparer currentime a current range; 
- si hors champs, chercher le nouveau currentRange, appliquer les modifs

les move sont dans un autre contexte puisque se sont des animations , mais elles ont aussi un range ! 
un range par attribut  / move ? 

function inRange(x, min, max) {
    return ((x-min)*(x-max) <= 0);
}
*/
/* 
passer en revue la scene :
placer dans une map : 
k: {start, end}
v: Map<id, action[]>

action: tout sauf style
*/
