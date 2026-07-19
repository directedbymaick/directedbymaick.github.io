<script lang="ts" module>
	/* Sigils de faction vectorisés d'après les logos générés (tests/…/logo factions).
	   Géométrie paramétrique : nette à toutes les tailles, stylable en dégradé. */

	const rad = (a: number) => (a * Math.PI) / 180;
	const px = (a: number, r: number, cx = 60, cy = 60) =>
		`${(cx + r * Math.cos(rad(a))).toFixed(2)} ${(cy + r * Math.sin(rad(a))).toFixed(2)}`;
	const arc = (a0: number, a1: number, r: number, cx = 60, cy = 60) =>
		`M ${px(a0, r, cx, cy)} A ${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${px(a1, r, cx, cy)}`;

	/** Couronne de rayons effilés (halo Vasar, soleil Velar). */
	function rays(n: number, r0: number, rShort: number, rLong: number, wShort: number, wLong: number) {
		let d = '';
		for (let i = 0; i < n; i++) {
			const a = rad((i / n) * 360 - 90);
			const long = i % 2 === 0;
			const r1 = long ? rLong : rShort;
			const w = long ? wLong : wShort;
			const cos = Math.cos(a), sin = Math.sin(a);
			d += `M ${(60 + cos * r0 - sin * w).toFixed(2)} ${(60 + sin * r0 + cos * w).toFixed(2)} L ${(60 + cos * r1).toFixed(2)} ${(60 + sin * r1).toFixed(2)} L ${(60 + cos * r0 + sin * w).toFixed(2)} ${(60 + sin * r0 - cos * w).toFixed(2)} Z `;
		}
		return d;
	}

	const VASAR_RAYS = rays(36, 45, 53, 58, 1.3, 1.3);
	const VELAR_RAYS = rays(24, 37, 50, 59, 2.5, 3.2);
	/* anneau brisé en bas + maillon qui tombe */
	const EXAR_RING = arc(112, 428, 42);
	const EXAR_LINK = arc(-60, 240, 8, 57, 103);
	/* croissant qui berce la syllabe */
	const ESHAR_CRESCENT =
		'M 20 66 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0 Z M 24 58 a 36 36 0 1 0 72 0 a 36 36 0 1 0 -72 0 Z';
	/* cercle suturé : arcs interrompus haut/bas + demi-disque */
	const MORAR_ARC_R = arc(-83, 83, 44);
	const MORAR_ARC_L = arc(97, 263, 44);
	const MORAR_HALF = 'M 60 21 A 39 39 0 0 0 60 99 Z';
	const MORAR_STITCH = [36, 48, 60, 72, 84]
		.map((y) => `M 55 ${y - 4} L 65 ${y + 4} M 55 ${y + 4} L 65 ${y - 4}`)
		.join(' ');

	/* Dégradés « métal précieux » : bandes chromées, reflet spéculaire, teinte de faction. */
	const STOPS: Record<string, string[]> = {
		vasar: ['#fff8dd', '#f3dd9a', '#c9a445', '#7c5c16', '#e9c96a', '#fff3c9'],
		exar: ['#ffb3a6', '#e84a55', '#b3273a', '#4e0810', '#d9384a', '#ff8f7e'],
		eshar: ['#e8d9ff', '#b394e8', '#8d6cb8', '#3e2f78', '#7fb0ff', '#d6b9ff'],
		morar: ['#f4fbff', '#c4dff2', '#8fb4d9', '#476e94', '#a9d3f0', '#e6f4ff'],
		velar: ['#fff6c9', '#ffd977', '#f0a626', '#8a4d08', '#ffbe45', '#ffefb0']
	};
	const OFFSETS = [0, 0.2, 0.42, 0.6, 0.78, 1];
</script>

<script lang="ts">
	let { faction, flat = false }: { faction: string; flat?: boolean } = $props();
	const uid = $props.id();
	const stops = $derived(STOPS[faction] ?? STOPS.vasar);
	const paint = $derived(flat ? 'currentColor' : `url(#${uid}-g)`);
</script>

<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
	{#if !flat}
		<defs>
			<linearGradient id="{uid}-g" x1="0" y1="0" x2="1" y2="1">
				{#each stops as c, i (i)}
					<stop offset={OFFSETS[i]} stop-color={c} />
				{/each}
			</linearGradient>
		</defs>
	{/if}

	{#if faction === 'exar'}
		<path d={EXAR_RING} fill="none" stroke={paint} stroke-width="6.5" />
		<path d={EXAR_LINK} fill="none" stroke={paint} stroke-width="3.4" stroke-linecap="round" />
		<path d="M44.5 92.5 l6.5 -3.4 l-2 6.2 Z M75.5 91.5 l-6.5 -3.4 l2 6.2 Z" fill={paint} />
	{:else if faction === 'eshar'}
		<path d={ESHAR_CRESCENT} fill-rule="evenodd" fill={paint} />
		<circle cx="60" cy="47" r="10" fill={paint} />
	{:else if faction === 'morar'}
		<path d={MORAR_ARC_R} fill="none" stroke={paint} stroke-width="2.4" />
		<path d={MORAR_ARC_L} fill="none" stroke={paint} stroke-width="2.4" />
		<path d={MORAR_HALF} fill={paint} />
		<path d={MORAR_STITCH} fill="none" stroke="#0a0a0d" stroke-width="3.6" stroke-linecap="round" opacity="0.55" />
		<path d={MORAR_STITCH} fill="none" stroke={paint} stroke-width="1.8" stroke-linecap="round" />
	{:else if faction === 'velar'}
		<path d={VELAR_RAYS} fill={paint} />
		<circle cx="60" cy="60" r="34.5" fill="none" stroke={paint} stroke-width="2.4" />
		<circle cx="60" cy="60" r="30" fill={paint} />
	{:else}
		<path d={VASAR_RAYS} fill={paint} />
		<circle cx="60" cy="60" r="40.5" fill="none" stroke={paint} stroke-width="2.6" />
		<circle cx="60" cy="60" r="35.5" fill="none" stroke={paint} stroke-width="1.2" />
	{/if}
</svg>

<style>
	svg {
		width: 1em;
		height: 1em;
		display: inline-block;
		vertical-align: -0.12em;
	}
</style>
