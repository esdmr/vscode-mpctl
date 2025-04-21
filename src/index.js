/** @import {MediaPlayer2, MprisMetadata} from './types.js' */
/** @import {MessageBus} from 'dbus-ts' */
const code = require('vscode');
const {sessionBus} = require('dbus-ts');
const {
	getMprisServices,
	sendMprisCommand,
	listenToMpris,
} = require('./mpris-utils.js');
const {fetchImage} = require('./image-utils.js');

/** @type {MessageBus<MediaPlayer2> | undefined} */
let bus;

/** @type {string} */
let service = '';

/** @type {WritableStream<MprisMetadata> | undefined} */
let status;

/** @type {ReadableStream<MprisMetadata> | undefined} */
let metadataStream;

const listFormat = new Intl.ListFormat('en');

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

const alignmentImage =
	'<br><img src="data:image/svg+xml,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2236%22%20height=%220%22/>" alt="">';

/**
 * @returns {WritableStream<MprisMetadata>}
 */
function createStatus() {
	/** @type {code.StatusBarItem} */
	let status;

	return new WritableStream({
		start() {
			console.log('MPRIS status: Starting status.', status);
			status = code.window.createStatusBarItem(
				code.StatusBarAlignment.Right,
			);
			status.name = 'MPRIS Media Control';
			status.text = '$(debug-stop) Not Playing'; // 1F3B5
			status.command = 'mprisctl.play';
			status.show();
		},
		async write(metadata) {
			console.debug('MPRIS status: Got metadata:', metadata);

			if (!metadata.title) {
				status.text = '$(debug-stop) Not Playing';
				status.tooltip = undefined;
				status.command = 'mprisctl.play';
				return;
			}

			const image = await fetchImage(
				code.Uri.parse(metadata.artUrl, true),
			);

			const tooltip = new code.MarkdownString('', true);
			tooltip.isTrusted = true;
			tooltip.supportHtml = true;
			tooltip.appendMarkdown(
				`<img src="${image}" alt="" width="128" height="128">\n\n`,
			);
			tooltip.appendText(metadata.title);
			tooltip.appendMarkdown('\n\nby *\u{200B}');
			tooltip.appendText(
				listFormat.format(
					metadata.artists.length > 2
						? [metadata.artists[0], '…']
						: metadata.artists,
				),
			);
			tooltip.appendMarkdown('* from *\u{200B}');
			tooltip.appendText(metadata.album);
			tooltip.appendMarkdown('*\n\n');
			tooltip.appendMarkdown('<table style="width: 128px">');
			tooltip.appendMarkdown('<tr>');
			tooltip.appendMarkdown(
				`<td align="center"><a href="command:mprisctl.previous">$(debug-reverse-continue)</a>${alignmentImage}</td>`,
			);

			if (metadata.playing) {
				tooltip.appendMarkdown(
					`<td align="center"><a href="command:mprisctl.play_pause">$(debug-pause)</a>${alignmentImage}</td>`,
				);
			} else {
				tooltip.appendMarkdown(
					`<td align="center"><a href="command:mprisctl.play_pause">$(debug-start)</a>${alignmentImage}</td>`,
				);
			}

			tooltip.appendMarkdown(
				`<td align="center"><a href="command:mprisctl.next">$(debug-continue)</a>${alignmentImage}</td>`,
			);
			tooltip.appendMarkdown('</tr>');
			tooltip.appendMarkdown('</table>\n');

			status.text =
				(metadata.playing ? '$(debug-start) ' : '$(debug-pause) ') +
				metadata.title;
			status.tooltip = tooltip;
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
