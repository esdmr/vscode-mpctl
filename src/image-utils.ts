import {Buffer} from 'node:buffer';
import mimeSniffer from 'mime-sniffer';
import code from 'vscode';
import {Jimp} from 'jimp';

export function getAlignmentImage(width: number) {
	return `<br><img src="data:image/svg+xml,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22${width}%22%20height=%220%22/>" alt="">`;
}

export const blankImageUrl =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=';

export async function fetchImage(uri: code.Uri) {
	if (
		uri.scheme === 'http' ||
		uri.scheme === 'https' ||
		uri.scheme === 'data'
	) {
		return uri.toString(true);
	}

	const content = await code.workspace.fs.readFile(uri);
	const buffer = Buffer.from(content);
	let mime: string;

	try {
		mime = await new Promise((resolve, reject) => {
			mimeSniffer.lookup(buffer, (error, info) => {
				if (error) {
					reject(error as Error);
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

export async function resizeImage(
	image: string,
	width: number,
	height = width,
) {
	const jimp = await Jimp.read(image);
	jimp.resize({w: width, h: height});
	return jimp.getBase64('image/png');
}
