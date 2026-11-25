import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://sigma.acx.ma";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function makePassword(length = 24): string {
  const groups = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!#$%&*+-=?@_",
  ];
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
  if (origin && origin !== ALLOWED_ORIGIN) return reply(403, { error: "Origine non autorisée." });
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply(401, { error: "Session Sigma requise." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return reply(500, { error: "Configuration serveur incomplète." });

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return reply(401, { error: "Session invalide." });

    const { data: caller, error: callerError } = await adminClient
      .from("profiles")
      .select("role, active, activity")
      .eq("id", authData.user.id)
      .maybeSingle();
    const canManage = caller && caller.active !== false &&
      (caller.role === "super_admin" || (caller.role === "admin" && caller.activity === "pgv"));
    if (callerError || !canManage) return reply(403, { error: "Action réservée aux administrateurs PGV actifs." });

    const input = await req.json().catch(() => ({}));
    const userId = typeof input.user_id === "string" ? input.user_id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return reply(400, { error: "Identifiant de compte invalide." });
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, full_name, role, active, activity")
      .eq("id", userId)
      .maybeSingle();
    if (targetProfileError || !targetProfile || targetProfile.role !== "agent" || targetProfile.activity !== "pgv") {
      return reply(404, { error: "Compte agent PGV introuvable; aucun changement effectué." });
    }
    if (targetProfile.active === false) return reply(409, { error: "Compte désactivé. Réactivez-le avant de changer son mot de passe." });

    const { data: targetAuth, error: targetAuthError } = await adminClient.auth.admin.getUserById(userId);
    if (targetAuthError || !targetAuth.user) return reply(404, { error: "Compte Auth introuvable; aucun changement effectué." });
    if (!targetAuth.user.email_confirmed_at) {
      return reply(409, { error: "Adresse email non confirmée; aucun mot de passe modifié." });
    }

    const temporaryPassword = makePassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password: temporaryPassword });
    if (updateError) return reply(500, { error: "Supabase n’a pas pu modifier le mot de passe." });

    // Journal serveur minimal sans email, mot de passe ni contenu client.
    console.info("admin-set-temp-password success", { actor: authData.user.id, target: userId, at: new Date().toISOString() });
    return reply(200, {
      ok: true,
      full_name: targetProfile.full_name,
      email: targetAuth.user.email,
      temporary_password: temporaryPassword,
      email_sent: false,
      displayed_once: true,
    });
  } catch (error) {
    console.error("admin-set-temp-password failed", error instanceof Error ? error.name : "unknown");
    return reply(500, { error: "Erreur serveur pendant la définition du mot de passe." });
  }
});
