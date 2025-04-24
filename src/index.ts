import code from 'vscode';
import {MprisBusCache, MprisListenerService} from './mpris-utils.js';
import {MprisStatusService} from './vscode-utils.js';

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

export async function activate(context: code.ExtensionContext) {
	try {
		await reconnectDbus();

		context.subscriptions.push(
			code.commands.registerCommand('mpctl.next', async () => {
				await bus.sendMprisCommand('Next');
			}),
			code.commands.registerCommand('mpctl.pause', async () => {
				await bus.sendMprisCommand('Pause');
			}),
			code.commands.registerCommand('mpctl.play_pause', async () => {
				await bus.sendMprisCommand('PlayPause');
			}),
			code.commands.registerCommand('mpctl.play', async () => {
				await bus.sendMprisCommand('Play');
			}),
			code.commands.registerCommand('mpctl.previous', async () => {
				await bus.sendMprisCommand('Previous');
			}),
			code.commands.registerCommand('mpctl.reconnect', async () => {
				await reconnectDbus();
			}),
			code.commands.registerCommand('mpctl.stop', async () => {
				await bus.sendMprisCommand('Stop');
			}),
			code.commands.registerCommand('mpctl.switch', async () => {
				const services = await bus.getServices();
				const items: code.QuickPickItem[] = [];

				for (const i of services) {
					items.push({
						// eslint-disable-next-line no-await-in-loop
						label: await bus.getServiceName(i),
						description: i,
						picked: bus.service === i,
					});
				}

				const selection = await code.window.showQuickPick(items, {
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
