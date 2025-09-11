import type { Route } from '.react-router/types/app/+types/root';
import { Welcome } from '../welcome/welcome';
import { getScene } from 'app/server/db';

import { useLoaderData } from 'react-router';

export async function loader() {
	return await getScene(1);
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: 'New React Router App' },
		{ name: 'description', content: 'Welcome to React Router!' },
	];
}

export default function Home() {
	// return <Welcome />;
	const scene = useLoaderData<typeof loader>();
	console.log(scene);
	return <div className="text-3xl font-bold underline">Hello world!</div>;
}
/* 
{
  id: 1,
  title: 'Scène',
  medias: [
    {
      id: 3,
      type: 'sound',
      path: '/assets/1_7b_e.mp3',
      content: null,
      lang: 'fr',
      order: 1,
      mediaId: 3,
      events: [Array]
    }
  ],
  capsules: [
    { id: 1, type: 'background', sceneId: 1, elements: [Array] },
    { id: 2, type: 'list', sceneId: 1, elements: [] }
  ],
  sources: [
    {
      id: 1,
      type: 'img',
      path: 'assets/28970388742_2f75d527d6_z.jpg',
      content: null,
      lang: null
    },
    {
      id: 2,
      type: 'img',
      path: 'assets/28999069391_5893263112_z.jpg',
      content: null,
      lang: null
    },
    {
      id: 3,
      type: 'sound',
      path: '/assets/1_7b_e.mp3',
      content: null,
      lang: 'fr'
    }
  ]
}

*/
