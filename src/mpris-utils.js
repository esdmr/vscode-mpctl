/** @import * as types from './types.js' */
const code = require('vscode');
const {sessionBus} = require('dbus-ts');
const {ensureString, ensureArray} = require('./type-utils.js');
const {blankImageUrl} = require('./image-utils.js');

/**
 * @param {types.MetadataMap} metadataMap
 * @param {string} playbackStatus
 * @returns {types.MprisMetadata}
 */
function buildMprisMetadata(metadataMap, playbackStatus) {
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

class MprisBusCache {
	/** @type {types.MprisMessageBus | undefined} */
	#bus;
	/** @type {string | undefined} */
	#service;
	/** @type {types.Interface<'org.freedesktop.DBus'> | undefined} */
	#dbusRoot;
	/** @type {types.Interface<'org.freedesktop.DBus.Properties'> | undefined} */
	#dbusProperties;
	/** @type {types.Interface<'org.mpris.MediaPlayer2.Player'> | undefined} */
	#mprisPlayer;
	/** @type {code.EventEmitter<void>} */
	#onServiceChanged = new code.EventEmitter();
	/** @type {types.PropertiesChangedHandler | undefined} */
	#propertiesChangedHandler;

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
		this.setService(service);
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

	/**
	 * @param {string | undefined} newService
	 */
	async setService(newService) {
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

	/**
	 * @param {types.PropertiesChangedHandler | undefined} handler
	 */
	async onPropertiesChanged(handler) {
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

	/**
	 * @param {string} service
	 */
	async getServiceName(service) {
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

	/**
	 * @param {'Next' | 'Previous' | 'Pause' | 'PlayPause' | 'Stop' | 'Play'} command
	 */
	async sendMprisCommand(command) {
		if (!this.#mprisPlayer) {
			await this.start();
		}

		if (!this.#mprisPlayer) {
			throw new Error('D-Bus service was not set yet');
		}

		await this.#mprisPlayer[command]();
	}
}

class MprisSinkCache {
	/** @type {types.MprisSink | undefined} */
	#sink;
	/** @type {types.Disposable | undefined} */
	#sinkStartHandler;
	/** @type {types.MprisMetadata | undefined} */
	#cachedMetadata;

	/**
	 * @param {types.MprisSink | undefined} sink
	 */
	setSink(sink) {
		this.#sinkStartHandler?.dispose();
		this.#sink = sink;

		this.#sinkStartHandler = sink?.onStart(() => {
			if (this.#cachedMetadata) sink.update(this.#cachedMetadata);
		});

		return this;
	}

	/**
	 * @param {MprisBusCache} bus
	 */
	async update(bus) {
		if (!bus.mprisPlayer) return;

		this.#cachedMetadata = buildMprisMetadata(
			await bus.mprisPlayer.Metadata,
			await bus.mprisPlayer.PlaybackStatus,
		);

		await this.#sink?.update(this.#cachedMetadata);
	}

	/**
	 * @param {MprisBusCache} bus
	 */
	bind(bus) {
		return this.update.bind(this, bus);
	}

	clear() {
		this.#cachedMetadata = undefined;
	}
}

class MprisListenerService {
	#bus;
	#sinkCache = new MprisSinkCache();
	/** @type {types.Disposable | undefined} */
	#serviceChangeHandler;

	/**
	 * @param {MprisBusCache} bus
	 */
	constructor(bus) {
		this.#bus = bus;
	}

	/**
	 * @param {types.MprisSink | undefined} sink
	 */
	setSink(sink) {
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

module.exports = {
	MprisBusCache,
	MprisListenerService,
};
