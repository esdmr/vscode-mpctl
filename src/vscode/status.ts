import {TypedEventTarget} from 'typescript-event-target';
import {StatusBarAlignment, Uri, window, type StatusBarItem} from 'vscode';
import {fetchImage} from '../image/fetch.js';
import {resizeImage} from '../image/resize.js';
import type {MprisMetadata} from '../mpris/metadata.js';
import type {MprisSink} from '../mpris/sink-cache.js';
import {artImageSize, formatMetadata} from './tooltip.js';

export class MprisStatusService
	extends TypedEventTarget<{
		start: Event;
		stop: Event;
	}>
	implements MprisSink
{
	#item: StatusBarItem | undefined;

	start() {
		if (this.#item) return;
		console.log('MPRIS status: Starting status.');

		this.#item = window.createStatusBarItem(StatusBarAlignment.Right);

		this.#item.name = 'MPRIS Media Control';
		this.#item.text = '$(music)';

		this.dispatchTypedEvent('start', new Event('start'));
		this.#item.show();
	}

	stop() {
		if (!this.#item) return;
		console.log('MPRIS status: Stopped');

		this.dispatchTypedEvent('stop', new Event('stop'));
		this.#item.dispose();
		this.#item = undefined;
	}

	dispose() {
		this.stop();
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

		let image = await fetchImage(Uri.parse(metadata.artUrl, true));
		image &&= await resizeImage(image, artImageSize);

		this.#item.text =
			(metadata.playing ? '$(debug-start) ' : '$(debug-pause) ') +
			metadata.title;

		this.#item.tooltip = formatMetadata(metadata, image);
		this.#item.command = undefined;
	}
}
