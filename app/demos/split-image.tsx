import * as React from "react";

type Props = {
	src: string;
	cols?: number; // ex: 20
	rows?: number; // ex: 20
	aspectRatio?: number; // ex: 1 ou 16/9
	className?: string; // classes supplémentaires sur la grille
};

function evenThenOddIndex(n: number, dest: number): number {
	// Retourne l'index "source" à afficher pour une position "dest"
	// Règle: [2,4,6,..., n, 1,3,5,...] (en 1-based)
	// En 0-based: [1,3,5,..., 0,2,4,...]
	if (n <= 1) return 0;

	const half = Math.floor(n / 2); // nombre d'éléments dans la 1ère partie
	let src = dest < half ? 2 * dest + 1 : 2 * (dest - half);

	// Sécurité pour n impair (rare ici mais on évite les dépassements)
	if (src >= n) src = n - 1;
	return src;
}

function posPercent(i: number, n: number): number {
	if (n <= 1) return 0;
	return (i / (n - 1)) * 100;
}

export function ResponsiveBackgroundSliceGrid({
	src,
	cols = 20,
	rows = 20,
	aspectRatio = 1,
	className
}: Props) {
	const [shifted, setShifted] = React.useState(false);
	const count = cols * rows;

	return (
		<>
			<style>
				{`
        .slice-grid {
            display: grid;
            width: 100%;
            gap: 0;
         }

        .slice-cell {
            background-repeat: no-repeat;
            width: 100%;
            height: 100%;
            /* optionnel: évite les “blancs” sur certains moteurs */
            background-origin: border-box;
        }
`}
			</style>

			<div
				className={`slice-grid ${className ?? ""}`}
				onClick={() => setShifted((v) => !v)}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") setShifted((v) => !v);
				}}
				aria-label="grille image (bascule au clic)"
				style={{
					gridTemplateColumns: `repeat(${cols}, 1fr)`,
					gridTemplateRows: `repeat(${rows}, 1fr)`,
					aspectRatio: String(aspectRatio)
				}}
			>
				{Array.from({ length: count }).map((_, index) => {
					const destRow = Math.floor(index / cols);
					const destCol = index % cols;

					const srcRow = shifted ? evenThenOddIndex(rows, destRow) : destRow;
					const srcCol = shifted ? evenThenOddIndex(cols, destCol) : destCol;

					const x = posPercent(srcCol, cols);
					const y = posPercent(srcRow, rows);

					return (
						<div
							key={index}
							className="slice-cell"
							style={{
								backgroundImage: `url("${src}")`,
								// l’image “totale” couvre l’ensemble: chaque cellule voit une fenêtre
								backgroundSize: `${cols * 100}% ${rows * 100}%`,
								backgroundPosition: `${x}% ${y}%`
							}}
						/>
					);
				})}
			</div>
		</>
	);
}
