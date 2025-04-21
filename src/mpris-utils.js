/** @import {ChangedProperties, MediaPlayer2, MediaPlayer2Player, Metadata_Map, MprisMetadata, Playback_Status} from './types.js' */
/** @import {DBusInterface, MessageBus} from 'dbus-ts' */
const {ensureString, ensureArray} = require('./type-utils.js');
const {blankImageUrl} = require('./image-utils.js');

/**
 * @param {MessageBus<{}>} bus
 */
async function getMprisServices(bus) {
	const dbusInterface = await bus.getInterface(
		'org.freedesktop.DBus',
		'/org/freedesktop/DBus',
		'org.freedesktop.DBus',
	);
	const [services] = await dbusInterface.ListNames();

	return services.filter((service) =>
		service.startsWith('org.mpris.MediaPlayer2.'),
	);
}

/**
 * @param {Readonly<Metadata_Map>} metadata
 * @param {Playback_Status} playbackStatus
 * @returns {MprisMetadata}
 */
function buildMprisMetadata(metadata, playbackStatus) {
	return {
		title: ensureString(metadata['xesam:title']),
		artists: ensureArray(metadata['xesam:artist'])
			.map((i) => ensureString(i))
			.filter(Boolean),
		album: ensureString(metadata['xesam:album']),
		artUrl: ensureString(metadata['mpris:artUrl']) || blankImageUrl,
		playing: playbackStatus === 'Playing',
	};
}

/**
 * @param {MessageBus<MediaPlayer2>} bus
 * @param {string} service
 */
async function getMprisMetadata(bus, service) {
	const player = await bus.getInterface(
		service,
		'/org/mpris/MediaPlayer2',
		'org.mpris.MediaPlayer2.Player',
	);

	const metadata = await player.Metadata;
	console.debug('MPRIS metadata:', metadata);

	const playbackStatus = await player.PlaybackStatus;
	console.debug('MPRIS playback status:', playbackStatus);

	return buildMprisMetadata(metadata, playbackStatus);
}

/**
 * @param {MessageBus<MediaPlayer2>} bus
 * @param {string} service
 * @param {'Next' | 'Previous' | 'Pause' | 'PlayPause' | 'Stop' | 'Play'} command
 */
async function sendMprisCommand(bus, service, command) {
	const player = await bus.getInterface(
		service,
		'/org/mpris/MediaPlayer2',
		'org.mpris.MediaPlayer2.Player',
	);

	await player[command]();
}

/**
 * @param {MessageBus<MediaPlayer2>} bus
 * @param {string} service
 * @returns {ReadableStream<MprisMetadata>}
 */
function listenToMpris(bus, service) {
	/** @type {DBusInterface} */
	let properties;

	/** @type {(interfaceName: string, changedProperties: ChangedProperties<MediaPlayer2Player>, invalidatedProperties: readonly string[]) => void} */
	let callback;

	return new ReadableStream({
		async start(controller) {
			const player = await bus.getInterface(
				service,
				'/org/mpris/MediaPlayer2',
				'org.mpris.MediaPlayer2.Player',
			);

			properties = await bus.getInterface(
				service,
				'/org/mpris/MediaPlayer2',
				'org.freedesktop.DBus.Properties',
			);

			let metadata = await player.Metadata;
			let playbackStatus = await player.PlaybackStatus;

			callback = (
				_interfaceName,
				changedProperties,
				_invalidatedProperties,
			) => {
				if (changedProperties.Metadata) {
					metadata = changedProperties.Metadata;
				}

				if (changedProperties.PlaybackStatus) {
					playbackStatus = changedProperties.PlaybackStatus;
				}

				if (
					changedProperties.Metadata ||
					changedProperties.PlaybackStatus
				) {
					controller.enqueue(
						buildMprisMetadata(metadata, playbackStatus),
					);
				}
			};

			await properties.addListener('PropertiesChanged', callback);
			controller.enqueue(buildMprisMetadata(metadata, playbackStatus));
		},
		async cancel() {
			await properties.removeListener('PropertiesChanged', callback);
		},
	});
}

module.exports = {
	getMprisServices,
	getMprisMetadata,
	sendMprisCommand,
	listenToMpris,
};
