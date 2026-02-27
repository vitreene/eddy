import { Trash2 } from "lucide-react";
import { Form } from "react-router";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function DeleteScene({ sceneId }: { sceneId: number }) {
	const formId = `delete-scene-${sceneId}`;

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button type="button" size="icon-sm" variant="outline" aria-label="Supprimer la scene courante">
					<Trash2 className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Supprimer la scene courante ?</AlertDialogTitle>
					<AlertDialogDescription>
						Cette action supprime la scene, son theme, son scene_content, ses capsules, ses items, ses events et ses
						decors. Les contenus du chutier sont conserves, sauf les textes si vous decochez l'option.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<Form id={formId} action={`/api/scene/${sceneId}/delete`} method="POST" className="space-y-3">
					<label className="flex items-center gap-2 text-sm">
						<input type="checkbox" name="keepTexts" defaultChecked />
						<span>Conserver les textes</span>
					</label>
				</Form>

				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction
						form={formId}
						type="submit"
						className="bg-destructive hover:bg-destructive/90 text-white"
					>
						Supprimer
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
