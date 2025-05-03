import {
	commands,
	window,
	type ExtensionContext,
	type QuickPickItem,
} from 'vscode';
import {MprisListenerService} from './mpris/listener-service.js';
import {MprisBusCache} from './mpris/bus-cache.js';
import {MprisStatusService} from './vscode/status.js';
import {showPlayerSelection} from './vscode/players.js';

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
				const selection = await showPlayerSelection(bus);
				if (selection) await bus.setService(selection);
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
