import { readdirSync, readFileSync } from 'node:fs';
const rows: string[] = [];
for (const f of readdirSync('cards').filter((x) => x.endsWith('.json'))) {
	const c = JSON.parse(readFileSync(`cards/${f}`, 'utf8'));
	rows.push(
		`${c.id} | ${c.faction} | ${c.kind} | ${c.cost} | ${c.attack ?? '-'}/${c.health ?? '-'} | ${c.rarity} | ${c.name} | ${(c.text ?? '').slice(0, 90)}${c.prononcer ? ` | PRONONCER(${c.prononcer.cost}): ${c.prononcer.text.slice(0, 60)}` : ''}`
	);
}
rows.sort();
console.log(rows.join('\n'));
