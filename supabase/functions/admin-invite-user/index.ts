import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const configuredOrigin = Deno.env.get("APP_ORIGIN") ?? "";
const corsHeaders = (origin: string) => ({
  "Access-Control-Allow-Origin": configuredOrigin || origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

function reply(status: number, body: Record<string, unknown>, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." }, origin);
  if (configuredOrigin && origin !== configuredOrigin) {
    return reply(403, { error: "Origine non autorisée." }, origin);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return reply(401, { error: "Session Sigma requise." }, origin);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return reply(500, { error: "Configuration serveur incomplète." }, origin);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return reply(401, { error: "Session invalide." }, origin);

    const { data: caller, error: callerError } = await adminClient
      .from("profiles")
      .select("role, active")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (callerError || !caller || caller.active === false || !["admin", "super_admin"].includes(caller.role)) {
      return reply(403, { error: "Action réservée aux administrateurs actifs." }, origin);
    }

    const input = await req.json();
    const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const agentId = typeof input.agent_id === "string" ? input.agent_id : "";
    if (!fullName || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !agentId) {
      return reply(400, { error: "Nom, adresse email ou fiche agent invalide." }, origin);
    }

    const { data: agent, error: agentError } = await adminClient
      .from("agents")
      .select("id, full_name, active, activity")
      .eq("id", agentId)
      .maybeSingle();
    if (agentError || !agent || agent.active === false || agent.activity !== "pgv") {
      return reply(400, { error: "La fiche agent PGV est introuvable ou inactive." }, origin);
    }

    const redirectTo = Deno.env.get("AUTH_REDIRECT_URL");
    const inviteOptions: { data: Record<string, string>; redirectTo?: string } = {
      data: { full_name: fullName },
    };
    if (redirectTo) inviteOptions.redirectTo = redirectTo;

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin
      .inviteUserByEmail(email, inviteOptions);
    if (inviteError || !inviteData.user) {
      const message = inviteError?.message ?? "Utilisateur Auth non créé.";
      const already = /already|registered|exists/i.test(message);
      return reply(already ? 409 : 400, {
        error: already
          ? "Cette adresse a déjà un compte. Retrouve-le dans la liste des comptes et rattache-le à sa fiche; utilise ensuite Réinitialiser pour lui envoyer un lien sécurisé."
          : message,
      }, origin);
    }

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: inviteData.user.id,
      full_name: fullName,
      role: "agent",
      agent_id: agent.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (profileError) {
      return reply(500, {
        error: "L’invitation a été envoyée, mais le profil Sigma n’a pas pu être rattaché. Contacte l’administrateur avant de renvoyer une invitation.",
      }, origin);
    }

    return reply(200, { ok: true, email, agent: agent.full_name }, origin);
  } catch (error) {
    console.error("admin-invite-user failed", error);
    return reply(500, { error: "Erreur serveur pendant l’invitation." }, origin);
  }
});
