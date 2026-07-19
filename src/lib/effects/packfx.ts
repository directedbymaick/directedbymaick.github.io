/**
 * Moteur de lumière canvas pour l'ouverture des boosters.
 *
 * Principe (VFX de jeu + motion Apple) : du bloom, pas des objets.
 * Aucune forme lisible — pas d'étoiles, pas d'anneaux, pas de confettis.
 * Trois matières seulement, toutes en blending additif :
 * - le BLOOM : une nappe de lumière à très longue retombée, qui gonfle et s'éteint ;
 * - la POUSSIÈRE : quelques motes doux (cœur diffus, jamais de bord), lents,
 *   qui dérivent et fondent — des braises dans la lumière, pas des paillettes ;
 * - les GLINTS : de rares éclats filés très courts, fins, presque subliminaux.
 */

export interface BurstSpec {
	colors: string[];
	/** Motes de poussière lumineuse. */
	orbs?: number;
	/** Éclats filés (très discrets, ttl court). */
	streaks?: number;
	/** Vitesse d'expulsion de base, px/s. */
	power?: number;
	/** Impulsion de bloom au centre. */
	bloom?: boolean;
}

type Kind = 'orb' | 'streak' | 'bloom';

interface Particle {
	kind: Kind;
	x: number;
	y: number;
	vx: number;
	vy: number;
	age: number;
	ttl: number;
	size: number;
	color: string;
	delay: number;
}

export interface PackFx {
	burst(x: number, y: number, spec: BurstSpec): void;
	destroy(): void;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function createPackFx(canvas: HTMLCanvasElement): PackFx {
	const ctx = canvas.getContext('2d')!;
	const DPR = Math.min(globalThis.devicePixelRatio || 1, 2);
	let parts: Particle[] = [];
	let raf = 0;
	let last = 0;

	const ro = new ResizeObserver(() => {
		canvas.width = Math.max(1, Math.round(canvas.clientWidth * DPR));
		canvas.height = Math.max(1, Math.round(canvas.clientHeight * DPR));
	});
	ro.observe(canvas);

	/* mote : cœur doux (pas de point blanc dur), halo couleur, très longue retombée */
	const motes = new Map<string, HTMLCanvasElement>();
	function moteSprite(color: string): HTMLCanvasElement {
		let s = motes.get(color);
		if (s) return s;
		s = document.createElement('canvas');
		s.width = s.height = 64;
		const c = s.getContext('2d')!;
		const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, 'rgba(255,255,255,0.9)');
		g.addColorStop(0.3, color);
		g.addColorStop(0.62, 'rgba(0,0,0,0)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, 64, 64);
		motes.set(color, s);
		return s;
	}

	/* bloom : la nappe — retombée en quatre paliers, aucun bord perceptible */
	const blooms = new Map<string, HTMLCanvasElement>();
	function bloomSprite(color: string): HTMLCanvasElement {
		let s = blooms.get(color);
		if (s) return s;
		s = document.createElement('canvas');
		s.width = s.height = 256;
		const c = s.getContext('2d')!;
		const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
		g.addColorStop(0, 'rgba(255,255,255,0.85)');
		g.addColorStop(0.18, color);
		g.addColorStop(0.45, 'rgba(0,0,0,0)'); // additive : le noir transparent s'efface
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, 256, 256);
		blooms.set(color, s);
		return s;
	}

	function burst(x: number, y: number, spec: BurstSpec): void {
		const { colors, orbs = 16, streaks = 6, power = 240, bloom = true } = spec;
		const col = () => colors[(Math.random() * colors.length) | 0];
		if (bloom) {
			parts.push({
				kind: 'bloom',
				x, y, vx: 0, vy: 0,
				age: 0, ttl: 1.1,
				size: 340,
				color: col(),
				delay: 0
			});
		}
		for (let i = 0; i < orbs; i++) {
			const a = Math.random() * Math.PI * 2;
			const sp = power * (0.2 + Math.pow(Math.random(), 1.7));
			parts.push({
				kind: 'orb',
				x, y,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp - power * 0.18,
				age: 0,
				ttl: rnd(0.8, 1.7),
				size: rnd(1.6, 5),
				color: col(),
				delay: rnd(0, 0.12)
			});
		}
		for (let i = 0; i < streaks; i++) {
			const a = Math.random() * Math.PI * 2;
			const sp = power * rnd(1.3, 2.1);
			parts.push({
				kind: 'streak',
				x, y,
				vx: Math.cos(a) * sp,
				vy: Math.sin(a) * sp,
				age: 0,
				ttl: rnd(0.22, 0.38),
				size: rnd(1, 1.7),
				color: col(),
				delay: rnd(0, 0.04)
			});
		}
		if (!raf) {
			last = performance.now();
			raf = requestAnimationFrame(step);
		}
	}

	function step(t: number): void {
		const dt = Math.min(0.033, (t - last) / 1000);
		last = t;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.save();
		ctx.scale(DPR, DPR);
		ctx.globalCompositeOperation = 'lighter';

		parts = parts.filter((p) => {
			if (p.delay > 0) {
				p.delay -= dt;
				return true;
			}
			p.age += dt;
			if (p.age >= p.ttl) return false;
			const k = p.age / p.ttl;

			if (p.kind === 'bloom') {
				// gonfle vite, s'éteint lentement — une respiration de lumière
				const grow = 0.55 + (1 - Math.pow(1 - Math.min(1, k * 3.2), 3)) * 0.85;
				const d = p.size * grow;
				ctx.globalAlpha = 0.55 * Math.pow(1 - k, 1.7);
				ctx.drawImage(bloomSprite(p.color), p.x - d / 2, p.y - d / 2, d, d);
			} else if (p.kind === 'orb') {
				p.vy += 300 * dt; // gravité douce : la poussière retombe, elle n'explose pas
				p.vx *= 1 - 2.8 * dt;
				p.vy *= 1 - 1.6 * dt;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				const born = k < 0.15 ? k / 0.15 : 1;
				const d = p.size * 4.5 * born;
				ctx.globalAlpha = 0.7 * Math.pow(1 - k, 1.6) * born;
				ctx.drawImage(moteSprite(p.color), p.x - d / 2, p.y - d / 2, d, d);
			} else {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.vx *= 1 - 3.4 * dt;
				p.vy *= 1 - 3.4 * dt;
				const lx = p.vx * 0.045;
				const ly = p.vy * 0.045;
				const g = ctx.createLinearGradient(p.x - lx, p.y - ly, p.x, p.y);
				g.addColorStop(0, 'rgba(255,255,255,0)');
				g.addColorStop(1, p.color);
				ctx.strokeStyle = g;
				ctx.lineCap = 'round';
				ctx.lineWidth = p.size * (1 - k * 0.6);
				ctx.globalAlpha = 0.55 * Math.pow(1 - k, 1.3);
				ctx.beginPath();
				ctx.moveTo(p.x - lx, p.y - ly);
				ctx.lineTo(p.x, p.y);
				ctx.stroke();
			}
			return true;
		});

		ctx.restore();
		ctx.globalAlpha = 1;
		if (parts.length > 0) {
			raf = requestAnimationFrame(step);
		} else {
			raf = 0;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	function destroy(): void {
		ro.disconnect();
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		parts = [];
	}

	return { burst, destroy };
}
