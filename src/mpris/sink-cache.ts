import type {TypedEventTarget} from 'typescript-event-target';
import type {MprisBusCache} from './bus-cache.js';
import {type MprisMetadata, buildMprisMetadata} from './metadata.js';

export type MprisSink = TypedEventTarget<{
	start: Event;
}> & {
	update(metadata: MprisMetadata): Promise<void>;
};
export class MprisSinkCache {
	readonly callback;
	#sink: MprisSink | undefined;
	#cachedMetadata: MprisMetadata | undefined;

	constructor(bus: MprisBusCache) {
		this.callback = async () => {
			if (!bus.mprisPlayer) return;

			this.#cachedMetadata = buildMprisMetadata(
				await bus.mprisPlayer.Metadata,
				await bus.mprisPlayer.PlaybackStatus,
			);

			await this.#sink?.update(this.#cachedMetadata);
		};
	}

	setSink(sink: MprisSink | undefined) {
		this.#sink?.removeEventListener('start', this.#onSinkStart);
		this.#sink = sink;
		this.#sink?.addEventListener('start', this.#onSinkStart);
		return this;
	}

	clear() {
		this.#cachedMetadata = undefined;
	}

	readonly #onSinkStart = async () => {
		if (this.#cachedMetadata) await this.#sink?.update(this.#cachedMetadata);
	};
}
