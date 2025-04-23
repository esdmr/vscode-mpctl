/** @import {MediaPlayer2, MprisMetadata} from './types.js' */
/** @import {MessageBus} from 'dbus-ts' */
const code = require('vscode');
const {sessionBus} = require('dbus-ts');
const {
	getMprisServices,
	sendMprisCommand,
	listenToMpris,
} = require('./mpris-utils.js');
const {fetchImage, resizeImage} = require('./image-utils.js');
const {artImageSize, formatMetadata} = require('./vscode-utils.js');

/** @type {MessageBus<MediaPlayer2> | undefined} */
let bus;

/** @type {string} */
let service = '';

/** @type {WritableStream<MprisMetadata> | undefined} */
let status;

/** @type {ReadableStream<MprisMetadata> | undefined} */
let metadataStream;

async function reconnectDbus() {
	await metadataStream?.cancel();
	metadataStream = undefined;

	bus?.connection.end();
	bus = await sessionBus();

	/** @type {string[]} */
	[service = ''] = await getMprisServices(bus);
	if (!service) return;

	metadataStream = listenToMpris(bus, service);

	status ??= createStatus();

	metadataStream.pipeTo(status, {
		preventClose: true,
		preventAbort: true,
	});
}

/**
 * @returns {WritableStream<MprisMetadata>}
 */
function createStatus() {
	/** @type {code.StatusBarItem} */
	let status;

	return new WritableStream({
		start() {
			console.log('MPRIS status: Starting status.', status);
			status = code.window.createStatusBarItem(code.StatusBarAlignment.Right);
			status.name = 'MPRIS Media Control';
			status.text = '$(music)';
			status.show();
		},
		async write(metadata) {
			console.debug('MPRIS status: Got metadata:', metadata);

			if (!metadata.title) {
				status.text = '$(music)';
				status.tooltip = undefined;
				status.command = service ? 'mprisctl.play' : undefined;
				return;
			}

			const image = await resizeImage(
				await fetchImage(code.Uri.parse(metadata.artUrl, true)),
				artImageSize,
			);

			status.text =
				(metadata.playing ? '$(debug-start) ' : '$(debug-pause) ') +
				metadata.title;
			status.tooltip = formatMetadata(metadata, image);
			status.command = undefined;
		},
		close() {
			console.log('MPRIS status: Closed');
			status.dispose();
		},
		abort(reason) {
			console.error('MPRIS status: Aborted:', reason);
			status.dispose();
		},
	});
}

/**
 * @param {code.ExtensionContext} context
 */
async function activate(context) {
	try {
		await reconnectDbus();

		context.subscriptions.push(
			code.commands.registerCommand('mprisctl.next', async () => {
				if (!bus || !service) await reconnectDbus();
				if (!bus || !service) return;
				await sendMprisCommand(bus, service, 'Next');
			}),
			code.commands.registerCommand('mprisctl.pause', async () => {
				if (!bus || !service) await reconnectDbus();
				if (!bus || !service) return;
				await sendMprisCommand(bus, service, 'Pause');
			}),
			code.commands.registerCommand('mprisctl.play_pause', async () => {
				if (!bus || !service) await reconnectDbus();
				if (!bus || !service) return;
				await sendMprisCommand(bus, service, 'PlayPause');
			}),
			code.commands.registerCommand('mprisctl.play', async () => {
				if (!bus || !service) await reconnectDbus();
				if (!bus || !service) return;
				await sendMprisCommand(bus, service, 'Play');
			}),
			code.commands.registerCommand('mprisctl.previous', async () => {
				if (!bus || !service) await reconnectDbus();
				if (!bus || !service) return;
				await sendMprisCommand(bus, service, 'Previous');
			}),
			code.commands.registerCommand('mprisctl.reconnect', async () => {
				if (!bus || !service) await reconnectDbus();
			}),
			code.commands.registerCommand('mprisctl.stop', async () => {
				if (!bus || !service) await reconnectDbus();
				if (!bus || !service) return;
				await sendMprisCommand(bus, service, 'Stop');
			}),
		);
	} catch (error) {
		bus?.connection.end();
		bus = undefined;
		throw error;
	}
}

async function deactivate() {
	const reason = new Error('Extension is being deactivated');

	await metadataStream?.cancel(reason);
	metadataStream = undefined;

	await status?.abort(reason);
	status = undefined;

	bus?.connection.end();
	bus = undefined;
}

module.exports = {activate, deactivate};
