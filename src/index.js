/** @import * as types from './types.js' */
const code = require('vscode');
const {MprisBusCache, MprisListenerService} = require('./mpris-utils.js');
const {MprisStatusService} = require('./vscode-utils.js');

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

/**
 * @param {code.ExtensionContext} context
 */
async function activate(context) {
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
		);
	} catch (error) {
		await bus.stop();
		throw error;
	}
}

async function deactivate() {
	await listener.asyncDispose();
	await bus.asyncDispose();
	status.dispose();
}

module.exports = {activate, deactivate};
