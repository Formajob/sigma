import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function esc(v: unknown) {
  return String(v ?? "—").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
}
function dateFr(v: string | null) {
  if (!v) return "—";
  const d = new Date(`${v}T12:00:00`);
  return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const mailKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("MAIL_FROM");
  const appUrl = (Deno.env.get("APP_PUBLIC_URL") || "https://sigma.acx.ma").replace(/\/$/, "");
  if (!url || !anon || !service || !mailKey || !from) return reply(503, { error: "Configuration email incomplète (RESEND_API_KEY / MAIL_FROM)." });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply(401, { error: "Session Sigma requise." });
  const userClient = createClient(url, anon, { global:{ headers:{ Authorization:authHeader } }, auth:{ persistSession:false, autoRefreshToken:false } });
  const admin = createClient(url, service, { auth:{ persistSession:false, autoRefreshToken:false } });

  try {
    const { data: auth, error: authErr } = await userClient.auth.getUser();
    if (authErr || !auth.user) return reply(401, { error: "Session invalide." });
    const { data: profile, error: profileErr } = await admin.from("profiles")
      .select("role, activity, active").eq("id", auth.user.id).maybeSingle();
    if (profileErr || !profile || profile.activity !== "pgv" || profile.active === false ||
        !["superviseur", "qualite", "admin", "super_admin"].includes(String(profile.role).toLowerCase())) {
      return reply(403, { error: "Envoi réservé à un responsable PGV actif." });
    }

    const input = await req.json().catch(() => ({}));
    const documentId = typeof input.document_id === "string" ? input.document_id : "";
    if (!documentId) return reply(400, { error: "Document manquant." });
    const { data: doc, error: docErr } = await admin.from("documents")
      .select("id, activity, agent_id, doc_type, object, meeting_date, follow_up_date, call_id, status, visibility, facts, impacts, solutions, followup")
      .eq("id", documentId).eq("activity", "pgv").maybeSingle();
    if (docErr || !doc || doc.visibility !== "agent") return reply(404, { error: "Document non trouvé ou non partagé avec l’agent." });

    const { data: agent } = await admin.from("agents")
      .select("id, full_name, email, activity").eq("id", doc.agent_id).eq("activity", "pgv").maybeSingle();
    if (!agent) return reply(404, { error: "Fiche agent PGV introuvable." });
    let recipient = String(agent.email || "").trim();
    if (!recipient) {
      const { data: agentProfile } = await admin.from("profiles")
        .select("id, active").eq("agent_id", agent.id).eq("activity", "pgv").maybeSingle();
      if (!agentProfile || agentProfile.active === false) return reply(400, { error: "Aucun compte PGV actif rattaché à cet agent." });
      const { data: authAgent } = await admin.auth.admin.getUserById(agentProfile.id);
      recipient = String(authAgent.user?.email || "").trim();
    }
    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return reply(400, { error: "Aucune adresse email valide pour cet agent." });

    const title = String(doc.object || doc.doc_type || "Documentation de suivi");
    const fields: Array<[string,string]> = [
      ["Faits", String(doc.facts || "—")], ["Impacts", String(doc.impacts || "—")],
      ["Solutions", String(doc.solutions || "—")], ["Suivi", String(doc.followup || "—")],
    ];
    const sections = fields.map(([label,value]) => `<tr><td style="padding:15px 18px;border-bottom:1px solid #edf0f2"><div style="font:700 11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#688087;margin-bottom:7px">${label}</div><div style="font:14px/1.7 Arial,sans-serif;color:#263940;white-space:pre-wrap">${esc(value)}</div></td></tr>`).join("");
    const logo = `${appUrl}/assets/acx-sigma-logo-light.svg`;
    const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f2f5f4;font-family:Arial,Helvetica,sans-serif;color:#20343b">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f4;padding:28px 12px"><tr><td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 12px 35px rgba(23,36,45,.12)">
          <tr><td style="padding:25px 30px;background:#17242d"><img src="${esc(logo)}" alt="ACX Sigma" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0"><div style="margin-top:19px;color:#64dfc4;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Suivi PGV · Documentation partagée</div></td></tr>
          <tr><td style="padding:27px 30px 14px"><div style="color:#c0622d;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">${esc(doc.doc_type)}</div><h1 style="margin:8px 0 10px;color:#17242d;font:600 25px/1.25 Georgia,serif">${esc(title)}</h1><p style="margin:0;color:#64767c;font-size:14px;line-height:1.7">Bonjour ${esc(agent.full_name)}, une documentation de suivi vous a été partagée par votre équipe.</p></td></tr>
          <tr><td style="padding:12px 30px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f8f6;border:1px solid #e6ece9;border-radius:9px"><tr><td style="padding:14px 17px;color:#42575e;font-size:13px;line-height:1.8"><b>Date :</b> ${esc(dateFr(doc.meeting_date))}<br><b>Suivi prévu :</b> ${esc(dateFr(doc.follow_up_date))}<br><b>Statut :</b> ${esc(doc.status)}<br><b>ID d’appel :</b> ${esc(doc.call_id)}</td></tr></table></td></tr>
          ${sections}
          <tr><td style="padding:23px 30px 27px"><a href="${esc(appUrl)}/login.html?client=pgv" style="display:inline-block;padding:13px 20px;border-radius:6px;background:#c0622d;color:#fff;font-size:13px;font-weight:bold;text-decoration:none">Ouvrir mon espace PGV</a><p style="margin:18px 0 0;color:#839196;font-size:11px;line-height:1.6">Ce message a été généré automatiquement par Sigma · ACX Maroc. Pour toute question, contactez votre superviseur.</p></td></tr>
          <tr><td style="height:5px;background:linear-gradient(90deg,#2ad4e8,#22d6be,#2fe8a5)"></td></tr>
        </table><div style="padding:15px;color:#94a1a4;font-size:10px">Sigma · ACX Maroc</div>
      </td></tr></table></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method:"POST", headers:{ Authorization:`Bearer ${mailKey}`, "Content-Type":"application/json" },
      body:JSON.stringify({ from, to:[recipient], subject:`Sigma · ${title}`, html }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Resend error", response.status, body.slice(0,500));
      return reply(502, { error:"Le fournisseur email a refusé l’envoi. Vérifie la clé, le domaine expéditeur et les logs Resend." });
    }
    return reply(200, { ok:true, recipient, document_id:doc.id });
  } catch (error) {
    console.error("pgv-send-agent-document failed", error);
    return reply(500, { error:"Erreur pendant l’envoi de la documentation." });
  }
});
