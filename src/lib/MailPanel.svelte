<script lang="ts">
	import { session } from '$lib/account.svelte';
	import { mail, inboxFor, markRead, claimMail } from '$lib/mail.svelte';

	let { close }: { close: () => void } = $props();

	const email = $derived(session.account?.email ?? null);
	const items = $derived(inboxFor(email));
	let openId = $state<string | null>(null);

	function toggle(id: string) {
		if (openId === id) {
			openId = null;
		} else {
			openId = id;
			markRead(id);
		}
	}

	function fmtDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
		} catch {
			return '';
		}
	}
</script>

<div class="mailp">
	<header>
		<span class="crest" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
				<rect x="3" y="5" width="18" height="14" rx="2.5" />
				<path d="M3.5 7l8.5 6 8.5-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
		<h3>Courrier</h3>
		<button class="x" onclick={close} aria-label="Fermer">✕</button>
	</header>

	{#if items.length === 0}
		<p class="empty">Aucun courrier pour l’instant.</p>
	{:else}
		<ul>
			{#each items as m (m.id)}
				{@const unread = !mail.read[m.id]}
				{@const open = openId === m.id}
				{@const claimable = !!m.coins && !mail.claimed[m.id]}
				<li class:open>
					<button class="row" onclick={() => toggle(m.id)}>
						<span class="dot" class:on={unread || claimable} aria-hidden="true"></span>
						<span class="meta">
							<span class="subj">{m.subject}</span>
							<span class="from">{m.from} · {fmtDate(m.date)}</span>
						</span>
						{#if claimable}
							<span class="tag"><i class="shard" aria-hidden="true"></i>{m.coins?.toLocaleString('fr-FR')}</span>
						{/if}
					</button>
					{#if open}
						<div class="body">
							{#each m.body as p}<p>{p}</p>{/each}
							{#if m.coins}
								{#if mail.claimed[m.id]}
									<p class="claimed">✓ Récompense réclamée.</p>
								{:else}
									<button class="claim" onclick={() => claimMail(m.id)}>
										Réclamer <i class="shard" aria-hidden="true"></i>{m.coins.toLocaleString('fr-FR')} Éclats
									</button>
								{/if}
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.mailp {
		position: relative;
		width: min(440px, 94vw);
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		background: rgba(10, 16, 30, 0.97);
		border: 1px solid rgba(213, 178, 94, 0.35);
		border-radius: 18px;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
		overflow: hidden;
		animation: mpop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
	}
	@keyframes mpop {
		from {
			opacity: 0;
			transform: translateY(14px) scale(0.97);
		}
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 1.1rem 1.3rem;
		border-bottom: 1px solid var(--panel-line);
	}
	.crest svg {
		width: 1.4rem;
		height: 1.4rem;
		color: var(--gold);
	}
	h3 {
		margin: 0;
		flex: 1;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 1.1rem;
		letter-spacing: 0.08em;
	}
	.x {
		border: none;
		background: none;
		color: rgba(238, 240, 245, 0.5);
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}
	.x:hover {
		color: var(--ink);
	}
	.empty {
		margin: 0;
		padding: 2.4rem 1.5rem;
		text-align: center;
		font-size: 0.88rem;
		color: rgba(238, 240, 245, 0.5);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0.5rem;
		overflow-y: auto;
	}
	li {
		border-radius: 12px;
	}
	li.open {
		background: rgba(140, 170, 220, 0.06);
	}
	.row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.75rem 0.85rem;
		border: none;
		background: none;
		color: inherit;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		border-radius: 12px;
	}
	.row:hover {
		background: rgba(140, 170, 220, 0.08);
	}
	.dot {
		flex: none;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: transparent;
		border: 1px solid rgba(140, 170, 220, 0.4);
	}
	.dot.on {
		background: var(--gold);
		border-color: var(--gold);
		box-shadow: 0 0 8px rgba(213, 178, 94, 0.6);
	}
	.meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.subj {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.from {
		font-size: 0.72rem;
		color: rgba(238, 240, 245, 0.45);
	}
	.tag {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.6rem;
		border: 1px solid rgba(213, 178, 94, 0.4);
		border-radius: 999px;
		font-size: 0.76rem;
		font-variant-numeric: tabular-nums;
		color: var(--gold);
	}
	.body {
		padding: 0.2rem 1rem 1rem 2.15rem;
	}
	.body p {
		margin: 0 0 0.6rem;
		font-size: 0.87rem;
		line-height: 1.6;
		color: rgba(238, 240, 245, 0.75);
	}
	.claimed {
		color: rgba(213, 178, 94, 0.85) !important;
		font-weight: 600;
	}
	.claim {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.3rem;
		padding: 0.6rem 1.2rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 0.86rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(213, 178, 94, 0.25);
	}
	.claim:hover {
		background: #f7edd6;
	}
	.shard {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		rotate: 45deg;
		border-radius: 2px;
		background: linear-gradient(135deg, #f2d98a, #a97f2c);
	}
</style>
