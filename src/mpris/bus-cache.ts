import process from 'node:process';
import {sessionBus} from 'dbus-ts';
import {TypedEventTarget} from 'typescript-event-target';
import type {
	MprisMessageBus,
	Interface,
	PropertiesChangedHandler,
} from './types.js';

export class MprisBusCache extends TypedEventTarget<{
	serviceChanged: Event;
}> {
	#bus: MprisMessageBus | undefined;
	#service: string | undefined;
	#dbusRoot: Interface<'org.freedesktop.DBus'> | undefined;
	#dbusProperties: Interface<'org.freedesktop.DBus.Properties'> | undefined;
	#mprisPlayer: Interface<'org.mpris.MediaPlayer2.Player'> | undefined;
	#propertiesChangedHandler: PropertiesChangedHandler | undefined;

	get service() {
		return this.#service;
	}

	get mprisPlayer() {
		return this.#mprisPlayer;
	}

	async start() {
		if (this.#bus && this.#service) return;

		this.#bus ??= await sessionBus();

		this.#dbusRoot = await this.#bus.getInterface(
			'org.freedesktop.DBus',
			'/org/freedesktop/DBus',
			'org.freedesktop.DBus',
		);

		await this.#dbusRoot.RequestName(
			`ir.esdmr.vscode_mpctl.pid_${process.pid}.vscode_mpctl`,
			3,
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

		this.dispatchTypedEvent('serviceChanged', new Event('serviceChanged'));
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
