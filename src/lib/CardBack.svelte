<script lang="ts">
	// Le dos de carte Expelled : l'illustration gravée plein cadre —
	// cadre or, chaînes, l'anneau de KOR sur bleu nuit. Rien d'autre.
</script>

<div class="scene">
	<div class="back">
		<div class="face">
			<img class="art" src="/card-back.webp" alt="" draggable="false" />
			<div class="vignette" aria-hidden="true"></div>
			<div class="sheen" aria-hidden="true"></div>
		</div>
	</div>
</div>

<style>
	.scene {
		perspective: 1100px;
		width: var(--card-w, 320px);
	}
	.back {
		width: 100%;
		aspect-ratio: 63 / 88;
		container-type: inline-size;
	}
	.face {
		position: absolute;
		inset: 0;
		border-radius: 4.6cqw;
		overflow: hidden;
		background: #0a0d14;
		box-shadow:
			0 2.5cqw 6cqw rgba(0, 0, 0, 0.5),
			inset 0 0.2cqw 0.4cqw rgba(255, 255, 255, 0.14),
			inset 0 -0.3cqw 0.5cqw rgba(0, 0, 0, 0.5);
	}
	.art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	/* assoit les coins, densifie les bords — la carte reste calme en pile */
	.vignette {
		position: absolute;
		inset: 0;
		background: radial-gradient(115% 115% at 50% 50%, transparent 62%, rgba(4, 6, 10, 0.42) 100%);
		pointer-events: none;
	}
	/* un souffle de lumière qui traverse l'or, lent et rare */
	.sheen {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			115deg,
			transparent 35%,
			rgba(255, 244, 214, 0.05) 46%,
			rgba(255, 244, 214, 0.1) 50%,
			rgba(255, 244, 214, 0.05) 54%,
			transparent 65%
		);
		background-size: 260% 100%;
		animation: backsheen 7s ease-in-out infinite;
		pointer-events: none;
	}
	@keyframes backsheen {
		0%, 62% { background-position: 130% 0; }
		100% { background-position: -60% 0; }
	}
	@media (prefers-reduced-motion: reduce) {
		.sheen { animation: none; }
	}
</style>
