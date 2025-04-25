import {
	commands,
	window,
	type ExtensionContext,
	type QuickPickItem,
} from 'vscode';
import {MprisListenerService} from './mpris/listener-service.js';
import {MprisBusCache} from './mpris/bus-cache.js';
import {MprisStatusService} from './vscode/status.js';

const status = new MprisStatusService();
const bus = new MprisBusCache();
const listener = new MprisListenerService(bus).setSink(status);

async function reconnectDbus() {
	await listener.stop();
	await bus.stop();
	status.clear();
	await bus.start();
	await listener.start();
	status.start();
}

export async function activate(context: ExtensionContext) {
	try {
		await reconnectDbus();

		context.subscriptions.push(
			commands.registerCommand('mpctl.next', async () => {
				await bus.sendMprisCommand('Next');
			}),
			commands.registerCommand('mpctl.pause', async () => {
				await bus.sendMprisCommand('Pause');
			}),
			commands.registerCommand('mpctl.play_pause', async () => {
				await bus.sendMprisCommand('PlayPause');
			}),
			commands.registerCommand('mpctl.play', async () => {
				await bus.sendMprisCommand('Play');
			}),
			commands.registerCommand('mpctl.previous', async () => {
				await bus.sendMprisCommand('Previous');
			}),
			commands.registerCommand('mpctl.reconnect', async () => {
				await reconnectDbus();
			}),
			commands.registerCommand('mpctl.stop', async () => {
				await bus.sendMprisCommand('Stop');
			}),
			commands.registerCommand('mpctl.switch', async () => {
				const services = await bus.getServices();
				const items: QuickPickItem[] = [];

				for (const i of services) {
					items.push({
						// eslint-disable-next-line no-await-in-loop
						label: await bus.getServiceName(i),
						description: i,
						picked: bus.service === i,
					});
				}

				const selection = await window.showQuickPick(items, {
					placeHolder: 'Player',
				});

				if (selection) {
					await bus.setService(selection.description);
				}
			}),
		);
	} catch (error) {
		await bus.stop();
		throw error;
	}
}

export async function deactivate() {
	await listener.asyncDispose();
	await bus.asyncDispose();
	status.dispose();
}
