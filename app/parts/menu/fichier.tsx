import type { SceneRef } from "@/api/db";

import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuIndicator,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	NavigationMenuViewport
} from "@/components/ui/navigation-menu";
import { Link } from "react-router";

export function Fichier({ scenes }: { scenes: Array<SceneRef> }) {
	return (
		<NavigationMenu>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuTrigger>Fichiers</NavigationMenuTrigger>
					<NavigationMenuContent>
						{scenes &&
							scenes.map((sc) => (
								<NavigationMenuLink key={sc.id} className="whitespace-nowrap" asChild>
									<Link reloadDocument to={`/scene/${sc.id}`}>
										{sc.title}
									</Link>
								</NavigationMenuLink>
							))}
					</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}
