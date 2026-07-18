<script lang="ts">
	import { getCard } from '$lib/cards';

	// Une seule carte, quatre décors : comparaison à armes égales.
	const c = getCard('doran')!;
	const PRON = { cost: 3, text: 'Exilez une Relique adverse.' };
</script>

<svelte:head>
	<title>Lab — Décors Expelled</title>
</svelte:head>

<header class="hero">
	<p class="kicker">Lab · Exploration</p>
	<h1>Quatre décors</h1>
	<p class="tagline">
		Même carte, même art, mêmes dimensions — seul le décor change. Dis-moi lequel te parle
		(ou ce qu'il faut croiser).
	</p>
</header>

<div class="board">
	<!-- ============ V1 : L'AURÉOLE ============ -->
	<section class="variant">
		<div class="mock v1">
			<img src={c.art} alt={c.name} />
			<div class="v1-scrim"></div>
			<span class="v1-cost"><i class="v1-halo"></i>{c.cost}</span>
			<span class="v1-sigil">◯</span>
			<div class="v1-panel">
				<h3 class="v1-name">{c.name}</h3>
				<span class="v1-rule"></span>
				<p class="v1-type">Être · Vasar</p>
				<p class="v1-text">{c.text}</p>
				<p class="v1-pron"><span>◌ Prononcer {PRON.cost}</span> {PRON.text}</p>
				<p class="v1-flavor">{c.flavor}</p>
				<div class="v1-stats">
					<span class="v1-stat">{c.attack}<small>ATQ</small></span>
					<span class="v1-gem"></span>
					<span class="v1-stat"><small>INT</small>{c.health}</span>
				</div>
			</div>
		</div>
		<h2>1 · L'Auréole</h2>
		<p>
			Zéro boîte, zéro badge. L'auréole flotte <em>au-dessus</em> du coût, comme sur une tête —
			penchée, lumineuse. Le reste est de la typographie nue sur l'image. Le Prononcer porte
			l'auréole vide ◌.
		</p>
	</section>

	<!-- ============ V2 : LE CARTEL ============ -->
	<section class="variant">
		<div class="mock v2">
			<img src={c.art} alt={c.name} />
			<span class="v2-cost">{c.cost}</span>
			<span class="v2-sigil">◯</span>
			<div class="v2-cartel">
				<h3 class="v2-name">{c.name}</h3>
				<p class="v2-type">Être · Vasar — Prismatique</p>
				<span class="v2-rule"></span>
				<p class="v2-text">{c.text}</p>
				<p class="v2-pron"><span>◌ Prononcer {PRON.cost}</span> {PRON.text}</p>
				<p class="v2-flavor">{c.flavor}</p>
				<div class="v2-stats">
					<span>{c.attack} <small>ATQ</small></span>
					<span><small>INT</small> {c.health}</span>
				</div>
			</div>
		</div>
		<h2>2 · Le Cartel</h2>
		<p>
			Le cartel de musée : une plaque ivoire posée sur l'œuvre, texte sombre, filet d'or.
			Valeur inversée — la seule carte claire du marché. Très Altered, très luxe éditorial.
		</p>
	</section>

	<!-- ============ V3 : LA TRANCHE D'OR ============ -->
	<section class="variant">
		<div class="mock v3">
			<img src={c.art} alt={c.name} />
			<div class="v3-scrim"></div>
			<i class="v3-frame"></i>
			<span class="v3-cost">{c.cost}</span>
			<span class="v3-sigil">◯</span>
			<div class="v3-panel">
				<h3 class="v3-name">{c.name}</h3>
				<p class="v3-type">Être · Vasar</p>
				<p class="v3-text">{c.text}</p>
				<p class="v3-pron"><span>◌ {PRON.cost}</span> {PRON.text}</p>
				<p class="v3-flavor">{c.flavor}</p>
			</div>
			<span class="v3-atq">{c.attack}</span>
			<span class="v3-int">{c.health}</span>
		</div>
		<h2>3 · La Tranche d'or</h2>
		<p>
			Un seul filet d'or continu, incrusté dans la carte comme une tranche de livre relié. Le
			coût et les stats sont <em>posés sur le filet</em> — la ligne s'interrompt pour eux.
			Bijouterie pure, aucun autre ornement.
		</p>
	</section>

	<!-- ============ V4 : L'ÉCLIPSE ============ -->
	<section class="variant">
		<div class="mock v4">
			<img src={c.art} alt={c.name} />
			<div class="v4-scrim"></div>
			<span class="v4-cost"><i></i>{c.cost}</span>
			<span class="v4-sigil">◯</span>
			<div class="v4-panel">
				<div class="v4-glow"></div>
				<h3 class="v4-name">{c.name}</h3>
				<p class="v4-type">Être · Vasar</p>
				<p class="v4-text">{c.text}</p>
				<p class="v4-pron"><span>◌ Prononcer {PRON.cost}</span> {PRON.text}</p>
				<div class="v4-stats">
					<span>{c.attack}<small>ATQ</small></span>
					<span><small>INT</small>{c.health}</span>
				</div>
			</div>
		</div>
		<h2>4 · L'Éclipse</h2>
		<p>
			La lumière vient de derrière : le nom est nimbé d'un halo doux, comme une tête devant un
			disque de lumière. Le coût est cerclé d'un croissant — un anneau éclipsé, jamais fermé.
		</p>
	</section>
</div>

<style>
	.hero {
		margin: 4rem 0 3rem;
	}
	.kicker {
		margin: 0 0 1rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.3em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.4);
	}
	h1 {
		margin: 0;
		font-weight: 800;
		font-size: clamp(2.6rem, 6vw, 4.2rem);
		letter-spacing: -0.03em;
	}
	.tagline {
		margin: 1.2rem 0 0;
		max-width: 60ch;
		color: rgba(242, 240, 234, 0.55);
	}

	.board {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 3rem 2rem;
	}
	.variant h2 {
		margin: 1.4rem 0 0.5rem;
		font-size: 1.05rem;
		font-weight: 650;
	}
	.variant > p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.55;
		color: rgba(242, 240, 234, 0.55);
		max-width: 40ch;
	}

	/* ---------- coquille commune ---------- */
	.mock {
		position: relative;
		width: 300px;
		max-width: 100%;
		aspect-ratio: 63 / 88;
		container-type: inline-size;
		border-radius: 4.6cqw;
		overflow: hidden;
		background: #0c0d12;
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.55);
		user-select: none;
	}
	.mock > img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 12%;
	}

	/* ============ V1 : L'AURÉOLE ============ */
	.v1-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(10, 10, 14, 0.32) 0%, transparent 20%, transparent 44%, rgba(8, 9, 13, 0.9) 72%, rgba(6, 7, 10, 0.97) 100%);
	}
	.v1-cost {
		position: absolute;
		top: 5.4cqw;
		left: 5cqw;
		font-family: Cinzel, Georgia, serif;
		font-size: 8.6cqw;
		font-weight: 700;
		line-height: 1;
		color: #f5edd8;
		text-shadow: 0 0.4cqw 1.4cqw rgba(0, 0, 0, 0.85);
	}
	.v1-halo {
		position: absolute;
		left: 50%;
		top: -3.4cqw;
		width: 9.5cqw;
		height: 3cqw;
		transform: translateX(-50%) rotate(-9deg);
		border-radius: 50%;
		border: 0.45cqw solid rgba(232, 200, 118, 0.95);
		border-bottom-color: rgba(232, 200, 118, 0.35);
		filter: blur(0.35px) drop-shadow(0 0 2.4cqw rgba(201, 164, 69, 0.8));
	}
	.v1-sigil {
		position: absolute;
		top: 4.6cqw;
		right: 5cqw;
		font-size: 5cqw;
		color: rgba(242, 240, 234, 0.75);
		text-shadow: 0 0 2cqw rgba(201, 164, 69, 0.6), 0 0.3cqw 0.8cqw rgba(0, 0, 0, 0.6);
	}
	.v1-panel {
		position: absolute;
		inset: auto 0 0;
		padding: 0 6cqw 5.4cqw;
		text-align: center;
		color: #ece9e0;
	}
	.v1-name {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 5.4cqw;
		font-weight: 700;
		text-shadow: 0 0.4cqw 1.4cqw rgba(0, 0, 0, 0.9);
	}
	.v1-rule {
		display: block;
		width: 34cqw;
		height: 1px;
		margin: 1.6cqw auto;
		background: linear-gradient(90deg, transparent, #c9a445 30%, #f2d98a 50%, #c9a445 70%, transparent);
	}
	.v1-type {
		margin: 0 0 2.2cqw;
		font-size: 2.6cqw;
		font-weight: 600;
		letter-spacing: 0.34em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.55);
	}
	.v1-text {
		margin: 0;
		font-size: 3.4cqw;
		line-height: 1.4;
	}
	.v1-pron {
		margin: 1.6cqw 0 0;
		font-size: 3.2cqw;
		line-height: 1.4;
	}
	.v1-pron span {
		font-family: Cinzel, Georgia, serif;
		font-size: 2.8cqw;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #e2c069;
		margin-right: 1cqw;
	}
	.v1-flavor {
		margin: 1.8cqw 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 3.4cqw;
		line-height: 1.3;
		color: rgba(236, 232, 225, 0.6);
	}
	.v1-stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 3cqw;
	}
	.v1-stat {
		display: flex;
		align-items: baseline;
		gap: 1.2cqw;
		font-family: Cinzel, Georgia, serif;
		font-size: 6cqw;
		font-weight: 700;
		color: #f5edd8;
	}
	.v1-stat small {
		font-size: 2.2cqw;
		letter-spacing: 0.26em;
		color: rgba(242, 240, 234, 0.45);
	}
	.v1-gem {
		width: 2.6cqw;
		height: 2.6cqw;
		border-radius: 50%;
		background: conic-gradient(#c87a8c, #d2b46e, #78c8a0, #6ea0d2, #aa78d2, #c87a8c);
		box-shadow: 0 0 2cqw rgba(200, 160, 220, 0.6);
	}

	/* ============ V2 : LE CARTEL ============ */
	.v2-cost {
		position: absolute;
		top: 0;
		left: 6.5cqw;
		padding: 2.8cqw 3cqw 1.8cqw;
		background: #efe9dc;
		color: #16130c;
		font-family: Cinzel, Georgia, serif;
		font-size: 6.4cqw;
		font-weight: 700;
		line-height: 1;
		border-radius: 0 0 1.4cqw 1.4cqw;
		box-shadow: 0 0.6cqw 1.6cqw rgba(0, 0, 0, 0.45), inset 0 -1px 0 #c9a445;
	}
	.v2-sigil {
		position: absolute;
		top: 4.6cqw;
		right: 5cqw;
		font-size: 5cqw;
		color: #efe9dc;
		text-shadow: 0 0.3cqw 0.8cqw rgba(0, 0, 0, 0.6);
	}
	.v2-cartel {
		position: absolute;
		left: 5cqw;
		right: 5cqw;
		bottom: 5cqw;
		padding: 3.2cqw 4cqw 3cqw;
		background: linear-gradient(180deg, #f2ecdf 0%, #e7dfcd 100%);
		color: #1a160d;
		border-radius: 1.2cqw;
		box-shadow:
			0 1cqw 3cqw rgba(0, 0, 0, 0.5),
			inset 0 0 0 1px rgba(201, 164, 69, 0.55),
			inset 0 0 0 2.5px #f2ecdf,
			inset 0 0 0 3.5px rgba(201, 164, 69, 0.3);
	}
	.v2-name {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 4.6cqw;
		font-weight: 700;
	}
	.v2-type {
		margin: 0.6cqw 0 0;
		font-size: 2.4cqw;
		font-weight: 600;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: #8a7a52;
	}
	.v2-rule {
		display: block;
		height: 1px;
		margin: 2cqw 0;
		background: linear-gradient(90deg, #c9a445, rgba(201, 164, 69, 0.15));
	}
	.v2-text {
		margin: 0;
		font-size: 3.2cqw;
		line-height: 1.4;
	}
	.v2-pron {
		margin: 1.4cqw 0 0;
		font-size: 3cqw;
		line-height: 1.4;
	}
	.v2-pron span {
		font-family: Cinzel, Georgia, serif;
		font-size: 2.6cqw;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #96731e;
		margin-right: 1cqw;
	}
	.v2-flavor {
		margin: 1.6cqw 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 3.2cqw;
		line-height: 1.3;
		color: #6d6350;
	}
	.v2-stats {
		display: flex;
		justify-content: space-between;
		margin-top: 2.2cqw;
		font-family: Cinzel, Georgia, serif;
		font-size: 4.6cqw;
		font-weight: 700;
	}
	.v2-stats small {
		font-size: 2cqw;
		letter-spacing: 0.24em;
		color: #8a7a52;
	}

	/* ============ V3 : LA TRANCHE D'OR ============ */
	.v3-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(10, 10, 14, 0.25) 0%, transparent 22%, transparent 48%, rgba(7, 8, 12, 0.93) 74%, rgba(6, 7, 10, 0.98) 100%);
	}
	.v3-frame {
		position: absolute;
		inset: 3.6cqw;
		border: 1px solid rgba(201, 164, 69, 0.75);
		border-radius: 2.4cqw;
		pointer-events: none;
		box-shadow: 0 0 3cqw rgba(201, 164, 69, 0.12), inset 0 0 3cqw rgba(201, 164, 69, 0.08);
	}
	/* posés SUR le filet : fond sombre local qui interrompt la ligne */
	.v3-cost {
		position: absolute;
		top: 3.6cqw;
		left: 9cqw;
		transform: translateY(-50%);
		padding: 0 2.2cqw;
		background: rgba(10, 10, 14, 0.85);
		font-family: Cinzel, Georgia, serif;
		font-size: 6.6cqw;
		font-weight: 700;
		color: #e8c876;
		text-shadow: 0 0 2.4cqw rgba(201, 164, 69, 0.5);
	}
	.v3-sigil {
		position: absolute;
		top: 3.6cqw;
		right: 9cqw;
		transform: translateY(-50%);
		padding: 0 2cqw;
		background: rgba(10, 10, 14, 0.85);
		font-size: 4.6cqw;
		color: rgba(242, 240, 234, 0.8);
	}
	.v3-panel {
		position: absolute;
		inset: auto 8.5cqw 9cqw;
		text-align: center;
		color: #ece9e0;
	}
	.v3-name {
		margin: 0;
		font-family: Cinzel, Georgia, serif;
		font-size: 5cqw;
		font-weight: 700;
		color: #f0e4c2;
		text-shadow: 0 0.4cqw 1.4cqw rgba(0, 0, 0, 0.9);
	}
	.v3-type {
		margin: 0.8cqw 0 2cqw;
		font-size: 2.5cqw;
		font-weight: 600;
		letter-spacing: 0.34em;
		text-transform: uppercase;
		color: rgba(201, 164, 69, 0.75);
	}
	.v3-text {
		margin: 0;
		font-size: 3.3cqw;
		line-height: 1.42;
	}
	.v3-pron {
		margin: 1.4cqw 0 0;
		font-size: 3.1cqw;
	}
	.v3-pron span {
		font-family: Cinzel, Georgia, serif;
		font-weight: 700;
		color: #e2c069;
		letter-spacing: 0.1em;
	}
	.v3-flavor {
		margin: 1.8cqw 0 0;
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-style: italic;
		font-size: 3.3cqw;
		color: rgba(236, 232, 225, 0.58);
	}
	.v3-atq,
	.v3-int {
		position: absolute;
		bottom: 3.6cqw;
		transform: translateY(50%);
		padding: 0 2.2cqw;
		background: rgba(10, 10, 14, 0.85);
		font-family: Cinzel, Georgia, serif;
		font-size: 5.6cqw;
		font-weight: 700;
		color: #f5edd8;
	}
	.v3-atq {
		left: 9cqw;
	}
	.v3-int {
		right: 9cqw;
	}

	/* ============ V4 : L'ÉCLIPSE ============ */
	.v4-scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(10, 10, 14, 0.3) 0%, transparent 20%, transparent 42%, rgba(7, 8, 12, 0.94) 70%, #05060a 100%);
	}
	.v4-cost {
		position: absolute;
		top: 4.6cqw;
		left: 4.6cqw;
		display: grid;
		place-items: center;
		width: 11cqw;
		height: 11cqw;
		font-family: Cinzel, Georgia, serif;
		font-size: 5.6cqw;
		font-weight: 700;
		color: #f5edd8;
		text-shadow: 0 0.3cqw 1cqw rgba(0, 0, 0, 0.8);
	}
	/* le croissant : un anneau jamais fermé */
	.v4-cost i {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: conic-gradient(
			from 40deg,
			rgba(232, 200, 118, 0) 0deg,
			#e8c876 60deg,
			#f2d98a 180deg,
			#c9a445 290deg,
			rgba(201, 164, 69, 0) 318deg
		);
		-webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.6cqw), #fff calc(100% - 1.4cqw));
		mask: radial-gradient(farthest-side, transparent calc(100% - 1.6cqw), #fff calc(100% - 1.4cqw));
		filter: drop-shadow(0 0 1.8cqw rgba(201, 164, 69, 0.55));
	}
	.v4-sigil {
		position: absolute;
		top: 4.6cqw;
		right: 5cqw;
		font-size: 5cqw;
		color: rgba(242, 240, 234, 0.75);
		text-shadow: 0 0.3cqw 0.8cqw rgba(0, 0, 0, 0.6);
	}
	.v4-panel {
		position: absolute;
		inset: auto 0 0;
		padding: 0 6.5cqw 5.6cqw;
		color: #ece9e0;
	}
	.v4-glow {
		position: absolute;
		left: 50%;
		top: -4cqw;
		transform: translateX(-50%);
		width: 70cqw;
		height: 26cqw;
		background: radial-gradient(50% 50% at 50% 50%, rgba(201, 164, 69, 0.34) 0%, rgba(201, 164, 69, 0.1) 45%, transparent 75%);
		pointer-events: none;
	}
	.v4-name {
		position: relative;
		margin: 0;
		text-align: center;
		font-family: Cinzel, Georgia, serif;
		font-size: 5.4cqw;
		font-weight: 700;
		color: #fdf8ea;
		text-shadow: 0 0 3cqw rgba(201, 164, 69, 0.6), 0 0.4cqw 1.4cqw rgba(0, 0, 0, 0.9);
	}
	.v4-type {
		position: relative;
		margin: 0.8cqw 0 2.4cqw;
		text-align: center;
		font-size: 2.5cqw;
		font-weight: 600;
		letter-spacing: 0.34em;
		text-transform: uppercase;
		color: rgba(242, 240, 234, 0.5);
	}
	.v4-text {
		margin: 0;
		font-size: 3.4cqw;
		line-height: 1.42;
	}
	.v4-pron {
		margin: 1.6cqw 0 0;
		font-size: 3.2cqw;
	}
	.v4-pron span {
		font-family: Cinzel, Georgia, serif;
		font-size: 2.8cqw;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #e2c069;
		margin-right: 1cqw;
	}
	.v4-stats {
		display: flex;
		justify-content: space-between;
		margin-top: 3cqw;
		font-family: Cinzel, Georgia, serif;
		font-size: 5.8cqw;
		font-weight: 700;
		color: #f5edd8;
	}
	.v4-stats small {
		font-size: 2.2cqw;
		letter-spacing: 0.26em;
		color: rgba(242, 240, 234, 0.45);
		margin: 0 1cqw;
	}
</style>
