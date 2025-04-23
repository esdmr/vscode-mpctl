/** @import {MprisMetadata} from './types.js' */
const code = require('vscode');
const {getAlignmentImage} = require('./image-utils.js');

const listFormat = new Intl.ListFormat('en');
const alignmentImage = getAlignmentImage(36);
const artImageSize = 128;

/**
 * @param {MprisMetadata} metadata
 * @param {string} image
 */
function formatMetadata(metadata, image) {
	const t = new code.MarkdownString('', true);

	t.isTrusted = true;
	t.supportHtml = true;

	t.appendMarkdown(
		`<img src="${image}" alt="" width="${artImageSize}" height="${artImageSize}">\n\n**\u{200B}`,
	);
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

		t.appendMarkdown('\u{200B}*\n');
	}

	if (metadata.album) {
		t.appendMarkdown('from *\u{200B}');
		t.appendText(metadata.album);
		t.appendMarkdown('\u{200B}*\n');
	}

	t.appendMarkdown(
		`\n<table style="width: 128px"><tr><td align="center"><a href="command:mprisctl.previous">$(debug-reverse-continue)</a>${alignmentImage}</td>`,
	);

	if (metadata.playing) {
		t.appendMarkdown(
			`<td align="center"><a href="command:mprisctl.play_pause">$(debug-pause)</a>${alignmentImage}</td>`,
		);
	} else {
		t.appendMarkdown(
			`<td align="center"><a href="command:mprisctl.play_pause">$(debug-start)</a>${alignmentImage}</td>`,
		);
	}

	t.appendMarkdown(
		`<td align="center"><a href="command:mprisctl.next">$(debug-continue)</a>${alignmentImage}</td></tr></table>`,
	);

	return t;
}

module.exports = {artImageSize, formatMetadata};
