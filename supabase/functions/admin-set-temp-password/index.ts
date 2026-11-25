const ALLOWED_ORIGINS = new Set(["https://sigma.acx.ma"]);
const BASE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function reply(origin: string | null, status: number, body: Record<string, unknown>) {
  const headers = new Headers({ ...BASE_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(JSON.stringify(body), { status, headers });
}

function makePassword(length = 24): string {
  const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!#$%&*+-=?@_"];
  const all = groups.join("");
  const bytes = new Uint8Array(length + groups.length);
  crypto.getRandomValues(bytes);
  const chars = groups.map((group, i) => group[bytes[i] % group.length]);
  for (let i = groups.length; i < length; i++) chars.push(all[bytes[i] % all.length]);
  for (let i = chars.length - 1; i > 0; i--) {
    const swap = bytes[(i + 7) % bytes.length] % (i + 1);
    [chars[i], chars[swap]] = [chars[swap], chars[i]];
  }
  return chars.join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(null, 403, { error: "Origine non autorisée." });
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: {
    ...BASE_HEADERS,
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
  } });
  if (req.method !== "POST") return reply(origin, 405, { error: "Méthode non autorisée." });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return reply(origin, 401, { error: "Session Sigma requise." });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply(origin, 500, { error: "Configuration serveur incomplète." });

  try {
    // Vérifie le JWT du demandeur auprès de GoTrue sans dépendance externe au démarrage.
    const callerResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    });
    if (!callerResponse.ok) return reply(origin, 401, { error: "Session invalide." });
    const callerAuth = await callerResponse.json();
    if (!callerAuth?.id) return reply(origin, 401, { error: "Session invalide." });

    const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const callerProfileUrl = new URL(`${url}/rest/v1/profiles`);
    callerProfileUrl.searchParams.set("id", `eq.${callerAuth.id}`);
    callerProfileUrl.searchParams.set("select", "role,active,activity");
    const callerProfileResponse = await fetch(callerProfileUrl, { headers: serviceHeaders });
    if (!callerProfileResponse.ok) {
      console.error("admin-set-temp-password profile lookup failed", callerProfileResponse.status);
      return reply(origin, 500, { error: "Impossible de vérifier les droits administrateur." });
    }
    const callerProfiles = await callerProfileResponse.json();
    const caller = Array.isArray(callerProfiles) ? callerProfiles[0] : null;
    const canManage = caller && caller.active !== false &&
      (caller.role === "super_admin" || (caller.role === "admin" && caller.activity === "pgv"));
    if (!canManage) return reply(origin, 403, { error: "Action réservée aux administrateurs PGV actifs." });

    const input = await req.json().catch(() => ({}));
    const userId = typeof input.user_id === "string" ? input.user_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return reply(origin, 400, { error: "Identifiant de compte invalide." });
    }

    const targetProfileUrl = new URL(`${url}/rest/v1/profiles`);
    targetProfileUrl.searchParams.set("id", `eq.${userId}`);
    targetProfileUrl.searchParams.set("select", "id,full_name,role,active,activity");
    const targetProfileResponse = await fetch(targetProfileUrl, { headers: serviceHeaders });
    if (!targetProfileResponse.ok) {
      console.error("admin-set-temp-password target lookup failed", targetProfileResponse.status);
      return reply(origin, 500, { error: "Impossible de vérifier le compte cible." });
    }
    const targetProfiles = await targetProfileResponse.json();
    const targetProfile = Array.isArray(targetProfiles) ? targetProfiles[0] : null;
    if (!targetProfile || targetProfile.role !== "agent" || targetProfile.activity !== "pgv") {
      return reply(origin, 404, { error: "Compte agent PGV introuvable; aucun changement effectué." });
    }
    if (targetProfile.active === false) return reply(origin, 409, { error: "Compte désactivé. Réactivez-le avant de changer son mot de passe." });

    const targetAuthResponse = await fetch(`${url}/auth/v1/admin/users/${userId}`, { headers: serviceHeaders });
    if (!targetAuthResponse.ok) {
      console.error("admin-set-temp-password auth lookup failed", targetAuthResponse.status);
      return reply(origin, 404, { error: "Compte Auth introuvable; aucun changement effectué." });
    }
    const targetAuth = await targetAuthResponse.json();
    if (!targetAuth?.email_confirmed_at) return reply(origin, 409, { error: "Adresse email non confirmée; aucun mot de passe modifié." });

    const temporaryPassword = makePassword();
    const updateResponse = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: { ...serviceHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ password: temporaryPassword }),
    });
    if (!updateResponse.ok) {
      console.error("admin-set-temp-password password update failed", updateResponse.status);
      return reply(origin, 500, { error: "Supabase n’a pas pu modifier le mot de passe." });
    }

    console.info("admin-set-temp-password success", { actor: callerAuth.id, target: userId, at: new Date().toISOString() });
    return reply(origin, 200, {
      ok: true,
      full_name: targetProfile.full_name,
      email: targetAuth.email,
      temporary_password: temporaryPassword,
      email_sent: false,
      displayed_once: true,
    });
  } catch (error) {
    console.error("admin-set-temp-password failed", error instanceof Error ? error.name : "unknown");
    return reply(origin, 500, { error: "Erreur serveur pendant la définition du mot de passe." });
  }
});
