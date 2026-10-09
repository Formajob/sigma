/* ============================================================
 * Sigma — Client Supabase partagé (Americana)
 *
 * Usage dans une page :
 *   <script src="js/supabase-config.js"></script>
 *   <script src="js/supabase-client.js"></script>
 *   <script>
 *     const info = await window.sigmaSupabase.testConnection();
 *     console.log("Agents Americana :", info.agents);
 *   </script>
 * ============================================================ */
(function () {
  "use strict";

  var CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.44.4/dist/umd/supabase.min.js";
  var client = null;

  function loadLib() {
    return new Promise(function (resolve, reject) {
      if (window.supabase && window.supabase.createClient) return resolve();
      var s = document.createElement("script");
      s.src = CDN;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("CDN Supabase injoignable. Vérifie ta connexion.")); };
      document.head.appendChild(s);
    });
  }

  async function getClient() {
    if (client) return client;
    var url = window.SIGMA_SUPABASE_URL;
    var key = window.SIGMA_SUPABASE_ANON_KEY;
    if (!url || !key || url.indexOf("xxx") !== -1) {
      throw new Error("Supabase non configuré : copie js/supabase-config.example.js vers js/supabase-config.js et renseigne l'URL + la clé anon.");
    }
    await loadLib();
    client = window.supabase.createClient(url, key);
    return client;
  }

  // Test rapide : compte les agents (vérifie URL + clé + RLS lecture)
  // Schéma réel : agents SANS colonne client (full_name, job_role...).
  async function testConnection() {
    var db = await getClient();
    var res = await db.from("agents").select("id", { count: "exact", head: true });
    if (res.error) throw res.error;
    return { ok: true, agents: res.count };
  }

  async function signIn(email, password) {
    var db = await getClient();
    var res = await db.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var db = await getClient();
    await db.auth.signOut();
  }

  // Profil applicatif : rôle + agent lié (null si pas de ligne = pas d'accès)
  // Schéma réel : profiles(id, full_name, role app_role, agent_id, active)
  // — id = auth.users.id (pas de user_id), pas de colonne client.
  async function getProfile() {
    var db = await getClient();
    var authRes = await db.auth.getUser();
    if (authRes.error || !authRes.data.user) return null;
    var p = await db.from("profiles")
      .select("id, role, full_name, agent_id, active, agents(id, full_name)")
      .eq("id", authRes.data.user.id)
      .maybeSingle();
    if (p.error || !p.data) return null;
    return {
      email: authRes.data.user.email,
      role: p.data.role,
      client: "americana",
      displayName: p.data.full_name || null,
      agentId: p.data.agent_id,
      agentName: p.data.agents ? p.data.agents.full_name : null,
      suspended: p.data.active === false
    };
  }

  // Garde de page : sans session, sans profil OU suspendu -> retour login
  async function requireAuth(loginUrl) {
    var profile = await getProfile();
    if (!profile) {
      window.location.href = loginUrl || "login.html";
      return null;
    }
    if (profile.suspended) {
      // Compte suspendu : on ferme la session et on renvoie au login avec motif.
      try { await signOut(); } catch (e) {}
      window.location.href = (loginUrl || "login.html") + "?msg=suspended";
      return null;
    }
    return profile;
  }

  async function insertCalibration(calibration, qaElements) {
    var db = await getClient();
    var authRes = await db.auth.getUser();
    var cal = await db.from("calibrations").insert({
      agent_id: calibration.agentId,
      call_id: calibration.callId,
      call_date: calibration.callDate,
      calibration_date: calibration.date,
      status: calibration.status,
      language: calibration.language,
      evaluator: calibration.evaluator,
      evaluator_name: calibration.evaluator,
      notes: calibration.notes || null,
      created_by: authRes.data.user.id
    }).select().single();
    if (cal.error) throw cal.error;
    var calId = cal.data.id;
    // 1 ligne calibration_results par élément, LIÉE au calibrage (calibration_id).
    // qaElements[i].elementId <-> calibration.elements[i]  (même ordre que la grille).
    // result = Oui / Non / N/A (enum qa_result) · reason obligatoire si Non.
    var values = calibration.elements || [];
    var reasons = calibration.reasons || [];
    var rows = (qaElements || []).map(function (e, i) {
      var v = values[i] || 'N/A';
      return {
        calibration_id: calId,
        element_id: e.elementId,
        result: v,
        reason: (v === 'Non' && reasons[i] ? reasons[i] : null)
      };
    });
    if (rows.length) {
      var res = await db.from("calibration_results").insert(rows).select();
      if (res.error) throw res.error;
    }
    return cal.data;
  }

  // QA_GRID (id + label + cat) chargé depuis supabase/qa_elements pour le mapping.
  async function loadQaElements() {
    var db = await getClient();
    var res = await db.from("qa_elements").select("id, label, category, position").order("position");
    if (res.error) throw res.error;
    return (res.data || []).map(function (q) {
      return { elementId: q.id, label: q.label, cat: q.category || 'NC' };
    });
  }

  // Calibrages réels + résultats, remis au format UI (elements[]/reasons[] par position).
  async function loadCalibrations() {
    var db = await getClient();
    var els = await db.from("qa_elements").select("id, position").order("position");
    if (els.error) throw els.error;
    var size = (els.data || []).length;
    var posIndex = {};
    (els.data || []).forEach(function (e, i) { posIndex[e.id] = i; });
    var res = await db.from("calibrations")
      .select("id, call_id, call_date, calibration_date, agent_id, status, language, evaluator, evaluator_name, notes, calibration_results(element_id, result, reason)")
      .order("calibration_date", { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(function (c) {
      var elements = new Array(size).fill('');
      var reasons = new Array(size).fill('');
      (c.calibration_results || []).forEach(function (r) {
        var idx = posIndex[r.element_id];
        if (idx == null) return;
        elements[idx] = r.result || '';
        reasons[idx] = r.reason || '';
      });
      return {
        id: c.id,
        type: 'Calibrage',
        date: c.calibration_date,
        callDate: c.call_date,
        agentId: c.agent_id,
        callId: c.call_id || '',
        status: c.status,
        evaluator: c.evaluator_name || c.evaluator || '',
        language: c.language || '',
        notes: c.notes || '',
        elements: elements,
        reasons: reasons
      };
    });
  }

  // ---------- Documents (FISS) ----------
  async function loadDocuments() {
    var db = await getClient();
    var res = await db.from("documents")
      .select("id, doc_type, object, meeting_date, follow_up_date, agent_id, call_id, visibility, status, facts, impacts, solutions, followup")
      .order("meeting_date", { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(function (d) {
      return {
        id: d.id,
        type: d.doc_type,
        object: d.object || '',
        status: d.status,
        meetingDate: d.meeting_date,
        followUpDate: d.follow_up_date,
        agentId: d.agent_id,
        callId: d.call_id || '',
        visibility: d.visibility,
        fiss: { facts: d.facts || '', impacts: d.impacts || '', solutions: d.solutions || '', followup: d.followup || '' }
      };
    });
  }

  async function insertDocument(row) {
    var db = await getClient();
    var authRes = await db.auth.getUser();
    var res = await db.from("documents").insert({
      doc_type: row.type,
      object: row.object || null,
      meeting_date: row.meetingDate,
      follow_up_date: row.followUpDate || null,
      agent_id: row.agentId,
      call_id: row.callId || null,
      visibility: row.visibility,
      status: row.status,
      facts: row.fiss.facts,
      impacts: row.fiss.impacts,
      solutions: row.fiss.solutions,
      followup: row.fiss.followup,
      created_by: authRes.data.user.id
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // ---------- Volumes d'appels (call_volumes) ----------
  // Schéma réel : agent_id, period_from, period_to, calls_taken.
  async function loadVolumes() {
    var db = await getClient();
    var res = await db.from("call_volumes")
      .select("id, agent_id, period_from, period_to, calls_taken")
      .order("period_from", { ascending: false });
    if (res.error) throw res.error;
    return (res.data || []).map(function (v) {
      return {
        id: v.id,
        agentId: v.agent_id,
        from: v.period_from,
        to: v.period_to,
        count: v.calls_taken
      };
    });
  }

  // Import par période : ÉCRASE toutes les lignes de la période, puis réinsère.
  // rows = [{ agentId, count }] · garantit zéro doublon et compteur à jour.
  async function importVolumes(rows, periodFrom, periodTo) {
    var db = await getClient();
    // 1) supprimer tout ce qui existe sur la période (tous agents)
    var del = await db.from("call_volumes").delete()
      .gte("period_from", periodFrom).lte("period_to", periodTo);
    if (del.error) throw del.error;
    if (!rows.length) return { deleted: true, inserted: 0 };
    // 2) réinsérer les nouvelles données
    var payload = rows.map(function (r) {
      return { agent_id: r.agentId, period_from: periodFrom, period_to: periodTo, calls_taken: r.count };
    });
    var ins = await db.from("call_volumes").insert(payload).select();
    if (ins.error) throw ins.error;
    return { deleted: true, inserted: (ins.data || []).length };
  }

  // Suppression d'un agent (fiche Équipe).
  async function deleteAgent(id) {
    var db = await getClient();
    var res = await db.from("agents").delete().eq("id", id);
    if (res.error) throw res.error;
    return true;
  }

  window.sigmaSupabase = {
    getClient: getClient,
    testConnection: testConnection,
    signIn: signIn,
    signOut: signOut,
    getProfile: getProfile,
    requireAuth: requireAuth,
    loadQaElements: loadQaElements,
    loadCalibrations: loadCalibrations,
    saveCalibration: insertCalibration,
    loadDocuments: loadDocuments,
    saveDocument: insertDocument,
    loadVolumes: loadVolumes,
    importVolumes: importVolumes,
    deleteAgent: deleteAgent
  };
})();
