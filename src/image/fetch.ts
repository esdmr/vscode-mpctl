import {Buffer} from 'node:buffer';
import mimeSniffer from 'mime-sniffer';
import {workspace, type Uri} from 'vscode';

export async function fetchImage(uri: Uri) {
	if (
		uri.scheme === 'http' ||
		uri.scheme === 'https' ||
		uri.scheme === 'data'
	) {
		return uri.toString(true);
	}

	const content = await workspace.fs.readFile(uri);
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
		return '';
	}

	return `data:${mime};base64,${buffer.toString('base64')}`;
}
