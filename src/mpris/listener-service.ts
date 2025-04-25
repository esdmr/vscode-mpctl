import type {MprisBusCache} from './bus-cache.js';
import {MprisSinkCache, type MprisSink} from './sink-cache.js';

export class MprisListenerService {
	readonly #bus;
	readonly #sinkCache;
	#listening = false;

	constructor(bus: MprisBusCache) {
		this.#bus = bus;
		this.#sinkCache = new MprisSinkCache(bus);
	}

	setSink(sink: MprisSink | undefined) {
		this.#sinkCache.setSink(sink);
		return this;
	}

	async start() {
		if (this.#listening) return;

		this.#listening = true;
		this.#bus.addEventListener('serviceChanged', this.#sinkCache.callback);

		await this.#bus.onPropertiesChanged(this.#sinkCache.callback);

		await this.#bus.start();
	}

	async stop() {
		if (!this.#listening) return;

		this.#listening = false;
		this.#bus.removeEventListener('serviceChanged', this.#sinkCache.callback);

		await this.#bus.onPropertiesChanged(undefined);

		this.#sinkCache.clear();
	}

	async asyncDispose() {
		await this.stop();
		this.setSink(undefined);
	}
}
