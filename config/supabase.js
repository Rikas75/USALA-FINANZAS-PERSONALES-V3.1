// ─────────────────────────────────────────────
//  USALA Suite — Base de Datos & Configuración
//  config/supabase.js  ·  carga PRIMERO
// ─────────────────────────────────────────────

var SUPA_URL = 'https://mdllmtuitgsqlpjmnllf.supabase.co';
var SUPA_KEY = 'sb_publishable_I8RyoelqHZrsiM-4K6ypGg_5Ze5BSNG';

var DB = {
  _h: function(){ return { 'Content-Type':'application/json', 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Prefer': 'return=representation' }; },
  get: async function(table, params){
    var url = SUPA_URL + '/rest/v1/' + table;
    if(params) url += '?' + params;
    var r = await fetch(url, { headers: DB._h() });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  },
  insert: async function(table, data){
    var r = await fetch(SUPA_URL + '/rest/v1/' + table, {
      method: 'POST', headers: DB._h(), body: JSON.stringify(data)
    });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  },
  update: async function(table, match, data){
    var url = SUPA_URL + '/rest/v1/' + table + '?' + match;
    var r = await fetch(url, {
      method: 'PATCH',
      headers: Object.assign({}, DB._h(), {'Prefer':'return=representation'}),
      body: JSON.stringify(data)
    });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  },
  upsert: async function(table, data, onConflict){
    var h = Object.assign({}, DB._h(), {'Prefer':'resolution=merge-duplicates,return=representation'});
    if(onConflict) h['Prefer'] += ',on_conflict=' + onConflict;
    var r = await fetch(SUPA_URL + '/rest/v1/' + table, {
      method: 'POST', headers: h, body: JSON.stringify(data)
    });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  },
  del: async function(table, match){
    var url = SUPA_URL + '/rest/v1/' + table + '?' + match;
    var r = await fetch(url, { method: 'DELETE', headers: DB._h() });
    if(!r.ok) throw new Error(await r.text());
    return true;
  }
};
