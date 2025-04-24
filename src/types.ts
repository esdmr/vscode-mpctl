import {type MessageBus, type DBusInterface} from 'dbus-ts';
import type {Interfaces} from '@dbus-types/dbus';

export type MetadataMap = Readonly<Record<string, unknown>>;
export type Playlist = readonly [unknown, string, string];
export type MaybePlaylist = readonly [
	unknown,
	readonly [unknown, string, string],
];

export type MediaPlayer2Root = {
	// CanQuit  b  Read only
	readonly CanQuit: Promise<boolean>;
	// CanSetFullscreen  b  Read only
	readonly CanSetFullscreen: Promise<boolean>;
	// CanRaise  b  Read only
	readonly CanRaise: Promise<boolean>;
	// HasTrackList  b  Read only
	readonly HasTrackList: Promise<boolean>;
	// Identity  s  Read only
	readonly Identity: Promise<string>;
	// DesktopEntry  s  Read only
	readonly DesktopEntry: Promise<string>;
	// SupportedUriSchemes  as  Read only
	readonly SupportedUriSchemes: Promise<readonly string[]>;
	// SupportedMimeTypes  as  Read only
	readonly SupportedMimeTypes: Promise<readonly string[]>;
	// Fullscreen  b  Read/Write
	get Fullscreen(): Promise<boolean>;
	set Fullscreen(value: boolean);

	// Raise  ()  →  nothing
	Raise(): Promise<void>;
	// Quit  ()  →  nothing
	Quit(): Promise<void>;
};

export type MediaPlayer2Player = {
	// PlaybackStatus  s (Playback_Status)  Read only
	readonly PlaybackStatus: Promise<string>;
	// Metadata  a{sv} (Metadata_Map)  Read only
	readonly Metadata: Promise<MetadataMap>;
	// Position  x (Time_In_Us)  Read only
	readonly Position: Promise<bigint>;
	// MinimumRate  d (Playback_Rate)  Read only
	readonly MinimumRate: Promise<number>;
	// MaximumRate  d (Playback_Rate)  Read only
	readonly MaximumRate: Promise<number>;
	// CanGoNext  b  Read only
	readonly CanGoNext: Promise<boolean>;
	// CanGoPrevious  b  Read only
	readonly CanGoPrevious: Promise<boolean>;
	// CanPlay  b  Read only
	readonly CanPlay: Promise<boolean>;
	// CanPause  b  Read only
	readonly CanPause: Promise<boolean>;
	// CanSeek  b  Read only
	readonly CanSeek: Promise<boolean>;
	// CanControl  b  Read only
	readonly CanControl: Promise<boolean>;
	// LoopStatus  s (Loop_Status)  Read/Write
	get LoopStatus(): Promise<string>;
	set LoopStatus(value: string);
	// Rate  d (Playback_Rate)  Read/Write
	get Rate(): Promise<number>;
	set Rate(value: number);
	// Shuffle  b  Read/Write
	get Shuffle(): Promise<boolean>;
	set Shuffle(value: boolean);
	// Volume  d (Volume)  Read/Write
	get Volume(): Promise<number>;
	set Volume(value: number);

	// Next  ()  →  nothing
	Next(): Promise<void>;
	// Previous  ()  →  nothing
	Previous(): Promise<void>;
	// Pause  ()  →  nothing
	Pause(): Promise<void>;
	// PlayPause  ()  →  nothing
	PlayPause(): Promise<void>;
	// Stop  ()  →  nothing
	Stop(): Promise<void>;
	// Play  ()  →  nothing
	Play(): Promise<void>;
	// Seek  (x: Offset)  →  nothing
	Seek(Offset: bigint): Promise<void>;
	// SetPosition  (o: TrackId, x: Position)  →  nothing
	SetPosition(TrackId: unknown, Position: bigint): Promise<void>;
	// OpenUri  (s: Uri)  →  nothing
	OpenUri(Uri: string): Promise<void>;

	// Seeked  (x: Position)
	Seeked(handler: (Position: bigint) => void): Promise<void>;
};

export type MediaPlayer2TrackList = {
	// Tracks  ao (Track_Id_List)  Read only
	readonly Tracks: Promise<readonly unknown[]>;
	// CanEditTracks  b  Read only
	readonly CanEditTracks: Promise<boolean>;

	// GetTracksMetadata  (ao: TrackIds)  →  aa{sv}: Metadata
	GetTracksMetadata(ao: readonly unknown[]): Promise<readonly MetadataMap[]>;
	// AddTrack  (s: Uri, o: AfterTrack, b: SetAsCurrent)  →  nothing
	AddTrack(
		Uri: string,
		AfterTrack: unknown,
		SetAsCurrent: boolean,
	): Promise<void>;
	// RemoveTrack  (o: TrackId)  →  nothing
	RemoveTrack(TrackId: unknown): Promise<void>;
	// GoTo  (o: TrackId)  →  nothing
	GoTo(TrackId: unknown): Promise<void>;

	// TrackListReplaced  (ao: Tracks, o: CurrentTrack)
	TrackListReplaced(
		handler: (Tracks: readonly unknown[], CurrentTrack: unknown) => void,
	): Promise<void>;
	// TrackAdded  (a{sv}: Metadata, o: AfterTrack)
	TrackAdded(
		handler: (Metadata: MetadataMap, AfterTrack: unknown) => void,
	): Promise<void>;
	// TrackRemoved  (o: TrackId)
	TrackRemoved(handler: (TrackId: unknown) => void): Promise<void>;
	// TrackMetadataChanged  (o: TrackId, a{sv}: Metadata)
	TrackMetadataChanged(
		handler: (TrackId: unknown, Metadata: MetadataMap) => void,
	): Promise<void>;
};

export type MediaPlayer2PlayLists = {
	// PlaylistCount  u  Read only
	readonly PlaylistCount: Promise<number>;
	// Orderings  as ( Playlist_Ordering_List)  Read only
	readonly Orderings: Promise<string[]>;
	// ActivePlaylist  (b(oss)) ( Maybe_Playlist)  Read only
	readonly ActivePlaylist: Promise<MaybePlaylist>;

	// ActivatePlaylist  (o: PlaylistId)  →  nothing
	ActivatePlaylist(PlaylistId: unknown): Promise<void>;
	// GetPlaylists  (u: Index, u: MaxCount, s: Order, b: ReverseOrder)  →  a(oss): Playlists
	GetPlaylists(
		Index: number,
		MaxCount: number,
		Order: string,
		ReverseOrder: boolean,
	): Promise<readonly Playlist[]>;

	// PlaylistChanged  ((oss): Playlist)
	PlaylistChanged(handler: (Playlist: Playlist) => void): void;
};

export type MediaPlayer2 = Interfaces & {
	'org.mpris.MediaPlayer2': MediaPlayer2Root;
	'org.mpris.MediaPlayer2.Player': MediaPlayer2Player;
	'org.mpris.MediaPlayer2.TrackList': MediaPlayer2TrackList;
	'org.mpris.MediaPlayer2.PlayLists': MediaPlayer2PlayLists;
};

export type MprisMessageBus = MessageBus<MediaPlayer2>;
export type Interface<S extends keyof MediaPlayer2 = never> = DBusInterface &
	MediaPlayer2[S];

export type ChangedProperties<T> = {
	readonly [K in keyof T]?: T[K] extends Promise<infer V> ? Awaited<V> : never;
};

export type PropertiesChangedHandler = (
	interfaceName: string,
	changedProperties: ChangedProperties<MediaPlayer2Player>,
	invalidatedProperties: readonly string[],
) => Promise<void>;
