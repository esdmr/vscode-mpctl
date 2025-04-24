import code from 'vscode';
import {sessionBus} from 'dbus-ts';
import {ensureString, ensureArray} from './type-utils.js';
import {blankImageUrl} from './image-utils.js';
import type {
	Interface,
	MetadataMap,
	MprisMessageBus,
	PropertiesChangedHandler,
} from './types.js';

export type MprisMetadata = {
	title: string;
	artists: string[];
	album: string;
	artUrl: string;
	playing: boolean;
};

function buildMprisMetadata(
	metadataMap: MetadataMap,
	playbackStatus: string,
): MprisMetadata {
	return {
		title: ensureString(metadataMap['xesam:title']),
		artists: ensureArray(metadataMap['xesam:artist'])
			.map((i) => ensureString(i))
			.filter(Boolean),
		album: ensureString(metadataMap['xesam:album']),
		artUrl: ensureString(metadataMap['mpris:artUrl']) || blankImageUrl,
		playing: playbackStatus === 'Playing',
	};
}

export class MprisBusCache {
	#bus: MprisMessageBus | undefined;
	#service: string | undefined;
	#dbusRoot: Interface<'org.freedesktop.DBus'> | undefined;
	#dbusProperties: Interface<'org.freedesktop.DBus.Properties'> | undefined;
	#mprisPlayer: Interface<'org.mpris.MediaPlayer2.Player'> | undefined;
	#propertiesChangedHandler: PropertiesChangedHandler | undefined;
	readonly #onServiceChanged = new code.EventEmitter<void>();

	get service() {
		return this.#service;
	}

	get mprisPlayer() {
		return this.#mprisPlayer;
	}

	get onServiceChanged() {
		return this.#onServiceChanged.event;
	}

	async start() {
		if (this.#bus && this.#service) return;

		this.#bus ??= await sessionBus();

		this.#dbusRoot = await this.#bus.getInterface(
			'org.freedesktop.DBus',
			'/org/freedesktop/DBus',
			'org.freedesktop.DBus',
		);

		const [service] = await this.getServices();
		await this.setService(service);
	}

	async stop() {
		if (!this.#bus) return;

		await this.setService(undefined);
		this.#dbusRoot = undefined;
		this.#bus.connection.end();
		this.#bus = undefined;
	}

	async asyncDispose() {
		await this.stop();
		this.#onServiceChanged.dispose();
		this.#propertiesChangedHandler = undefined;
	}

	async setService(newService: string | undefined) {
		if (!this.#bus) {
			await this.start();
		}

		if (!this.#bus) {
			throw new Error('D-Bus was not started yet');
		}

		if (this.#propertiesChangedHandler && this.#dbusProperties) {
			await this.#dbusProperties.removeListener(
				'PropertiesChanged',
				this.#propertiesChangedHandler,
			);
		}

		this.#service = newService;

		this.#dbusProperties = newService
			? await this.#bus.getInterface(
					newService,
					'/org/mpris/MediaPlayer2',
					'org.freedesktop.DBus.Properties',
				)
			: undefined;

		this.#mprisPlayer = newService
			? await this.#bus.getInterface(
					newService,
					'/org/mpris/MediaPlayer2',
					'org.mpris.MediaPlayer2.Player',
				)
			: undefined;

		if (this.#propertiesChangedHandler && this.#dbusProperties) {
			await this.#dbusProperties.addListener(
				'PropertiesChanged',
				this.#propertiesChangedHandler,
			);
		}

		this.#onServiceChanged.fire();
	}

	async onPropertiesChanged(handler: PropertiesChangedHandler | undefined) {
		if (this.#propertiesChangedHandler && this.#dbusProperties) {
			await this.#dbusProperties.removeListener(
				'PropertiesChanged',
				this.#propertiesChangedHandler,
			);
		}

		this.#propertiesChangedHandler = handler;

		if (handler && this.#dbusProperties) {
			await this.#dbusProperties.addListener('PropertiesChanged', handler);
		}
	}

	async getServices() {
		if (!this.#dbusRoot) {
			await this.start();
		}

		if (!this.#dbusRoot) {
			throw new Error('D-Bus was not started yet');
		}

		const [services] = await this.#dbusRoot.ListNames();

		return services.filter((service) =>
			service.startsWith('org.mpris.MediaPlayer2.'),
		);
	}

	async getServiceName(service: string) {
		if (!this.#bus) {
			await this.start();
		}

		if (!this.#bus) {
			throw new Error('D-Bus was not started yet');
		}

		const mprisRoot = await this.#bus.getInterface(
			service,
			'/org/mpris/MediaPlayer2',
			'org.mpris.MediaPlayer2',
		);

		return mprisRoot.Identity;
	}

	async sendMprisCommand(
		command: 'Next' | 'Previous' | 'Pause' | 'PlayPause' | 'Stop' | 'Play',
	) {
		if (!this.#mprisPlayer) {
			await this.start();
		}

		if (!this.#mprisPlayer) {
			throw new Error('D-Bus service was not set yet');
		}

		await this.#mprisPlayer[command]();
	}
}

export type MprisSink = {
	onStart(handler: () => void): code.Disposable;
	update(metadata: MprisMetadata): Promise<void>;
};

class MprisSinkCache {
	#sink: MprisSink | undefined;
	#sinkStartHandler: code.Disposable | undefined;
	#cachedMetadata: MprisMetadata | undefined;

	setSink(sink: MprisSink | undefined) {
		this.#sinkStartHandler?.dispose();
		this.#sink = sink;

		this.#sinkStartHandler = sink?.onStart(async () => {
			if (this.#cachedMetadata) await sink.update(this.#cachedMetadata);
		});

		return this;
	}

	async update(bus: MprisBusCache) {
		if (!bus.mprisPlayer) return;

		this.#cachedMetadata = buildMprisMetadata(
			await bus.mprisPlayer.Metadata,
			await bus.mprisPlayer.PlaybackStatus,
		);

		await this.#sink?.update(this.#cachedMetadata);
	}

	bind(bus: MprisBusCache) {
		return this.update.bind(this, bus);
	}

	clear() {
		this.#cachedMetadata = undefined;
	}
}

export class MprisListenerService {
	readonly #bus;
	readonly #sinkCache = new MprisSinkCache();
	#serviceChangeHandler: code.Disposable | undefined;

	constructor(bus: MprisBusCache) {
		this.#bus = bus;
	}

	setSink(sink: MprisSink | undefined) {
		this.#sinkCache.setSink(sink);
		return this;
	}

	async start() {
		if (this.#serviceChangeHandler) return;

		await this.#bus.onPropertiesChanged(this.#sinkCache.bind(this.#bus));

		this.#serviceChangeHandler = this.#bus.onServiceChanged(
			this.#sinkCache.bind(this.#bus),
		);

		await this.#bus.start();
	}

	async stop() {
		if (!this.#serviceChangeHandler) return;

		this.#serviceChangeHandler?.dispose();
		this.#serviceChangeHandler = undefined;

		await this.#bus.onPropertiesChanged(undefined);

		this.#sinkCache.clear();
	}

	async asyncDispose() {
		await this.stop();
		this.setSink(undefined);
	}
}
