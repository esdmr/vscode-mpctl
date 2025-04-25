import {Jimp} from 'jimp';

export async function resizeImage(
	image: string,
	width: number,
	height = width,
) {
	const jimp = await Jimp.read(image);
	jimp.resize({w: width, h: height});
	return jimp.getBase64('image/png');
}
