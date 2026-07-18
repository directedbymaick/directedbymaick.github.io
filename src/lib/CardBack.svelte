<script lang="ts">
	// Le dos de carte Expelled : carbone, filet or, le cercle de KOR.
</script>

<div class="scene">
	<div class="back">
		<div class="face">
			<div class="etch"></div>
			<div class="emblem">
				<span class="glyph">◯</span>
				<span class="wordmark">Expelled</span>
				<span class="sub">Trading Card Game</span>
			</div>
			<span class="corner tl">S01</span>
			<span class="corner br">S01</span>
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
		font-family: Bahnschrift, 'Segoe UI', system-ui, sans-serif;
	}
	.face {
		position: absolute;
		inset: 0;
		border-radius: 4.6cqw;
		overflow: hidden;
		/* carbone : tissage en pixels entiers (jamais de stripes sub-pixel) */
		background:
			radial-gradient(120% 90% at 50% 0%, rgba(255, 180, 84, 0.07), transparent 55%),
			radial-gradient(140% 100% at 50% 115%, rgba(20, 30, 44, 0.9), transparent 60%),
			repeating-linear-gradient(45deg, #161b22 0 3px, #10141a 3px 6px),
			repeating-linear-gradient(-45deg, #141920 0 3px, #0e1218 3px 6px),
			#10141a;
		box-shadow:
			0 2.5cqw 6cqw rgba(0, 0, 0, 0.5),
			inset 0 0.2cqw 0.4cqw rgba(255, 255, 255, 0.14),
			inset 0 -0.3cqw 0.5cqw rgba(0, 0, 0, 0.5);
	}
	.etch {
		position: absolute;
		inset: 3.4cqw;
		border-radius: 2.6cqw;
		border: 1px solid rgba(255, 180, 84, 0.32);
		box-shadow: inset 0 0 4cqw rgba(255, 180, 84, 0.05);
		pointer-events: none;
	}
	.emblem {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.6cqw;
	}
	.glyph {
		font-size: 22cqw;
		line-height: 1;
		color: rgba(255, 180, 84, 0.85);
		text-shadow: 0 0 6cqw rgba(255, 180, 84, 0.45);
	}
	.wordmark {
		font-stretch: 70%;
		font-weight: 800;
		font-size: 9.5cqw;
		letter-spacing: 0.32em;
		text-indent: 0.32em;
		text-transform: uppercase;
		color: #ece8e1;
	}
	.sub {
		font-family: Consolas, monospace;
		font-size: 2.9cqw;
		letter-spacing: 0.42em;
		text-indent: 0.42em;
		text-transform: uppercase;
		color: rgba(236, 232, 225, 0.4);
	}
	.corner {
		position: absolute;
		font-family: Consolas, monospace;
		font-size: 2.8cqw;
		letter-spacing: 0.22em;
		color: rgba(255, 180, 84, 0.5);
	}
	.corner.tl {
		top: 5.4cqw;
		left: 6cqw;
	}
	.corner.br {
		bottom: 5.4cqw;
		right: 6cqw;
		rotate: 180deg;
	}
</style>
