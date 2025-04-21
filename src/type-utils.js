/**
 * @param {unknown} value
 */
function ensureString(value) {
	return typeof value === 'string' ? value : '';
}

/**
 * @param {unknown} value
 */
function ensureArray(value) {
	return Array.isArray(value) ? value : [];
}

module.exports = {ensureString, ensureArray};
