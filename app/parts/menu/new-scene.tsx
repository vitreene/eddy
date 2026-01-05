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
import { Form } from "react-router";

export function NewScene() {
	return (
		<AlertDialog>
			<AlertDialogTrigger>Nouveau</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Nouvelle scène</AlertDialogTitle>
				</AlertDialogHeader>
				<Form id="new-scene" action="/api/scene" method="POST">
					<label>Titre de la scène</label>
					<input className="mt-2 h-8 w-full border p-1" name="title"></input>
				</Form>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction form="new-scene" type="submit">
						Créer
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
