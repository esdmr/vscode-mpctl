#!/usr/bin/env node
/** @import {MediaPlayer2} from './types.js' */
/** @import {MessageBus} from 'dbus-ts' */
const process = require('node:process');
const {sessionBus} = require('dbus-ts');
const {
	getMprisServices: findMprisService,
	listenToMpris,
} = require('./mpris-utils.js');

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

async function main() {
	/** @type {MessageBus<MediaPlayer2>} */
	const bus = await sessionBus();

	try {
		const [service] = await findMprisService(bus);

		if (!service) {
			return;
		}

		for await (const metadata of listenToMpris(bus, service)) {
			console.log('Changed.', metadata);
		}
	} finally {
		bus.connection.end();
	}
}
