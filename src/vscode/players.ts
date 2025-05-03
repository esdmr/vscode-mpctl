import {QuickPickItemKind, window, type QuickPickItem} from 'vscode';
import type {MprisBusCache} from '../mpris/bus-cache.js';
import {buildMprisMetadata} from '../mpris/metadata.js';

export async function showPlayerSelection(bus: MprisBusCache) {
	const quickPick = window.createQuickPick();
	quickPick.busy = true;
	quickPick.placeholder = 'Player';
	quickPick.show();

	const result = new Promise((resolve) => {
		quickPick.onDidAccept(() => {
			resolve(quickPick.selectedItems[0]?.description);
			quickPick.hide();
		});
		quickPick.onDidHide(() => {
			resolve(undefined);
		});
	});

	const services = await bus.getServices();
	const items: QuickPickItem[] = [];

	for (const service of services) {
		// eslint-disable-next-line no-await-in-loop
		const name = await bus.getServiceName(service);
		// eslint-disable-next-line no-await-in-loop
		const player = await bus.getServicePlayer(service);

		// eslint-disable-next-line no-await-in-loop
		const {title} = buildMprisMetadata(await player.Metadata, 'Unknown');

		items.push({
			label: name ?? service.split('.').at(-1),
			description: service,
			detail: title,
			picked: bus.service === service,
		});
	}

	quickPick.busy = false;
	quickPick.items = items;
	quickPick.placeholder =
		items.length === 0 ? 'No Media Player Detected' : 'Player';

	return result;
}
