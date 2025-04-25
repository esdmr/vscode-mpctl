import {ensureString, ensureArray} from '../type-utils.js';
import type {MetadataMap} from './types.js';

export type MprisMetadata = {
	title: string;
	artists: string[];
	album: string;
	artUrl: string;
	playing: boolean;
};

export function buildMprisMetadata(
	metadataMap: MetadataMap,
	playbackStatus: string,
): MprisMetadata {
	return {
		title: ensureString(metadataMap['xesam:title']),
		artists: ensureArray(metadataMap['xesam:artist'])
			.map((i) => ensureString(i))
			.filter(Boolean),
		album: ensureString(metadataMap['xesam:album']),
		artUrl: ensureString(metadataMap['mpris:artUrl']),
		playing: playbackStatus === 'Playing',
	};
}
