import {QuickPickItemKind, window, type QuickPickItem} from 'vscode';
import type {MprisBusCache} from '../mpris/bus-cache.js';

export async function showPlayerSelection(bus: MprisBusCache) {
	const services = await bus.getServices();
	const items: QuickPickItem[] = [];

	for (const i of services) {
		// eslint-disable-next-line no-await-in-loop
		const name = await bus.getServiceName(i);

		items.push({
			label: name ?? i.split('.').at(-1),
			description: i,
			picked: bus.service === i,
		});
	}

	const selection = await window.showQuickPick(items, {
		placeHolder: items.length === 0 ? 'No Players Detected' : 'Player',
	});

	return selection?.description;
}
