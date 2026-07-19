<script lang="ts">
	/* Les vrais sceaux de faction (logos fournis, static/factions/*.png,
	   blanc sur transparent) — affichés en masque CSS, donc teintables :
	   dégradé « métal précieux » par défaut, currentColor en mode flat. */
	const GRADIENT: Record<string, string> = {
		vasar: 'linear-gradient(135deg, #fff8dd 0%, #f3dd9a 20%, #c9a445 42%, #7c5c16 60%, #e9c96a 78%, #fff3c9 100%)',
		exar: 'linear-gradient(135deg, #ffb3a6 0%, #e84a55 20%, #b3273a 42%, #4e0810 60%, #d9384a 78%, #ff8f7e 100%)',
		eshar: 'linear-gradient(135deg, #e8d9ff 0%, #b394e8 20%, #8d6cb8 42%, #3e2f78 60%, #7fb0ff 78%, #d6b9ff 100%)',
		morar: 'linear-gradient(135deg, #f4fbff 0%, #c4dff2 20%, #8fb4d9 42%, #476e94 60%, #a9d3f0 78%, #e6f4ff 100%)',
		velar: 'linear-gradient(135deg, #fff6c9 0%, #ffd977 20%, #f0a626 42%, #8a4d08 60%, #ffbe45 78%, #ffefb0 100%)'
	};

	let { faction, flat = false }: { faction: string; flat?: boolean } = $props();
	const known = $derived(GRADIENT[faction] ? faction : 'vasar');
	const paint = $derived(flat ? 'currentColor' : GRADIENT[known]);
</script>

<span
	class="sigil"
	aria-hidden="true"
	style="--sig: url('/factions/{known}.png'); background: {paint}"
></span>

<style>
	.sigil {
		display: inline-block;
		width: 1em;
		height: 1em;
		vertical-align: -0.12em;
		-webkit-mask: var(--sig) center / contain no-repeat;
		mask: var(--sig) center / contain no-repeat;
	}
</style>
