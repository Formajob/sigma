/* ============================================================
   Sigma · couche de données PGV
   Toutes les requêtes filtrent sur activity = 'pgv'.
   Aucune donnée inventée : en cas d'absence, on renvoie du vide
   et la page affiche un état explicite.
   ============================================================ */
(function () {
  'use strict';

  var ACTIVITY = 'pgv';
  var CACHE_KEY = 'sigma-pgv-cache-v1';
  var db = null, ctx = null;

  function client() {
    if (db) return db;
    if (!window.sigmaSupabase) throw new Error('Client Supabase absent');
    return null;
  }

  function missing(err) {
    var m = (err && (err.message || err.details || err.hint)) || '';
    return /does not exist|schema cache|Could not find the table|undefined table/i.test(m);
  }
  function raise(err, table) {
    var e = new Error(err.message || ('Erreur sur ' + table));
    e.table = table;
    e.missing = missing(err);
    throw e;
  }

  /* ---------------- utilitaires ---------------- */
  function isoLocal(d) {
    var x = d || new Date();
    var m = x.getMonth() + 1, j = x.getDate();
    return x.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (j < 10 ? '0' + j : j);
  }
  function startOfMonth(d) { var x = d || new Date(); return new Date(x.getFullYear(), x.getMonth(), 1); }
  function endOfMonth(d) { var x = d || new Date(); return new Date(x.getFullYear(), x.getMonth() + 1, 0); }

  /* ---------------- lecture ---------------- */
  async function init() {
    db = await window.sigmaSupabase.getClient();
    return db;
  }

  async function loadAgents() {
    var res = await db.from('agents')
      .select('id, full_name, staff_id, active, team, activity')
      .eq('activity', ACTIVITY)
      .order('full_name');
    if (res.error) {
      // repli si la colonne activity n'existe pas encore
      var alt = await db.from('agents').select('id, full_name, staff_id, active, team').order('full_name');
      if (alt.error) raise(alt.error, 'agents');
      return (alt.data || []).filter(function (a) { return /pgv/i.test(a.team || ''); });
    }
    return res.data || [];
  }

  async function loadElements() {
    var res = await db.from('qa_elements')
      .select('id, code, category, label, position, weight, critical, na_allowed, activity')
      .eq('activity', ACTIVITY).eq('active', true).order('position');
    if (res.error) raise(res.error, 'qa_elements');
    return res.data || [];
  }

  /* Tous les calibrages avec leurs réponses, pour le calendrier. */
  async function loadCalibrationsFull(from, to) {
    var res = await db.from('calibrations')
      .select('id, agent_id, call_id, call_date, calibration_date, status, activity, channel, ' +
              'evaluator_name, evaluator, language, notes, calibration_results(element_id, result, reason)')
      .eq('activity', ACTIVITY)
      .gte('calibration_date', from)
      .lte('calibration_date', to)
      .order('calibration_date', { ascending: false });
    if (res.error) raise(res.error, 'calibrations');
    return res.data || [];
  }

  async function loadCalibrations(from, to, agentId) {
    var q = db.from('calibrations')
      .select('id, agent_id, call_id, call_date, calibration_date, status, activity, channel, evaluator_name, notes')
      .eq('activity', ACTIVITY)
      .gte('calibration_date', from || isoLocal(startOfMonth()))
      .lte('calibration_date', to || isoLocal(endOfMonth()))
      .order('calibration_date', { ascending: false });
    if (agentId) q = q.eq('agent_id', agentId);
    var res = await q;
    if (res.error) raise(res.error, 'calibrations');
    return res.data || [];
  }

  async function loadResults(ids) {
    if (!ids || !ids.length) return [];
    var res = await db.from('calibration_results')
      .select('calibration_id, element_id, result, reason').in('calibration_id', ids);
    if (res.error) raise(res.error, 'calibration_results');
    return res.data || [];
  }

  /* ---------------- écriture calibrage ---------------- */
  async function updateCalibration(id, row) {
    var calRes = await db.from('calibrations').update({
      agent_id: row.agentId,
      call_id: row.callId || null,
      call_date: row.callDate || row.date,
      calibration_date: row.date,
      status: row.status || 'Terminé',
      language: row.language || 'Français',
      evaluator: row.evaluator_kind || 'Autre',
      evaluator_name: row.evaluator || null,
      notes: row.notes || null
    }).eq('id', id).eq('activity', ACTIVITY).select().single();
    if (calRes.error) raise(calRes.error, 'calibrations');

    var rows = (row.elements || []).map(function (el, i) {
      var v = (row.values || [])[i] || 'N/A';
      return {
        calibration_id: id, element_id: el.id, result: v,
        reason: (v === 'Non' && row.reasons && row.reasons[i]) ? row.reasons[i] : null
      };
    });
    if (rows.length) {
      var result = await db.from('calibration_results').upsert(rows, { onConflict: 'calibration_id,element_id' });
      if (result.error) raise(result.error, 'calibration_results');
    }
    return calRes.data;
  }

  async function saveCalibration(row) {
    // row = { agentId, callId, callDate, date, status, evaluator, notes, values[], reasons[], elements[] }
    var user = null;
    try { var a = await db.auth.getUser(); user = a.data && a.data.user; } catch (e) {}

    var cal = await db.from('calibrations').insert({
      agent_id: row.agentId,
      call_id: row.callId || null,
      call_date: row.callDate || row.date,
      calibration_date: row.date,
      status: row.status || 'Terminé',
      // Les colonnes sont des enums historiques : la langue attend le libellé,
      // et le type d'évaluateur est « Autre » quand le nom est saisi librement.
      language: row.language || 'Français',
      evaluator: row.evaluator_kind || 'Autre',
      evaluator_name: row.evaluator || (user && user.email) || null,
      notes: row.notes || null,
      activity: ACTIVITY,
      channel: 'call',
      created_by: user ? user.id : null
    }).select().single();
    if (cal.error) raise(cal.error, 'calibrations');

    var rows = (row.elements || []).map(function (el, i) {
      var v = (row.values || [])[i] || 'N/A';
      return {
        calibration_id: cal.data.id,
        element_id: el.id,
        result: v,
        reason: (v === 'Non' && row.reasons && row.reasons[i]) ? row.reasons[i] : null
      };
    });
    if (rows.length) {
      var res = await db.from('calibration_results').insert(rows).select();
      if (res.error) {
        // on ne laisse pas un calibrage orphelin
        try { await db.from('calibrations').delete().eq('id', cal.data.id); } catch (e) {}
        raise(res.error, 'calibration_results');
      }
    }
    return cal.data;
  }

  /* ---------------- documents de suivi (FISS) ---------------- */
  async function loadDocuments(from, to, agentId) {
    var q = db.from('documents')
      .select('id, doc_type, object, meeting_date, follow_up_date, agent_id, call_id, ' +
              'visibility, status, facts, impacts, solutions, followup, activity, created_at')
      .eq('activity', ACTIVITY)
      .order('meeting_date', { ascending: false });
    if (from) q = q.gte('meeting_date', from);
    if (to) q = q.lte('meeting_date', to);
    if (agentId) q = q.eq('agent_id', agentId);
    var res = await q;
    if (res.error) raise(res.error, 'documents');
    return res.data || [];
  }

  async function saveDocument(row) {
    var user = null;
    try { var a = await db.auth.getUser(); user = a.data && a.data.user; } catch (e) {}
    var payload = {
      doc_type: row.type,
      object: row.object || null,
      meeting_date: row.meetingDate,
      follow_up_date: row.followUpDate || null,
      agent_id: row.agentId,
      call_id: row.callId || null,
      visibility: row.visibility || 'supervisor',
      status: row.status || 'Planifié',
      facts: row.facts || null,
      impacts: row.impacts || null,
      solutions: row.solutions || null,
      followup: row.followup || null,
      activity: ACTIVITY,
      channel: 'call'
    };
    var res;
    if (row.id) res = await db.from('documents').update(payload).eq('id', row.id).select().single();
    else {
      payload.created_by = user ? user.id : null;
      res = await db.from('documents').insert(payload).select().single();
    }
    if (res.error) raise(res.error, 'documents');
    return res.data;
  }

  async function deleteDocument(id) {
    var r = await db.from('documents').delete().eq('id', id);
    if (r.error) raise(r.error, 'documents');
    return true;
  }

  /* Document de suivi (format FISS) créé depuis un calibrage, pour coacher
     les points non maîtrisés. Le calibrage est lié via call_id + agent. */
  async function createFollowUpDoc(row) {
    var user = null;
    try { var a = await db.auth.getUser(); user = a.data && a.data.user; } catch (e) {}
    var res = await db.from('documents').insert({
      doc_type: 'Rencontre',
      object: row.object || 'Calibrage',
      meeting_date: row.meetingDate,
      follow_up_date: row.followUpDate || null,
      agent_id: row.agentId,
      call_id: row.callId || null,
      visibility: 'agent',
      status: 'Planifié',
      facts: row.facts || null,
      impacts: row.impacts || null,
      solutions: row.solutions || null,
      followup: row.followup || null,
      activity: ACTIVITY,
      created_by: user ? user.id : null
    }).select().single();
    if (res.error) raise(res.error, 'documents');
    return res.data;
  }

  async function deleteCalibration(id) {
    var r = await db.from('calibration_results').delete().eq('calibration_id', id);
    if (r.error) raise(r.error, 'calibration_results');
    var c = await db.from('calibrations').delete().eq('id', id);
    if (c.error) raise(c.error, 'calibrations');
    return true;
  }

  /* ---------------- planning ---------------- */
  async function loadShifts() {
    var res = await db.from('planning_shifts')
      .select('code, label, start_time, end_time, is_work, break_minutes, color')
      .eq('activity', ACTIVITY).order('is_work', { ascending: false });
    if (res.error) raise(res.error, 'planning_shifts');
    return res.data || [];
  }

  async function loadPlanning(from, to) {
    var res = await db.from('planning_entries')
      .select('id, agent_id, work_date, shift_code, start_time, end_time')
      .eq('activity', ACTIVITY).gte('work_date', from).lte('work_date', to);
    if (res.error) raise(res.error, 'planning_entries');
    return res.data || [];
  }

  async function savePlanningEntry(agentId, workDate, shiftCode, note) {
    var res = await db.from('planning_entries').upsert({
      activity: ACTIVITY, agent_id: agentId, work_date: workDate,
      shift_code: shiftCode, note: note || null, updated_at: new Date().toISOString()
    }, { onConflict: 'activity,agent_id,work_date' }).select().single();
    if (res.error) raise(res.error, 'planning_entries');
    return res.data;
  }

  async function clearPlanningEntry(agentId, workDate) {
    var res = await db.from('planning_entries').delete()
      .eq('activity', ACTIVITY).eq('agent_id', agentId).eq('work_date', workDate);
    if (res.error) raise(res.error, 'planning_entries');
    return true;
  }

  /* ---------------- présence ---------------- */
  async function loadAttendance(workDate, agentId) {
    var q = db.from('attendance_events')
      .select('id, agent_id, event_type, break_type, occurred_at, work_date, source')
      .eq('activity', ACTIVITY).eq('work_date', workDate)
      .order('occurred_at');
    if (agentId) q = q.eq('agent_id', agentId);
    var res = await q;
    if (res.error) raise(res.error, 'attendance_events');
    return res.data || [];
  }

  async function loadAttendanceRange(from, to) {
    var res = await db.from('attendance_events')
      .select('id, agent_id, event_type, break_type, occurred_at, work_date, source')
      .eq('activity', ACTIVITY).gte('work_date', from).lte('work_date', to)
      .order('occurred_at');
    if (res.error) raise(res.error, 'attendance_events');
    return res.data || [];
  }

  async function loadTeamPresence(workDate) {
    var res = await db.from('attendance_team_presence_live')
      .select('agent_id, status, state_since, updated_at, elapsed_seconds')
      .eq('activity', ACTIVITY).eq('work_date', workDate || isoLocal());
    if (res.error) raise(res.error, 'attendance_team_presence');
    return res.data || [];
  }

  async function addEvent(agentId, eventType, breakType, workDate, source, note) {
    var payload = {
      activity: ACTIVITY, agent_id: agentId, event_type: eventType,
      work_date: workDate || isoLocal(),
      source: source || 'agent', note: note || null
    };
    if (breakType) payload.break_type = breakType;
    var res = await db.from('attendance_events').insert(payload).select().single();
    if (res.error) raise(res.error, 'attendance_events');
    return res.data;
  }

  async function loadBreakSettings() {
    var res = await db.from('attendance_settings')
      .select('break_type, max_minutes, max_per_day').eq('activity', ACTIVITY);
    if (res.error) raise(res.error, 'attendance_settings');
    return res.data || [];
  }

  async function loadAcks(workDate, agentId) {
    var q = db.from('attendance_alert_acks')
      .select('agent_id, alert_code').eq('activity', ACTIVITY).eq('work_date', workDate);
    if (agentId) q = q.eq('agent_id', agentId);
    var res = await q;
    if (res.error) return [];                    // non bloquant
    return res.data || [];
  }

  async function ackAlert(agentId, workDate, alertCode) {
    var res = await db.from('attendance_alert_acks').upsert({
      activity: ACTIVITY, agent_id: agentId, work_date: workDate, alert_code: alertCode, acked_at: new Date().toISOString()
    }, { onConflict: 'activity,agent_id,work_date,alert_code' });
    if (res.error) raise(res.error, 'attendance_alert_acks');
    return true;
  }

  /* ---------------- emails ---------------- */
  async function loadRotation() {
    var res = await db.from('email_rotation')
      .select('position, agent_id, active').eq('activity', ACTIVITY).order('position');
    if (res.error) raise(res.error, 'email_rotation');
    return res.data || [];
  }

  async function loadEmailSettings() {
    var res = await db.from('email_settings')
      .select('anchor_date, skip_weekend, target_sac_pct, active').eq('activity', ACTIVITY).maybeSingle();
    if (res.error) raise(res.error, 'email_settings');
    return res.data || { anchor_date: isoLocal(), skip_weekend: true, target_sac_pct: 98, active: true };
  }

  async function loadEmailDays(from, to) {
    var res = await db.from('email_days')
      .select('id, work_date, planned_agent_id, duty_agent_id, received_total, received_sac, non_sac_spam, non_sac_pub, non_sac_autre_departement, non_sac_autre, treated_sac, note')
      .eq('activity', ACTIVITY).gte('work_date', from).lte('work_date', to).order('work_date');
    if (res.error) raise(res.error, 'email_days');
    return res.data || [];
  }

  async function saveEmailAgentRow(workDate, agentId, sac, other, note) {
    var res = await db.from('email_agent_daily').upsert({
      activity: ACTIVITY, work_date: workDate, agent_id: agentId,
      treated_sac: Math.max(0, +sac || 0),
      treated_other: Math.max(0, +other || 0),
      note: note || null
    }, { onConflict: 'activity,work_date,agent_id' }).select().single();
    if (res.error) raise(res.error, 'email_agent_daily');
    return res.data;
  }

  async function saveEmailDay(row) {
    var res = await db.from('email_days').upsert({
      activity: ACTIVITY,
      work_date: row.work_date,
      planned_agent_id: row.planned_agent_id || null,
      duty_agent_id: row.duty_agent_id || null,
      received_total: row.received_total || 0,
      received_sac: row.received_sac || 0,
      non_sac_spam: row.non_sac_spam || 0,
      non_sac_pub: row.non_sac_pub || 0,
      non_sac_autre_departement: row.non_sac_autre_departement || 0,
      non_sac_autre: row.non_sac_autre || 0,
      treated_sac: row.treated_sac || 0,
      note: row.note || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'activity,work_date' }).select().single();
    if (res.error) raise(res.error, 'email_days');
    return res.data;
  }

  /* ---------------- activité quotidienne de l'agent (appels) ---------------- */
  async function loadAgentActivity(from, to, agentId) {
    var q = db.from('agent_daily_activity')
      .select('id, work_date, agent_id, calls_received, calls_treated, note')
      .eq('activity', ACTIVITY).gte('work_date', from).lte('work_date', to);
    if (agentId) q = q.eq('agent_id', agentId);
    var res = await q.order('work_date');
    if (res.error) raise(res.error, 'agent_daily_activity');
    return res.data || [];
  }

  async function saveAgentActivityAgent(agentId, workDate, callsReceived, note) {
    var res = await db.from('agent_daily_activity').upsert({
      activity: ACTIVITY, work_date: workDate, agent_id: agentId,
      calls_received: Math.max(0, +callsReceived || 0),
      note: note || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'activity,work_date,agent_id' }).select().single();
    if (res.error) raise(res.error, 'agent_daily_activity');
    return res.data;
  }

  async function loadEmailAgents(from, to) {
    var res = await db.from('email_agent_daily')
      .select('work_date, agent_id, treated_sac, treated_other, note')
      .eq('activity', ACTIVITY).gte('work_date', from).lte('work_date', to);
    if (res.error) raise(res.error, 'email_agent_daily');
    return res.data || [];
  }

  /* ---------------- rotation (calcul pur) ---------------- */
  // Simulation : le curseur n'avance que les jours où au moins un agent travaille.
  function simulateRotation(fromISO, toISO, rotationIds, planningMap, skipWeekend) {
    var out = [], cursor = 0, d = fromISO;
    if (!rotationIds.length) return out;
    while (d <= toISO) {
      var dow = new Date(d + 'T00:00:00').getDay();
      var open = !(skipWeekend && (dow === 0 || dow === 6));
      var working = rotationIds.filter(function (id) {
        var p = planningMap[d] && planningMap[d][id];
        return p && p.is_work;
      });
      if (!open || !working.length) {
        out.push({ date: d, planned: null, duty: null, open: false, replacement: false });
        d = nextDay(d);
        continue;
      }
      var planned = rotationIds[cursor % rotationIds.length];
      var duty = planned, offset = 0;
      if (working.indexOf(planned) < 0) {
        for (var k = 1; k < rotationIds.length; k++) {
          var cand = rotationIds[(cursor + k) % rotationIds.length];
          if (working.indexOf(cand) >= 0) { duty = cand; offset = k; break; }
        }
      }
      out.push({ date: d, planned: planned, duty: duty, open: true, replacement: offset > 0 });
      cursor++;
      d = nextDay(d);
    }
    return out;
  }
  function nextDay(iso) {
    var x = new Date(iso + 'T00:00:00');
    x.setDate(x.getDate() + 1);
    var m = x.getMonth() + 1, j = x.getDate();
    return x.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (j < 10 ? '0' + j : j);
  }

  /* ---------------- cache ---------------- */
  function cacheSet(key, value) {
    try {
      var all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      all[key] = { at: Date.now(), value: value };
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch (e) {}
  }
  function cacheGet(key) {
    try {
      var all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      return all[key] ? all[key].value : null;
    } catch (e) { return null; }
  }
  function cacheClear() {
    try {
      var all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      Object.keys(all).forEach(function (k) {
        try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
      });
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {}
  }

  window.pgvData = {
    ACTIVITY: ACTIVITY,
    init: init,
    iso: isoLocal,
    startOfMonth: function () { return isoLocal(startOfMonth()); },
    endOfMonth: function () { return isoLocal(endOfMonth()); },
    loadAgents: loadAgents,
    loadElements: loadElements,
    loadCalibrations: loadCalibrations,
    loadCalibrationsFull: loadCalibrationsFull,
    loadResults: loadResults,
    saveCalibration: saveCalibration,
    updateCalibration: updateCalibration,
    deleteCalibration: deleteCalibration,
    loadDocuments: loadDocuments,
    saveDocument: saveDocument,
    deleteDocument: deleteDocument,
    createFollowUpDoc: createFollowUpDoc,
    loadShifts: loadShifts,
    loadPlanning: loadPlanning,
    savePlanningEntry: savePlanningEntry,
    clearPlanningEntry: clearPlanningEntry,
    loadAttendance: loadAttendance,
    loadAttendanceRange: loadAttendanceRange,
    loadTeamPresence: loadTeamPresence,
    addEvent: addEvent,
    loadBreakSettings: loadBreakSettings,
    loadAcks: loadAcks,
    ackAlert: ackAlert,
    loadRotation: loadRotation,
    loadEmailSettings: loadEmailSettings,
    loadEmailDays: loadEmailDays,
    saveEmailDay: saveEmailDay,
    loadEmailAgents: loadEmailAgents,
    simulateRotation: simulateRotation,
    nextDay: nextDay,
    cacheSet: cacheSet,
    cacheGet: cacheGet,
    cacheClear: cacheClear,
    loadAgentActivity: loadAgentActivity,
    saveAgentActivityAgent: saveAgentActivityAgent,
    saveEmailAgentRow: saveEmailAgentRow,
    isMissing: function (e) { return !!(e && e.missing); }
  };
})();
