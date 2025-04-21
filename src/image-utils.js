/**
 * @see https://github.com/esdmr/notepadd/blob/fbd1e9e7b1a33b2ab72524704a57ac291c53bbf2/vscode-notepadd/src/command/export-to-latex.ts
 */
/** @import {Uri} from 'vscode' */
const {Buffer} = require('node:buffer');
const mimeSniffer = require('mime-sniffer');
const code = require('vscode');

const blankImageUrl = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

/**
 * @param {Uri} uri
 * @returns {Promise<string>}
 */
async function fetchImage(uri) {
	if (uri.scheme === 'http' || uri.scheme === 'https') {
		return uri.toString(true);
	}

	const content = await code.workspace.fs.readFile(uri);
	const buffer = Buffer.from(content);
	/** @type {string} */
	let mime;

	try {
		mime = await new Promise((resolve, reject) => {
			mimeSniffer.lookup(buffer, (error, info) => {
				if (error) {
					reject(error);
				} else {
					resolve(info.mime);
				}
			});
		});
	} catch (error) {
		console.error(
			'MPRIS Control: Unknown file extension:',
			uri.fsPath,
			error,
		);
		return blankImageUrl;
	}

	return `data:${mime};base64,${buffer.toString('base64')}`;
}

module.exports = {blankImageUrl, fetchImage};
