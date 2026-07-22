<script lang="ts">
	import logo from '$lib/assets/logo.svg';
	import {
		requestLoginCode,
		verifyCode,
		resendCode,
		isValidEmail
	} from '$lib/account.svelte';

	let step = $state<'email' | 'code'>('email');
	let email = $state('');
	let code = $state('');
	let err = $state('');
	let info = $state('');
	let busy = $state(false);

	function done() {
		// recharge vers l'espace : tous les stores se réinitialisent sur le compte
		if (typeof location !== 'undefined') location.assign('/profil');
	}

	async function submitEmail(e: SubmitEvent) {
		e.preventDefault();
		err = '';
		info = '';
		if (!isValidEmail(email)) {
			err = 'Cet e-mail ne semble pas valide.';
			return;
		}
		busy = true;
		const res = await requestLoginCode(email);
		busy = false;
		if (!res.ok) {
			err = res.error ?? 'Envoi du code impossible.';
			return;
		}
		step = 'code';
		info = `Un code de connexion a été envoyé à ${email}.`;
	}

	async function submitCode(e: SubmitEvent) {
		e.preventDefault();
		err = '';
		busy = true;
		const res = await verifyCode(email, code);
		busy = false;
		if (res.ok) done();
		else err = res.error ?? 'Code invalide.';
	}

	async function resend() {
		err = '';
		info = '';
		busy = true;
		const res = await resendCode(email);
		busy = false;
		info = res.ok ? 'Nouveau code envoyé.' : (res.error ?? 'Renvoi impossible.');
	}
</script>

<div class="auth">
	<img class="auth-logo" src={logo} alt="" aria-hidden="true" />

	{#if step === 'email'}
		<h3>Entrer dans le Silence</h3>
		<p class="auth-sub">
			Entrez votre e-mail. Nous vous enverrons un code à usage unique, sans mot de passe.
		</p>
		<form onsubmit={submitEmail}>
			<input
				type="email"
				bind:value={email}
				placeholder="vous@exemple.com"
				autocomplete="email"
				required
			/>
			{#if err}<p class="auth-err">{err}</p>{/if}
			{#if info}<p class="auth-info">{info}</p>{/if}
			<button class="auth-submit" type="submit" disabled={busy}>
				{busy ? '…' : 'Recevoir mon code'}
			</button>
		</form>
	{:else}
		<h3>Code de connexion</h3>
		<p class="auth-sub">{info || `Entrez le code envoyé à ${email}.`}</p>
		<form onsubmit={submitCode}>
			<input
				class="codeinput"
				type="text"
				bind:value={code}
				placeholder="——————"
				inputmode="numeric"
				autocomplete="one-time-code"
				maxlength="6"
				required
			/>
			{#if err}<p class="auth-err">{err}</p>{/if}
			<button class="auth-submit" type="submit" disabled={busy}>
				{busy ? '…' : 'Valider'}
			</button>
		</form>
		<p class="auth-switch">
			Pas reçu ?
			<button type="button" onclick={resend} disabled={busy}>Renvoyer le code</button>
			·
			<button type="button" onclick={() => ((step = 'email'), (err = ''), (code = ''))}
				>Modifier l'e-mail</button
			>
		</p>
	{/if}

	<p class="auth-note">Le code expire rapidement et ne peut être utilisé qu'une fois. Vos données sont sauvegardées en ligne.</p>
</div>

<style>
	.auth {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
	}
	.auth-logo {
		width: 4.2rem;
		filter: drop-shadow(0 0 16px rgba(213, 178, 94, 0.45));
	}
	h3 {
		margin: 0.4rem 0 0;
		font-family: Cinzel, Georgia, serif;
		font-weight: 600;
		font-size: 1.35rem;
		letter-spacing: 0.06em;
	}
	.auth-sub {
		margin: 0;
		text-align: center;
		font-size: 0.85rem;
		line-height: 1.5;
		color: rgba(238, 240, 245, 0.55);
	}
	form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		margin-top: 0.6rem;
	}
	input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.7rem 1rem;
		font-family: inherit;
		font-size: 0.95rem;
		color: var(--ink);
		background: rgba(140, 170, 220, 0.08);
		border: 1px solid var(--panel-line);
		border-radius: 11px;
	}
	input:focus {
		outline: none;
		border-color: rgba(213, 178, 94, 0.6);
	}
	.codeinput {
		text-align: center;
		font-size: 1.6rem;
		letter-spacing: 0.5em;
		font-variant-numeric: tabular-nums;
		padding-left: 0.5em;
	}
	.auth-err {
		margin: 0;
		font-size: 0.8rem;
		color: #ff9d9d;
	}
	.auth-info {
		margin: 0;
		font-size: 0.8rem;
		color: rgba(213, 178, 94, 0.9);
	}
	.auth-submit {
		width: 100%;
		margin-top: 0.3rem;
		padding: 0.75rem 1.4rem;
		border: none;
		border-radius: 999px;
		background: var(--cream);
		color: #171b10;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(213, 178, 94, 0.25);
	}
	.auth-submit:hover:not(:disabled) {
		background: #f7edd6;
	}
	.auth-submit:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.auth-switch {
		margin: 0.2rem 0 0;
		font-size: 0.82rem;
		color: rgba(238, 240, 245, 0.5);
	}
	.auth-switch button {
		background: none;
		border: none;
		padding: 0;
		font-family: inherit;
		font-size: inherit;
		font-weight: 600;
		color: var(--gold);
		cursor: pointer;
		text-decoration: underline;
	}
	.auth-switch button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.auth-note {
		margin: 0.5rem 0 0;
		text-align: center;
		font-size: 0.7rem;
		line-height: 1.45;
		color: rgba(238, 240, 245, 0.35);
	}
</style>
