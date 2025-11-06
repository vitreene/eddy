import { useContext, useEffect } from "react";

import type { ElementComp } from "@/api/db";
import * as transitions from "@/player/presets/transitions";
import { SceneContext, type ActionEvent } from "@/provider/scene-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditMediaContext } from "@/provider/edit-media-provider";

import { Media } from "../capsule-edit/display-media";

export function EditMediaActions({ element }: { element: ElementComp }) {
	return (
		<div className="flex gap-2">
			<Media attr={element.media} size={"lg"} />
			<div className="min-w-64 border border-slate-400 p-2">
				<Tabs defaultValue="animation" className="w-full">
					<TabsList>
						<TabsTrigger value="animation">Animation</TabsTrigger>
						<TabsTrigger value="description">Description</TabsTrigger>
					</TabsList>
					<TabsContent value="animation">
						<TabActions events={element.events} />
					</TabsContent>
					<TabsContent value="description">To do</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

function TabActions({ events }: { events: Array<ActionEvent> }) {
	return (
		<Tabs defaultValue="intro" orientation="vertical" className="flex flex-row gap-4">
			<ActionsList events={events} />

			<div className="border-l border-slate-500 pl-4">
				{events.map((event) => (
					<TabsContent key={event.action} value={event.action}>
						<ActionLine event={event} />
					</TabsContent>
				))}
			</div>
		</Tabs>
	);
}

function ActionsList({ events }: { events: Array<ActionEvent> }) {
	return (
		<TabsList className="flex-col">
			{events.map((e) => (
				<TabsTrigger key={e.action} value={e.action}>
					{e.action}
				</TabsTrigger>
			))}
		</TabsList>
	);
}

function ActionLine({ event }: { event: ActionEvent }) {
	const comp = useContext(SceneContext);
	const mediaActions = useContext(EditMediaContext)!;
	const ev = mediaActions.state[event.action];

	useEffect(() => {
		comp!.dispatch({ type: "set-action", event });
	}, [comp!.dispatch, event]);

	const onChangeAction = (e: React.ChangeEvent<HTMLSelectElement>) => {
		// send({ type: "UPDATE", target: event.action, payload: { ref: e.target.value } });
		mediaActions?.dispatch({ type: "update", target: event.action, payload: { ref: e.target.value } });
	};

	return (
		<div className="mb-2 text-xs">
			<input name="target" hidden defaultValue={event.action} />
			<dl className="">
				<dt className="font-light">Repère</dt>
				<dd className="">{ev.text ?? "––"}</dd>
				<dt className="mt-2 font-light">Transition</dt>
				<dd className="">
					<SelectAction value={ev?.ref ?? "--"} onChange={onChangeAction} />
				</dd>
			</dl>
		</div>
	);
}

function SelectAction({
	value,
	onChange
}: {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
	return (
		<select name={"ref"} onChange={onChange} value={value}>
			<option value={""}>––</option>
			{Object.entries(transitions).map(([k, t]) => (
				<option key={k} value={t.name}>
					{t.name}
				</option>
			))}
		</select>
	);
}

/* 
editeur de media

selon les caractérisstiques de la capsule, l'accès aux réglages est limité. 


- intro - outro - automatique ,
- intro - sustain - outro dans les autres cas,
- actions custom

outro - automatique selon le choix de la capsule, désactivable
si le modele est un diaporama, automatique synchronise outro et intro du suivant.
si le modele est une liste, ne rien faire. 

sustain est a part, c'est l'animation par défaut pour la durée d'apparition de l'image. 

*/
