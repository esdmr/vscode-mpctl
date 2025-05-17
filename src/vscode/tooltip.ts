import {MarkdownString} from 'vscode';
import {getAlignmentImage} from '../image/alignment.js';
import type {MprisMetadata} from '../mpris/metadata.js';

const listFormat = new Intl.ListFormat('en');
const alignmentImage = getAlignmentImage(36);
export const artImageSize = 128;

export function formatMetadata(metadata: MprisMetadata, image: string) {
	const t = new MarkdownString('', true);

	t.isTrusted = true;
	t.supportHtml = true;

	if (image) {
		t.appendMarkdown(
			`<img src="${image}" alt="" width="${artImageSize}" height="${artImageSize}">\n\n`,
		);
	}

	t.appendMarkdown(`**\u{200B}`);
	t.appendText(metadata.title);
	t.appendMarkdown('\u{200B}**\n\n');

	if (metadata.artists.length > 0) {
		t.appendMarkdown('by *\u{200B}');

		t.appendText(
			listFormat.format(
				metadata.artists.length > 2
					? [metadata.artists[0], '…']
					: metadata.artists,
			),
		);

		t.appendMarkdown('\u{200B}*\n\n');
	}

	if (metadata.album) {
		t.appendMarkdown('from *\u{200B}');
		t.appendText(metadata.album);
		t.appendMarkdown('\u{200B}*\n\n');
	}

	t.appendMarkdown(
		`<table style="width: 128px"><tr><td align="center"><a href="command:mpctl.previous">$(debug-reverse-continue)</a>${alignmentImage}</td><td align="center"><a href="command:mpctl.play_pause">$(debug-start)</a>${alignmentImage}</td><td align="center"><a href="command:mpctl.next">$(debug-continue)</a>${alignmentImage}</td></tr></table>`,
	);

	return t;
}
