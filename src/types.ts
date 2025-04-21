type Object_Path = unknown;
type Variant = unknown;
type Int64 = bigint;
type Uint32 = number;

export type Track_Id = Object_Path;
export type Playback_Rate = number;
export type Volume = number;
export type Time_In_Us = Int64;
export type Playback_Status = string;
export type Loop_Status = string;
export type Metadata_Map = Record<string, Variant>;
export type Playlist_Id = Object_Path;
export type Uri = string;
export type Playlist_Ordering = string;
export type Playlist = [Object_Path, string, string];
export type Maybe_Playlist = [Object_Path, [Object_Path, string, string]];

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
	readonly PlaybackStatus: Promise<Playback_Status>;
	// Metadata  a{sv} (Metadata_Map)  Read only
	readonly Metadata: Promise<Readonly<Metadata_Map>>;
	// Position  x (Time_In_Us)  Read only
	readonly Position: Promise<Time_In_Us>;
	// MinimumRate  d (Playback_Rate)  Read only
	readonly MinimumRate: Promise<Playback_Rate>;
	// MaximumRate  d (Playback_Rate)  Read only
	readonly MaximumRate: Promise<Playback_Rate>;
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
	get LoopStatus(): Promise<Loop_Status>;
	set LoopStatus(value: Loop_Status);
	// Rate  d (Playback_Rate)  Read/Write
	get Rate(): Promise<Playback_Rate>;
	set Rate(value: Playback_Rate);
	// Shuffle  b  Read/Write
	get Shuffle(): Promise<boolean>;
	set Shuffle(value: boolean);
	// Volume  d (Volume)  Read/Write
	get Volume(): Promise<Volume>;
	set Volume(value: Volume);

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
	Seek(Offset: Int64): Promise<void>;
	// SetPosition  (o: TrackId, x: Position)  →  nothing
	SetPosition(TrackId: Object_Path, Position: Int64): Promise<void>;
	// OpenUri  (s: Uri)  →  nothing
	OpenUri(Uri: string): Promise<void>;

	// Seeked  (x: Position)
	Seeked(handler: (Position: Int64) => void): Promise<void>;
};

export type MediaPlayer2TrackList = {
	// Tracks  ao (Track_Id_List)  Read only
	readonly Tracks: Promise<readonly Track_Id[]>;
	// CanEditTracks  b  Read only
	readonly CanEditTracks: Promise<boolean>;

	// GetTracksMetadata  (ao: TrackIds)  →  aa{sv}: Metadata
	GetTracksMetadata(
		ao: readonly Track_Id[],
	): Promise<ReadonlyArray<Readonly<Metadata_Map>>>;
	// AddTrack  (s: Uri, o: AfterTrack, b: SetAsCurrent)  →  nothing
	AddTrack(
		Uri: string,
		AfterTrack: Object_Path,
		SetAsCurrent: boolean,
	): Promise<void>;
	// RemoveTrack  (o: TrackId)  →  nothing
	RemoveTrack(TrackId: Object_Path): Promise<void>;
	// GoTo  (o: TrackId)  →  nothing
	GoTo(TrackId: Object_Path): Promise<void>;

	// TrackListReplaced  (ao: Tracks, o: CurrentTrack)
	TrackListReplaced(
		handler: (
			Tracks: readonly Object_Path[],
			CurrentTrack: Object_Path,
		) => void,
	): Promise<void>;
	// TrackAdded  (a{sv}: Metadata, o: AfterTrack)
	TrackAdded(
		handler: (
			Metadata: Readonly<Metadata_Map>,
			AfterTrack: Object_Path,
		) => void,
	): Promise<void>;
	// TrackRemoved  (o: TrackId)
	TrackRemoved(handler: (TrackId: Object_Path) => void): Promise<void>;
	// TrackMetadataChanged  (o: TrackId, a{sv}: Metadata)
	TrackMetadataChanged(
		handler: (
			TrackId: Object_Path,
			Metadata: Readonly<Metadata_Map>,
		) => void,
	): Promise<void>;
};

export type MediaPlayer2PlayLists = {
	// PlaylistCount  u  Read only
	readonly PlaylistCount: Promise<Uint32>;
	// Orderings  as ( Playlist_Ordering_List)  Read only
	readonly Orderings: Promise<Playlist_Ordering[]>;
	// ActivePlaylist  (b(oss)) ( Maybe_Playlist)  Read only
	readonly ActivePlaylist: Promise<Maybe_Playlist>;

	// ActivatePlaylist  (o: PlaylistId)  →  nothing
	ActivatePlaylist(PlaylistId: Object_Path): Promise<void>;
	// GetPlaylists  (u: Index, u: MaxCount, s: Order, b: ReverseOrder)  →  a(oss): Playlists
	GetPlaylists(
		Index: Uint32,
		MaxCount: Uint32,
		Order: string,
		ReverseOrder: boolean,
	): Promise<readonly Playlist[]>;

	// PlaylistChanged  ((oss): Playlist)
	PlaylistChanged(handler: (Playlist: Playlist) => void): void;
};

export type MediaPlayer2 = {
	'org.mpris.MediaPlayer2': MediaPlayer2Root;
	'org.mpris.MediaPlayer2.Player': MediaPlayer2Player;
	'org.mpris.MediaPlayer2.TrackList': MediaPlayer2TrackList;
	'org.mpris.MediaPlayer2.PlayLists': MediaPlayer2PlayLists;
};

export type ChangedProperties<T> = {
	readonly [K in keyof T]?: T[K] extends Promise<infer V>
		? Awaited<V>
		: never;
};

export type MprisMetadata = {
	title: string;
	artists: string[];
	album: string;
	artUrl: string;
	playing: boolean;
};
