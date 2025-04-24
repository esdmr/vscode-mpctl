import code from 'vscode';
import {getAlignmentImage, fetchImage, resizeImage} from './image-utils.js';
import type {MprisMetadata, MprisSink} from './mpris-utils.js';

const listFormat = new Intl.ListFormat('en');
const alignmentImage = getAlignmentImage(36);
export const artImageSize = 128;

export function formatMetadata(metadata: MprisMetadata, image: string) {
	const t = new code.MarkdownString('', true);

	t.isTrusted = true;
	t.supportHtml = true;

	t.appendMarkdown(
		`<img src="${image}" alt="" width="${artImageSize}" height="${artImageSize}">\n\n**\u{200B}`,
	);
	t.appendText(metadata.title);
	t.appendMarkdown('\u{200B}**\n\n');

	if (metadata.artists.length > 0) {
		t.appendMarkdown('by *\u{200B}');

		t.appendText(
			listFormat.format(
				metadata.artists.length > 2
					? [metadata.artists[0], '…']
					: metadata.artists,
			),
		);

		t.appendMarkdown('\u{200B}*\n\n');
	}

	if (metadata.album) {
		t.appendMarkdown('from *\u{200B}');
		t.appendText(metadata.album);
		t.appendMarkdown('\u{200B}*\n\n');
	}

	t.appendMarkdown(
		`<table style="width: 128px"><tr><td align="center"><a href="command:mpctl.previous">$(debug-reverse-continue)</a>${alignmentImage}</td><td align="center"><a href="command:mpctl.play_pause">$(debug-start)</a>${alignmentImage}</td><td align="center"><a href="command:mpctl.next">$(debug-continue)</a>${alignmentImage}</td></tr></table>`,
	);

	return t;
}

export class MprisStatusService implements code.Disposable, MprisSink {
	#item: code.StatusBarItem | undefined;
	readonly #onStart = new code.EventEmitter<void>();
	readonly #onStop = new code.EventEmitter<void>();

	get onStart() {
		return this.#onStart.event;
	}

	get onStop() {
		return this.#onStop.event;
	}

	start() {
		if (this.#item) return;
		console.log('MPRIS status: Starting status.');

		this.#item = code.window.createStatusBarItem(code.StatusBarAlignment.Right);

		this.#item.name = 'MPRIS Media Control';
		this.#item.text = '$(music)';

		this.#onStart.fire();
		this.#item.show();
	}

	stop() {
		if (!this.#item) return;
		console.log('MPRIS status: Stopped');

		this.#onStop.fire();
		this.#item.dispose();
		this.#item = undefined;
	}

	dispose() {
		this.stop();
		this.#onStart.dispose();
		this.#onStop.dispose();
	}

	clear() {
		if (!this.#item) return;
		this.#item.text = '$(music)';
		this.#item.tooltip = undefined;
		this.#item.command = undefined;
	}

	async update(metadata: MprisMetadata) {
		if (!this.#item) return;
		console.debug('MPRIS status: Got metadata:', metadata);

		if (!metadata.title) {
			this.clear();
			return;
		}

		const image = await resizeImage(
			await fetchImage(code.Uri.parse(metadata.artUrl, true)),
			artImageSize,
		);

		this.#item.text =
			(metadata.playing ? '$(debug-start) ' : '$(debug-pause) ') +
			metadata.title;

		this.#item.tooltip = formatMetadata(metadata, image);
		this.#item.command = undefined;
	}
}
