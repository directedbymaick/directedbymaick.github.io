import { createClient } from '@supabase/supabase-js';

/**
 * Le client Supabase — authentification e-mail + mot de passe avec code,
 * et sauvegarde cloud du joueur (dans les métadonnées de son compte).
 * La clé « publishable » est publique par conception : sûre côté client.
 */
export const SUPABASE_URL = 'https://xhtpmdxjbxgfggvahlte.supabase.co';
const SUPABASE_ANON = 'sb_publishable_spKKcUnewDeHC0RRaSloPw_K720s1U7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: false
	}
});
