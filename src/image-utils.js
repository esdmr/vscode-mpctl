/**
 * @see https://github.com/esdmr/notepadd/blob/fbd1e9e7b1a33b2ab72524704a57ac291c53bbf2/vscode-notepadd/src/command/export-to-latex.ts
 */
/** @import {Uri} from 'vscode' */
const {Buffer} = require('node:buffer');
const mimeSniffer = require('mime-sniffer');
const code = require('vscode');
const jimp = require('jimp');

/**
 * @param {number} width
 */
function getAlignmentImage(width) {
	return `<br><img src="data:image/svg+xml,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22${width}%22%20height=%220%22/>" alt="">`;
}

const blankImageUrl =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=';

/**
 * @param {Uri} uri
 * @returns {Promise<string>}
 */
async function fetchImage(uri) {
	if (
		uri.scheme === 'http' ||
		uri.scheme === 'https' ||
		uri.scheme === 'data'
	) {
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
		console.error('MPRIS Control: Unknown file extension:', uri.fsPath, error);
		return blankImageUrl;
	}

	return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * @param {string} image
 * @param {number} width
 * @param {number} [height=width]
 */
async function resizeImage(image, width, height = width) {
	const jimpImage = await jimp.Jimp.read(image);
	jimpImage.resize({w: width, h: height});
	return jimpImage.getBase64('image/png');
}

module.exports = {
	blankImageUrl,
	getAlignmentImage,
	fetchImage,
	resizeImage,
};
