const AGENTS = [
  { id:'a1', full_name:'Amadou AliBa', staff_id:'209217', active:true, team:'SAC PGV', activity:'pgv' },
  { id:'a2', full_name:'Elagbi Zineb', staff_id:'203858', active:true, team:'SAC PGV', activity:'pgv' },
  { id:'a3', full_name:'Miri Hind', staff_id:'204186', active:true, team:'SAC PGV', activity:'pgv' }
];
// grille réelle : lue depuis le fichier livré, pour que les tests ne divergent jamais
const vm = require('vm');
const fs = require('fs');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync('/home/user/sigma-build/js/pgv-grid.js', 'utf8'), sandbox);
const GRID = sandbox.window.PGV_GRID;
const ELEMENTS = GRID.map((g, i) => ({
  id: 'e' + i, code: g.code, category: g.cat, label: g.label,
  position: i + 1, weight: g.weight, critical: g.critical,
  na_allowed: g.na, activity: 'pgv', active: true
}));
const TABLES = {
  agents: AGENTS, qa_elements: ELEMENTS,
  calibrations: [
    { activity:'pgv', id:'cal1', agent_id:'a1', call_id:'204186-1611', call_date:'2026-11-08',
      calibration_date:'2026-11-08', status:'Terminé', evaluator_name:'Jawad', notes:null,
      calibration_results:[{element_id:'e0',result:'Oui',reason:null},{element_id:'e1',result:'Non',reason:'x'},
                           {element_id:'e2',result:'Oui',reason:null},{element_id:'e3',result:'N/A',reason:null}] }
  ],
  calibration_results: [],
  planning_shifts: [{activity:'pgv',code:'M',label:'Après-midi',start_time:'14:00:00',end_time:'23:00:00',is_work:true,break_minutes:60},
                    {activity:'pgv',code:'SAT',label:'Samedi',start_time:'14:00:00',end_time:'18:00:00',is_work:true,break_minutes:0},
                    {activity:'pgv',code:'OFF',label:'Repos',start_time:null,end_time:null,is_work:false,break_minutes:0}],
  planning_entries: [], attendance_events: [], attendance_settings: [
    {activity:'pgv',break_type:'pause',max_minutes:15,max_per_day:2},
    {activity:'pgv',break_type:'lunch',max_minutes:60,max_per_day:1},
    {activity:'pgv',break_type:'sortie',max_minutes:5,max_per_day:2},
    {activity:'pgv',break_type:'rencontre',max_minutes:30,max_per_day:1},
    {activity:'pgv',break_type:'reunion',max_minutes:30,max_per_day:1}
  ], attendance_alert_acks: [],
  email_rotation: [{activity:'pgv',position:1,agent_id:'a1',active:true},{activity:'pgv',position:2,agent_id:'a2',active:true}],
  email_settings: [{activity:'pgv',anchor_date:'2026-11-16',skip_weekend:true,target_sac_pct:98,active:true}],
  email_days: [], email_agent_daily: [], agent_daily_activity: [],
  documents: [
    { activity:'pgv', id:'doc1', doc_type:'Rencontre', object:'Performance', meeting_date:'2026-11-10',
      follow_up_date:'2026-11-20', agent_id:'a1', call_id:'204186-1611', visibility:'agent',
      status:'Planifié', facts:'Rencontre sur le calibrage du 08/11.', impacts:'Deux critères en écart.',
      solutions:'Reprendre la reformulation.', followup:'Réécoute de contrôle.', created_at:'2026-11-10T10:00:00' },
    { activity:'pgv', id:'doc2', doc_type:'Feedback', object:'Positif', meeting_date:'2026-11-12',
      follow_up_date:null, agent_id:'a2', call_id:null, visibility:'supervisor',
      status:'Terminé', facts:'Appel salué par le client.', impacts:'RAS', solutions:'Partager la pratique.',
      followup:null, created_at:'2026-11-12T15:00:00' }
  ]
};
const MOCK = `
window.SIGMA_SUPABASE_URL="https://demo.supabase.co"; window.SIGMA_SUPABASE_ANON_KEY="demo";
window.__MOCK_PROFILE={displayName:'Jawad Test',email:'j@acx.ma',role:'superviseur',agentId:'a1',agentName:'Amadou AliBa'};
window.__SIGMA_READY=Promise.resolve(window.__MOCK_PROFILE);
(function(){
 var DATA=${JSON.stringify(TABLES)}; window.__DATA=DATA;
 function chain(t){ var rows=DATA[t]?JSON.parse(JSON.stringify(DATA[t])):[];
  var api={select:function(){return api},order:function(){return api},
   eq:function(k,v){rows=rows.filter(function(r){return r[k]===v});return api},
   in:function(k,a){rows=rows.filter(function(r){return a.indexOf(r[k])>=0});return api},
   gte:function(k,v){rows=rows.filter(function(r){return String(r[k])>=String(v)});return api},
   lte:function(k,v){rows=rows.filter(function(r){return String(r[k])<=String(v)});return api},
   maybeSingle:function(){return Promise.resolve({data:rows[0]||null,error:null})},
   single:function(){ if(rows.length) return Promise.resolve({data:rows[0],error:null});
     var last=DATA[t]&&DATA[t][DATA[t].length-1]; return Promise.resolve({data:last||null,error:null}); },
   insert:function(r){var a=Array.isArray(r)?r:[r]; a.forEach(function(x){if(t==='attendance_events'&&!x.occurred_at)x.occurred_at=new Date().toISOString();DATA[t].push(x)}); return chain(t)},
   upsert:function(r){var a=Array.isArray(r)?r:[r]; a.forEach(function(x){DATA[t].push(x)}); return chain(t)},
   delete:function(){return api},
   then:function(res){res({data:rows,error:null})}};
  return api; }
 window.sigmaSupabase={getClient:function(){return Promise.resolve({from:chain,rpc:function(){return Promise.resolve({data:[],error:null})},auth:{getUser:function(){return Promise.resolve({data:{user:{id:'u1',email:'j@acx.ma'}}})},resetPasswordForEmail:function(){return Promise.resolve({error:null})}}})},signOut:function(){return Promise.resolve()}};
})();
`;
module.exports = { TABLES, MOCK };
