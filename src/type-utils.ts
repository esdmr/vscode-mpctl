export function ensureString(value: unknown) {
	return typeof value === 'string' ? value : '';
}

export function ensureArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}
