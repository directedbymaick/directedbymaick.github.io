/**
 * Chargeur .env minimal (pas de dépendance) : lit `.env` à la racine du projet
 * et remplit process.env sans écraser les variables déjà définies.
 */
import fs from 'node:fs';
import path from 'node:path';

export function loadEnv(root = process.cwd()): void {
	const file = path.join(root, '.env');
	if (!fs.existsSync(file)) return;
	for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
		if (!m) continue;
		const [, key, raw] = m;
		if (process.env[key] !== undefined) continue;
		process.env[key] = raw.replace(/^["']|["']$/g, '');
	}
}
