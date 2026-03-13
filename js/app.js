// ─────────────────────────────────────────────
//  USALA Suite — App Core
//  js/app.js
// ─────────────────────────────────────────────

// ── Variables globales ──


// ── Sync Keys ──


function fmt(n){ return getSimboloMoneda() + Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2}); }

function today(){ return new Date().toISOString().split('T')[0]; }

function getSimboloMoneda(){
  var key = 'usala_moneda_app_' + (S.user ? (S.user.isAdmin ? 'admin' : S.user.codigo) : 'anon');
  try{ var m = JSON.parse(localStorage.getItem(key)||'null'); return m ? m.simbolo : '$'; }catch(e){ return '$'; }
}


function ukey(k){
  var uid = S.user ? (S.user.isAdmin ? 'admin' : 'u_' + S.user.codigo) : 'anon';
  return 'usala_' + uid + '_' + k;
}

function load(k, def){
  try{ var v=localStorage.getItem(ukey(k)); return v!==null?JSON.parse(v):def; }catch(e){ return def; }
}

function save(k, v){
  try{ localStorage.setItem(ukey(k), JSON.stringify(v)); }catch(e){}
  if(S && S.user){ _syncQueue.push({key:k, value:v}); _schedulSync(); }
}

function _cacheGet(k){ if(_cacheTs[k] && Date.now()-_cacheTs[k]<CACHE_TTL) return _cache[k]; return null; }

function _cacheSet(k,v){ _cache[k]=v; _cacheTs[k]=Date.now(); }

function _cacheInvalid(k){ delete _cache[k]; delete _cacheTs[k]; }

function _cacheInvalidUser(){ var uc=getUCod(); Object.keys(_cache).forEach(function(k){ if(k.indexOf(uc)===0) { delete _cache[k]; delete _cacheTs[k]; } }); }

function _syncShowOverlay(show){
  var el = document.getElementById('syncLoadingOverlay');
  if(!el) return;
  el.style.display = show ? 'flex' : 'none';
}

function _syncSetProgress(msg, pct){
  var m = document.getElementById('syncLoadingMsg');
  var b = document.getElementById('syncLoadingBar');
  if(m) m.textContent = msg;
  if(b) b.style.width = pct + '%';
}

async function _flushSync(){
  if(!S.user || _syncQueue.length === 0) return;
  var uc = getUCod();
  var batch = _syncQueue.splice(0, _syncQueue.length);
  var latest = {};
  batch.forEach(function(op){ latest[op.key] = op; });
  _setSyncIndicator('syncing');
  var ok = 0, fail = 0;
  for(var key in latest){
    var op = latest[key];
    try {
      await DB.upsert('usala_kv', {
        user_codigo: uc,
        key: key,
        value: JSON.stringify(op.value),
        updated_at: new Date().toISOString()
      }, 'user_codigo,key');
      ok++;
    } catch(e) {
      _syncQueue.push(op);
      fail++;
    }
  }
  _setSyncIndicator(fail > 0 ? 'error' : 'ok');
}

async function dbRestaurarDatos(){
  var uc = getUCod();
  if(!uc){ console.warn('dbRestaurarDatos: sin usuario'); return; }
  _syncShowOverlay(true);
  _syncSetProgress('Conectando con la nube...', 10);
  try {
    // 1. Descargar TODO el KV del usuario desde Supabase
    var remote = await DB.get('usala_kv',
      'user_codigo=eq.' + encodeURIComponent(uc) + '&order=updated_at.desc');
    _syncSetProgress('Datos recibidos, aplicando...', 50);
    if(remote && remote.length > 0){
      var hayDatosRemoto = false;
      remote.forEach(function(row){
        try {
          var localKey = 'usala_' + uc + '_' + row.key;
          var localRaw = localStorage.getItem(localKey);
          var remoteVal = JSON.parse(row.value);
          var localVacio = !localRaw ||
            (function(v){ try{ var p=JSON.parse(v);
              return (Array.isArray(p)&&p.length===0)||(typeof p==='object'&&!Array.isArray(p)&&Object.keys(p||{}).length===0);
            }catch(e){ return true; } })(localRaw);
          if(localVacio){
            localStorage.setItem(localKey, row.value);
            _cacheInvalid(uc + '_kv_' + row.key);
            hayDatosRemoto = true;
          } else {
            try {
              var localVal = JSON.parse(localRaw);
              var remoteArr = Array.isArray(remoteVal) ? remoteVal : null;
              var localArr  = Array.isArray(localVal)  ? localVal  : null;
              if(remoteArr && localArr && remoteArr.length > localArr.length){
                localStorage.setItem(localKey, row.value);
                _cacheInvalid(uc + '_kv_' + row.key);
                hayDatosRemoto = true;
              }
            } catch(e){}
          }
        } catch(e){ console.warn('Error aplicando key:', row.key, e); }
      });
      _syncSetProgress(hayDatosRemoto ? 'Datos restaurados ✓' : 'Datos locales al día ✓', 80);
    } else {
      _syncSetProgress('Subiendo datos locales...', 60);
      _SYNC_KEYS.forEach(function(key){
        var raw = localStorage.getItem('usala_' + uc + '_' + key);
        if(raw){ try{
          var v = JSON.parse(raw);
          var noVacio = (Array.isArray(v)&&v.length>0)||(typeof v==='object'&&!Array.isArray(v)&&Object.keys(v||{}).length>0);
          if(noVacio) _syncQueue.push({key:key, value:v});
        }catch(e){} }
      });
      if(_syncQueue.length > 0) _flushSync();
      _syncSetProgress('Datos guardados en nube ✓', 80);
    }
    var cuentasKey = 'usala_cuentas_' + (S.user.isAdmin ? 'admin' : 'u_' + uc);
    if(!localStorage.getItem(cuentasKey)){
      var remCuentas = remote ? remote.find(function(r){ return r.key === 'cuentas'; }) : null;
      if(remCuentas){
        localStorage.setItem(cuentasKey, remCuentas.value);
      }
    }
    _syncSetProgress('Listo', 100);
    await new Promise(function(r){ setTimeout(r, 400); }); // pequeña pausa visual
  } catch(e){
    _syncSetProgress('Sin conexión — usando datos locales', 100);
    console.warn('dbRestaurarDatos offline:', e.message);
    await new Promise(function(r){ setTimeout(r, 600); });
  }
  _syncShowOverlay(false);
}

async function dbSyncFromLocal(){
  var uc = getUCod(); if(!uc) return;
  var keys = ['txs','cuentas','creditos','metas','pagos_mensuales','activos_personales',
              'presupuesto','alertas','cats_gasto_custom','cats_ingreso_custom',
              'cats_activos_custom','cats_pagos_custom','cxc'];
  console.log('🔄 Sincronizando con Supabase...');
  try {
    // 1. Bajar TODO lo que hay en remoto para este usuario
    var remote = await DB.get('usala_kv',
      'user_codigo=eq.'+encodeURIComponent(uc)+'&order=updated_at.desc');
    var remoteMap = {};
    if(remote && remote.length > 0){
      remote.forEach(function(row){ remoteMap[row.key] = row; });
    }
    keys.forEach(function(key){
      var localKey = 'usala_' + uc + '_' + key;
      var localRaw = localStorage.getItem(localKey);
      var remoteRow = remoteMap[key];
      if(remoteRow && localRaw){
        try{
          var localVal = JSON.parse(localRaw);
          var remoteVal = JSON.parse(remoteRow.value);
          var localVacio = (Array.isArray(localVal) && localVal.length===0) ||
                           (typeof localVal==='object' && !Array.isArray(localVal) && Object.keys(localVal||{}).length===0);
          if(localVacio && remoteVal){
            localStorage.setItem(localKey, remoteRow.value);
            _cacheInvalid(uc+'_kv_'+key);
            console.log('  ⬇️ Descargado desde nube:', key);
          } else {
            _syncQueue.push({key:key, value:localVal});
          }
        } catch(e){}
      } else if(remoteRow && !localRaw){
        localStorage.setItem(localKey, remoteRow.value);
        _cacheInvalid(uc+'_kv_'+key);
        console.log('  ⬇️ Descargado desde nube:', key);
      } else if(!remoteRow && localRaw){
        try{
          var v = JSON.parse(localRaw);
          var noVacio = (Array.isArray(v)&&v.length>0)||(typeof v==='object'&&!Array.isArray(v)&&Object.keys(v||{}).length>0);
          if(noVacio){ _syncQueue.push({key:key, value:v}); console.log('  ⬆️ Subiendo a nube:', key); }
        } catch(e){}
      }
    });
    if(_syncQueue.length > 0){ await _flushSync(); }
    if(remote && remote.length > 0 && S.tab){
      setTimeout(function(){ renderTab(S.tab); }, 100);
    }
    console.log('✅ Sync completo');
  } catch(e) {
    console.warn('⚠️ Sync falló (modo offline):', e.message);
  }
}

function iniciarRealtime(){
  if(_realtimeInterval) clearInterval(_realtimeInterval);
  _realtimeActivo = true;
  _lastSyncTs = new Date().toISOString();
  _realtimeTick();
  _realtimeInterval = setInterval(_realtimeTick, 30000);
  console.log('⚡ Realtime activo — sync cada 30s');
}

function _lockIniciarEscuchas(){
  ['touchstart','mousedown','keydown','scroll'].forEach(function(ev){
    document.addEventListener(ev, _lockActividad, {passive:true});
  });
}

function _lockReiniciar(){
  if(_lockTimer) clearTimeout(_lockTimer);
  var mins = getLockTimeout();
  if(!mins || _lockActivo) return;
  _lockTimer = setTimeout(function(){ _lockBloqueAhora(); }, mins * 60 * 1000);
}

function _lockVerificar(){
  var nipK = S.user.isAdmin ? 'usala_nip_admin' : 'usala_nip_u_'+S.user.codigo;
  var nip  = localStorage.getItem(nipK);
  if(nip && _lockPin === nip){
    lockDesbloquear();
  } else {
    for(var i=0;i<4;i++) document.getElementById('ld'+i).classList.add('error');
    document.getElementById('lockErr').textContent = '⚠ NIP incorrecto';
    setTimeout(function(){
      _lockPin=''; _lockActualizarDots();
      document.getElementById('lockErr').textContent='';
    }, 900);
  }
}

function getCuentas(){ return JSON.parse(localStorage.getItem('usala_cuentas_'+(S.user.isAdmin?'admin':'u_'+S.user.codigo))||'{"efectivo":0,"cheques":[],"tarjetas":[]}'); }

function saveCuentas(c){ localStorage.setItem('usala_cuentas_'+(S.user.isAdmin?'admin':'u_'+S.user.codigo), JSON.stringify(c)); }

function renderCuentas(){
  var c = getCuentas();
  var saldoEfec = (c.efectivo||0);
  var totalCheques = (c.cheques||[]).reduce(function(s,x){ return s+Number(x.saldo||0); },0);
  var totalTC = (c.tarjetas||[]).reduce(function(s,t){ return s+Number(t.balance||0); },0);
  var totalDisp = saldoEfec + totalCheques;
  var bancosHTML = (c.cheques||[]).map(function(ch){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">'
      +'<div style="display:flex;align-items:center;gap:10px;">'
      +'<div style="width:32px;height:32px;border-radius:10px;background:var(--inp);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:0.9rem;">🏧</div>'
      +'<div><div style="font-weight:700;font-size:0.85rem;color:var(--text);">'+ch.banco+'</div>'
      +'<div style="font-size:0.65rem;color:var(--dim);">'+ch.tipo+'</div></div>'
      +'</div>'
      +'<div style="font-weight:800;font-size:0.92rem;color:var(--text);font-family:JetBrains Mono,monospace;">'+fmt(ch.saldo||0)+'</div>'
      +'</div>';
  }).join('') || '<div style="color:var(--dim);font-size:0.8rem;padding:10px 0;">Sin cuentas bancarias</div>';
  var tcHTML = (c.tarjetas||[]).map(function(t){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">'
      +'<div style="display:flex;align-items:center;gap:10px;">'
      +'<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(255,95,87,0.2),rgba(255,95,87,0.08));border:1px solid rgba(255,95,87,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;">💳</div>'
      +'<div><div style="font-weight:700;font-size:0.85rem;color:var(--text);">'+t.nombre+'</div>'
      +'<div style="font-size:0.65rem;color:var(--dim);">Límite: '+fmt(t.limite||0)+'</div></div>'
      +'</div>'
      +'<div style="text-align:right;">'
      +'<div style="font-weight:800;font-size:0.92rem;color:var(--danger);font-family:JetBrains Mono,monospace;">'+fmt(t.balance||0)+'</div>'
      +'<div style="font-size:0.6rem;color:var(--dim);">deuda</div>'
      +'</div></div>';
  }).join('') || '<div style="color:var(--dim);font-size:0.8rem;padding:10px 0;">Sin tarjetas</div>';
  return ''
    +'<div class="hero-card" style="margin-bottom:16px;">'
    +'<div style="position:relative;z-index:1;">'
    +'<div class="hero-label">Total disponible</div>'
    +'<div class="hero-amount">'+fmt(totalDisp)+'</div>'
    +'<div class="hero-sub">Efectivo + Cuentas bancarias</div>'
    +'<div class="hero-pills">'
    +'<div class="hero-pill" onclick="goSub(\'efectivo\')"><span class="hero-pill-ico">💵</span>Efectivo '+fmt(saldoEfec)+'</div>'
    +'<div class="hero-pill" onclick="goSub(\'cheques\')"><span class="hero-pill-ico">🏧</span>Banco '+fmt(totalCheques)+'</div>'
    +(totalTC>0?'<div class="hero-pill" style="background:rgba(255,95,87,0.25);border-color:rgba(255,95,87,0.3);" onclick="goSub(\'tarjetas\')"><span class="hero-pill-ico">💳</span>TC '+fmt(totalTC)+'</div>':'')
    +'</div>'
    +'</div></div>'
    +'<div class="sec-title">💵 Efectivo</div>'
    +'<div class="cuenta-card">'
    +'<div class="cuenta-card-header">'
    +'<div class="cuenta-card-ico" style="background:linear-gradient(135deg,rgba(43,192,112,0.2),rgba(43,192,112,0.08));">💵</div>'
    +'<span class="cuenta-card-badge" style="background:rgba(43,192,112,0.12);color:var(--accent2);border:1px solid rgba(43,192,112,0.2);">En mano</span>'
    +'</div>'
    +'<div class="cuenta-saldo">'+fmt(saldoEfec)+'</div>'
    +'<div class="cuenta-label">Dinero físico disponible</div>'
    +'<div class="cuenta-actions">'
    +'<button class="cuenta-btn primary" onclick="goSub(\'efectivo\')">📊 Ver movimientos</button>'
    +'<button class="cuenta-btn" onclick="abrirTxModal(\'ingreso\')">➕</button>'
    +'<button class="cuenta-btn" onclick="abrirTxModal(\'gasto\')">➖</button>'
    +'</div></div>'
    +'<div class="sec-title">🏧 Banco</div>'
    +'<div class="cuenta-card">'
    +'<div class="cuenta-card-header">'
    +'<div class="cuenta-card-ico" style="background:linear-gradient(135deg,rgba(56,170,255,0.2),rgba(56,170,255,0.08));">🏧</div>'
    +'<span class="cuenta-card-badge" style="background:rgba(56,170,255,0.12);color:#60c8ff;border:1px solid rgba(56,170,255,0.2);">'+fmt(totalCheques)+'</span>'
    +'</div>'
    +'<div class="cuenta-saldo">'+fmt(totalCheques)+'</div>'
    +'<div class="cuenta-label">Total en cuentas bancarias</div>'
    +'<div style="margin-top:14px;">'+bancosHTML+'</div>'
    +'<div class="cuenta-actions">'
    +'<button class="cuenta-btn primary" onclick="goSub(\'cheques\')">📊 Ver movimientos</button>'
    +'<button class="cuenta-btn" onclick="abrirTxModal(\'ingreso\')">➕</button>'
    +'</div></div>'
    +'<div class="sec-title">💳 Tarjetas de crédito</div>'
    +'<div class="cuenta-card">'
    +'<div class="cuenta-card-header">'
    +'<div class="cuenta-card-ico" style="background:linear-gradient(135deg,rgba(255,95,87,0.2),rgba(255,95,87,0.08));">💳</div>'
    +(totalTC>0?'<span class="cuenta-card-badge" style="background:rgba(255,95,87,0.12);color:var(--danger);border:1px solid rgba(255,95,87,0.2);">Deuda '+fmt(totalTC)+'</span>':'<span class="cuenta-card-badge" style="background:rgba(43,192,112,0.12);color:var(--accent2);">✅ Al corriente</span>')
    +'</div>'
    +(totalTC>0?'<div class="cuenta-saldo" style="color:var(--danger);">'+fmt(totalTC)+'</div>':'<div class="cuenta-saldo" style="color:var(--accent2);">$0.00</div>')
    +'<div class="cuenta-label">Deuda total en tarjetas</div>'
    +'<div style="margin-top:14px;">'+tcHTML+'</div>'
    +'<div class="cuenta-actions">'
    +'<button class="cuenta-btn primary" onclick="goSub(\'tarjetas\')">💳 Ver tarjetas</button>'
    +'</div></div>';
}

function renderEfectivo(){
  var c = getCuentas();
  var txs = getTxs().filter(function(t){ return t.cuenta==='efectivo'; });
  var items = txs.slice().reverse().map(function(t){
    return '<div class="tx-item">'
      +'<div class="tx-ico">'+(t.tipo==='ingreso'?'💵':'💸')+'</div>'
      +'<div class="tx-info"><div class="tx-name">'+t.desc+'</div>'
      +'<div class="tx-date">'+t.fecha+' · '+t.cat+'</div></div>'
      +'<div class="tx-right"><div class="tx-amt '+(t.tipo==='ingreso'?'ing':'gas')+'">'
      +(t.tipo==='ingreso'?'+':'-')+fmt(t.monto)+'</div>'
      +'<div style="display:flex;gap:4px;">'
      +'<button class="ic-btn" onclick="editarTx(\"'+t.id+'\")"  >✏️</button>'
      +'<button class="ic-btn" onclick="borrarTx(\"'+t.id+'\")"  >🗑️</button>'
      +'</div></div></div>';
  }).join('')||'<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin movimientos</div>';
  var catEnt = getIngresoCats();
  var catSal = getGastoCats();
  return '<div class="page-header">'+backBtn('cuentas',1)+'<div class="page-title">💵 Efectivo</div></div>'
    +'<div class="card" style="margin-bottom:14px;text-align:center;padding:22px;">'
    +'<div style="font-size:0.65rem;font-weight:700;color:var(--dim);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Saldo en efectivo</div>'
    +'<div style="font-size:2.4rem;font-weight:900;color:var(--accent);">'+fmt(c.efectivo||0)+'</div>'
    +'</div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<div class="card-title">Registrar movimiento</div>'
    +'<div class="tipo-selector" style="margin-bottom:12px;">'
    +'<div class="tipo-opt selected" id="efTipoEnt" onclick="selEfTipo(\'ingreso\')">💵 Entrada (ingreso)</div>'
    +'<div class="tipo-opt" id="efTipoSal" onclick="selEfTipo(\'gasto\')">💸 Salida (gasto)</div>'
    +'</div>'
    +'<label class="inp-label">Descripción</label>'
    +'<input class="inp" id="efDesc" placeholder="Ej: Cobré trabajo / Compré despensa" autocomplete="off">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Monto ($)</label><input class="inp" id="efMonto" type="number" inputmode="decimal" placeholder="0.00"></div>'
    +'<div><label class="inp-label">Categoría</label>'
    +'<select class="inp" id="efCat">'
    + catEnt.map(function(cat){ return '<option>'+cat+'</option>'; }).join('')
    +'</select>'
    +'<button type="button" class="cat-add-btn" id="efCatAddBtn" onclick="abrirCatModalEf()">＋ Categoría</button></div>'
    +'</div>'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="efFecha" type="date" value="'+today()+'">'
    +'<div id="efDestRow" style="display:none;">'
    +'<label class="inp-label">¿A qué banco? (opcional)</label>'
    +'<select class="inp" id="efDestBanco"><option value="">— Solo registrar salida —</option>'
    + (c.cheques||[]).map(function(ch,i){ return '<option value="cheque_'+i+'">🏦 '+ch.banco+'</option>'; }).join('')
    +'</select></div>'
    +'<button class="btn-main" onclick="guardarMovEfectivo()">💾 Guardar</button>'
    +'</div>'
    +'<div class="card"><div class="card-title">Movimientos ('+txs.length+')</div>'+items+'</div>';
}

function renderCheques(){
  var c=getCuentas(); var cuentas=c.cheques||[];
  var total=cuentas.reduce(function(s,x){ return s+Number(x.saldo||0); },0);
  var items=cuentas.length ? cuentas.map(function(ct,i){
    var cval='cheque_'+i;
    var txsCuenta=getTxs().filter(function(t){ return t.cuenta===cval; });
    var ultMov=txsCuenta.length ? txsCuenta[txsCuenta.length-1] : null;
    return '<div class="cred-item" onclick="goSub(\'banco_\'+'+i+')" style="cursor:pointer;">'
      +'<div class="cred-top"><div><div class="cred-persona">🏧 '+ct.banco+'</div>'
      +'<div class="cred-desc">'+ct.tipo+(ct.numCuenta?' · ***'+ct.numCuenta.slice(-4):'')+(ultMov?' · Último mov: '+ultMov.fecha:'')+'</div></div>'
      +'<div><div style="font-size:1.1rem;font-weight:900;color:var(--accent);">'+fmt(ct.saldo||0)+'</div>'
      +'<div style="font-size:0.62rem;color:var(--dim);text-align:right;">'+txsCuenta.length+' mov.</div></div></div>'
      +(ct.nota?'<div style="font-size:0.72rem;color:var(--dim);margin-top:2px;">📝 '+ct.nota+'</div>':'')
      +'</div>';
  }).join('') : '<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin cuentas bancarias. Agrega una abajo.</div>';
  return '<div class="page-header">'+backBtn('cuentas',1)+'<div class="page-title">🏧 Mis Bancos</div></div>'
    +'<div class="card" style="text-align:center;padding:18px;margin-bottom:14px;">'
    +'<div style="font-size:0.65rem;font-weight:700;color:var(--dim);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">Total en bancos</div>'
    +'<div style="font-size:2rem;font-weight:900;color:var(--accent);">'+fmt(total)+'</div>'
    +'</div>'
    + items
    +'<div class="card" style="margin-top:14px;" id="chequesForm">'
    +'<div class="card-title" id="chFormTitle">+ Agregar cuenta bancaria</div>'
    +'<label class="inp-label">Banco / Institución</label>'
    +'<input class="inp" id="chBanco" placeholder="Ej: BBVA, Santander, HSBC...">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Tipo</label>'
    +'<select class="inp" id="chTipo"><option>Débito</option><option>Ahorro</option><option>Nómina</option><option>Inversión</option><option>Otro</option></select></div>'
    +'<div><label class="inp-label">Saldo inicial ($)</label><input class="inp" id="chSaldo" type="number" inputmode="decimal" placeholder="0.00"></div>'
    +'</div>'
    +'<label class="inp-label">No. cuenta (últimos 4 dígitos)</label>'
    +'<input class="inp" id="chNum" placeholder="Ej: 4521" maxlength="4" inputmode="numeric">'
    +'<label class="inp-label">Nota (opcional)</label>'
    +'<input class="inp" id="chNota" placeholder="Ej: Cuenta de nómina principal">'
    +'<button class="btn-main" id="chSaveBtn" onclick="guardarCuenta()">💾 Guardar cuenta</button>'
    +'</div>';
}

function renderBancoDetalle(idx){
  var c=getCuentas(); var ct=c.cheques[idx];
  if(!ct) return renderCheques();
  var cval='cheque_'+idx;
  var txs=getTxs().filter(function(t){ return t.cuenta===cval; });
  var catEnt=['Salario','Depósito','Transferencia recibida','Nómina','Inversión','Otros ingresos'];
  var catSal=getGastoCats();
  var items=txs.slice().reverse().map(function(t){
    return '<div class="tx-item">'
      +'<div class="tx-ico">'+(t.tipo==='ingreso'?'📥':'📤')+'</div>'
      +'<div class="tx-info"><div class="tx-name">'+t.desc+'</div>'
      +'<div class="tx-date">'+t.fecha+' · '+t.cat+'</div></div>'
      +'<div class="tx-right"><div class="tx-amt '+(t.tipo==='ingreso'?'ing':'gas')+'">'
      +(t.tipo==='ingreso'?'+':'-')+fmt(t.monto)+'</div>'
      +'<button class="ic-btn" onclick="borrarTxBanco(\"'+t.id+'\",'+idx+')">🗑️</button></div></div>';
  }).join('')||'<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin movimientos</div>';
  return '<div class="page-header">'+backBtn('cheques',1)+'<div class="page-title">🏧 '+ct.banco+'</div></div>'
    +'<div class="card" style="text-align:center;padding:18px;margin-bottom:14px;">'
    +'<div style="font-size:0.65rem;font-weight:700;color:var(--dim);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Saldo</div>'
    +'<div style="font-size:2.2rem;font-weight:900;color:var(--accent);">'+fmt(ct.saldo||0)+'</div>'
    +'<div style="font-size:0.7rem;color:var(--dim);margin-top:4px;">'+ct.tipo+(ct.numCuenta?' · ***'+ct.numCuenta:'')+'</div>'
    +'<div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">'
    +'<button class="cred-btn" onclick="editarCuenta('+idx+');goSub(\'cheques\')">✏️ Editar</button>'
    +'<button class="cred-btn danger" onclick="borrarCuenta('+idx+')">🗑️ Eliminar</button>'
    +'</div></div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<div class="card-title">Registrar movimiento</div>'
    +'<div class="tipo-selector" style="margin-bottom:12px;">'
    +'<div class="tipo-opt selected" id="bkTipoEnt" onclick="selBkTipo(\'ingreso\','+idx+')">📥 Entrada</div>'
    +'<div class="tipo-opt" id="bkTipoSal" onclick="selBkTipo(\'gasto\','+idx+')">📤 Salida</div>'
    +'</div>'
    +'<label class="inp-label">Descripción</label>'
    +'<input class="inp" id="bkDesc" placeholder="Ej: Nómina quincenal / Pago luz" autocomplete="off">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Monto ($)</label><input class="inp" id="bkMonto" type="number" inputmode="decimal" placeholder="0.00"></div>'
    +'<div><label class="inp-label">Categoría</label>'
    +'<select class="inp" id="bkCat">'
    +catEnt.map(function(cat){ return '<option>'+cat+'</option>'; }).join('')
    +'</select><button type="button" class="cat-add-btn" id="bkCatAddBtn" onclick="abrirCatModalBk()">＋ Categoría</button></div></div>'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="bkFecha" type="date" value="'+today()+'">'
    +'<button class="btn-main" onclick="guardarMovBanco('+idx+')">💾 Guardar</button>'
    +'</div>'
    +'<div class="card"><div class="card-title">Movimientos ('+txs.length+')</div>'+items+'</div>';
}

function borrarTxBanco(id,idx){
  var txs=getTxs(); var t=txs.find(function(x){ return x.id===id; });
  if(!t) return;
  var _eliT=JSON.parse(JSON.stringify(t));
  var c=getCuentas();
  c.cheques[idx].saldo=(c.cheques[idx].saldo||0)-(t.tipo==='ingreso'?t.monto:-t.monto);
  saveCuentas(c);
  saveTxs(txs.filter(function(x){ return x.id!==id; }));
  goSub('banco_'+idx);
  mostrarUndo('🏧 Movimiento eliminado', function(){
    var c2=getCuentas();
    c2.cheques[idx].saldo=(c2.cheques[idx].saldo||0)+(_eliT.tipo==='ingreso'?_eliT.monto:-_eliT.monto);
    saveCuentas(c2);
    var t2=getTxs(); t2.push(_eliT); saveTxs(t2);
    goSub('banco_'+idx);
  });
}

function guardarCuenta(){
  var banco=document.getElementById('chBanco').value.trim();
  var tipo=document.getElementById('chTipo').value;
  var saldo=parseFloat(document.getElementById('chSaldo').value)||0;
  var num=document.getElementById('chNum').value.trim();
  var nota=document.getElementById('chNota').value.trim();
  if(!banco){ showToast('⚠ Escribe el nombre del banco'); return; }
  var c=getCuentas(); c.cheques=c.cheques||[];
  if(_editCuentaIdx!==null){
    c.cheques[_editCuentaIdx]=Object.assign(c.cheques[_editCuentaIdx],{banco:banco,tipo:tipo,saldo:saldo,numCuenta:num,nota:nota});
    _editCuentaIdx=null; showToast('✓ Cuenta actualizada');
  } else {
    c.cheques.push({banco:banco,tipo:tipo,saldo:saldo,numCuenta:num,nota:nota});
    showToast('✓ Cuenta bancaria agregada');
  }
  saveCuentas(c); goSub('cheques');
}

function editarCuenta(i){
  var c=getCuentas(); var ct=c.cheques[i]; _editCuentaIdx=i;
  goSub('cheques');
  setTimeout(function(){
    document.getElementById('chBanco').value=ct.banco;
    document.getElementById('chTipo').value=ct.tipo;
    document.getElementById('chSaldo').value=ct.saldo||0;
    document.getElementById('chNum').value=ct.numCuenta||'';
    document.getElementById('chNota').value=ct.nota||'';
    document.getElementById('chFormTitle').textContent='✏️ Editar cuenta';
    document.getElementById('chSaveBtn').textContent='💾 Guardar cambios';
    document.getElementById('chequesForm').scrollIntoView({behavior:'smooth'});
  },100);
}

function borrarCuenta(i){
  var c=getCuentas(); var _eliBanco=JSON.parse(JSON.stringify(c.cheques[i]));
  c.cheques.splice(i,1); saveCuentas(c); goSub('cheques');
  mostrarUndo('🏧 Cuenta eliminada', function(){
    var c2=getCuentas(); c2.cheques.splice(i,0,_eliBanco); saveCuentas(c2); goSub('cheques');
  });
}

function abonarCuenta(i){
  var c=getCuentas(); var ct=c.cheques[i];
  usalaPrompt('Ajustar saldo de '+ct.banco+' ($)', String(ct.saldo||0), function(val){
    var nuevo=parseFloat(val);
    if(isNaN(nuevo)){ showToast('Ingresa un monto valido'); return; }
    c.cheques[i].saldo=nuevo; saveCuentas(c);
    showToast('Saldo actualizado'); goSub('banco_'+i);
  },{type:'number', placeholder:'0.00'});
}

function renderPagosMes(){
  var mc = document.getElementById('mainContent');
  mc.innerHTML = '';
  var pagos  = loadPagosBase();
  var estado = loadPagosEstado();
  var hoy    = new Date(); hoy.setHours(0,0,0,0);
  var mesActKey = new Date().toISOString().slice(0,7);
  var mesNombre = hoy.toLocaleString('es-MX',{month:'long',year:'numeric'});
  // Helpers definidos primero para que todo el scope los vea
  function _calcFechaVenc(p, ref){
    if(p.proximoPago){
      var pts=p.proximoPago.split('-');
      return new Date(+pts[0],+pts[1]-1,+pts[2]);
    }
    var dia = Math.min(p.dia||1, 28);
    var f = new Date(ref.getFullYear(), ref.getMonth(), dia);
    f.setHours(0,0,0,0);
    if(f < ref) f.setMonth(f.getMonth()+1);
    return f;
  }
  function _diasLabel(diff){
    if(diff<0)  return {txt:'Vencido hace '+Math.abs(diff)+' día'+(Math.abs(diff)!==1?'s':''), col:'#e53935', bg:'rgba(229,57,53,0.08)'};
    if(diff===0)return {txt:'Vence HOY',     col:'#e53935', bg:'rgba(229,57,53,0.1)'};
    if(diff===1)return {txt:'Vence mañana',  col:'#f57c00', bg:'rgba(245,124,0,0.08)'};
    if(diff<=3) return {txt:'En '+diff+' días', col:'#f57c00', bg:'rgba(245,124,0,0.06)'};
    if(diff<=7) return {txt:'En '+diff+' días', col:'#f9a825', bg:'rgba(249,168,37,0.07)'};
    return      {txt:'Día '+diff, col:'var(--dim)', bg:'transparent'};
  }
  var hdr = document.createElement('div');
  hdr.innerHTML = '<div class="page-header">'+backSubBtn()+'<div class="page-title">📅 Pagos del Mes</div></div>';
  mc.appendChild(hdr);
  var totalMonto  = pagos.reduce(function(s,p){ return s+(p.monto||0); },0);
  var pagados     = pagos.filter(function(p){ return estado[p.id]&&estado[p.id].pagado; });
  var totalPagado = pagados.reduce(function(s,p){ return s+(estado[p.id].montoPagado||p.monto||0); },0);
  var pct         = totalMonto>0 ? Math.min(100,Math.round((totalPagado/totalMonto)*100)) : 0;
  var pendientes  = pagos.filter(function(p){ return !estado[p.id]||!estado[p.id].pagado; });
  var masUrgente = null;
  pendientes.forEach(function(p){
    var f = _calcFechaVenc(p, hoy);
    var d = Math.round((f-hoy)/86400000);
    if(masUrgente===null || d < masUrgente) masUrgente = d;
  });
  var alertaTxt = '';
  if(masUrgente!==null){
    var _nVencidos=pendientes.filter(function(p){ return Math.round((_calcFechaVenc(p,hoy)-hoy)/86400000)<0; }).length;
    if(masUrgente<0)       alertaTxt='⚠️ Tienes '+_nVencidos+' pago'+(_nVencidos!==1?'s':'')+' vencido'+(_nVencidos!==1?'s':'');
    else if(masUrgente===0) alertaTxt='📍 Tienes pagos que vencen HOY';
    else if(masUrgente===1) alertaTxt='⏰ Tu próximo pago vence MAÑANA';
    else if(masUrgente<=3)  alertaTxt='⏰ Próximo vencimiento en '+masUrgente+' días';
  }
  var res = document.createElement('div');
  res.className='card'; res.style.marginBottom='10px';
  res.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
      +'<div style="font-size:0.8rem;font-weight:800;text-transform:capitalize;">'+mesNombre+'</div>'
      +'<div style="font-size:0.75rem;color:var(--dim);">'+pagados.length+' / '+pagos.length+' pagados</div>'
    +'</div>'
    +'<div class="prog-wrap" style="margin-bottom:8px;"><div class="prog-bar" style="width:'+pct+'%;'+(pct>=100?'background:#2d9e5f;':'')+'"></div></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:0.78rem;">'
      +'<span style="color:var(--dim);">Total: <b>'+fmt(totalMonto)+'</b></span>'
      +'<span style="color:var(--accent2);">Pagado: <b>'+fmt(totalPagado)+'</b></span>'
    +'</div>'
    +(totalMonto-totalPagado>0?'<div style="font-size:0.75rem;margin-top:4px;color:var(--danger);">Pendiente: <b>'+fmt(totalMonto-totalPagado)+'</b></div>':'')
    +(alertaTxt?'<div style="margin-top:10px;padding:8px 12px;border-radius:10px;background:rgba(229,57,53,0.08);border:1px solid rgba(229,57,53,0.2);font-size:0.75rem;font-weight:700;color:#e53935;">'+alertaTxt+'</div>':'');
  mc.appendChild(res);
  var tabState = {active: 'pendientes'};
  var tabWrap = document.createElement('div');
  tabWrap.style.cssText='display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;';
  tabWrap.innerHTML =
    '<button class="pp-tab active" id="pmTab_pend" onclick="pmSetTab(\'pendientes\')">⏳ Pendientes ('+pendientes.length+')</button>'
    +'<button class="pp-tab" id="pmTab_pag"  onclick="pmSetTab(\'pagados\')">✅ Pagados ('+pagados.length+')</button>'
    +'<button class="pp-tab" id="pmTab_hist" onclick="pmSetTab(\'historial\')">📚 Historial</button>';
  mc.appendChild(tabWrap);
  var bAdd = document.createElement('button');
  bAdd.style.cssText='width:100%;padding:13px;background:var(--accent);color:var(--navtext);border:none;border-radius:12px;font-family:\'Outfit\',sans-serif;font-weight:700;cursor:pointer;margin-bottom:14px;font-size:0.95rem;';
  bAdd.textContent='+ Agregar pago fijo';
  bAdd.onclick=function(){ renderFormPago(null); };
  mc.appendChild(bAdd);
  var listaCont = document.createElement('div');
  listaCont.id = 'pmListaCont';
  mc.appendChild(listaCont);
  function renderPendientes(){
    var cont = document.getElementById('pmListaCont');
    if(!cont) return;
    cont.innerHTML='';
    if(!pagos.length){
      cont.innerHTML='<div style="text-align:center;padding:30px;color:var(--dim);font-size:0.83rem;">Sin pagos registrados. Agrega tus pagos fijos del mes.</div>';
      return;
    }
    var pends = pagos.filter(function(p){ return !estado[p.id]||!estado[p.id].pagado; });
    pends.sort(function(a,b){
      return _calcFechaVenc(a,hoy) - _calcFechaVenc(b,hoy);
    });
    if(!pends.length){
      cont.innerHTML='<div style="text-align:center;padding:30px;color:var(--accent2);font-size:0.83rem;">🎉 ¡Todos los pagos de este mes están al corriente!</div>';
      return;
    }
    pends.forEach(function(p){
      var f    = _calcFechaVenc(p, hoy);
      var diff = Math.round((f-hoy)/86400000);
      var lbl  = _diasLabel(diff); lbl.p = p;
      var idx  = pagos.indexOf(p);
      cont.appendChild(_mkPagoCard(p, idx, f, diff, lbl, false));
    });
  }
  function renderPagadosMes(){
    var cont = document.getElementById('pmListaCont');
    if(!cont) return;
    cont.innerHTML='';
    var pags = pagos.filter(function(p){ return estado[p.id]&&estado[p.id].pagado; });
    pags.sort(function(a,b){
      var fa=estado[a.id].fecha||''; var fb=estado[b.id].fecha||'';
      return fb.localeCompare(fa); // más reciente primero
    });
    if(!pags.length){
      cont.innerHTML='<div style="text-align:center;padding:30px;color:var(--dim);font-size:0.83rem;">Aún no hay pagos marcados como pagados este mes.</div>';
      return;
    }
    pags.forEach(function(p){
      var st  = estado[p.id];
      var idx = pagos.indexOf(p);
      var f   = st.fecha ? (function(){ var pts=st.fecha.split('-'); return new Date(+pts[0],+pts[1]-1,+pts[2]); })() : hoy;
      var lbl = {txt:'Pagado el '+f.toLocaleDateString('es-MX',{day:'numeric',month:'short'}), col:'var(--accent2)', bg:'rgba(45,158,95,0.06)'};
      cont.appendChild(_mkPagoCard(p, idx, f, null, lbl, true));
    });
  }
  function renderHistorialPagos(){
    var cont = document.getElementById('pmListaCont');
    if(!cont) return;
    cont.innerHTML='';
    // Recolectar todos los meses con estado guardado
    var u    = S.user;
    var base = u ? (u.isAdmin?'usala_admin':'usala_u_'+u.codigo) : 'usala_admin';
    var prefix = base+'_pagos_estado_';
    var mesesGuardados = [];
    for(var k in localStorage){
      if(k.indexOf(prefix)===0){
        var mesK = k.replace(prefix,'');
        mesesGuardados.push(mesK);
      }
    }
    mesesGuardados.sort().reverse(); // más reciente primero
    if(!mesesGuardados.length){
      cont.innerHTML='<div style="text-align:center;padding:30px;color:var(--dim);font-size:0.83rem;">El historial se irá construyendo mes a mes conforme marques pagos.</div>';
      return;
    }
    var _mesesNombres=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    mesesGuardados.forEach(function(mesK){
      var estadoMes;
      try{ estadoMes=JSON.parse(localStorage.getItem(prefix+mesK)||'{}'); }catch(e){ estadoMes={}; }
      var pagosEseMes = Object.keys(estadoMes);
      if(!pagosEseMes.length) return;
      var parts  = mesK.split('-');
      var yr     = parts[0]; var mn = parseInt(parts[1],10)-1;
      var mesLabel = _mesesNombres[mn]+' '+yr;
      var esMesAct = mesK===mesActKey;
      var totalPagMes  = 0;
      var totalEstMes  = 0;
      var countPag     = 0;
      pagosEseMes.forEach(function(pid){
        var st  = estadoMes[pid];
        var pag = pagos.find(function(p){ return p.id==pid; });
        if(!pag) return;
        totalEstMes += pag.monto||0;
        if(st&&st.pagado){ totalPagMes+=(st.montoPagado||pag.monto||0); countPag++; }
      });
      var secDiv = document.createElement('div');
      secDiv.style.cssText='margin-bottom:16px;';
      var secHdr = document.createElement('div');
      secHdr.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--inp);border-radius:12px;margin-bottom:8px;cursor:pointer;';
      secHdr.innerHTML =
        '<div>'
          +'<div style="font-weight:800;font-size:0.88rem;text-transform:capitalize;">'
            +(esMesAct?'📍 ':'')+ mesLabel
          +'</div>'
          +'<div style="font-size:0.7rem;color:var(--dim);margin-top:1px;">'+countPag+' pagado'+(countPag!==1?'s':'')+' · '+fmt(totalPagMes)+'</div>'
        +'</div>'
        +'<div style="text-align:right;">'
          +'<div style="font-weight:900;font-size:0.92rem;color:var(--accent2);">'+fmt(totalPagMes)+'</div>'
          +'<div style="font-size:0.68rem;color:var(--dim);">de '+fmt(totalEstMes)+'</div>'
        +'</div>';
      var detalleDiv = document.createElement('div');
      detalleDiv.style.display = esMesAct ? 'block' : 'none';
      secHdr.onclick = function(){
        detalleDiv.style.display = detalleDiv.style.display==='none'?'block':'none';
      };
      pagosEseMes.forEach(function(pid){
        var st  = estadoMes[pid];
        var pag = pagos.find(function(p){ return p.id==pid; });
        if(!pag) return;
        var row = document.createElement('div');
        row.style.cssText='display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:1px solid var(--border);';
        var pagadoOk = st&&st.pagado;
        row.innerHTML =
          '<div style="flex:1;">'
            +'<div style="font-size:0.82rem;font-weight:600;'+(pagadoOk?'':'color:var(--dim);')+'">'+(pagadoOk?'✅ ':'⏳ ')+pag.nombre+'</div>'
            +(pagadoOk&&st.fecha?'<div style="font-size:0.68rem;color:var(--dim);">Pagado el '+st.fecha+'</div>':'')
          +'</div>'
          +'<div style="font-weight:800;font-size:0.85rem;color:'+(pagadoOk?'var(--accent2)':'var(--danger)')+';">'
            +fmt(pagadoOk?(st.montoPagado||pag.monto||0):(pag.monto||0))
          +'</div>';
        detalleDiv.appendChild(row);
      });
      secDiv.appendChild(secHdr);
      secDiv.appendChild(detalleDiv);
      cont.appendChild(secDiv);
    });
  }
  function _mkPagoCard(p, idx, f, diff, lbl, esPagado){
    var st  = estado[p.id]||{};
    var card = document.createElement('div');
    card.style.cssText='background:var(--card);border-radius:14px;padding:0;margin-bottom:8px;'
      +'border:1.5px solid '+(esPagado?'rgba(45,158,95,0.3)':diff!==null&&diff<=1?'rgba(229,57,53,0.4)':diff!==null&&diff<=3?'rgba(245,124,0,0.35)':'var(--border)')
      +';overflow:hidden;';
    var inner = document.createElement('div');
    inner.style.cssText='display:flex;';
    var barra = document.createElement('div');
    barra.style.cssText='width:4px;background:'+(esPagado?'#2d9e5f':lbl.col)+';flex-shrink:0;';
    var cuerpo = document.createElement('div');
    cuerpo.style.cssText='flex:1;padding:12px 12px 12px 10px;opacity:'+(esPagado?'0.8':'1')+';';
    var topRow = document.createElement('div');
    topRow.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;';
    var left = document.createElement('div'); left.style.flex='1';
    var nombre = document.createElement('div');
    nombre.style.cssText='font-weight:800;font-size:0.9rem;'+(esPagado?'color:var(--dim);text-decoration:line-through;':'');
    nombre.textContent=p.nombre;
    left.appendChild(nombre);
    var badge = document.createElement('div');
    badge.style.cssText='display:inline-block;font-size:0.65rem;font-weight:800;padding:2px 8px;border-radius:20px;margin-top:4px;background:'+lbl.bg+';color:'+lbl.col+';';
    badge.textContent = lbl.txt;
    left.appendChild(badge);
    var fMeta = document.createElement('div');
    fMeta.style.cssText='font-size:0.68rem;color:var(--dim);margin-top:3px;';
    var fStr = f.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
    fMeta.textContent = (p.categoria||'')+' · '+fStr+(p.frecuencia&&p.frecuencia!=='mensual'?' · '+p.frecuencia:'');
    left.appendChild(fMeta);
    topRow.appendChild(left);
    var montoCol = esPagado?'var(--accent2)':diff!==null&&diff<=1?'#e53935':'var(--danger)';
    var montoDiv = document.createElement('div');
    montoDiv.style.cssText='font-weight:900;font-size:1rem;font-family:\'JetBrains Mono\',monospace;color:'+montoCol+';margin-left:8px;';
    montoDiv.textContent=fmt(esPagado?(st.montoPagado||p.monto||0):p.monto);
    topRow.appendChild(montoDiv);
    cuerpo.appendChild(topRow);
    var btns=document.createElement('div');
    btns.style.cssText='display:flex;gap:6px;margin-top:8px;';
    var bPag=document.createElement('button');
    bPag.style.cssText='flex:1;border:none;border-radius:8px;padding:6px 0;font-size:0.75rem;cursor:pointer;font-weight:700;font-family:\'Outfit\',sans-serif;background:'+(esPagado?'var(--inp)':'#2d9e5f')+';color:'+(esPagado?'var(--dim)':'#fff')+';';
    bPag.textContent=esPagado?'↩ Desmarcar':'✅ Marcar pagado';
    (function(pid,pmonto,pagado_){
      bPag.onclick=function(){
        if(pagado_){ var e2=loadPagosEstado(); delete e2[pid]; savePagosEstado(e2); renderPagosMes(); }
        else{ renderPagarPago(pid,pmonto); }
      };
    })(p.id,p.monto,esPagado);
    btns.appendChild(bPag);
    var bEd=document.createElement('button');
    bEd.style.cssText='border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:0.75rem;cursor:pointer;background:none;color:var(--accent);';
    bEd.textContent='✏️';
    (function(i){ bEd.onclick=function(){ renderFormPago(i); }; })(idx);
    btns.appendChild(bEd);
    var bDel=document.createElement('button');
    bDel.style.cssText='border:1px solid rgba(229,57,53,0.3);border-radius:8px;padding:6px 10px;font-size:0.75rem;cursor:pointer;background:none;color:var(--danger);';
    bDel.textContent='🗑';
    (function(i){ bDel.onclick=function(){ borrarPago(i); }; })(idx);
    btns.appendChild(bDel);
    cuerpo.appendChild(btns);
    inner.appendChild(barra);
    inner.appendChild(cuerpo);
    card.appendChild(inner);
    return card;
  }
  // pmSetTab es función global
  renderPendientes();
}

function pmSetTab(tab){
  ['pend','pag','hist'].forEach(function(t){
    var el=document.getElementById('pmTab_'+t);
    if(el){ el.classList.remove('active'); el.classList.remove('pp-tab-active'); }
  });
  var mapId={pendientes:'pend', pagados:'pag', historial:'hist'};
  var activeEl = document.getElementById('pmTab_'+(mapId[tab]||tab));
  if(activeEl){ activeEl.classList.add('active'); activeEl.classList.add('pp-tab-active'); }
  var cont = document.getElementById('pmListaCont');
  if(!cont) return;
  if(tab==='pendientes'){
    var pendientes = loadPagosBase().filter(function(p){ return !_estaPagado(p.nombre); });
    cont.innerHTML = renderPendientes(pendientes);
  } else if(tab==='pagados'){
    var pagados = loadPagosBase().filter(function(p){ return _estaPagado(p.nombre); });
    cont.innerHTML = renderPagadosMes(pagados);
  } else {
    cont.innerHTML = renderHistorialPagos();
  }
}

function renderFormPago(idx){
  var pagos=loadPagosBase();
  var p=idx!==null?pagos[idx]:{};
  var mc=document.getElementById('mainContent');
  mc.innerHTML='';
  var d=document.createElement('div'); d.style.padding='20px 16px';
  var catOpts=getPagosCats().map(function(c){
    return '<option value="'+c+'"'+(p.categoria===c?' selected':'')+'>'+c+'</option>';
  }).join('');
  d.innerHTML='<div style="font-size:1rem;font-weight:800;margin-bottom:14px;">'+(idx!==null?'✏️ Editar':'➕ Nuevo')+' Pago Fijo</div>'
    +'<label class="inp-label">Nombre del pago</label>'
    +'<input class="inp" id="fpNombre" placeholder="Ej: CFE, TELMEX, Renta..." value="'+(p.nombre||'')+'">'
    +'<label class="inp-label">Categoría</label>'
    +'<select class="inp" id="fpCat">'+catOpts+'</select>'
    +'<button type="button" class="cat-add-btn" onclick="abrirCatModal(\'pagos\',\'fpCat\')">＋ Categoría</button>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Monto estimado</label><input class="inp" id="fpMonto" type="number" min="0" placeholder="$0.00" value="'+(p.monto||'')+'"></div>'
    +'<div><label class="inp-label">Día de vencimiento</label><input class="inp" id="fpDia" type="number" min="1" max="31" placeholder="15" value="'+(p.dia||'')+'"></div>'
    +'</div>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Frecuencia</label>'
    +'<select class="inp" id="fpFrec">'
    +'<option value="mensual"'+((!p.frecuencia||p.frecuencia==="mensual")?" selected":"")+'>Mensual</option>'
    +'<option value="bimestral"'+(p.frecuencia==="bimestral"?" selected":"")+'>Bimestral (c/2 meses)</option>'
    +'<option value="trimestral"'+(p.frecuencia==="trimestral"?" selected":"")+'>Trimestral (c/3 meses)</option>'
    +'<option value="cuatrimestral"'+(p.frecuencia==="cuatrimestral"?" selected":"")+'>Cuatrimestral (c/4 meses)</option>'
    +'<option value="semestral"'+(p.frecuencia==="semestral"?" selected":"")+'>Semestral (c/6 meses)</option>'
    +'<option value="anual"'+(p.frecuencia==="anual"?" selected":"")+'>Anual</option>'
    +'</select></div>'
    +'<div><label class="inp-label">Próximo pago</label>'
    +'<input class="inp" id="fpProximo" type="date" value="'+(p.proximoPago||today())+'">'
    +'</div>'
    +'</div>'
    +'<label class="inp-label">Notas (opcional)</label>'
    +'<input class="inp" id="fpNotas" placeholder="Cuenta, referencia, etc." value="'+(p.notas||'')+'" style="margin-bottom:16px;">';
  var bOk=document.createElement('button');
  bOk.className='btn-main'; bOk.textContent=idx!==null?'💾 Guardar cambios':'➕ Agregar';
  bOk.onclick=function(){
    var nombre=document.getElementById('fpNombre').value.trim();
    var cat=document.getElementById('fpCat').value;
    var monto=parseFloat(document.getElementById('fpMonto').value)||0;
    var dia=parseInt(document.getElementById('fpDia').value)||1;
    var notas=document.getElementById('fpNotas').value.trim();
    var frec=document.getElementById('fpFrec')?document.getElementById('fpFrec').value:'mensual';
    var proximo=document.getElementById('fpProximo')?document.getElementById('fpProximo').value:'';
    if(!nombre||!monto){ showToast('⚠ Nombre y monto son obligatorios'); return; }
    var pp=loadPagosBase();
    if(idx!==null){
      pp[idx].nombre=nombre; pp[idx].categoria=cat; pp[idx].monto=monto; pp[idx].dia=dia;
      pp[idx].notas=notas; pp[idx].frecuencia=frec; pp[idx].proximoPago=proximo;
      showToast('✓ Actualizado');
    } else {
      pp.push({id:'pm_'+Date.now(),nombre:nombre,categoria:cat,monto:monto,dia:dia,
               notas:notas,frecuencia:frec,proximoPago:proximo});
      showToast('✓ Pago agregado');
    }
    savePagosBase(pp); renderPagosMes();
  };
  var bCan=document.createElement('button');
  bCan.className='btn-sec'; bCan.style.marginTop='8px'; bCan.textContent='Cancelar';
  bCan.onclick=function(){ renderPagosMes(); };
  d.appendChild(bOk); d.appendChild(bCan);
  mc.appendChild(d);
  setTimeout(function(){ var el=document.getElementById('fpNombre'); if(el) el.focus(); },80);
}

function renderPagarPago(pid, montoEst){
  var mc = document.getElementById('mainContent');
  mc.innerHTML='';
  var d=document.createElement('div'); d.style.padding='20px 16px';
  d.innerHTML='<div style="font-size:1rem;font-weight:800;margin-bottom:14px;">✅ Registrar Pago</div>'
    +'<label class="inp-label">Monto pagado</label>'
    +'<input class="inp" id="pmPagado" type="number" min="0" placeholder="'+montoEst+'" style="margin-bottom:16px;">';
  var bOk=document.createElement('button');
  bOk.className='btn-main'; bOk.textContent='Confirmar pago';
  bOk.onclick=function(){
    var m=parseFloat(document.getElementById('pmPagado').value)||montoEst;
    var e=loadPagosEstado(); e[pid]={pagado:true,montoPagado:m,fecha:today()};
    savePagosEstado(e); showToast('✅ Pago registrado'); renderPagosMes();
  };
  var bCan=document.createElement('button');
  bCan.className='btn-sec'; bCan.style.marginTop='8px'; bCan.textContent='Cancelar';
  bCan.onclick=function(){ renderPagosMes(); };
  d.appendChild(bOk); d.appendChild(bCan);
  mc.appendChild(d);
  setTimeout(function(){ var el=document.getElementById('pmPagado'); if(el){el.value=montoEst;el.focus();el.select();} },80);
}

function loadPagosBase(){ return load('pagos_mensuales',[]); }

function savePagosBase(p){ save('pagos_mensuales',p); }

function loadPagosEstado(){ try{ return JSON.parse(localStorage.getItem(keyPagosMes())||'{}'); }catch(e){ return {}; } }

function savePagosEstado(e){ localStorage.setItem(keyPagosMes(), JSON.stringify(e)); }

function getPagosCats(){ return PAGOS_CATS.concat(load('cats_pagos_custom',[])); }

function borrarPago(i){
  var pp=loadPagosBase();
  if(!pp[i]) return;
  var eli=JSON.parse(JSON.stringify(pp[i]));
  pp.splice(i,1); savePagosBase(pp);
  renderPagosMes();
  mostrarUndo('📅 '+eli.nombre+' eliminado', function(){
    var pp2=loadPagosBase(); pp2.splice(i,0,eli); savePagosBase(pp2); renderPagosMes();
  });
}

function renderCarrito(){
  var cats   = getCarritoCats();
  var actual = getCarritoActual();
  var hist   = getCarritoHistorial();
  var tabActual = (S._carritoTab || 'lista') === 'lista';
  var tabHist   = (S._carritoTab) === 'historial';
  var tabCat    = (S._carritoTab) === 'catalogo';
  var tabs = '<div style="display:flex;gap:6px;margin-bottom:14px;">'
    + ['lista','historial','catalogo'].map(function(t,i){
        var labels = ['🛒 Lista actual','📋 Historial','🔍 Catálogo'];
        var active = (S._carritoTab||'lista') === t;
        return '<button onclick="_carritoTab(\''+t+'\')" style="flex:1;padding:9px 4px;border-radius:12px;border:none;font-family:Outfit,sans-serif;font-size:0.72rem;font-weight:700;cursor:pointer;transition:all 0.18s;background:'+(active?'var(--accent)':'var(--inp)')+';color:'+(active?'#fff':'var(--dim)')+';">'+labels[i]+'</button>';
      }).join('')
    + '</div>';
  var content = '';
  if(tabHist)   content = _renderCarritoHistorial();
  else if(tabCat) content = _renderCarritoCatalogo();
  else          content = _renderCarritoLista(actual, cats);
  return '<div class="page-header">'
    + backSubBtn()
    + '<div class="page-title">🛒 Carrito</div>'
    + '<button onclick="_carritoNuevo()" style="background:var(--accent);border:none;border-radius:10px;padding:6px 12px;font-size:0.75rem;font-weight:700;color:#fff;cursor:pointer;">+ Nueva lista</button>'
    + '</div>'
    + tabs
    + content;
}

function _renderCarritoLista(actual, cats){
  var items = actual.items || [];
  var comprados = items.filter(function(i){ return i.comprado; });
  var total = comprados.reduce(function(s,i){ return s + (i.precio||0)*(i.qty||1); },0);
  var totalEst = items.reduce(function(s,i){ return s + (i.precio||0)*(i.qty||1); },0);
  var headerLista = '<div class="card" style="margin-bottom:12px;padding:14px 16px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
    + '<input id="carritoNombreLista" class="inp" placeholder="Nombre de la lista (ej: Super semanal)" '
    + 'style="flex:1;margin-right:8px;font-weight:700;" value="'+( actual.nombre||'')+'" '
    + 'onchange="carritoActualizarNombre(this.value)">'
    + '</div>'
    + '<input id="carritoTienda" class="inp" placeholder="🏪 Tienda / lugar" '
    + 'value="'+(actual.tienda||'')+'" onchange="carritoActualizarTienda(this.value)" style="margin-bottom:10px;">'
    + '<div style="font-size:0.7rem;font-weight:700;color:var(--dim);margin-bottom:8px;">CATEGORÍA</div>'
    + '<div class="carrito-cat-grid">'
    + cats.map(function(c){
        var activa = (actual.catId === c.id) ? ' activa' : '';
        return '<button class="carrito-cat-btn'+activa+'" onclick="carritoSelCat(\''+c.id+'\')">'+
          '<div class="carrito-cat-ico">'+c.ico+'</div>'+
          '<div class="carrito-cat-lbl">'+c.nombre+'</div></button>';
      }).join('')
    + '<button class="carrito-cat-btn" onclick="carritoNuevaCat()" style="border-style:dashed;opacity:0.7;">'
    + '<div class="carrito-cat-ico">➕</div><div class="carrito-cat-lbl">Nueva</div></button>'
    + '</div>'
    + '</div>';
  var formAdd = '<div class="card" style="margin-bottom:12px;padding:14px 16px;">'
    + '<div style="font-size:0.72rem;font-weight:700;color:var(--dim);margin-bottom:8px;">AGREGAR PRODUCTO</div>'
    + '<input id="carritoNombreItem" class="inp" placeholder="Nombre del producto" '
    + 'style="margin-bottom:8px;" oninput="carritoSugerirPrecio(this.value)" autocomplete="off">'
    + '<div id="carritoSugerencia" style="display:none;font-size:0.72rem;color:var(--accent);'
    + 'background:var(--inp);border-radius:10px;padding:7px 12px;margin-bottom:8px;cursor:pointer;" '
    + 'onclick="carritoAplicarSugerencia()"></div>'
    + '<div style="display:flex;gap:8px;margin-bottom:8px;">'
    + '<input id="carritoPrecioItem" class="inp" type="number" placeholder="Precio est." style="flex:1;">'
    + '<input id="carritoQtyItem" class="inp" type="number" placeholder="Cant." style="width:70px;" value="1">'
    + '<select id="carritoUnidadItem" class="inp" style="width:80px;padding:10px 6px;">'
    + '<option value="pza">pza</option><option value="kg">kg</option><option value="lt">lt</option>'
    + '<option value="caja">caja</option><option value="paq">paq</option><option value="doc">doc</option>'
    + '</select>'
    + '</div>'
    + '<input id="carritoNotaItem" class="inp" placeholder="Nota (opcional)" style="margin-bottom:10px;">'
    + '<button class="btn-main" onclick="carritoAgregarItem()">+ Agregar a la lista</button>'
    + '</div>';
  var listaItems = '';
  if(items.length === 0){
    listaItems = '<div class="card" style="text-align:center;padding:32px 20px;color:var(--dim);">'
      + '<div style="font-size:2.5rem;margin-bottom:10px;">🛒</div>'
      + '<div style="font-size:0.85rem;">Tu lista está vacía</div>'
      + '<div style="font-size:0.72rem;margin-top:4px;">Agrega productos arriba</div></div>';
  } else {
    var pendientes = items.filter(function(i){ return !i.comprado; });
    var compradosItems = items.filter(function(i){ return i.comprado; });
    if(pendientes.length > 0){
      listaItems += '<div style="font-size:0.7rem;font-weight:700;color:var(--dim);margin-bottom:8px;">PENDIENTES ('+pendientes.length+')</div>';
      listaItems += pendientes.map(function(it,i){
        var ri = items.indexOf(it);
        return _carritoItemHTML(it, ri);
      }).join('');
    }
    if(compradosItems.length > 0){
      listaItems += '<div style="font-size:0.7rem;font-weight:700;color:var(--dim);margin:12px 0 8px;">COMPRADOS ('+compradosItems.length+')</div>';
      listaItems += compradosItems.map(function(it){
        var ri = items.indexOf(it);
        return _carritoItemHTML(it, ri);
      }).join('');
    }
  }
  var totalBar = items.length > 0 ? '<div class="carrito-total-bar" id="carritoTotalBar" style="touch-action:none;">'
    + '<button onclick="_carritoColapsarBarra()" style="background:none;border:none;font-size:0.75rem;color:var(--dim);cursor:pointer;padding:0 6px 0 0;flex-shrink:0;" title="Minimizar">✕</button>'
    + '<div class="ctb-detalle" style="display:flex;flex:1;justify-content:space-between;align-items:center;gap:8px;">'
    + '<div>'
    + '<div style="font-size:0.65rem;color:var(--dim);">Estimado</div>'
    + '<div style="font-size:1rem;font-weight:900;color:var(--text);">'+fmt(totalEst)+'</div>'
    + '</div>'
    + '<div style="text-align:right;">'
    + '<div style="font-size:0.65rem;color:var(--accent);">Comprado</div>'
    + '<div style="font-size:1rem;font-weight:900;color:var(--accent);">'+fmt(total)+'</div>'
    + '</div>'
    + '<div style="display:flex;gap:6px;">'
    + '<button onclick="carritoCompartir()" style="background:var(--inp);border:1px solid var(--border);border-radius:14px;padding:9px 11px;font-family:Outfit,sans-serif;font-size:0.95rem;cursor:pointer;">&#x1F4E4;</button>'
    + '<button onclick="carritoFinalizar()" style="background:var(--accent);border:none;border-radius:14px;padding:9px 14px;font-family:Outfit,sans-serif;font-size:0.78rem;font-weight:800;color:#fff;cursor:pointer;box-shadow:0 4px 14px rgba(43,192,112,0.3);">✅ Finalizar</button>'
    + '</div>'
    + '</div>'
    + '<div class="ctb-mini" style="display:none;font-size:0.78rem;font-weight:800;color:var(--accent);cursor:pointer;" onclick="_carritoExpandirBarra()">'+fmt(totalEst)+' — ver ›</div>'
    + '</div>' : '';
  return headerLista + formAdd + listaItems + totalBar;
}

function _renderCarritoHistorial(){
  var hist = getCarritoHistorial();
  if(hist.length === 0){
    return '<div class="card" style="text-align:center;padding:40px 20px;color:var(--dim);">'
      + '<div style="font-size:2.5rem;margin-bottom:10px;">📋</div>'
      + '<div style="font-size:0.85rem;">Sin listas guardadas aún</div>'
      + '<div style="font-size:0.72rem;margin-top:4px;">Finaliza una compra para guardarla aquí</div></div>';
  }
  return hist.map(function(lista, hi){
    var total = (lista.items||[]).reduce(function(s,i){ return s+(i.precio||0)*(i.qty||1); },0);
    var comprados = (lista.items||[]).filter(function(i){ return i.comprado; }).length;
    var cats = getCarritoCats();
    var cat = cats.find(function(c){ return c.id === lista.catId; });
    return '<div class="card" style="margin-bottom:10px;padding:14px 16px;">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">'
      + '<div>'
      + '<div style="font-weight:800;font-size:0.9rem;color:var(--text);">'+(cat?cat.ico+' ':'')+( lista.nombre||'Sin nombre')+'</div>'
      + '<div style="font-size:0.68rem;color:var(--dim);margin-top:2px;">'
      + lista.fecha + (lista.tienda?' · '+lista.tienda:'')
      + ' · '+comprados+'/'+(lista.items||[]).length+' productos'
      + '</div>'
      + '</div>'
      + '<div style="font-size:1rem;font-weight:900;color:var(--accent);">'+fmt(total)+'</div>'
      + '</div>'
      + '<div style="font-size:0.72rem;color:var(--dim);margin-bottom:10px;line-height:1.6;">'
      + (lista.items||[]).slice(0,5).map(function(i){ return i.nombre+(i.precio?' ('+fmt(i.precio)+')':''); }).join(' · ')
      + ((lista.items||[]).length > 5 ? ' · +'+((lista.items||[]).length-5)+' más' : '')
      + '</div>'
      + '<div style="display:flex;gap:8px;">'
      + '<button onclick="carritoCargarLista('+hi+')" style="flex:1;background:var(--accent);border:none;border-radius:12px;padding:9px;font-family:Outfit,sans-serif;font-size:0.78rem;font-weight:700;color:#fff;cursor:pointer;">📂 Usar lista</button>'
      + '<button onclick="carritoCompartirLista('+hi+')" style="background:var(--inp);border:1px solid var(--border);border-radius:12px;padding:9px 12px;font-family:Outfit,sans-serif;font-size:0.78rem;color:var(--text);cursor:pointer;">&#x1F4E4;</button>'
      + '<button onclick="carritoEliminarLista('+hi+')" style="background:var(--inp);border:1px solid var(--border);border-radius:12px;padding:9px 12px;font-family:Outfit,sans-serif;font-size:0.78rem;color:var(--dim);cursor:pointer;">🗑</button>'
      + '</div>'
      + '</div>';
  }).join('');
}

function _renderCarritoCatalogo(){
  var cat = getProductosCatalogo();
  var keys = Object.keys(cat).sort();
  if(keys.length === 0){
    return '<div class="card" style="text-align:center;padding:40px 20px;color:var(--dim);">'
      + '<div style="font-size:2.5rem;margin-bottom:10px;">🔍</div>'
      + '<div style="font-size:0.85rem;">Sin precios registrados aún</div>'
      + '<div style="font-size:0.72rem;margin-top:4px;">Los precios se guardan al marcar productos como comprados</div></div>';
  }
  return '<div style="margin-bottom:10px;">'
    + '<input class="inp" placeholder="🔍 Buscar producto..." oninput="_filtrarCatalogo(this.value)" id="catBuscar">'
    + '</div>'
    + '<div id="catLista">'
    + keys.map(function(k){
        var hist = cat[k];
        var ultimo = hist[0];
        var mejor  = hist.reduce(function(m,h){ return h.precio < m.precio ? h : m; }, hist[0]);
        var mayor  = hist.reduce(function(m,h){ return h.precio > m.precio ? h : m; }, hist[0]);
        return '<div class="card" style="margin-bottom:8px;padding:12px 16px;" data-prod="'+k+'">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
          + '<div style="font-weight:800;font-size:0.88rem;color:var(--text);">'+hist[0].tienda&&false?'':''
          + k.charAt(0).toUpperCase()+k.slice(1)+'</div>'
          + '<div style="font-size:1rem;font-weight:900;color:var(--text);">'+fmt(ultimo.precio)+'</div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-bottom:8px;">'
          + '<span style="font-size:0.67rem;background:rgba(43,192,112,0.12);color:#1a8c4e;border-radius:8px;padding:3px 8px;font-weight:700;">Mínimo: '+fmt(mejor.precio)+(mejor.tienda?' en '+mejor.tienda:'')+'</span>'
          + (hist.length > 1 ? '<span style="font-size:0.67rem;background:rgba(255,95,87,0.1);color:#cc2a2a;border-radius:8px;padding:3px 8px;font-weight:700;">Máximo: '+fmt(mayor.precio)+'</span>' : '')
          + '</div>'
          + hist.slice(0,4).map(function(h){
              return '<div class="hist-precio-row">'
                + '<span class="hist-precio-tienda">'+(h.tienda||'Sin tienda')+'</span>'
                + '<span class="hist-precio-fecha">'+h.fecha+'</span>'
                + '<span class="hist-precio-val">'+fmt(h.precio)+'</span>'
                + '</div>';
            }).join('')
          + '</div>';
      }).join('')
    + '</div>';
}

function carritoAgregarItem(){
  var nombre = (document.getElementById('carritoNombreItem').value||'').trim();
  var precio = parseFloat(document.getElementById('carritoPrecioItem').value)||0;
  var qty    = parseInt(document.getElementById('carritoQtyItem').value)||1;
  var unidad = document.getElementById('carritoUnidadItem').value||'pza';
  var nota   = (document.getElementById('carritoNotaItem').value||'').trim();
  if(!nombre){ showToast('⚠ Escribe el nombre del producto'); return; }
  var actual = getCarritoActual();
  actual.items = actual.items || [];
  actual.items.push({ nombre:nombre, precio:precio, qty:qty, unidad:unidad, nota:nota, comprado:false, id: Date.now() });
  if(!actual.fecha) actual.fecha = today();
  saveCarritoActual(actual);
  ['carritoNombreItem','carritoPrecioItem','carritoNotaItem'].forEach(function(id){
    var el = document.getElementById(id); if(el) el.value='';
  });
  var qEl = document.getElementById('carritoQtyItem'); if(qEl) qEl.value='1';
  var sug = document.getElementById('carritoSugerencia'); if(sug) sug.style.display='none';
  goSub('carrito');
  showToast('✓ '+nombre+' agregado');
}

function carritoToggleItem(ri){
  var actual = getCarritoActual();
  var item = actual.items[ri];
  if(!item) return;
  item.comprado = !item.comprado;
  if(item.comprado && item.precio){
    carritoRegistrarPrecio(item.nombre, item.precio, actual.tienda);
  }
  saveCarritoActual(actual);
  goSub('carrito');
}

function carritoQty(ri, delta){
  var actual = getCarritoActual();
  var item = actual.items[ri];
  if(!item) return;
  item.qty = Math.max(1, (item.qty||1) + delta);
  saveCarritoActual(actual);
  goSub('carrito');
}

function carritoEliminarItem(ri){
  var actual = getCarritoActual();
  var item = actual.items[ri];
  if(!item) return;
  var backup = JSON.parse(JSON.stringify(actual));
  actual.items.splice(ri, 1);
  saveCarritoActual(actual);
  goSub('carrito');
  mostrarUndo('🗑 "'+item.nombre+'" eliminado', function(){
    saveCarritoActual(backup); goSub('carrito');
  });
}

function carritoFinalizar(){
  var actual = getCarritoActual();
  if(!actual.items || actual.items.length === 0){ showToast('⚠ Lista vacía'); return; }
  var comprados = actual.items.filter(function(i){ return i.comprado; });
  var totalComp = comprados.reduce(function(s,i){ return s+(i.precio||0)*(i.qty||1); },0);
  var totalEst  = actual.items.reduce(function(s,i){ return s+(i.precio||0)*(i.qty||1); },0);
  if(comprados.length === 0){
    showToast('⚠ Marca al menos un producto como comprado');
    return;
  }
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
  var cats = getCarritoCats();
  var cat  = cats.find(function(c){ return c.id===actual.catId; });
  var catNombre = cat ? cat.nombre : 'Compras';
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;margin:0 auto;">'
    + '<div style="font-size:1.1rem;font-weight:900;margin-bottom:6px;">✅ Finalizar compra</div>'
    + '<div style="font-size:0.78rem;color:var(--dim);margin-bottom:18px;">'+comprados.length+' productos · Total gastado: <b style="color:var(--accent);">'+fmt(totalComp)+'</b></div>'
    + '<div style="background:var(--inp);border-radius:14px;padding:12px 14px;margin-bottom:16px;">'
    + '<div style="font-size:0.68rem;color:var(--dim);margin-bottom:8px;">RESUMEN</div>'
    + '<div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px;">'
    + '<span>Estimado</span><span style="font-weight:700;">'+fmt(totalEst)+'</span></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:0.82rem;">'
    + '<span>Real comprado</span><span style="font-weight:800;color:var(--accent);">'+fmt(totalComp)+'</span></div>'
    + '</div>'
    + '<div style="font-size:0.72rem;font-weight:700;color:var(--dim);margin-bottom:6px;">¿REGISTRAR COMO GASTO?</div>'
    + '<div style="background:var(--inp);border-radius:14px;padding:12px 14px;margin-bottom:14px;">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
    + '<input type="checkbox" id="finRegGasto" checked style="width:18px;height:18px;cursor:pointer;">'
    + '<label for="finRegGasto" style="font-size:0.82rem;font-weight:600;cursor:pointer;">Sí, registrar '+fmt(totalComp)+' como gasto</label>'
    + '</div>'
    + '<select id="finCuentaGasto" class="inp" style="font-size:0.8rem;">'
    + _carritoOpsCuentas()
    + '</select>'
    + '</div>'
    + '<button class="btn-main" onclick="carritoConfirmarFin()">✅ Confirmar y guardar</button>'
    + '<button onclick="document.getElementById(\'modalFinCarrito\').remove()" style="width:100%;margin-top:8px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;">Cancelar</button>'
    + '</div>';
  modal.id = 'modalFinCarrito';
  document.body.appendChild(modal);
}

function _carritoNuevo(){
  usalaConfirm('Empezar lista nueva? La lista actual se perdera si no la guardas.', function(){
    saveCarritoActual({nombre:'',catId:'super',items:[],fecha:'',tienda:''});
      S._carritoTab = 'lista';
      goSub('carrito');
  });
}

function carritoCargarLista(hi){
  var hist = getCarritoHistorial();
  var lista = hist[hi];
  if(!lista) return;
  var nueva = JSON.parse(JSON.stringify(lista));
  nueva.items = nueva.items.map(function(i){
    return { nombre:i.nombre, precio:i.precio, qty:i.qty, unidad:i.unidad, nota:i.nota, comprado:false, id:Date.now()+Math.random() };
  });
  nueva.fecha = today();
  nueva.fechaFin = null;
  nueva.totalReal = null;
  saveCarritoActual(nueva);
  S._carritoTab = 'lista';
  goSub('carrito');
  showToast('📂 Lista cargada — ya puedes modificarla');
}

function carritoEliminarLista(hi){
  var hist = getCarritoHistorial();
  var lista = hist[hi];
  if(!lista) return;
  var backup = JSON.parse(JSON.stringify(hist));
  hist.splice(hi, 1);
  saveCarritoHistorial(hist);
  goSub('carrito');
  mostrarUndo('🗑 Lista eliminada', function(){ saveCarritoHistorial(backup); goSub('carrito'); });
}

function carritoCompartir(){
  var actual = getCarritoActual();
  if(!actual.items || actual.items.length === 0){ showToast('⚠ Lista vacía'); return; }
  var texto = _carritoTextoLista(actual);
  _carritoMostrarModalCompartir(texto);
}

function _initCarritoDrag(){
  var bar = document.getElementById('carritoTotalBar');
  if(!bar) return;
  var isDragging = false, startY = 0, startBottom = 72;
  function getBottom(){ return parseInt(bar.style.bottom)||72; }
  function onStart(e){
    var target = e.target || e.srcElement;
    if(target.tagName==='BUTTON'||target.tagName==='A') return;
    isDragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startBottom = getBottom();
    bar.style.transition = 'none';
    e.preventDefault();
  }
  function onMove(e){
    if(!isDragging) return;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    var delta = startY - y; // mover hacia arriba = delta positivo
    var newBottom = Math.max(8, Math.min(window.innerHeight - 80, startBottom + delta));
    bar.style.bottom = newBottom + 'px';
    e.preventDefault();
  }
  function onEnd(){
    if(!isDragging) return;
    isDragging = false;
    bar.style.transition = 'all 0.25s';
  }
  bar.addEventListener('touchstart', onStart, {passive:false});
  bar.addEventListener('touchmove',  onMove,  {passive:false});
  bar.addEventListener('touchend',   onEnd);
  bar.addEventListener('mousedown',  onStart);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup',   onEnd);
}

function getCarritoActual(){ return load('carrito_actual', {nombre:'',catId:'super',items:[],fecha:'',tienda:''}); }

function saveCarritoActual(c){ save('carrito_actual', c); }

function getCarritoHistorial(){ return load('carrito_historial', []); }

function saveCarritoHistorial(h){ save('carrito_historial', h); }

function getCarritoCats(){
  var defaults = [
    {id:'agro',   ico:'🌾', nombre:'Agropecuario'},
    {id:'shop',   ico:'🛍️', nombre:'Shopping'},
    {id:'super',  ico:'🛒', nombre:'Súper'},
    {id:'mat',    ico:'🧱', nombre:'Materiales'},
    {id:'ins',    ico:'📦', nombre:'Insumos'},
  ];
  var custom = load('carrito_cats', []);
  return defaults.concat(custom);
}

function carritoRegistrarPrecio(nombre, precio, tienda){
  if(!nombre || !precio) return;
  var cat = getProductosCatalogo();
  var key = nombre.trim().toLowerCase();
  if(!cat[key]) cat[key] = [];
  cat[key].unshift({ precio: precio, tienda: tienda||'', fecha: today() });
  if(cat[key].length > 10) cat[key] = cat[key].slice(0,10); // max 10 registros por producto
  saveProductosCatalogo(cat);
}

function abrirCalc(){
  var cf = document.getElementById('calcFloat');
  var bb = document.getElementById('calcBubble');
  if(bb && bb.style.display !== 'none'){
    restaurarCalc(); return;
  }
  if(cf.style.display === 'block') return;
  _calcExpr=''; _calcResult='0'; _calcNewNum=true;
  document.getElementById('calcDisplay').textContent='0';
  document.getElementById('calcExpr').textContent='';
  cf.style.display='block';
  cf.style.bottom='100px'; cf.style.right='14px';
  cf.style.left='auto'; cf.style.top='auto';
  if(bb) bb.style.display='none';
  iniciarDragCalc();
  iniciarDragBurbuja();
}

function cerrarCalc(){
  var cf = document.getElementById('calcFloat');
  var bb = document.getElementById('calcBubble');
  cf.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  cf.style.transform  = 'scale(0.8)';
  cf.style.opacity    = '0';
  setTimeout(function(){
    cf.style.display='none';
    cf.style.transform=''; cf.style.opacity=''; cf.style.transition='';
  }, 200);
  if(bb) bb.style.display='none';
  _calcExpr=''; _calcResult='0'; _calcNewNum=true;
}

function calcDel(){
  if(_calcNewNum||_calcResult==='0') return;
  _calcResult=_calcResult.length>1?_calcResult.slice(0,-1):'0';
  document.getElementById('calcDisplay').textContent=_calcResult;
}

function calcOp(op){
  _calcExpr+=_calcResult+' '+op+' ';
  document.getElementById('calcExpr').textContent=_calcExpr;
  _calcNewNum=true; _calcResult='0';
}

function restaurarCalc(){
  var cf = document.getElementById('calcFloat');
  var bb = document.getElementById('calcBubble');
  var r  = bb.getBoundingClientRect();
  cf.style.left  = Math.max(0, r.left - 100) + 'px';
  cf.style.top   = Math.max(0, r.top  - 200) + 'px';
  cf.style.right = 'auto'; cf.style.bottom = 'auto';
  cf.style.transform = 'scale(0.3)';
  cf.style.opacity = '0';
  cf.style.display = 'block';
  bb.style.display = 'none';
  requestAnimationFrame(function(){
    cf.style.transition = 'transform 0.3s cubic-bezier(0.34,1.4,0.64,1), opacity 0.25s ease';
    cf.style.transform  = 'scale(1)';
    cf.style.opacity    = '1';
    setTimeout(function(){ cf.style.transition=''; }, 350);
  });
}

function minimizarCalc(){
  var cf = document.getElementById('calcFloat');
  var bb = document.getElementById('calcBubble');
  var r = cf.getBoundingClientRect();
  bb.style.left = (r.left + r.width/2 - 34) + 'px';
  bb.style.top  = (r.top  + r.height/2 - 34) + 'px';
  bb.style.right = 'auto'; bb.style.bottom = 'auto';
  bb.style.display = 'flex';
  document.getElementById('calcBubbleVal').textContent = _calcResult !== '0' ? _calcResult : (_calcExpr ? '...' : '0');
  cf.style.transform = 'scale(0.3)';
  cf.style.opacity = '0';
  setTimeout(function(){ cf.style.display='none'; cf.style.transform=''; cf.style.opacity=''; }, 280);
}

function toggleVoz(){
  if(_vozActivo){ detenerVoz(); return; }
  iniciarVoz();
}


// ── Funciones adicionales ──

function nkPress(n){
  if(_nipBuffer.length >= 4) return;
  _nipBuffer += String(n);
  _actualizarNipDots();
  if(_nipBuffer.length === 4) setTimeout(verificarNip, 120);
}

function nkDel(){
  _nipBuffer = _nipBuffer.slice(0,-1);
  _actualizarNipDots();
  var err = document.getElementById('nipErr');
  if(err) err.style.display='none';
}

function _actualizarNipDots(){
  for(var i=1;i<=4;i++){
    var d = document.getElementById('nd'+i);
    if(d) d.className = 'nip-dot' + (i<=_nipBuffer.length ? ' on' : '');
  }
}

function nipKey(){
  if(!_sesionPendiente) return null;
  return _sesionPendiente.isAdmin ? 'usala_nip_admin' : 'usala_nip_u_' + _sesionPendiente.codigo;
}


function copiarCodigo(c){ navigator.clipboard.writeText(c).catch(function(){}); showToast('✓ Copiado: '+c); }


// ── Funciones restantes ──

function getUCod(){ return S.user ? (S.user.isAdmin ? 'admin' : S.user.codigo) : null; }

async function dbGetCodigos(){
  var ck = 'codigos';
  var cached = _cacheGet(ck); if(cached) return cached;
  try {
    var rows = await DB.get('usala_usuarios', 'is_admin=eq.false&order=creado_en.desc');
    _cacheSet(ck, rows||[]);
    return rows||[];
  } catch(e) { console.warn('dbGetCodigos:', e); return []; }
}

async function dbGetTxs(){
  var uc = getUCod(); if(!uc) return [];
  var ck = uc + '_txs';
  var cached = _cacheGet(ck); if(cached) return cached;
  try {
    var rows = await DB.get('usala_txs', 'user_codigo=eq.' + encodeURIComponent(uc) + '&order=fecha.asc,id.asc');
    _cacheSet(ck, rows||[]);
    return rows||[];
  } catch(e) { console.warn('dbGetTxs:', e); return []; }
}

async function dbSaveTx(tx){
  var uc = getUCod(); if(!uc) return;
  try {
    var data = { user_codigo: uc, tipo: tx.tipo, monto: tx.monto, desc: tx.desc, cat: tx.cat, fecha: tx.fecha, cuenta: tx.cuenta||'efectivo' };
    if(tx.id && typeof tx.id === 'number' && tx.id > 0){
      await DB.update('usala_txs', 'id=eq.'+tx.id+'&user_codigo=eq.'+encodeURIComponent(uc), data);
    } else {
      await DB.insert('usala_txs', data);
    }
    _cacheInvalid(uc + '_txs');
  } catch(e) { console.warn('dbSaveTx:', e); }
}

async function dbDeleteTx(id){
  var uc = getUCod(); if(!uc) return;
  try {
    await DB.del('usala_txs', 'id=eq.'+id+'&user_codigo=eq.'+encodeURIComponent(uc));
    _cacheInvalid(uc + '_txs');
  } catch(e) { console.warn('dbDeleteTx:', e); }
}

function _schedulSync(){
  if(_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(_flushSync, 2000); // esperar 2s de inactividad
}

function _setSyncIndicator(estado){
  var el = document.getElementById('syncDot');
  if(!el) return;
  el.style.display = 'block';
  if(estado === 'syncing'){
    el.style.background = '#ffb340';
    el.title = 'Guardando...';
  } else if(estado === 'ok'){
    el.style.background = '#2bc070';
    el.title = 'Guardado en la nube ✓';
    if(_syncIndicatorTimer) clearTimeout(_syncIndicatorTimer);
    _syncIndicatorTimer = setTimeout(function(){ el.style.display='none'; }, 3000);
  } else {
    el.style.background = '#ff5f57';
    el.title = 'Sin conexión — datos guardados localmente';
  }
}

async function dbKVGet(key){
  var uc = getUCod(); if(!uc) return null;
  var ck = uc + '_kv_' + key;
  var cached = _cacheGet(ck); if(cached !== null) return cached;
  try {
    var rows = await DB.get('usala_kv', 'user_codigo=eq.'+encodeURIComponent(uc)+'&key=eq.'+encodeURIComponent(key));
    var val = (rows && rows.length > 0) ? JSON.parse(rows[0].value) : null;
    _cacheSet(ck, val);
    return val;
  } catch(e) { return null; }
}

async function dbKVSet(key, value){
  var uc = getUCod(); if(!uc) return;
  var ck = uc + '_kv_' + key;
  _cacheSet(ck, value);
  try { localStorage.setItem('usala_'+uc+'_'+key, JSON.stringify(value)); } catch(e){}
  _syncQueue.push({ key: key, value: value });
  _schedulSync();
}

function detenerRealtime(){
  if(_realtimeInterval) clearInterval(_realtimeInterval);
  _realtimeActivo = false;
  console.log('⏹ Realtime detenido');
}

async function _realtimeTick(){
  if(!S.user || !_realtimeActivo) return;
  var uc = getUCod();
  if(!uc) return;
  try {
    var remote = await DB.get('usala_kv',
      'user_codigo=eq.' + encodeURIComponent(uc) +
      '&updated_at=gt.' + encodeURIComponent(_lastSyncTs) +
      '&order=updated_at.desc');
    if(remote && remote.length > 0){
      var cambio = false;
      remote.forEach(function(row){
        try {
          var localKey = 'usala_' + uc + '_' + row.key;
          var localRaw = localStorage.getItem(localKey);
          if(localRaw !== row.value){
            localStorage.setItem(localKey, row.value);
            _cacheInvalid(uc + '_kv_' + row.key);
            cambio = true;
            console.log('⚡ Actualizado desde nube:', row.key);
          }
        } catch(e){}
      });
      if(cambio){
        _realtimeRefrescarUI();
        _setSyncIndicator('ok');
      }
    }
    // También revisar noticias del admin para TODOS los usuarios
    if(!S.user.isAdmin){
      var noticias = await DB.get('usala_noticias', 'order=fecha.desc&limit=5');
      if(noticias && noticias.length > 0){
        var stored = JSON.parse(localStorage.getItem('usala_noticias')||'[]');
        if(JSON.stringify(noticias) !== JSON.stringify(stored)){
          localStorage.setItem('usala_noticias', JSON.stringify(noticias));
          if(S.tab === 'inicio') renderTab('inicio');
        }
      }
    }
    _lastSyncTs = new Date().toISOString();
  } catch(e){
    _setSyncIndicator('error');
    console.warn('⚡ Realtime tick falló:', e.message);
  }
}

function _realtimeRefrescarUI(){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  var tab = S.tab || 'inicio';
  var sub = S.subtab;
  var subsRefresca = ['historial','creditos_debo','creditos_cobrar','progreso','reportes'];
  if(sub && subsRefresca.indexOf(sub) > -1){
    goSub(sub);
  } else if(!sub || sub === tab){
    renderTab(tab);
  }
  _mostrarToastSync();
}

function _mostrarToastSync(){
  if(_syncToastTimer) return; // no spamear
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
    +'background:rgba(43,192,112,0.9);color:#fff;font-size:0.72rem;font-weight:700;'
    +'padding:6px 14px;border-radius:20px;z-index:9998;pointer-events:none;'
    +'backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(43,192,112,0.3);';
  t.textContent = '⚡ Datos actualizados';
  document.body.appendChild(t);
  _syncToastTimer = setTimeout(function(){
    t.remove(); _syncToastTimer = null;
  }, 2000);
}

async function dbPing(){
  try {
    await DB.get('usala_usuarios', 'codigo=eq.admin&select=codigo');
    _dbOnline = true;
  } catch(e) { _dbOnline = false; }
  return _dbOnline;
}

function selectTheme(el){
  document.querySelectorAll('.theme-card').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
  S.theme = el.dataset.theme;
  applyTheme(S.theme);
}

function applyTheme(t){
  document.documentElement.dataset.theme = (t === 'default') ? '' : t;
}

function confirmarTema(){
  localStorage.setItem('usala_theme', S.theme);
}

function mostrarPanelSolicitud(){
  ['panelSesion','panelCodigo','panelEnviada'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  var ps = document.getElementById('panelSolicitud');
  if(ps) ps.style.display='block';
}

function formatearContacto(inp){
  var v = inp.value.replace(/\D/g,'');
  if(v.startsWith('521')) v=v.slice(2);
  else if(v.startsWith('52')) v=v.slice(2);
  else if(v.startsWith('1') && v.length===11) v=v.slice(1);
  if(v.length>10) v=v.slice(0,10);
  var fmt='';
  if(v.length>0) fmt=v.slice(0,2);
  if(v.length>2) fmt+=' '+v.slice(2,6);
  if(v.length>6) fmt+=' '+v.slice(6,10);
  if(inp.value.includes('@')) return;
  inp.value = fmt;
  var hint = document.getElementById('solContactoHint');
  if(hint){
    if(v.length===10){ hint.textContent='✅ Número válido'; hint.style.display='block'; hint.style.color='var(--accent2)'; }
    else if(v.length>4){ hint.textContent='⚠ Verifica el número'; hint.style.display='block'; hint.style.color='#f57c00'; }
    else{ hint.style.display='none'; }
  }
}

function enviarSolicitud(){
  var nombre   = (document.getElementById('solNombre').value||'').trim();
  var motivo   = (document.getElementById('solMotivo').value||'').trim();
  var contacto = (document.getElementById('solContacto').value||'').trim();
  var msg      = document.getElementById('solicitudMsg');
  var btn      = document.querySelector('#panelSolicitud .lg-btn');
  if(!nombre){ showErr('⚠ Escribe tu nombre'); return; }
  if(!contacto || (contacto.replace(/\D/g,'').length < 7 && !contacto.includes('@'))){
    showErr('⚠ Escribe tu WhatsApp o email'); return;
  }
  if(msg) msg.style.display='none';
  if(btn){ btn.textContent='Enviando...'; btn.disabled=true; }
  var sol = {
    nombre: nombre, motivo: motivo, contacto: contacto,
    fecha: today(), estado: 'pendiente'
  };
  DB.insert('usala_solicitudes', sol).then(function(res){
    if(btn){ btn.textContent='📩 Enviar solicitud'; btn.disabled=false; }
    ['panelSolicitud'].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display='none'; });
    var pe = document.getElementById('panelEnviada'); if(pe) pe.style.display='block';
    var txt = '🔑 Solicitud USALA\n👤 '+nombre+'\n📞 '+contacto+(motivo?'\n💬 '+motivo:'');
    var waBtn = document.getElementById('_solWaBtn');
    if(waBtn) waBtn.href='https://wa.me/?text='+encodeURIComponent(txt);
    var cpBtn = document.getElementById('_solCopyBtn');
    if(cpBtn) cpBtn.onclick=function(){ navigator.clipboard.writeText(txt).catch(function(){}); showToast('✓ Copiado'); };
  }).catch(function(e){
    console.warn('Supabase error:', e);
    var sols = JSON.parse(localStorage.getItem('usala_solicitudes')||'[]');
    sols.push(Object.assign({id:Date.now()}, sol));
    localStorage.setItem('usala_solicitudes', JSON.stringify(sols));
    if(btn){ btn.textContent='📩 Enviar solicitud'; btn.disabled=false; }
    ['panelSolicitud'].forEach(function(id){ var el=document.getElementById(id); if(el) el.style.display='none'; });
    var pe = document.getElementById('panelEnviada'); if(pe) pe.style.display='block';
    var txt = '🔑 Solicitud USALA\n👤 '+nombre+'\n📞 '+contacto+(motivo?'\n💬 '+motivo:'');
    var waBtn = document.getElementById('_solWaBtn');
    if(waBtn) waBtn.href='https://wa.me/?text='+encodeURIComponent(txt);
  });
}

function importarSolicitud(){
  var raw = (document.getElementById('importSolInp').value||'').trim();
  if(!raw){ showToast('⚠ Pega el mensaje primero'); return; }
  var sol=null;
  try{
    var match = raw.match(/([A-Za-z0-9+/]{20,}={0,2})/);
    if(match) sol=JSON.parse(decodeURIComponent(escape(atob(match[1]))));
    else sol=JSON.parse(raw);
  } catch(e){ showToast('⚠ No se pudo leer el mensaje'); return; }
  if(!sol||!sol.nombre){ showToast('⚠ Mensaje inválido'); return; }
  var sols=JSON.parse(localStorage.getItem('usala_solicitudes')||'[]');
  var ya=sols.find(function(s){ return s.contacto===sol.contacto && s.estado==='pendiente'; });
  if(ya){ showToast('Ya existe solicitud pendiente de '+sol.nombre); return; }
  sol.estado='pendiente'; sol.importada=true;
  sols.push(sol); localStorage.setItem('usala_solicitudes',JSON.stringify(sols));
  document.getElementById('importSolInp').value='';
  showToast('✅ Solicitud de '+sol.nombre+' registrada');
  goSub('codigos');
}

async function _hashPass(pass){
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest('SHA-256', enc.encode(pass));
  return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

function olvidarContraseña(){
  var codigo = (document.getElementById('accCodigo').value||'').trim().toUpperCase();
  showToast('📩 Pídele al administrador que te genere un nuevo código para '+codigo);
}

function cerrarWelcome(){
  var m = document.getElementById('welcomeModal');
  var bd = document.getElementById('welcomeBackdrop');
  var sh = document.getElementById('welcomeSheet');
  if(bd) bd.style.background = 'rgba(0,0,0,0)';
  if(sh) sh.style.transform = 'translateY(100%)';
  setTimeout(function(){ if(m) m.style.display = 'none'; }, 500);
  if(S.user && !S.user.isAdmin){
    localStorage.setItem('usala_bienvenida_' + S.user.codigo, '1');
  }
}

function iniciarDragBurbuja(){
  var bb = document.getElementById('calcBubble');
  var startX,startY,startL,startT,dragging=false,moved=false;
  bb.ontouchstart=function(e){
    if(e.touches.length!==1) return;
    dragging=true; moved=false;
    var r=bb.getBoundingClientRect();
    startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    startL=r.left; startT=r.top;
    bb.style.right='auto'; bb.style.bottom='auto';
    e.preventDefault();
  };
  bb.ontouchmove=function(e){
    if(!dragging||e.touches.length!==1) return;
    moved=true;
    var dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
    bb.style.left=Math.max(0,Math.min(window.innerWidth-68,startL+dx))+'px';
    bb.style.top =Math.max(0,Math.min(window.innerHeight-68,startT+dy))+'px';
    e.preventDefault();
  };
  bb.ontouchend=function(e){
    dragging=false;
    if(!moved) restaurarCalc(); // tap sin drag = restaurar
  };
}

function iniciarDragCalc(){
  var handle = document.getElementById('calcHandle');
  var cf = document.getElementById('calcFloat');
  var startX,startY,startL,startT,dragging=false;
  function esBtnCalc(el){ return el.id==='calcMinBtn'||el.id==='calcCloseBtn'||el.closest&&(el.closest('#calcMinBtn')||el.closest('#calcCloseBtn')); }
  handle.ontouchstart = function(e){
    if(esBtnCalc(e.target)) return;
    if(e.touches.length!==1) return;
    dragging=true;
    var r=cf.getBoundingClientRect();
    startX=e.touches[0].clientX; startY=e.touches[0].clientY;
    startL=r.left; startT=r.top;
    cf.style.right='auto'; cf.style.bottom='auto';
    cf.style.left=startL+'px'; cf.style.top=startT+'px';
    e.preventDefault();
  };
  handle.ontouchmove = function(e){
    if(!dragging||e.touches.length!==1) return;
    var dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
    var newL=Math.max(0,Math.min(window.innerWidth-cf.offsetWidth, startL+dx));
    var newT=Math.max(0,Math.min(window.innerHeight-cf.offsetHeight, startT+dy));
    cf.style.left=newL+'px'; cf.style.top=newT+'px';
    e.preventDefault();
  };
  handle.ontouchend=function(){ dragging=false; };
  handle.onmousedown=function(e){
    if(esBtnCalc(e.target)) return;
    dragging=true;
    var r=cf.getBoundingClientRect();
    startX=e.clientX; startY=e.clientY;
    startL=r.left; startT=r.top;
    cf.style.right='auto'; cf.style.bottom='auto';
    cf.style.left=startL+'px'; cf.style.top=startT+'px';
    e.preventDefault();
  };
  document.onmousemove=function(e){
    if(!dragging) return;
    var newL=Math.max(0,Math.min(window.innerWidth-cf.offsetWidth, startL+(e.clientX-startX)));
    var newT=Math.max(0,Math.min(window.innerHeight-cf.offsetHeight, startT+(e.clientY-startY)));
    cf.style.left=newL+'px'; cf.style.top=newT+'px';
  };
  document.onmouseup=function(){ dragging=false; };
}


function calcNum(n){
  if(_calcNewNum){ _calcResult=n; _calcNewNum=false; }
  else { _calcResult=_calcResult==='0'?n:_calcResult+n; }
  document.getElementById('calcDisplay').textContent=_calcResult;
}

function calcPlusMinus(){
  if(_calcResult==='0') return;
  _calcResult=_calcResult.startsWith('-')?_calcResult.slice(1):'-'+_calcResult;
  document.getElementById('calcDisplay').textContent=_calcResult;
}

function calcPunto(){
  if(_calcNewNum){ _calcResult='0.'; _calcNewNum=false; }
  else if(!_calcResult.includes('.')) _calcResult+='.';
  document.getElementById('calcDisplay').textContent=_calcResult;
}

function calcEqual(){
  try{
    var expr=(_calcExpr+_calcResult).replace(/÷/g,'/').replace(/×/g,'*');
    expr=expr.replace(/(\d+\.?\d*)\s*%/g,function(m,n){ return (parseFloat(n)/100); });
    var res=Function('"use strict";return ('+expr+')')();
    _calcResult=parseFloat(res.toFixed(10)).toString();
    document.getElementById('calcDisplay').textContent=_calcResult;
    document.getElementById('calcExpr').textContent=_calcExpr+'=';
    _calcExpr=''; _calcNewNum=true;
  }catch(e){ document.getElementById('calcDisplay').textContent='Error'; _calcExpr=''; _calcNewNum=true; }
}

function calcAc(){ _calcExpr=''; _calcResult='0'; _calcNewNum=true; document.getElementById('calcDisplay').textContent='0'; document.getElementById('calcExpr').textContent=''; }

function poblarCuentas(cuentaActual){
  var c = getCuentas();
  var sel = document.getElementById('txCuenta');
  if(!sel) return;
  var ops = '<option value="">— Sin asignar —</option>'
    +'<option value="efectivo"'+(cuentaActual==='efectivo'?' selected':'')+'>💵 Efectivo</option>';
  (c.cheques||[]).forEach(function(ch, i){
    var val = 'cheque_'+i;
    ops += '<option value="'+val+'"'+(cuentaActual===val?' selected':'')+'>🏧 '+ch.banco+' ('+ch.tipo+')</option>';
  });
  sel.innerHTML = ops;
}

function _abrirTxModalDirecto(tipo){
  S.editTxId = null;
  document.getElementById('txModalTitle').textContent = 'Nueva Transacción';
  document.getElementById('txDesc').value = '';
  document.getElementById('txMonto').value = '';
  document.getElementById('txFecha').value = today();
  document.getElementById('tipoSelector').style.display = 'grid';
  document.getElementById('txSaveBtn').textContent = '💾 Guardar';
  selTipo(tipo || 'gasto');
  poblarCuentas('');
  document.getElementById('txModal').classList.add('open');
  setTimeout(function(){ document.getElementById('txDesc').focus(); }, 400);
}

function cerrarIngresoTipo(){ document.getElementById('ingresoTipoModal').classList.remove('open'); }

function elegirTipoIngreso(tipo){
  cerrarIngresoTipo();
  if(tipo === 'normal'){
    _abrirTxModalDirecto('ingreso');
  } else if(tipo === 'prestamo'){
    _abrirModalPrestamoRecibido();
  } else if(tipo === 'cobro'){
    _abrirModalCobrarCxC();
  }
}

function _cobrarCxC(i){
  var cxcs = load('cxc',[]);
  var c = cxcs[i];
  if(!c) return;
  var txs = load('txs',[]);
  txs.push({ id:Date.now(), tipo:'ingreso', monto:c.monto,
    desc:'Cobré a: '+c.nombre, cat:'Cobro de deuda',
    fecha:today(), cuenta:'efectivo' });
  save('txs', txs);
  cxcs.splice(i,1);
  save('cxc', cxcs);
  document.getElementById('cobrarCxCModal').remove();
  showToast('✅ Cobro registrado');
  if(S.tab==='inicio') renderTab('inicio');
}

function cerrarGastoTipo(){ document.getElementById('gastoTipoModal').classList.remove('open'); }

function elegirTipoGasto(tipo){
  cerrarGastoTipo();
  if(tipo === 'normal'){
    _abrirTxModalDirecto('gasto');
  } else if(tipo === 'preste'){
    _abrirModalPreste();
  } else if(tipo === 'abono'){
    _abrirModalAbonoDeuda();
  }
}

function _abrirModalAbonoDeuda(){
  var creds = load('creditos',[]);
  var deudas = creds.filter(function(c){ return c.tipo==='deuda' && c.estado!=='pagado'; });
  if(deudas.length === 0){
    _abrirTxModalDirecto('gasto');
    showToast('No tienes deudas activas — registra como gasto normal');
    return;
  }
  var m = document.createElement('div');
  m.className = 'modal open';
  m.id = 'abonoModal';
  var lista = deudas.map(function(c){
    var ri = creds.indexOf(c);
    var pendiente = c.monto - (c.abonado||0);
    return '<button onclick="_seleccionarDeudaAbono('+ri+')" style="'
      +'display:flex;align-items:center;justify-content:space-between;'
      +'padding:14px 16px;border-radius:16px;border:1.5px solid var(--border);'
      +'background:var(--card);cursor:pointer;width:100%;color:var(--text);margin-bottom:10px;">'
      +'<div style="text-align:left;">'
      +'<div style="font-weight:700;">'+c.persona+'</div>'
      +'<div style="font-size:0.78rem;color:var(--dim);">'+(c.descripcion||'')+'</div>'
      +'</div>'
      +'<div style="text-align:right;">'
      +'<div style="font-weight:800;color:#ff5f57;">-'+fmt(pendiente)+'</div>'
      +'<div style="font-size:0.72rem;color:var(--dim);">pendiente</div>'
      +'</div>'
      +'</button>';
  }).join('');
  m.innerHTML = '<div class="modal-box" style="position:relative;z-index:2;">'
    +'<div class="modal-header"><div class="modal-title">💸 ¿A qué deuda abonaste?</div>'
    +'<button class="modal-close" onclick="document.getElementById(&quot;abonoModal&quot;).remove()">✕</button></div>'
    +'<p style="color:var(--dim);font-size:0.82rem;margin-bottom:14px;">Selecciona la deuda que pagaste</p>'
    +lista+'</div>';
  document.body.appendChild(m);
}

function _seleccionarDeudaAbono(ri){
  document.getElementById('abonoModal').remove();
  var creds = load('creditos',[]);
  var c = creds[ri];
  if(!c) return;
  var pendiente = c.monto - (c.abonado||0);
  var m = document.createElement('div');
  m.className = 'modal open';
  m.id = 'montoAbonoModal';
  m.setAttribute('data-ri', ri);
  m.innerHTML = '<div class="modal-box" style="position:relative;z-index:2;">'
    +'<div class="modal-header"><div class="modal-title">💸 Abono a '+c.persona+'</div>'
    +'<button class="modal-close" onclick="document.getElementById(&quot;montoAbonoModal&quot;).remove()">✕</button></div>'
    +'<p style="color:var(--dim);font-size:0.82rem;margin-bottom:4px;">'+( c.descripcion||'')+'</p>'
    +'<p style="font-size:0.82rem;margin-bottom:14px;">Pendiente: <b style="color:#ff5f57;">'+fmt(pendiente)+'</b></p>'
    +'<label class="inp-label">Monto del abono ($)</label>'
    +'<input class="inp" id="abonoMonto" type="number" inputmode="decimal" placeholder="0.00">'
    +'<label class="inp-label">¿De qué cuenta salió?</label>'
    +'<select class="inp" id="abonoCuenta"><option value="efectivo">💵 Efectivo</option><option value="banco">🏦 Banco</option></select>'
    +'<button class="lg-btn" style="margin-top:18px;" onclick="_guardarAbonoDeuda('+ri+')">💾 Guardar abono</button>'
    +'</div>';
  document.body.appendChild(m);
}

function _guardarAbonoDeuda(ri){
  var monto  = parseFloat(document.getElementById('abonoMonto').value||0);
  var cuenta = document.getElementById('abonoCuenta').value;
  if(!monto){ showToast('⚠ Ingresa el monto del abono'); return; }
  var creds = load('creditos',[]);
  var c = creds[ri];
  if(!c){ showToast('Error: deuda no encontrada'); return; }
  var pendiente = c.monto - (c.abonado||0);
  if(monto > pendiente) monto = pendiente;
  if(!c.historialAbonos) c.historialAbonos = [];
  c.historialAbonos.push({ fecha:today(), monto:monto, nota:'Pago directo' });
  c.abonado = (parseFloat(c.abonado)||0) + monto;
  if(c.abonado >= c.monto) c.estado = 'pagado';
  save('creditos', creds);
  var txs = load('txs',[]);
  txs.push({ id:Date.now(), tipo:'gasto', monto:monto,
    desc:'Abono: '+c.persona, cat:'Pagos / Deudas', fecha:today(), cuenta:cuenta });
  save('txs', txs);
  document.getElementById('montoAbonoModal').remove();
  showToast(c.estado==='pagado' ? '🎉 ¡Deuda saldada!' : '✅ Abono registrado');
  if(S.tab==='inicio') renderTab('inicio');
  if(S.tab==='creditos') renderTab('creditos');
}

function selTipo(t){
  document.getElementById('tipoGasto').classList.toggle('selected', t==='gasto');
  document.getElementById('tipoIngreso').classList.toggle('selected', t==='ingreso');
  var sel = document.getElementById('txCat');
  sel.innerHTML = t==='ingreso' ? buildIngresoCatSelect('txCat','') : buildGastoCatSelect('txCat','');
}

function _consejeroSVG(expresion){
  var ojos = {
    feliz:     '<circle cx="22" cy="26" r="3" fill="#2a1a00"/><circle cx="42" cy="26" r="3" fill="#2a1a00"/><circle cx="23" cy="25" r="1" fill="white"/><circle cx="43" cy="25" r="1" fill="white"/>',
    contento:  '<circle cx="22" cy="27" r="2.5" fill="#2a1a00"/><circle cx="42" cy="27" r="2.5" fill="#2a1a00"/><circle cx="23" cy="26" r="1" fill="white"/><circle cx="43" cy="26" r="1" fill="white"/>',
    preocupado:'<ellipse cx="22" cy="27" rx="3" ry="2.5" fill="#2a1a00"/><ellipse cx="42" cy="27" rx="3" ry="2.5" fill="#2a1a00"/><path d="M19 22 Q22 20 25 22" stroke="#2a1a00" stroke-width="1.5" fill="none"/>',
    triste:    '<ellipse cx="22" cy="28" rx="3" ry="2" fill="#2a1a00"/><ellipse cx="42" cy="28" rx="3" ry="2" fill="#2a1a00"/><path d="M18 22 Q22 19 26 22" stroke="#2a1a00" stroke-width="1.5" fill="none"/><path d="M38 22 Q42 19 46 22" stroke="#2a1a00" stroke-width="1.5" fill="none"/>',
  };
  var boca = {
    feliz:     '<path d="M24 35 Q32 42 40 35" stroke="#2a1a00" stroke-width="2" fill="none" stroke-linecap="round"/>',
    contento:  '<path d="M25 35 Q32 40 39 35" stroke="#2a1a00" stroke-width="2" fill="none" stroke-linecap="round"/>',
    preocupado:'<path d="M24 38 Q32 34 40 38" stroke="#2a1a00" stroke-width="2" fill="none" stroke-linecap="round"/>',
    triste:    '<path d="M24 40 Q32 34 40 40" stroke="#2a1a00" stroke-width="2" fill="none" stroke-linecap="round"/>',
  };
  var mejilla = (expresion==='feliz'||expresion==='contento')
    ? '<ellipse cx="16" cy="34" rx="5" ry="4" fill="rgba(255,150,120,0.3)"/><ellipse cx="48" cy="34" rx="5" ry="4" fill="rgba(255,150,120,0.3)"/>'
    : '';
  var colorCara = expresion==='triste'||expresion==='preocupado' ? '#FFD580' : '#FFE066';
  var colorSombrero = expresion==='feliz' ? '#1a8c4e' : expresion==='contento' ? '#0070cc' : expresion==='preocupado' ? '#c07a10' : '#cc2a2a';
  var signo = expresion==='feliz' ? '$' : expresion==='contento' ? '$' : expresion==='preocupado' ? '!' : '?';
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">'
    +'<ellipse cx="32" cy="60" rx="18" ry="4" fill="rgba(0,0,0,0.08)"/>'
    +'<rect x="20" y="46" width="24" height="16" rx="8" fill="'+colorSombrero+'"/>'
    +'<rect x="27" y="42" width="10" height="8" rx="4" fill="'+colorCara+'"/>'
    +'<circle cx="32" cy="28" r="20" fill="'+colorCara+'"/>'
    +'<circle cx="32" cy="28" r="20" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>'
    +mejilla
    +ojos[expresion]
    +boca[expresion]
    +'<rect x="14" y="10" width="36" height="4" rx="2" fill="'+colorSombrero+'"/>'
    +'<rect x="20" y="2" width="24" height="10" rx="4" fill="'+colorSombrero+'"/>'
    +'<text x="32" y="10" text-anchor="middle" font-size="7" font-weight="900" fill="white">'+signo+'</text>'
    +'<ellipse cx="23" cy="20" rx="4" ry="3" fill="rgba(255,255,255,0.25)"/>'
    +'</svg>';
}

function renderConsejeroDetalle(){
  irProgreso();
}

function saveCarritoCats(cats){
  var defaultIds = ['agro','shop','super','mat','ins'];
  save('carrito_cats', cats.filter(function(c){ return defaultIds.indexOf(c.id)===-1; }));
}

function getProductosCatalogo(){ return load('carrito_catalogo', {}); }

function saveProductosCatalogo(c){ save('carrito_catalogo', c); }

function carritoUltimoPrecio(nombre){
  var cat = getProductosCatalogo();
  var key = nombre.trim().toLowerCase();
  var hist = cat[key];
  if(!hist || hist.length === 0) return null;
  return hist[0];
}

function carritoHistorialPreciosTienda(nombre){
  var cat = getProductosCatalogo();
  var key = nombre.trim().toLowerCase();
  return cat[key] || [];
}

function _carritoTab(t){ S._carritoTab = t; goSub('carrito'); }

function _carritoItemHTML(it, ri){
  var chkClass = it.comprado ? ' on' : '';
  var itemClass = it.comprado ? ' comprado' : '';
  var hist = carritoHistorialPreciosTienda(it.nombre);
  var mejorPrecio = hist.length > 1 ? hist.reduce(function(m,h){ return h.precio < m.precio ? h : m; }, hist[0]) : null;
  var precioStr = it.precio ? fmt(it.precio) : '—';
  var qtyStr = (it.qty||1) + ' ' + (it.unidad||'pza');
  return '<div class="carrito-item'+itemClass+'" id="ci_'+ri+'">'
    + '<div class="ci-check'+chkClass+'" onclick="carritoToggleItem('+ri+')">'+(it.comprado?'✓':'')+'</div>'
    + '<div class="ci-body" onclick="carritoEditarItem('+ri+')">'
    + '<div class="ci-nombre">'+it.nombre+'</div>'
    + '<div class="ci-meta">'+qtyStr+(it.nota?' · '+it.nota:'')+'</div>'
    + (mejorPrecio && !it.comprado ? '<div class="ci-precio-hist">💡 Mejor precio visto: '+fmt(mejorPrecio.precio)+' en '+mejorPrecio.tienda+'</div>' : '')
    + '</div>'
    + '<div class="ci-right">'
    + '<div class="ci-precio">'+precioStr+'</div>'
    + '<div class="ci-qty">'
    + '<button onclick="carritoQty('+ri+',-1)">−</button>'
    + '<span>'+(it.qty||1)+'</span>'
    + '<button onclick="carritoQty('+ri+',1)">+</button>'
    + '</div>'
    + '</div>'
    + '<button onclick="carritoEliminarItem('+ri+')" style="position:absolute;top:6px;right:6px;background:none;border:none;font-size:0.7rem;color:var(--dim);cursor:pointer;padding:2px 4px;">✕</button>'
    + '</div>';
}

function _filtrarCatalogo(q){
  var items = document.querySelectorAll('#catLista [data-prod]');
  items.forEach(function(el){
    var prod = el.getAttribute('data-prod') || '';
    el.style.display = prod.indexOf(q.toLowerCase()) > -1 ? '' : 'none';
  });
}

function carritoSelCat(id){
  var actual = getCarritoActual();
  actual.catId = id;
  saveCarritoActual(actual);
  goSub('carrito');
}

function carritoActualizarNombre(v){
  var actual = getCarritoActual(); actual.nombre = v; saveCarritoActual(actual);
}

function carritoActualizarTienda(v){
  var actual = getCarritoActual(); actual.tienda = v; saveCarritoActual(actual);
}

function carritoSugerirPrecio(nombre){
  var sug = document.getElementById('carritoSugerencia');
  if(!sug) return;
  if(!nombre || nombre.length < 2){ sug.style.display='none'; return; }
  var ultimo = carritoUltimoPrecio(nombre);
  if(ultimo){
    sug.style.display = 'block';
    sug.innerHTML = '💡 Última vez: <b>'+fmt(ultimo.precio)+'</b>'
      +(ultimo.tienda?' en '+ultimo.tienda:'')
      +' — '+ultimo.fecha
      +' <span style="font-size:0.65rem;opacity:0.7;">(toca para usar)</span>';
    sug._precio = ultimo.precio;
  } else {
    sug.style.display = 'none';
  }
}

function carritoAplicarSugerencia(){
  var sug = document.getElementById('carritoSugerencia');
  var inp = document.getElementById('carritoPrecioItem');
  if(sug && inp && sug._precio) inp.value = sug._precio;
}

function carritoEditarItem(ri){
  var actual = getCarritoActual();
  var item = actual.items[ri];
  if(!item) return;
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;';
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;margin:0 auto;">'
    + '<div style="font-size:1rem;font-weight:800;margin-bottom:16px;">✏️ Editar producto</div>'
    + '<input class="inp" id="editNombre" value="'+item.nombre+'" placeholder="Nombre" style="margin-bottom:8px;">'
    + '<div style="display:flex;gap:8px;margin-bottom:8px;">'
    + '<input class="inp" id="editPrecio" type="number" value="'+(item.precio||'')+'" placeholder="Precio" style="flex:1;">'
    + '<input class="inp" id="editQty" type="number" value="'+(item.qty||1)+'" placeholder="Cant." style="width:70px;">'
    + '</div>'
    + '<input class="inp" id="editNota" value="'+(item.nota||'')+'" placeholder="Nota" style="margin-bottom:12px;">'
    + '<button class="btn-main" onclick="carritoGuardarEdicion('+ri+',this.closest(\'div\').parentElement.parentElement)">💾 Guardar</button>'
    + '<button onclick="this.closest(\'div\').parentElement.parentElement.remove()" style="width:100%;margin-top:8px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;">Cancelar</button>'
    + '</div>';
  document.body.appendChild(modal);
}

function carritoGuardarEdicion(ri, modal){
  var actual = getCarritoActual();
  var item = actual.items[ri];
  if(!item) return;
  item.nombre = document.getElementById('editNombre').value.trim()||item.nombre;
  item.precio = parseFloat(document.getElementById('editPrecio').value)||0;
  item.qty    = parseInt(document.getElementById('editQty').value)||1;
  item.nota   = document.getElementById('editNota').value.trim();
  saveCarritoActual(actual);
  if(modal) modal.remove();
  goSub('carrito');
  showToast('✓ Producto actualizado');
}

function _carritoTextoLista(lista){
  var cats = getCarritoCats();
  var cat  = cats.find(function(c){ return c.id === lista.catId; });
  var lineas = [];
  lineas.push('🛒 *' + (lista.nombre || 'Lista de compras') + '*');
  if(lista.tienda) lineas.push('📍 ' + lista.tienda);
  lineas.push('📅 ' + (lista.fecha || today()));
  lineas.push('');
  var pendientes = (lista.items||[]).filter(function(i){ return !i.comprado; });
  var comprados  = (lista.items||[]).filter(function(i){ return i.comprado; });
  if(pendientes.length > 0){
    lineas.push('📋 *Pendientes:*');
    pendientes.forEach(function(i){
      var precio = i.precio ? ' — ' + fmt(i.precio) : '';
      lineas.push('☐ ' + i.nombre + ' x' + (i.qty||1) + ' ' + (i.unidad||'pza') + precio + (i.nota?' ('+i.nota+')':''));
    });
  }
  if(comprados.length > 0){
    lineas.push('');
    lineas.push('✅ *Comprados:*');
    comprados.forEach(function(i){
      var precio = i.precio ? ' — ' + fmt(i.precio) : '';
      lineas.push('☑ ' + i.nombre + ' x' + (i.qty||1) + ' ' + (i.unidad||'pza') + precio);
    });
  }
  var total = (lista.items||[]).reduce(function(s,i){ return s+(i.precio||0)*(i.qty||1); },0);
  if(total > 0){
    lineas.push('');
    lineas.push('💰 *Total estimado: ' + fmt(total) + '*');
  }
  lineas.push('');
  lineas.push('_Compartido desde USALA Finanzas_');
  return lineas.join('\n');
}

function _carritoMostrarModalCompartir(texto){
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
  var waUrl = 'https://wa.me/?text=' + encodeURIComponent(texto);
  var tgUrl = 'https://t.me/share/url?url=&text=' + encodeURIComponent(texto);
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px 24px 0 0;padding:24px 20px 44px;width:100%;max-width:480px;margin:0 auto;">'
    + '<div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 20px;"></div>'
    + '<div style="font-size:1rem;font-weight:800;color:var(--text);margin-bottom:16px;">📤 Compartir lista</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">'
    + '<a href="'+waUrl+'" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:linear-gradient(135deg,#25D366,#1da855);border-radius:16px;text-decoration:none;color:#fff;font-family:Outfit,sans-serif;font-size:0.85rem;font-weight:700;box-shadow:0 4px 14px rgba(37,211,102,0.3);">'+
      '<span style="font-size:1.3rem;">💬</span> WhatsApp</a>'
    + '<a href="'+tgUrl+'" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:linear-gradient(135deg,#2AABEE,#1a8bc4);border-radius:16px;text-decoration:none;color:#fff;font-family:Outfit,sans-serif;font-size:0.85rem;font-weight:700;box-shadow:0 4px 14px rgba(42,171,238,0.25);">'+
      '<span style="font-size:1.3rem;">✈️</span> Telegram</a>'
    + '<button onclick="_carritoCopiarTexto(this)" data-texto="'+encodeURIComponent(texto)+'" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--inp);border:1px solid var(--border);border-radius:16px;font-family:Outfit,sans-serif;font-size:0.85rem;font-weight:700;color:var(--text);cursor:pointer;">'+
      '<span style="font-size:1.3rem;">📋</span> Copiar texto</button>'
    + '<button onclick="_carritoShareNativo()" data-texto="'+encodeURIComponent(texto)+'" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;background:var(--inp);border:1px solid var(--border);border-radius:16px;font-family:Outfit,sans-serif;font-size:0.85rem;font-weight:700;color:var(--text);cursor:pointer;">'+
      '<span style="font-size:1.3rem;">&#x1F4F2;</span> Más opciones</button>'
    + '</div>'
    + '<div style="font-size:0.72rem;color:var(--dim);margin-bottom:6px;">Vista previa:</div>'
    + '<div style="background:var(--inp);border-radius:14px;padding:12px 14px;font-size:0.75rem;color:var(--text);line-height:1.6;max-height:150px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;">'
    + texto.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    + '</div>'
    + '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;margin-top:14px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;padding:8px;">Cerrar</button>'
    + '</div>';
  document.body.appendChild(modal);
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
}

function _carritoCopiarTexto(btn){
  var texto = decodeURIComponent(btn.getAttribute('data-texto'));
  navigator.clipboard.writeText(texto).then(function(){
    btn.innerHTML = '<span style="font-size:1.3rem;">✅</span> ¡Copiado!';
    setTimeout(function(){ btn.innerHTML = '<span style="font-size:1.3rem;">📋</span> Copiar texto'; }, 2000);
  }).catch(function(){
    var ta = document.createElement('textarea');
    ta.value = texto; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('✓ Lista copiada al portapapeles');
  });
}

function _carritoShareNativo(){
  var btn = document.querySelector('[data-texto]');
  var texto = btn ? decodeURIComponent(btn.getAttribute('data-texto')) : '';
  if(navigator.share){
    navigator.share({ title: 'Lista de compras', text: texto })
      .catch(function(){});
  } else {
    showToast('Usa WhatsApp o Telegram arriba');
  }
}

function _carritoColapsarBarra(){
  var bar = document.getElementById('carritoTotalBar');
  if(!bar) return;
  bar.querySelector('.ctb-detalle').style.display = 'none';
  bar.querySelector('.ctb-mini').style.display = 'block';
  bar.style.padding = '6px 14px';
  bar.style.opacity = '0.8';
}

function _carritoExpandirBarra(){
  var bar = document.getElementById('carritoTotalBar');
  if(!bar) return;
  bar.querySelector('.ctb-detalle').style.display = 'flex';
  bar.querySelector('.ctb-mini').style.display = 'none';
  bar.style.padding = '12px 16px';
  bar.style.opacity = '1';
}

function carritoCompartirLista(hi){
  var hist = getCarritoHistorial();
  var lista = hist[hi];
  if(!lista){ showToast('Lista no encontrada'); return; }
  var texto = _carritoTextoLista(lista);
  _carritoMostrarModalCompartir(texto);
}

function _carritoOpsCuentas(){
  var c = getCuentas();
  var ops = '<option value="">— Sin asignar —</option>'
    + '<option value="efectivo">💵 Efectivo</option>';
  (c.cheques||[]).forEach(function(ch,i){
    ops += '<option value="cheque_'+i+'">🏧 '+ch.banco+'</option>';
  });
  (c.tarjetas||[]).forEach(function(t,i){
    ops += '<option value="tc_'+i+'">💳 '+t.banco+'</option>';
  });
  return ops;
}

function carritoNuevaCat(){
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px;padding:24px 20px;width:100%;max-width:380px;">'
    + '<div style="font-size:1rem;font-weight:800;margin-bottom:16px;">➕ Nueva categoría</div>'
    + '<input class="inp" id="nuevaCatIco" placeholder="Emoji (ej: 🌿)" style="margin-bottom:8px;width:80px;">'
    + '<input class="inp" id="nuevaCatNombre" placeholder="Nombre de la categoría" style="margin-bottom:14px;">'
    + '<button class="btn-main" onclick="carritoGuardarNuevaCat(this.closest(\'div\').parentElement)">✅ Crear categoría</button>'
    + '<button onclick="this.closest(\'div\').parentElement.remove()" style="width:100%;margin-top:8px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;">Cancelar</button>'
    + '</div>';
  document.body.appendChild(modal);
}

function carritoGuardarNuevaCat(modal){
  var ico    = (document.getElementById('nuevaCatIco').value||'🏷️').trim();
  var nombre = (document.getElementById('nuevaCatNombre').value||'').trim();
  if(!nombre){ showToast('⚠ Escribe el nombre'); return; }
  var defaultIds = ['agro','shop','super','mat','ins'];
  var custom = load('carrito_cats', []);
  var id = 'cat_'+Date.now();
  custom.push({ id:id, ico:ico, nombre:nombre });
  save('carrito_cats', custom);
  if(modal) modal.remove();
  showToast('✓ Categoría "'+nombre+'" creada');
  goSub('carrito');
}

function getGastoCats(){
  var custom = load('cats_gasto_custom', []);
  return GASTO_CATS_BASE.map(function(c){ return c.id; }).concat(custom);
}

function getIngresoCats(){
  var custom = load('cats_ingreso_custom', []);
  return INGRESO_CATS_BASE.map(function(c){ return c.id; }).concat(custom);
}

function getColorCat(id){
  var found = GASTO_CATS_BASE.find(function(c){ return c.id===id; });
  return found ? found.color : '#78909c';
}

function buildGastoCatSelect(id, valSeleccionado){
  var cats = getGastoCats();
  var sel = valSeleccionado ? migrarCat(valSeleccionado) : cats[0];
  return cats.map(function(c){ return '<option'+(c===sel?' selected':'')+'>'+c+'</option>'; }).join('');
}

function buildIngresoCatSelect(id, valSeleccionado){
  var cats = getIngresoCats();
  var sel = valSeleccionado ? migrarCat(valSeleccionado) : cats[0];
  return cats.map(function(c){ return '<option'+(c===sel?' selected':'')+'>'+c+'</option>'; }).join('');
}

function keyPagosMes(){
  var mes = new Date().toISOString().slice(0,7); // YYYY-MM
  var u = S.user;
  var base = u.isAdmin ? 'usala_admin' : 'usala_u_'+u.codigo;
  return base+'_pagos_estado_'+mes;
}

function getActivosCats(){ return ACTIVOS_CATS.concat(load('cats_activos_custom',[])); }

function renderFormActivo(idx){
  var activos=load('activos_personales',[]);
  var a=idx!==null?activos[idx]:{};
  var mc=document.getElementById('mainContent'); mc.innerHTML='';
  var d=document.createElement('div'); d.style.padding='20px 16px';
  var catOpts=getActivosCats().map(function(c){ return '<option value="'+c+'"'+(a.categoria===c?' selected':'')+'>'+c+'</option>'; }).join('');
  d.innerHTML='<div style="font-size:1rem;font-weight:800;margin-bottom:14px;">'+(idx!==null?'✏️ Editar':'➕ Nuevo')+' Activo</div>'
    +'<label class="inp-label">Nombre del activo</label><input class="inp" id="faName" placeholder="Ej: Casa Colonia Roma, Toyota Corolla..." value="'+(a.nombre||'')+'">'
    +'<label class="inp-label">Categoría</label><select class="inp" id="faCat">'+catOpts+'</select>'
    +'<button type="button" class="cat-add-btn" onclick="abrirCatModal(\'activos\',\'faCat\')">＋ Categoría</button>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Valor estimado ($)</label><input class="inp" id="faValor" type="number" min="0" placeholder="0.00" value="'+(a.valor||'')+'"></div>'
    +'<div><label class="inp-label">Fecha de adquisición</label><input class="inp" id="faFecha" type="date" value="'+(a.fecha||'')+'"></div>'
    +'</div>'
    +'<label class="inp-label">Descripción / notas</label><input class="inp" id="faDesc" placeholder="Notas opcionales..." value="'+(a.descripcion||'')+'" style="margin-bottom:16px;">';
  var bOk=document.createElement('button'); bOk.className='btn-main'; bOk.textContent=idx!==null?'💾 Guardar':'➕ Agregar';
  bOk.onclick=function(){
    var nombre=document.getElementById('faName').value.trim();
    var valor=parseFloat(document.getElementById('faValor').value)||0;
    if(!nombre||!valor){ showToast('⚠ Nombre y valor son obligatorios'); return; }
    var cat=document.getElementById('faCat').value;
    var fecha=document.getElementById('faFecha').value;
    var desc=document.getElementById('faDesc').value.trim();
    var aa=load('activos_personales',[]);
    if(idx!==null){ aa[idx]={nombre:nombre,categoria:cat,valor:valor,fecha:fecha,descripcion:desc}; showToast('✓ Actualizado'); }
    else { aa.push({nombre:nombre,categoria:cat,valor:valor,fecha:fecha,descripcion:desc}); showToast('✓ Activo registrado'); }
    save('activos_personales',aa); renderActivos();
  };
  var bCan=document.createElement('button'); bCan.className='btn-sec'; bCan.style.marginTop='8px'; bCan.textContent='Cancelar';
  bCan.onclick=function(){ renderActivos(); };
  d.appendChild(bOk); d.appendChild(bCan); mc.appendChild(d);
  setTimeout(function(){ var el=document.getElementById('faName'); if(el) el.focus(); },80);
}

function _snapKey(){
  var u=S.user;
  return (u.isAdmin?'usala_admin':'usala_u_'+u.codigo)+'_snap_';
}

function guardarSnapshotMes(){
  var mes=new Date().toISOString().slice(0,7);
  var key=_snapKey()+mes;
  if(localStorage.getItem(key)) return; // ya existe
  _forzarSnapshot(mes, key);
}

function _forzarSnapshot(mes, key){
  var cu=getCuentas();
  var creds=load('creditos',[]);
  var activos=load('activos_personales',[]);
  var txs=getTxs();
  var txsMes=txs.filter(function(t){ return t.fecha&&t.fecha.slice(0,7)===mes; });
  var ingresos=txsMes.filter(function(t){ return t.tipo==='ingreso'; }).reduce(function(s,t){ return s+Number(t.monto||0); },0);
  var gastos  =txsMes.filter(function(t){ return t.tipo==='gasto';   }).reduce(function(s,t){ return s+Number(t.monto||0); },0);
  var efectivo=Number(cu.efectivo||0);
  var banco   =(cu.cheques||[]).reduce(function(s,x){ return s+Number(x.saldo||0); },0);
  var deudaTC =(cu.tarjetas||[]).reduce(function(s,t){ return s+Number(t.balance||0); },0);
  var deudaCred=creds.filter(function(c){ return c.tipo==='deuda'&&c.estado!=='pagado'; })
                     .reduce(function(s,c){ return s+Number(c.monto-(c.abonado||0)); },0);
  var totalActivos=activos.reduce(function(s,a){ return s+Number(a.valor||0); },0);
  var totalDeudas=deudaTC+deudaCred;
  var patrimonioNeto=(efectivo+banco+totalActivos)-totalDeudas;
  var snap={mes:mes,efectivo:efectivo,banco:banco,deudaTC:deudaTC,deudaCred:deudaCred,
    totalActivos:totalActivos,totalDeudas:totalDeudas,patrimonioNeto:patrimonioNeto,
    ingresos:ingresos,gastos:gastos,fecha:new Date().toISOString()};
  localStorage.setItem(key, JSON.stringify(snap));
}

function getSnapshots(){
  var prefix=_snapKey();
  var snaps=[];
  for(var k in localStorage){
    if(k.indexOf(prefix)===0){
      var raw=localStorage.getItem(k);
      if(raw){ try{ snaps.push(JSON.parse(raw)); }catch(e){} }
    }
  }
  snaps.sort(function(a,b){ return a.mes.localeCompare(b.mes); });
  return snaps;
}

function _selTipoInteres(tipo){
  _tipoInteresActual = tipo;
  ['total','mensual','anual'].forEach(function(t){
    var el = document.getElementById('tiInt' + t.charAt(0).toUpperCase() + t.slice(1));
    if(el) el.classList.toggle('selected', t === tipo);
  });
  _actualizarResumenInteres();
}

function _getTipoInteresSeleccionado(){
  return _tipoInteresActual || 'total';
}

function _actualizarResumenInteres(){
  var montoEl   = document.getElementById('crMonto');
  var interesEl = document.getElementById('crInteres');
  var resEl     = document.getElementById('resumenInteres');
  if(!montoEl || !interesEl || !resEl) return;
  var monto   = parseFloat(montoEl.value) || 0;
  var interes = parseFloat(interesEl.value) || 0;
  if(!monto || !interes){ resEl.style.display='none'; return; }
  var tipo  = _tipoInteresActual || 'total';
  var texto = '';
  if(tipo === 'total'){
    var montoInteres = monto * interes / 100;
    var total = monto + montoInteres;
    texto = '📦 Interés sobre el total: <b>+' + fmt(montoInteres) + '</b> → Total a pagar: <b>' + fmt(total) + '</b>';
  } else if(tipo === 'mensual'){
    var porMes = monto * interes / 100;
    texto = '📅 Interés mensual: <b>+' + fmt(porMes) + '/mes</b> — se acumula cada mes hasta liquidar';
  } else if(tipo === 'anual'){
    var porAnio = monto * interes / 100;
    var porMesAnual = porAnio / 12;
    texto = '📆 Interés anual: <b>+' + fmt(porAnio) + '/año</b> (~' + fmt(porMesAnual) + '/mes)';
  }
  resEl.innerHTML = texto;
  resEl.style.display = 'block';
}

function _initTipoInteres(tipoGuardado){
  _tipoInteresActual = tipoGuardado || 'total';
  var grid = document.getElementById('tipoInteresGrid');
  if(!grid) return;
  var opts = [['total','📦 Total'],['mensual','📅 Mensual'],['anual','📆 Anual']];
  grid.innerHTML = opts.map(function(o){
    var sel = _tipoInteresActual === o[0] ? 'selected' : '';
    return '<button type="button" id="tiInt'+o[0]+'" onclick="_selTipoInteres(&quot;'+o[0]+'&quot;)" class="tipo-opt '+sel+'" style="border-radius:12px;padding:10px 4px;font-size:0.78rem;">'+o[1]+'</button>';
  }).join('');
}

function guardarEdicionAbono(ri, ai, tipo){
  var capital = parseFloat(document.getElementById('eaCapital').value)||0;
  var interes = parseFloat(document.getElementById('eaInteres').value)||0;
  var fecha   = document.getElementById('eaFecha').value;
  var nota    = document.getElementById('eaNota').value.trim();
  if(!fecha){ showToast('⚠ Selecciona la fecha'); return; }
  if(capital<=0 && interes<=0){ showToast('⚠ Ingresa al menos un monto'); return; }
  var creds = load('creditos',[]);
  var a = creds[ri].historialAbonos[ai];
  var diffCap = capital - (a.monto||0);
  var diffInt = interes  - (a.interes||0);
  creds[ri].abonado          = Math.max(0,(creds[ri].abonado||0)+diffCap);
  creds[ri].interesesPagados = Math.max(0,(creds[ri].interesesPagados||0)+diffInt);
  creds[ri].historialAbonos[ai] = { monto:capital, interes:interes, fecha:fecha, nota:nota };
  if(creds[ri].abonado >= creds[ri].monto) creds[ri].estado='pagado';
  else if(creds[ri].estado==='pagado')     creds[ri].estado='pendiente';
  save('creditos', creds);
  showToast('✓ Abono actualizado');
  goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
}

function confirmarAbono(ri, tipo){
  if(ri === undefined || ri === null) ri = window._abonoRi;
  if(ri === undefined || ri === null){ showToast('⚠ Error: recarga e intenta de nuevo'); return; }
  var monto   = parseFloat(document.getElementById('abonoMonto').value)||0;
  var interes = parseFloat(document.getElementById('abonoInteres').value)||0;
  var fecha   = document.getElementById('abonoFecha').value;
  if(monto<=0 && interes<=0){ showToast('⚠ Ingresa al menos un monto'); return; }
  if(!fecha){ showToast('⚠ Selecciona la fecha'); return; }
  var nota = (document.getElementById('abonoNota') ? document.getElementById('abonoNota').value.trim() : '') || '';
  var creds = load('creditos',[]);
  if(!creds[ri]){ showToast('⚠ Crédito no encontrado'); return; }
  var esCobrar = (tipo||creds[ri].tipo) === 'prestamo';
  creds[ri].abonado = (creds[ri].abonado||0) + monto;
  creds[ri].interesesPagados = (creds[ri].interesesPagados||0) + interes;
  if(!creds[ri].historialAbonos) creds[ri].historialAbonos = [];
  creds[ri].historialAbonos.push({ monto:monto, interes:interes, fecha:fecha, nota:nota });
  var resumen = fmt(monto) + (interes>0 ? ' + '+fmt(interes)+' int.' : '');
  if(creds[ri].abonado >= creds[ri].monto){
    creds[ri].estado = 'pagado';
    showToast(esCobrar ? '🎉 ¡Cobro completo! '+resumen : '🎉 ¡Liquidado! '+resumen);
  } else {
    var pendiente = creds[ri].monto - creds[ri].abonado;
    showToast((esCobrar?'💰 Pago recibido: ':'✓ Abono: ') + resumen + ' · Resta: '+fmt(pendiente));
  }
  save('creditos', creds);
  window._abonoRi = null; window._abonoTipo = null;
  goSub(esCobrar ? 'creditos_cobrar' : 'creditos_debo');
}

function _adminTab(t){ _adminPanelTab = t; renderAdminPanel(); }

function _adminCfgNombreApp(){
  var actual = (JSON.parse(localStorage.getItem('usala_cfg_global')||'{}')).nombreApp || 'USALA Finanzas';
  usalaPrompt('Nombre de la app:', actual, function(nuevo){
    if(!nuevo||!nuevo.trim()) return;
    _adminToggleCfg('nombreApp', nuevo.trim());
    _adminRenderConfig();
  });
}

function _adminCfgBienvenida(){
  var actual = (JSON.parse(localStorage.getItem('usala_cfg_global')||'{}')).msgBienvenida || '';
  usalaPrompt('Mensaje de bienvenida para nuevos usuarios:', actual, function(nuevo){
    if(nuevo===null||nuevo===undefined) return;
    _adminToggleCfg('msgBienvenida', nuevo.trim());
    _adminRenderConfig();
  });
}

function _adminMetricCard(label, valor, color){
  return '<div class="card" style="padding:14px;text-align:center;">'
    + '<div style="font-size:0.7rem;color:var(--dim);margin-bottom:4px;">' + label + '</div>'
    + '<div style="font-size:1rem;font-weight:900;color:' + color + ';">' + valor + '</div>'
    + '</div>';
}

function abonarMeta(i){
  var m=load('metas',[]);
  usalaPrompt('💰 Abonar a meta: '+m[i].nombre, '', function(val){
    var a=parseFloat(val);
    if(!a||a<=0){ showToast('Ingresa un monto válido'); return; }
    m[i].actual=(m[i].actual||0)+a;
    if(m[i].actual>=m[i].meta){ showToast('🎉 Meta alcanzada!'); }
    else { showToast('Abono registrado: '+fmt(a)); }
    save('metas',m); goSub('metas');
  },{type:'number', placeholder:'0.00'});
}

function editarMeta(i){
  var m=load('metas',[]);
  usalaPrompt2('✏️ Editar meta', [
    {label:'Nombre', value:m[i].nombre, placeholder:'Nombre de la meta'},
    {label:'Objetivo ($)', value:m[i].meta, type:'number', placeholder:'0.00'}
  ], function(vals){
    var nombre=vals[0].trim(); var meta=parseFloat(vals[1]);
    if(!nombre||!meta){ showToast('Completa nombre y objetivo'); return; }
    m[i]=Object.assign(m[i],{nombre:nombre,meta:meta});
    save('metas',m); showToast('Meta actualizada'); goSub('metas');
  });
}

function getPresCats(){
  var custom = load('cats_gasto_custom',[]);
  var extra = custom.map(function(id){ return {id:id, color:'#78909c'}; });
  return GASTO_CATS_BASE.concat(extra);
}

function guardarPres(cat,val){ var p=load('presupuesto',{}); p[cat]=parseFloat(val)||0; save('presupuesto',p); showToast('✓ Límite guardado'); }

function editarAlerta(i){
  var a=load('alertas',[])[i];
  document.getElementById('alNombre').value=a.nombre;
  document.getElementById('alLimite').value=a.limite;
  document.getElementById('alFecha').value=a.fecha;
  document.getElementById('alSaveBtn').textContent='💾 Guardar cambios';
  window._editAlerta=i;
  document.getElementById('alertaForm').scrollIntoView({behavior:'smooth'});
}

function _toggleImportPanel(){
  var p=document.getElementById('importSolPanel');
  var b=document.getElementById('btnToggleImport');
  if(!p) return;
  var open = p.style.display==='none';
  p.style.display = open ? 'block' : 'none';
  if(b) b.textContent = open ? '✕ Cerrar' : '+ Pegar';
}

function _generarCodigoUnico(prefijo){
  var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0,O,1,I,L
  function rnd4(){ var s=''; for(var i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }
  var cods = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  var codigo = prefijo+'-'+rnd4();
  var intentos = 0;
  while(cods.find(function(x){ return x.codigo===codigo; }) && intentos++<20){
    codigo = prefijo+'-'+rnd4();
  }
  return codigo;
}


function aprobarSolicitud(idx){
  var solicitudes=JSON.parse(localStorage.getItem('usala_solicitudes')||'[]');
  var s=solicitudes[idx]; if(!s) return;
  _aprobarIdx = idx;
  var mc = document.getElementById('aprobarModal');
  if(!mc){
    mc = document.createElement('div');
    mc.id = 'aprobarModal';
    mc.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
    mc.innerHTML =
      '<div style="background:var(--card);border-radius:24px 24px 0 0;padding:24px 20px 32px;width:100%;max-width:480px;">'
      +'<div style="font-weight:900;font-size:1rem;margin-bottom:4px;">✅ Aprobar solicitud</div>'
      +'<div id="aprobarNombreLabel" style="font-size:0.8rem;color:var(--dim);margin-bottom:18px;"></div>'
      +'<label class="inp-label">Prefijo del código</label>'
      +'<input class="inp" id="aprobarPrefijo" maxlength="5" style="text-transform:uppercase;">'
      +'<label class="inp-label">Vigencia del acceso</label>'
      +'<select class="inp" id="aprobarVence">'
        +'<option value="7">7 días</option>'
        +'<option value="15">15 días</option>'
        +'<option value="30" selected>1 mes</option>'
        +'<option value="90">3 meses</option>'
        +'<option value="180">6 meses</option>'
        +'<option value="365">1 año</option>'
      +'</select>'
      +'<button onclick="_confirmarAprobacion()" style="width:100%;margin-top:14px;padding:14px;background:var(--accent2);color:#fff;border:none;border-radius:14px;font-family:Outfit,sans-serif;font-weight:800;font-size:0.92rem;cursor:pointer;">🔑 Generar código</button>'
      +'<button onclick="cerrarAprobarModal()" style="width:100%;margin-top:8px;padding:12px;background:none;border:none;color:var(--dim);font-family:Outfit,sans-serif;font-size:0.85rem;cursor:pointer;">Cancelar</button>'
      +'</div>';
    document.body.appendChild(mc);
  }
  var prefijoAuto = (s.nombre.split(' ')[0]).substring(0,4).toUpperCase()||'USR';
  document.getElementById('aprobarPrefijo').value = prefijoAuto;
  document.getElementById('aprobarNombreLabel').textContent = '👤 '+s.nombre+(s.contacto?' · 📞 '+s.contacto:'');
  mc.style.display = 'flex';
}

function cerrarAprobarModal(){ var m=document.getElementById('aprobarModal'); if(m) m.remove(); }

function _confirmarAprobacion(){
  var solicitudes=JSON.parse(localStorage.getItem('usala_solicitudes')||'[]');
  var s=solicitudes[_aprobarIdx]; if(!s) return;
  var prefijo=(document.getElementById('aprobarPrefijo').value.trim().toUpperCase()||'USR').substring(0,5);
  var dias=parseInt(document.getElementById('aprobarVence').value)||30;
  var codigo=_generarCodigoUnico(prefijo);
  var venc=new Date(); venc.setDate(venc.getDate()+dias);
  var vencStr=venc.toISOString().split('T')[0];
  var codigos=JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  codigos.push({codigo:codigo,vencimiento:vencStr,nota:s.nombre,contacto:s.contacto||'',activo:true,usado:false,creado:today()});
  localStorage.setItem('usala_codigos',JSON.stringify(codigos));
  solicitudes[_aprobarIdx].estado='aprobada';
  solicitudes[_aprobarIdx].codigoGenerado=codigo;
  localStorage.setItem('usala_solicitudes',JSON.stringify(solicitudes));
  navigator.clipboard.writeText(codigo).catch(function(){});
  var modal=document.getElementById('aprobarModal'); if(modal) modal.remove();
  showToast('✅ Código '+codigo+' generado y copiado — compártelo con '+s.nombre);
  goSub('codigos');
}

function rechazarSolicitud(idx){
  usalaConfirm('Rechazar esta solicitud?', function(){
    var solicitudes=JSON.parse(localStorage.getItem('usala_solicitudes')||'[]');
      solicitudes[idx].estado='rechazada';
      localStorage.setItem('usala_solicitudes',JSON.stringify(solicitudes));
      showToast('✓ Solicitud rechazada');
      goSub('codigos');
  });
}

function _actualizarCodPreview(){
  var pref = (document.getElementById('codPrefijo').value||'FIN').toUpperCase().slice(0,4);
  var prev = document.getElementById('codPreview');
  if(prev) prev.textContent = pref + '-????';
}

function generarCodigo(){
  var prefijo=document.getElementById('codPrefijo').value.trim().toUpperCase()||'FIN';
  var dias=parseInt(document.getElementById('codVence').value);
  var nota=document.getElementById('codNota').value.trim();
  var contacto=document.getElementById('codContacto').value.trim();
  if(!nota){ showToast('⚠ Escribe el nombre del usuario'); return; }
  var codigo=_generarCodigoUnico(prefijo);
  var venc=new Date(); venc.setDate(venc.getDate()+dias);
  var vencStr=venc.toISOString().split('T')[0];
  var codigos=JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  codigos.push({codigo:codigo,vencimiento:vencStr,nota:nota,contacto:contacto,activo:true,usado:false,creado:today(),nombreUsuario:nota});
  localStorage.setItem('usala_codigos',JSON.stringify(codigos));
  dbCrearCodigo(codigo, nota, vencStr+'T23:59:59Z', contacto, nota).then(function(res){
    if(res) console.log('✅ Código en Supabase:', codigo);
    else console.warn('⚠️ Solo guardado local');
  });
  navigator.clipboard.writeText(codigo).catch(function(){});
  showToast('✓ Código '+codigo+' copiado — compártelo con '+nota);
  goSub('codigos');
}

function resetearNipUsuario(arg){
  usalaConfirm('Resetear el NIP de este usuario?\nEl usuario podra entrar sin NIP.', function(){
    localStorage.removeItem('usala_nip_u_'+codigo);
      showToast('🔓 NIP de '+nombre+' reseteado. Ya puede entrar sin NIP.');
      goSub('codigos');
  });
}

function pickTema(){
  var html = '<div class="page-header">'
    + '<button onclick="goSub(&quot;config&quot;)" style="background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;padding:4px 8px;">← Atrás</button>'
    + '<div class="page-title">🎨 Tema visual</div></div>'
    + '<div class="card">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
    + '<div class="theme-card" data-theme="default" style="background:#f0f4f0;color:#1e6b3c;border:2px solid transparent;" onclick="elegirTema(this,&quot;default&quot;)">'
    +   '<div style="width:28px;height:28px;border-radius:50%;background:#1e6b3c;margin-bottom:8px;"></div>'
    +   '<div style="font-weight:700;font-size:0.9rem;">Verde Natural</div></div>'
    + '<div class="theme-card" data-theme="dark" style="background:#162016;color:#2d9e5f;border:2px solid transparent;" onclick="elegirTema(this,&quot;dark&quot;)">'
    +   '<div style="width:28px;height:28px;border-radius:50%;background:#2d9e5f;margin-bottom:8px;"></div>'
    +   '<div style="font-weight:700;font-size:0.9rem;color:#e8f5e8;">Oscuro Pro</div></div>'
    + '<div class="theme-card" data-theme="gold" style="background:#140f00;color:#c9841a;border:2px solid transparent;" onclick="elegirTema(this,&quot;gold&quot;)">'
    +   '<div style="width:28px;height:28px;border-radius:50%;background:#c9841a;margin-bottom:8px;"></div>'
    +   '<div style="font-weight:700;font-size:0.9rem;color:#f5e6c0;">Dorado Élite</div></div>'
    + '<div class="theme-card" data-theme="ocean" style="background:#e8f4fd;color:#0066cc;border:2px solid transparent;" onclick="elegirTema(this,&quot;ocean&quot;)">'
    +   '<div style="width:28px;height:28px;border-radius:50%;background:#0066cc;margin-bottom:8px;"></div>'
    +   '<div style="font-weight:700;font-size:0.9rem;">Océano</div></div>'
    + '<div class="theme-card" data-theme="rose" style="background:#fff5f7;color:#c02040;border:2px solid transparent;grid-column:1/-1;" onclick="elegirTema(this,&quot;rose&quot;)">'
    +   '<div style="width:28px;height:28px;border-radius:50%;background:#c02040;margin-bottom:8px;"></div>'
    +   '<div style="font-weight:700;font-size:0.9rem;">Rosa Elegante</div></div>'
    + '</div></div>';
  document.getElementById('mainContent').innerHTML = html;
  var activo = document.querySelector('.theme-card[data-theme="'+(S.theme||'default')+'"]');
  if(activo) activo.style.border = '2px solid currentColor';
}

function elegirTema(el, t){
  document.querySelectorAll('.theme-card').forEach(function(c){ c.style.border='2px solid transparent'; });
  el.style.border = '2px solid currentColor';
  S.theme = t;
  applyTheme(t);
  localStorage.setItem('usala_theme', t);
  showToast('🎨 Tema aplicado');
}

function _getMicEstado(){
  var p = localStorage.getItem('usala_mic_permiso');
  if(!p)    return 'No solicitado aún';
  if(p === 'granted') return '✅ Permitido';
  if(p === 'denied')  return '❌ Denegado';
  return p;
}

function _getMonedaApp(){
  var key = 'usala_moneda_app_' + (S.user ? (S.user.isAdmin ? 'admin' : S.user.codigo) : 'anon');
  try{ var m = JSON.parse(localStorage.getItem(key)||'null');
    return m ? (m.bandera+' '+m.nombre+' ('+m.simbolo+')') : '🇲🇽 Pesos mexicanos ($)'; }
  catch(e){ return '🇲🇽 Pesos mexicanos ($)'; }
}

function abrirSelectorMoneda(){
  var monedas = [
    {codigo:'MXN', nombre:'Pesos mexicanos', simbolo:'$', bandera:'🇲🇽'},
    {codigo:'USD', nombre:'Dólares',          simbolo:'$', bandera:'🇺🇸'},
    {codigo:'EUR', nombre:'Euros',            simbolo:'€', bandera:'🇪🇺'},
    {codigo:'CAD', nombre:'Dólar canadiense', simbolo:'$', bandera:'🇨🇦'},
    {codigo:'GBP', nombre:'Libras',           simbolo:'£', bandera:'🇬🇧'},
    {codigo:'COP', nombre:'Pesos colombianos',simbolo:'$', bandera:'🇨🇴'},
    {codigo:'ARS', nombre:'Pesos argentinos', simbolo:'$', bandera:'🇦🇷'},
    {codigo:'GTQ', nombre:'Quetzales',        simbolo:'Q', bandera:'🇬🇹'},
    {codigo:'PEN', nombre:'Soles',            simbolo:'S/',bandera:'🇵🇪'},
  ];
  var key = 'usala_moneda_app_' + (S.user ? (S.user.isAdmin ? 'admin' : S.user.codigo) : 'anon');
  var actual;
  try{ actual = JSON.parse(localStorage.getItem(key)||'null'); }catch(e){ actual = null; }
  var html = '<div class="page-header">'
    +'<button onclick="goSub(&quot;config&quot;)" style="background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;padding:4px 8px;">← Atrás</button>'
    +'<div class="page-title">💱 Moneda de la app</div></div>'
    +'<div class="card">'
    +'<div style="font-size:0.8rem;color:var(--dim);margin-bottom:14px;line-height:1.5;">El símbolo se mostrará en toda la app: saldos, historial y reportes.</div>'
    + monedas.map(function(m){
        var activa = actual && actual.codigo === m.codigo;
        return '<div onclick="guardarMonedaApp(&quot;'+m.codigo+'&quot;)" style="display:flex;align-items:center;gap:12px;padding:14px 12px;border-radius:14px;margin-bottom:6px;cursor:pointer;background:'+(activa?'rgba(30,107,60,0.10)':'var(--inp)')+';border:2px solid '+(activa?'var(--accent)':'transparent')+';">'
          +'<span style="font-size:1.4rem;">'+m.bandera+'</span>'
          +'<div style="flex:1;"><div style="font-weight:700;font-size:0.9rem;color:var(--text);">'+m.nombre+'</div>'
          +'<div style="font-size:0.72rem;color:var(--dim);">'+m.codigo+' · símbolo: '+m.simbolo+'</div></div>'
          +(activa?'<span style="color:var(--accent);font-size:1.1rem;">✓</span>':'')
          +'</div>';
      }).join('')
    +'</div>';
  document.getElementById('mainContent').innerHTML = html;
}

function guardarMonedaApp(codigo){
  var monedas = {
    MXN:{codigo:'MXN',nombre:'Pesos mexicanos', simbolo:'$', bandera:'🇲🇽'},
    USD:{codigo:'USD',nombre:'Dólares',          simbolo:'$', bandera:'🇺🇸'},
    EUR:{codigo:'EUR',nombre:'Euros',            simbolo:'€', bandera:'🇪🇺'},
    CAD:{codigo:'CAD',nombre:'Dólar canadiense', simbolo:'$', bandera:'🇨🇦'},
    GBP:{codigo:'GBP',nombre:'Libras',           simbolo:'£', bandera:'🇬🇧'},
    COP:{codigo:'COP',nombre:'Pesos colombianos',simbolo:'$', bandera:'🇨🇴'},
    ARS:{codigo:'ARS',nombre:'Pesos argentinos', simbolo:'$', bandera:'🇦🇷'},
    GTQ:{codigo:'GTQ',nombre:'Quetzales',        simbolo:'Q', bandera:'🇬🇹'},
    PEN:{codigo:'PEN',nombre:'Soles',            simbolo:'S/',bandera:'🇵🇪'},
  };
  var m = monedas[codigo];
  if(!m) return;
  var key = 'usala_moneda_app_' + (S.user ? (S.user.isAdmin ? 'admin' : S.user.codigo) : 'anon');
  localStorage.setItem(key, JSON.stringify(m));
  showToast(m.bandera+' Moneda cambiada a '+m.nombre);
  renderTab(S.tab); // refrescar pantalla actual
  abrirSelectorMoneda(); // refrescar selector con nuevo check
}

function restablecerMic(){
  localStorage.removeItem('usala_mic_permiso');
  showToast('🎤 Micrófono restablecido');
  var el = document.getElementById('micEstadoLabel');
  if(el) el.textContent = 'No solicitado aún';
}

function restablecerMonedaIA(){
  var key = 'usala_ia_moneda_' + (S.user ? (S.user.isAdmin ? 'admin' : S.user.codigo) : 'anon');
  localStorage.removeItem(key);
  _iaMoneda = null;
  _iaHistorial = [];
  _iaInicializado = false;
  _iaAbierto = false;
  if(p){ p.style.display = 'none'; }
  if(bub) bub.innerHTML = '';
  showToast('💱 Moneda restablecida. Abre el asistente 🎙️ para elegir de nuevo.');
  var el = document.getElementById('monedaEstadoLabel');
  if(el) el.textContent = 'No configurada';
}

function irACuenta(sub){
  cerrarUMenu();
  goTab('cuentas', document.querySelectorAll('.nb')[1]);
  setTimeout(function(){ goSub(sub); }, 120);
}

function cambiarPass(){
  var p1=document.getElementById('np1').value;
  var p2=document.getElementById('np2').value;
  if(!p1||p1.length<4){ showToast('⚠ Mínimo 4 caracteres'); return; }
  if(p1!==p2){ showToast('⚠ Las contraseñas no coinciden'); return; }
  localStorage.setItem('usala_admin_pass',p1);
  showToast('✓ Contraseña actualizada');
}

function resetTxs(){
  usalaConfirm('Borrar TODAS las transacciones?\n\nTambien se restablecen los saldos de efectivo y cuentas bancarias. Esta accion no se puede deshacer.', function(){
    save('txs',[]);
      var uid = S.user.isAdmin ? 'admin' : 'u_'+S.user.codigo;
      var cu = JSON.parse(localStorage.getItem('usala_cuentas_'+uid)||'{}');
      cu.efectivo = 0;
      cu.movEfectivo = [];
      (cu.cheques||[]).forEach(function(ch){ ch.saldo = 0; });
      localStorage.setItem('usala_cuentas_'+uid, JSON.stringify(cu));
      showToast('✓ Transacciones y saldos borrados');
      goSub('config');
  });
}

function resetCuenta(){
  usalaConfirm('BORRAR TODA tu informacion?\n\nSe eliminaran transacciones, cuentas, creditos, metas y presupuestos.\n\nEsta accion NO se puede deshacer.', function(){
    var uid = S.user.isAdmin ? 'admin' : 'u_'+S.user.codigo;
      var prefix = 'usala_'+uid+'_';
      Object.keys(localStorage).filter(function(k){
        return k.indexOf(prefix)===0;
      }).forEach(function(k){ localStorage.removeItem(k); });
      localStorage.removeItem('usala_cuentas_'+uid);
      showToast('✅ Cuenta restablecida completamente');
      setTimeout(function(){ goTab('inicio',document.querySelector('.nb')); },600);
  });
}

function abrirCatModalTx(){
  var tipo = document.getElementById('tipoGasto') &&
    document.getElementById('tipoGasto').classList.contains('selected') ? 'gasto' : 'ingreso';
  abrirCatModal(tipo, 'txCat');
}

function abrirCatModalEf(){
  var esEnt = document.getElementById('efTipoEnt') &&
    document.getElementById('efTipoEnt').classList.contains('selected');
  abrirCatModal(esEnt ? 'ingreso' : 'gasto', 'efCat');
}

function abrirCatModalBk(){
  var esEnt = document.getElementById('bkTipoEnt') &&
    document.getElementById('bkTipoEnt').classList.contains('selected');
  abrirCatModal(esEnt ? 'ingreso' : 'gasto', 'bkCat');
}

function abrirPP(){
  var _todos = _ppGetPagos();
  var _hayVenc = _todos.some(function(p){ return p.diffDias < 0; });
  _ppTab = _hayVenc ? 'hoy' : 'semana';
  document.querySelectorAll('.pp-tab').forEach(function(b,i){
    var tabs=['hoy','semana','mes','año'];
    b.classList.toggle('active', tabs[i]===_ppTab);
  });
  _ppRender();
  document.getElementById('ppOverlay').style.display='flex';
}

function cerrarPP(){ document.getElementById('ppOverlay').style.display='none'; }

function ppSetTab(tab, btn){
  _ppTab = tab;
  document.querySelectorAll('.pp-tab').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  _ppRender();
}

function _ppGetPagos(){
  var hoy     = new Date(); hoy.setHours(0,0,0,0);
  var anioAct = hoy.getFullYear();
  var mesAct  = hoy.getMonth();    // 0-11
  var diaAct  = hoy.getDate();
  var lista = [];
  var pagosBase  = loadPagosBase();
  var pagosEst   = loadPagosEstado();
  var _meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  pagosBase.forEach(function(p){
    var pid = p.id;
    if(pagosEst[pid] && pagosEst[pid].pagado) return;
    var freq = p.frecuencia || 'mensual';
    var diasFrec = {mensual:1,bimestral:2,trimestral:3,cuatrimestral:4,semestral:6,anual:12};
    var mesesFrec = diasFrec[freq] || 1;
    var fechasOcurr = [];
    var fechaRel = null;
    if(p.proximoPago){
      var _pts = p.proximoPago.split('-');
      fechaRel = new Date(+_pts[0], +_pts[1]-1, +_pts[2]);
      fechaRel.setHours(0,0,0,0);
    } else if(p.dia){
      var dia = Math.min(p.dia, 28);
      fechaRel = new Date(anioAct, mesAct, dia);
      fechaRel.setHours(0,0,0,0);
    }
    if(fechaRel){
      var diffDias = Math.round((fechaRel - hoy) / 86400000);
      lista.push({
        nombre:   p.nombre||'Sin nombre',
        monto:    p.monto||0,
        fecha:    fechaRel,
        diffDias: diffDias,
        cat:      p.categoria||'📦 Otros',
        freq:     freq,
        fuente:   'pago',
        pagado:   false,
        urgencia: diffDias<0?'vencido': diffDias===0?'hoy': diffDias<=2?'urgente': diffDias<=7?'pronto':'ok'
      });
    }
  });
  var creds = load('creditos',[]);
  creds.forEach(function(c){
    if(c.estado==='pagado') return;
    if(!c.fechaLimite) return;
    var parts = c.fechaLimite.split('-');
    var fecha = new Date(+parts[0], +parts[1]-1, +parts[2]); fecha.setHours(0,0,0,0);
    if(fecha.getFullYear() < anioAct) return;
    var diffDias = Math.round((fecha - hoy) / 86400000);
    var pendiente = (c.monto||0) - (c.abonado||0);
    lista.push({
      nombre:   (c.tipo==='deuda'?'💳 Debo a ':'📥 Me debe ')+c.persona,
      monto:    pendiente,
      fecha:    fecha,
      diffDias: diffDias,
      cat:      c.tipo==='deuda'?'🤝 Crédito':'📥 Por cobrar',
      freq:     'único',
      fuente:   c.tipo==='deuda'?'deuda':'cobrar',
      pagado:   false,
      urgencia: diffDias<=0?'vencido': diffDias<=2?'urgente': diffDias<=7?'pronto':'ok'
    });
  });
  return lista.sort(function(a,b){ return a.fecha-b.fecha; });
}

function _ppFiltrar(lista, tab){
  var hoy   = new Date(); hoy.setHours(0,0,0,0);
  var fin;
  if(tab==='hoy'){
    return lista.filter(function(p){ return p.diffDias <= 0; });
  }
  if(tab==='semana'){
    fin = new Date(hoy); fin.setDate(fin.getDate()+7);
    return lista.filter(function(p){ return p.fecha<=fin; });
  }
  if(tab==='mes'){
    fin = new Date(hoy.getFullYear(), hoy.getMonth()+1, 0);
    return lista.filter(function(p){ return p.fecha<=fin; });
  }
  return lista;
}

function _ppFechaLabel(p){
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var d = p.diffDias;
  if(d<0)  return '⚠️ Vencido hace '+Math.abs(d)+' día'+(Math.abs(d)!==1?'s':'');
  if(d===0) return '📍 Hoy';
  if(d===1) return '⏰ Mañana';
  if(d<=7)  return 'En '+d+' días · '+p.fecha.toLocaleDateString('es-MX',{weekday:'long'});
  return p.fecha.toLocaleDateString('es-MX',{day:'numeric',month:'long'})
    +(p.freq!=='único'&&p.freq!=='mensual'?' · '+p.freq:'');
}

function _ppUrgColor(u){
  return u==='vencido'?'#e53935': u==='urgente'?'#f57c00': u==='pronto'?'#f9a825':'var(--accent2)';
}

function _ppRender(){
  var body  = document.getElementById('ppBody');
  var sub   = document.getElementById('ppSubtitle');
  if(!body) return;
  var todos  = _ppGetPagos();
  var lista  = _ppFiltrar(todos, _ppTab);
  var total  = lista.reduce(function(s,p){ return s+p.monto; },0);
  var labels = {hoy:'Hoy, '+new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}),
    semana:'Semana del '+new Date().toLocaleDateString('es-MX',{day:'numeric',month:'short'}),
    mes:new Date().toLocaleDateString('es-MX',{month:'long',year:'numeric'}),
    año:new Date().getFullYear()+' completo'};
  sub.textContent = labels[_ppTab];
  body.innerHTML = '';
  if(!lista.length){
    body.innerHTML = '<div class="pp-empty">'
      +'<div style="font-size:2.5rem;margin-bottom:10px;">🎉</div>'
      +'<div style="font-weight:800;margin-bottom:6px;">¡Todo al corriente!</div>'
      +'<div>No hay pagos pendientes para '+labels[_ppTab].toLowerCase()+'</div>'
      +'</div>';
    return;
  }
  var vencidos = lista.filter(function(p){ return p.urgencia==='vencido'; }).length;
  var urgentes = lista.filter(function(p){ return p.urgencia==='urgente'; }).length;
  var resumen  = document.createElement('div');
  resumen.style.cssText='background:var(--inp);border-radius:14px;padding:14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;';
  resumen.innerHTML =
    '<div>'
      +'<div style="font-size:1.45rem;font-weight:900;color:var(--danger);">'+fmt(total)+'</div>'
      +'<div style="font-size:0.72rem;color:var(--dim);">'+lista.length+' pago'+(lista.length!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">'
    +(vencidos?'<div style="font-size:0.7rem;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(229,57,53,0.12);color:#e53935;">⚠️ '+vencidos+' vencido'+(vencidos!==1?'s':'')+'</div>':'')
    +(urgentes?'<div style="font-size:0.7rem;font-weight:800;padding:4px 10px;border-radius:20px;background:rgba(245,124,0,0.12);color:#f57c00;">⏰ '+urgentes+' urgente'+(urgentes!==1?'s':'')+'</div>':'')
    +'</div>';
  body.appendChild(resumen);
  if(_ppTab==='año'){
    var grupos = {};
    lista.forEach(function(p){
      var k = p.fecha.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
      if(!grupos[k]) grupos[k]=[];
      grupos[k].push(p);
    });
    Object.keys(grupos).forEach(function(mes){
      var secTit = document.createElement('div');
      secTit.className='pp-section-title';
      var totMes = grupos[mes].reduce(function(s,p){ return s+p.monto; },0);
      secTit.innerHTML = mes.charAt(0).toUpperCase()+mes.slice(1)
        +' <span style="font-weight:900;color:var(--text);">'+fmt(totMes)+'</span>';
      body.appendChild(secTit);
      grupos[mes].forEach(function(p){ body.appendChild(_ppMkItem(p)); });
    });
  } else {
    lista.forEach(function(p){ body.appendChild(_ppMkItem(p)); });
  }
  var link = document.createElement('div');
  link.style.cssText='text-align:center;padding:16px 0 4px;';
  link.innerHTML='<button onclick="cerrarPP();goSub(\'pagos_mes\')" style="background:none;border:1.5px solid var(--border);border-radius:20px;padding:8px 20px;font-family:\'Outfit\',sans-serif;font-size:0.78rem;font-weight:700;cursor:pointer;color:var(--dim);">📅 Gestionar pagos del mes ›</button>';
  body.appendChild(link);
}

function _ppMkItem(p){
  var col = _ppUrgColor(p.urgencia);
  var row = document.createElement('div');
  row.className='pp-item';
  var ico = document.createElement('div');
  ico.className='pp-ico';
  ico.style.background = col+'18';
  ico.textContent = p.fuente==='deuda'?'💳': p.fuente==='cobrar'?'📥': '📅';
  var info = document.createElement('div');
  info.className='pp-info';
  var name = document.createElement('div'); name.className='pp-name'; name.textContent=p.nombre;
  var when = document.createElement('div'); when.className='pp-when'; when.textContent=_ppFechaLabel(p);
  info.appendChild(name); info.appendChild(when);
  var right = document.createElement('div');
  right.style.cssText='display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;';
  var amt = document.createElement('div');
  amt.className='pp-amt'; amt.style.color=col; amt.textContent=fmt(p.monto);
  var cat = document.createElement('div');
  cat.style.cssText='font-size:0.62rem;color:var(--dim);';
  cat.textContent=p.cat;
  right.appendChild(amt); right.appendChild(cat);
  var dot = document.createElement('div');
  dot.style.cssText='width:3px;align-self:stretch;border-radius:99px;background:'+col+';flex-shrink:0;margin-right:-4px;';
  row.appendChild(dot); row.appendChild(ico); row.appendChild(info); row.appendChild(right);
  return row;
}

function _lockKey(){
  var u = S.user;
  if(!u) return null;
  return 'usala_autolock_' + (u.isAdmin ? 'admin' : 'u_'+u.codigo);
}

function getLockTimeout(){
  var k = _lockKey();
  if(!k) return 0;
  return parseInt(localStorage.getItem(k)||'0', 10);
}

function setLockTimeout(minutos){
  var k = _lockKey();
  if(!k) return;
  if(minutos===0){ localStorage.removeItem(k); }
  else { localStorage.setItem(k, String(minutos)); }
  _lockReiniciar();
  showToast(minutos===0 ? '🔓 Bloqueo automático desactivado' : '⏱ Se bloqueará tras '+minutos+' min de inactividad');
}

function _lockActividad(){
  if(_lockActivo) return;
  _lockReiniciar();
}

function _lockBloqueAhora(){
  if(!S.user) return;
  _lockActivo = true;
  if(_lockTimer) clearTimeout(_lockTimer);
  var nombre = S.user.nombre || 'Usuario';
  document.getElementById('lockNombre').textContent = nombre.split(' ')[0];
  var mins = getLockTimeout();
  document.getElementById('lockTimeBadge').textContent = '⏱ Bloqueado tras '+mins+' min sin uso';
  var nipK = S.user.isAdmin ? 'usala_nip_admin' : 'usala_nip_u_'+S.user.codigo;
  var tieneNip = !!localStorage.getItem(nipK);
  document.getElementById('lockNoNipMsg').style.display = tieneNip ? 'none' : 'block';
  _lockPin = '';
  _lockActualizarDots();
  document.getElementById('lockErr').textContent = '';
  document.getElementById('lockScreen').style.display = 'flex';
}

function lockKey(d){
  if(_lockPin.length >= 4) return;
  _lockPin += d;
  _lockActualizarDots();
  if(_lockPin.length === 4) setTimeout(_lockVerificar, 120);
}

function lockDel(){
  _lockPin = _lockPin.slice(0,-1);
  _lockActualizarDots();
  document.getElementById('lockErr').textContent='';
}

function _lockActualizarDots(){
  for(var i=0;i<4;i++){
    var dot = document.getElementById('ld'+i);
    dot.classList.toggle('filled', i < _lockPin.length);
    dot.classList.remove('error');
  }
}

function lockDesbloquear(){
  _lockActivo = false;
  _lockPin    = '';
  document.getElementById('lockScreen').style.display = 'none';
  _lockReiniciar(); // reiniciar timer
}

function lockCerrarSesion(){
  document.getElementById('lockScreen').style.display = 'none';
  _lockActivo = false;
  cerrarSesion();
}

function _getSecurityStatus(){
  if(!S.user) return {nip:false, autolock:false};
  var uid    = S.user.isAdmin ? 'admin' : 'u_' + S.user.codigo;
  var nipKey = 'usala_nip_' + uid;
  var lockKey2 = 'usala_autolock_' + uid;
  return {
    nip:      !!localStorage.getItem(nipKey),
    autolock: parseInt(localStorage.getItem(lockKey2)||'0',10) > 0
  };
}

function cerrarBannerSeg(){ var b=document.getElementById('secBanner'); if(b) b.style.display='none'; }

function _bannerSeguridad(){
  var st = _getSecurityStatus();
  if(st.nip && st.autolock) return ''; // Todo protegido — sin banner
  var nivel  = (!st.nip && !st.autolock) ? 'critico' : 'medio';
  var titulo, msg, acciones;
  if(nivel === 'critico'){
    titulo  = '⚠️ Tu cuenta no está protegida';
    msg     = 'Cualquier persona que acceda a este dispositivo podría ver tus finanzas. Activa al menos el NIP y el bloqueo automático.';
    acciones = [
      {label:'🔒 Activar NIP',     fn:"goSub('config_nip')"},
      {label:'⏱ Bloqueo auto',     fn:"abrirConfigAutolock()"}
    ];
  } else if(!st.nip){
    titulo  = '🔑 Falta tu NIP de seguridad';
    msg     = 'Tienes bloqueo automático, pero sin NIP cualquiera puede desbloquear con un toque. Añade tu NIP para protección real.';
    acciones = [{label:'🔒 Configurar NIP', fn:"goSub('config_nip')"}];
  } else {
    titulo  = '⏱ Sin bloqueo automático';
    msg     = 'Tienes NIP, pero si dejas la app abierta queda expuesta. Programa un tiempo de bloqueo automático.';
    acciones = [{label:'⏱ Activar bloqueo', fn:"abrirConfigAutolock()"}];
  }
  var colorBg  = nivel==='critico' ? 'rgba(229,57,53,0.07)'  : 'rgba(245,124,0,0.07)';
  var colorBrd = nivel==='critico' ? 'rgba(229,57,53,0.25)'  : 'rgba(245,124,0,0.25)';
  var colorTxt = nivel==='critico' ? '#c62828'                : '#e65100';
  var icoBig   = nivel==='critico' ? '🛡️'                     : '🔐';
  var btns = acciones.map(function(a){
    return '<button onclick="'+a.fn+'" style="'
      +'background:'+colorTxt+';color:#fff;border:none;border-radius:20px;'
      +'padding:7px 16px;font-family:Outfit,sans-serif;font-size:0.72rem;'
      +'font-weight:800;cursor:pointer;white-space:nowrap;">'+a.label+'</button>';
  }).join('');
  return '<div id="secBanner" style="'
    +'background:'+colorBg+';border:1.5px solid '+colorBrd+';'
    +'border-radius:16px;padding:14px 16px;margin-bottom:14px;'
    +'animation:fadeIn 0.4s;">'
    +'<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;">'
      +'<div style="font-size:1.8rem;line-height:1;flex-shrink:0;">'+icoBig+'</div>'
      +'<div>'
        +'<div style="font-weight:900;font-size:0.85rem;color:'+colorTxt+';margin-bottom:3px;">'+titulo+'</div>'
        +'<div style="font-size:0.75rem;color:var(--dim);line-height:1.5;">'+msg+'</div>'
      +'</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
      +btns
      +'<button onclick="cerrarBannerSeg()" '
        +'style="margin-left:auto;background:none;border:none;color:var(--dim);'
        +'font-size:0.7rem;cursor:pointer;white-space:nowrap;padding:4px 6px;">Ahora no ✕</button>'
    +'</div>'
    +'</div>';
}

function abrirCatModal(tipo, selectId){
  _catModalTipo = tipo;
  _catSelectId  = selectId;
  _catSelectVal = (document.getElementById(selectId)||{}).value || '';
  var t = _CAT_TITLES[tipo] || {title:'🏷️ Categorías', sub:''};
  document.getElementById('catModalTitle').textContent = t.title;
  document.getElementById('catModalSub').textContent   = t.sub;
  document.getElementById('catModalInp').value = '';
  _renderCatChips();
  var m = document.getElementById('catModal');
  m.style.display = 'flex';
  setTimeout(function(){ document.getElementById('catModalInp').focus(); }, 200);
}

function cerrarCatModal(){
  document.getElementById('catModal').style.display = 'none';
  _catModalTipo = null; _catSelectId = null;
}

function _renderCatChips(){
  var wrap = document.getElementById('catModalChips');
  if(!wrap) return;
  wrap.innerHTML = '';
  var custom = load(_CAT_KEYS[_catModalTipo], []);
  var base = _CAT_BASE[_catModalTipo] || [];
  base.forEach(function(c){
    var chip = document.createElement('div');
    chip.className = 'cat-chip';
    chip.style.opacity = '0.55';
    chip.innerHTML = '<span>'+c+'</span>';
    wrap.appendChild(chip);
  });
  custom.forEach(function(c, i){
    var chip = document.createElement('div');
    chip.className = 'cat-chip';
    chip.style.borderColor = 'var(--accent)';
    chip.style.background = 'var(--accent)18';
    var txt = document.createElement('span'); txt.textContent = c;
    var del = document.createElement('button'); del.className='del-chip'; del.textContent='×';
    del.title = 'Eliminar';
    (function(idx){ del.onclick = function(){
      var c2=load(_CAT_KEYS[_catModalTipo],[]); var eli=c2[idx];
      c2.splice(idx,1); save(_CAT_KEYS[_catModalTipo],c2);
      _renderCatChips();
      _refrescarSelect(_catSelectVal);
      mostrarUndo('🏷️ "'+eli+'" eliminada', function(){
        var c3=load(_CAT_KEYS[_catModalTipo],[]); c3.splice(idx,0,eli);
        save(_CAT_KEYS[_catModalTipo],c3); _renderCatChips(); _refrescarSelect(eli);
      });
    }; })(i);
    chip.appendChild(txt); chip.appendChild(del);
    wrap.appendChild(chip);
  });
  if(!custom.length){
    var hint = document.createElement('div');
    hint.style.cssText='font-size:0.75rem;color:var(--dim);padding:8px 0;width:100%;';
    hint.textContent = 'Aún no tienes categorías personalizadas. ¡Agrega la primera!';
    wrap.appendChild(hint);
  }
}

function guardarNuevaCat(){
  var inp = document.getElementById('catModalInp');
  var val = inp ? inp.value.trim() : '';
  if(!val){ showToast('⚠ Escribe un nombre'); inp && inp.focus(); return; }
  if(val.length > 40){ showToast('⚠ Máximo 40 caracteres'); return; }
  var custom = load(_CAT_KEYS[_catModalTipo], []);
  var base   = _CAT_BASE[_catModalTipo] || [];
  var todas  = base.concat(custom).map(function(c){ return c.toLowerCase(); });
  if(todas.indexOf(val.toLowerCase())>=0){ showToast('⚠ Ya existe "'+val+'"'); return; }
  custom.push(val);
  save(_CAT_KEYS[_catModalTipo], custom);
  inp.value = '';
  _renderCatChips();
  _refrescarSelect(val);   // seleccionar la nueva en el select
  showToast('✅ "'+val+'" agregada');
  inp.focus();
}

function _refrescarSelect(val){
  var sel = _catSelectId ? document.getElementById(_catSelectId) : null;
  if(!sel) return;
  var tipo = _catModalTipo;
  if(tipo==='gasto'){
    sel.innerHTML = buildGastoCatSelect(_catSelectId, val);
  } else if(tipo==='ingreso'){
    sel.innerHTML = buildIngresoCatSelect(_catSelectId, val);
  } else if(tipo==='activos'){
    var all = ACTIVOS_CATS.concat(load('cats_activos_custom',[]));
    sel.innerHTML = all.map(function(c){ return '<option'+(c===val?' selected':'')+'>'+c+'</option>'; }).join('');
  } else if(tipo==='pagos'){
    var all2 = PAGOS_CATS.concat(load('cats_pagos_custom',[]));
    sel.innerHTML = all2.map(function(c){ return '<option'+(c===val?' selected':'')+'>'+c+'</option>'; }).join('');
  }
}

function mkCatBtn(tipo, selectId){
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cat-add-btn';
  btn.innerHTML = '＋ Categoría';
  btn.onclick = function(e){ e.preventDefault(); abrirCatModal(tipo, selectId); };
  return btn;
}

function agregarCatCustom(){
  abrirCatModal('gasto', null);
}

function borrarCatCustom(i){
  var custom = load('cats_gasto_custom',[]);
  var _eliCat = custom[i];
  custom.splice(i,1); save('cats_gasto_custom',custom);
  goSub('config');
  mostrarUndo('🏷️ Categoría eliminada', function(){
    var c2=load('cats_gasto_custom',[]); c2.splice(i,0,_eliCat); save('cats_gasto_custom',c2); goSub('config');
  });
}

function guardarVersion(){
  var v=document.getElementById('vNum').value.trim();
  var n=document.getElementById('vNotas').value.trim();
  if(!v) return;
  localStorage.setItem('usala_version',v);
  localStorage.setItem('usala_notas',n);
  APP_VERSION=v; APP_NOTAS=n;
  showToast('✓ Versión actualizada');
  document.getElementById('verBadge').textContent='v'+v;
  goSub('version');
}

function abrirAyuda(){ goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('ayuda'); },10); }

function saveNoticias(n){ localStorage.setItem('usala_noticias', JSON.stringify(n)); }

function saldoRealCuenta(cuentaVal){
  var txs = getTxs().filter(function(t){ return t.cuenta===cuentaVal; });
  return txs.reduce(function(s,t){
    return s + (t.tipo==='ingreso' ? Number(t.monto) : -Number(t.monto));
  }, 0);
}

function selEfTipo(t){
  var esEnt = t==='ingreso';
  document.getElementById('efTipoEnt').classList.toggle('selected', esEnt);
  document.getElementById('efTipoSal').classList.toggle('selected', !esEnt);
  var sel = document.getElementById('efCat');
  if(sel) sel.innerHTML = esEnt ? buildIngresoCatSelect('efCat','') : buildGastoCatSelect('efCat','');
  var destRow = document.getElementById('efDestRow');
  if(destRow) destRow.style.display = esEnt ? 'none' : 'block';
}

function guardarMovEfectivo(){
  var desc  = document.getElementById('efDesc').value.trim();
  var monto = parseFloat(document.getElementById('efMonto').value);
  var fecha = document.getElementById('efFecha').value||today();
  var cat   = document.getElementById('efCat').value;
  var tipo  = document.getElementById('efTipoEnt').classList.contains('selected')?'ingreso':'gasto';
  var destEl = document.getElementById('efDestBanco');
  var dest  = destEl ? destEl.value : '';
  if(!desc||!monto||monto<=0){ showToast('⚠ Completa descripción y monto'); return; }
  var id = Date.now();
  var txs = getTxs();
  txs.push({id:id, tipo:tipo, desc:desc, monto:monto, cat:cat, fecha:fecha, cuenta:'efectivo'});
  saveTxs(txs);
  var c = getCuentas();
  c.efectivo = (c.efectivo||0) + (tipo==='ingreso'?monto:-monto);
  if(tipo==='gasto' && dest && dest.indexOf('cheque_')===0){
    var idx = parseInt(dest.replace('cheque_',''));
    if(c.cheques && c.cheques[idx]){
      c.cheques[idx].saldo = (Number(c.cheques[idx].saldo)||0) + monto;
      var txs2 = getTxs();
      txs2.push({id:Date.now()+1, tipo:'ingreso', desc:'Transferencia desde Efectivo: '+desc, monto:monto, cat:'Transferencia recibida', fecha:fecha, cuenta:dest});
      saveTxs(txs2);
    }
  }
  saveCuentas(c);
  showToast('✓ '+(tipo==='ingreso'?'Entrada':'Salida')+' registrada en Efectivo');
  goSub('efectivo');
}

function selBkTipo(t, idx){
  var esEnt=t==='ingreso';
  document.getElementById('bkTipoEnt').classList.toggle('selected',esEnt);
  document.getElementById('bkTipoSal').classList.toggle('selected',!esEnt);
  var cats=esEnt?getIngresoCats():getGastoCats();
  var sel=document.getElementById('bkCat'); if(sel) sel.innerHTML=cats.map(function(cat){ return '<option>'+cat+'</option>'; }).join('');
}

function guardarMovBanco(idx){
  var desc=document.getElementById('bkDesc').value.trim();
  var monto=parseFloat(document.getElementById('bkMonto').value);
  var fecha=document.getElementById('bkFecha').value||today();
  var cat=document.getElementById('bkCat').value;
  var tipo=document.getElementById('bkTipoEnt').classList.contains('selected')?'ingreso':'gasto';
  if(!desc||!monto||monto<=0){ showToast('⚠ Completa descripción y monto'); return; }
  var cval='cheque_'+idx;
  var id=Date.now(); var txs=getTxs();
  txs.push({id:id,tipo:tipo,desc:desc,monto:monto,cat:cat,fecha:fecha,cuenta:cval});
  saveTxs(txs);
  var c=getCuentas();
  c.cheques[idx].saldo=(c.cheques[idx].saldo||0)+(tipo==='ingreso'?monto:-monto);
  saveCuentas(c);
  showToast('✓ '+(tipo==='ingreso'?'Ingreso':'Gasto')+' en '+c.cheques[idx].banco);
  goSub('banco_'+idx);
}

function renderFaqs(q, catFiltro){
  var term = (q||'').toLowerCase().trim();
  var filtrados = FAQS.filter(function(f){
    var matchQ   = !term || f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term) || f.cat.toLowerCase().includes(term);
    var matchCat = !catFiltro || f.cat.toLowerCase().includes(catFiltro.toLowerCase());
    return matchQ && matchCat;
  });
  if(!filtrados.length) return '<div style="text-align:center;padding:24px;color:var(--dim);font-size:0.83rem;">No se encontraron resultados para "'+q+'"</div>';
  var porCat = {};
  filtrados.forEach(function(f){ if(!porCat[f.cat]) porCat[f.cat]=[]; porCat[f.cat].push(f); });
  return Object.keys(porCat).map(function(cat){
    return '<div style="font-size:0.65rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin:14px 0 6px;">'+cat+'</div>'
      + porCat[cat].map(function(f,i){
          var id='faq_'+cat.replace(/\W/g,'')+'_'+i;
          return '<div class="card" style="margin-bottom:6px;cursor:pointer;" onclick="toggleFaq(\''+id+'\')">'
            +'<div style="display:flex;justify-content:space-between;align-items:center;">'
            +'<div style="font-weight:700;font-size:0.85rem;flex:1;padding-right:8px;">'+f.q+'</div>'
            +'<div id="arr_'+id+'" style="color:var(--dim);font-size:1rem;flex-shrink:0;">›</div>'
            +'</div>'
            +'<div id="'+id+'" style="display:none;font-size:0.78rem;color:var(--dim);line-height:1.6;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">'+f.a+'</div>'
            +'</div>';
        }).join('');
  }).join('');
}

function ayudaChipEv(btn){
  ayudaChip(btn, btn.getAttribute('data-cat')||'');
}

function ayudaChip(btn, cat){
  document.querySelectorAll('.ayuda-chip').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var q = document.getElementById('ayudaBusca').value;
  document.getElementById('ayudaLista').innerHTML = renderFaqs(q, cat);
}

function filtrarAyuda(){
  var q=document.getElementById('ayudaBusca').value;
  var chipActivo = document.querySelector('.ayuda-chip.active');
  var cat = chipActivo ? (chipActivo.id==='chip_todos'?'':chipActivo.textContent.replace(/[^a-zA-ZáéíóúÁÉÍÓÚ ]/g,'').trim()) : '';
  document.getElementById('ayudaLista').innerHTML=renderFaqs(q, cat);
}

function toggleFaq(id){
  var el=document.getElementById(id);
  var arr=document.getElementById('arr_'+id);
  if(!el) return;
  var open=el.style.display==='block';
  el.style.display=open?'none':'block';
  arr.textContent=open?'›':'↓';
}

function iniciarVoz(){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ showToast('⚠ Tu navegador no soporta voz'); return; }
  _vozRec = new SR();
  _vozRec.lang = 'es-MX';
  _vozRec.continuous = false;
  _vozRec.interimResults = false;
  _vozRec.onstart = function(){
    _vozActivo = true;
    var btn = document.getElementById('btnVoz');
    if(btn){ btn.style.background='#ff3b30'; btn.style.color='#fff'; btn.textContent='🔴'; }
    showToast('🎤 Escuchando...');
  };
  _vozRec.onend = function(){ detenerVoz(); };
  _vozRec.onerror = function(e){
    detenerVoz();
    if(e.error === 'not-allowed') showToast('🔒 Micrófono bloqueado. Actívalo en Configuración del sitio.');
    else if(e.error !== 'no-speech') showToast('⚠ Error de voz: ' + e.error);
  };
  _vozRec.onresult = function(e){
    var t = e.results[0][0].transcript.toLowerCase().trim();
    showToast('🎤 "' + t + '"');
    procesarComandoVoz(t);
  };
  try{ _vozRec.start(); } catch(e){ showToast('⚠ No se pudo iniciar el mic'); }
}

function detenerVoz(){
  _vozActivo = false;
  var btn = document.getElementById('btnVoz');
  if(btn){ btn.style.background=''; btn.style.color=''; btn.textContent='🎙️'; }
  if(_vozRec){ try{ _vozRec.stop(); }catch(e){} _vozRec = null; }
}

function procesarComandoVoz(t){
  var nb = document.querySelectorAll('.nb');
  if(/\binicio\b|\bhome\b/.test(t)){ goTab('inicio',nb[0]); showToast('🏠 Inicio'); return; }
  if(/\bcuentas?\b/.test(t) && !/tarjeta|tc\b/.test(t)){ goTab('cuentas',nb[1]); showToast('🏦 Cuentas'); return; }
  if(/\bcr[eé]ditos?\b|\bpr[eé]stamo\b/.test(t)){ goTab('creditos',nb[2]); showToast('🤝 Créditos'); return; }
  if(/\breportes?\b/.test(t)){ goTab('reportes',nb[3]); showToast('📊 Reportes'); return; }
  if(/\bm[aá]s\b|\bajuste\b|\bconfig\b/.test(t)){ goTab('mas',document.querySelectorAll('.nb')[4]); showToast('⋯ Más'); return; }
  if(/\befectivo\b/.test(t)){ goTab('cuentas',nb[1]); setTimeout(function(){ goSub('efectivo'); },60); showToast('💵 Efectivo'); return; }
  if(/\bbanco\b|\bcheque\b/.test(t)){ goTab('cuentas',nb[1]); setTimeout(function(){ goSub('cheques'); },60); showToast('🏦 Banco'); return; }
  if(/\btarjeta\b|\btc\b/.test(t)){ goTab('cuentas',nb[1]); setTimeout(function(){ goSub('tarjetas_credito'); },60); showToast('💳 Tarjetas'); return; }
  if(/\bcalculadora\b|\bcalc\b/.test(t)){ abrirCalc(); showToast('🔢 Calculadora'); return; }
  if(/\bhistorial\b/.test(t)){ goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('historial'); },60); showToast('📋 Historial'); return; }
  if(/\bayuda\b/.test(t)){ goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('ayuda'); },60); showToast('❓ Ayuda'); return; }
  if(/\bmetas?\b/.test(t)){ goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('metas'); },60); showToast('🎯 Metas'); return; }
  if(/\bpresupuesto\b/.test(t)){ goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('presupuesto'); },60); showToast('💰 Presupuesto'); return; }
  if(/\bconversor\b|\btipo de cambio\b/.test(t)){ goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('conversor'); },60); showToast('💱 Conversor'); return; }
  var mG = t.match(/gast[eé]\s+(\d+[\.,]?\d*)/);
  var mI = t.match(/ingres[eé]\s+(\d+[\.,]?\d*)/);
  if(mG){
    var m = parseFloat(mG[1].replace(',','.'));
    if(m > 0){
      var c = getCuentas(); c.efectivo = (c.efectivo||0) - m; saveCuentas(c);
      var txs = getTxs(); txs.push({id:Date.now(),tipo:'gasto',desc:'Voz',monto:m,cat:'Otros gastos',fecha:today(),cuenta:'efectivo'}); saveTxs(txs);
      showToast('💸 Gasto ' + getSimboloMoneda() + m.toFixed(2) + ' en Efectivo'); renderTab(S.tab); return;
    }
  }
  if(mI){
    var m2 = parseFloat(mI[1].replace(',','.'));
    if(m2 > 0){
      var c2 = getCuentas(); c2.efectivo = (c2.efectivo||0) + m2; saveCuentas(c2);
      var txs2 = getTxs(); txs2.push({id:Date.now(),tipo:'ingreso',desc:'Voz',monto:m2,cat:'Otros ingresos',fecha:today(),cuenta:'efectivo'}); saveTxs(txs2);
      showToast('💰 Ingreso ' + getSimboloMoneda() + m2.toFixed(2) + ' en Efectivo'); renderTab(S.tab); return;
    }
  }
  showToast('❓ No entendí: "' + t + '"');
}

function verFichaCodigo(codigo){
  var cods=JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  var c=cods.find(function(x){ return x.codigo===codigo; });
  if(!c) return;
  var hoy=new Date(); hoy.setHours(0,0,0,0);
  var vencDate=new Date(c.vencimiento.split('-').join('/'));
  var estaVenc=vencDate<hoy;
  var diffDias=Math.round((vencDate-hoy)/86400000);
  var tieneNip=!!localStorage.getItem('usala_nip_u_'+c.codigo);
  var nombre=c.nombreUsuario||c.nota||'Sin nombre';
  var contacto=c.contacto||'';
  var initials=nombre.split(' ').map(function(p){ return p[0]||''; }).slice(0,2).join('').toUpperCase();
  var stCol=estaVenc?'#9e9e9e':diffDias<=7?'#f57c00':'var(--accent2)';
  var mc=document.getElementById('mainContent');
  mc.innerHTML=
    '<div class="page-header"><button onclick="goSub(\'codigos\')" style="background:none;border:none;color:var(--accent);font-size:1rem;cursor:pointer;padding:4px 8px;">← Atrás</button>'
    +'<div class="page-title">👤 Ficha</div></div>'
    +'<div style="text-align:center;padding:24px 0 18px;">'
      +'<div style="width:72px;height:72px;border-radius:50%;background:'+stCol+';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.6rem;margin:0 auto 12px;">'+initials+'</div>'
      +'<div style="font-size:1.2rem;font-weight:900;">'+nombre+'</div>'
      +(contacto?'<div style="font-size:0.82rem;color:var(--accent);margin-top:4px;">📞 '+contacto+'</div>':'<div style="font-size:0.78rem;color:var(--dim);margin-top:4px;">Sin contacto registrado</div>')
    +'</div>'
    +'<div class="card" style="margin-bottom:14px;">'
      +'<div class="card-title">📋 Datos de acceso</div>'
      +'<div style="display:flex;flex-direction:column;gap:10px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--inp);border-radius:12px;">'
          +'<div><div style="font-size:0.65rem;color:var(--dim);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Código</div>'
          +'<div style="font-family:monospace;font-size:1.15rem;font-weight:700;letter-spacing:0.1em;">'+c.codigo+'</div></div>'
          +'<button id="btnCopiarFicha" style="background:var(--accent);color:var(--navtext);border:none;border-radius:10px;padding:8px 14px;font-family:Outfit,sans-serif;font-weight:700;font-size:0.78rem;cursor:pointer;">📋 Copiar</button>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
          +'<div style="padding:10px;background:var(--inp);border-radius:12px;">'
            +'<div style="font-size:0.65rem;color:var(--dim);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Estado</div>'
            +'<div style="font-size:0.85rem;font-weight:800;color:'+stCol+';">'+(estaVenc?'⛔ Vencido':diffDias<=7?'⚠️ Pronto':'✅ Activo')+'</div>'
          +'</div>'
          +'<div style="padding:10px;background:var(--inp);border-radius:12px;">'
            +'<div style="font-size:0.65rem;color:var(--dim);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Vencimiento</div>'
            +'<div style="font-size:0.82rem;font-weight:700;">'+c.vencimiento+'</div>'
          +'</div>'
          +'<div style="padding:10px;background:var(--inp);border-radius:12px;">'
            +'<div style="font-size:0.65rem;color:var(--dim);font-weight:700;text-transform:uppercase;margin-bottom:3px;">Primer acceso</div>'
            +'<div style="font-size:0.82rem;font-weight:700;">'+(c.fechaUso||'Sin usar')+'</div>'
          +'</div>'
          +'<div style="padding:10px;background:var(--inp);border-radius:12px;">'
            +'<div style="font-size:0.65rem;color:var(--dim);font-weight:700;text-transform:uppercase;margin-bottom:3px;">NIP</div>'
            +'<div style="font-size:0.82rem;font-weight:700;">'+(tieneNip?'🔒 Configurado':'🔓 Sin NIP')+'</div>'
          +'</div>'
        +'</div>'
        +(c.creado?'<div style="font-size:0.7rem;color:var(--dim);">📅 Código creado el '+c.creado+'</div>':'')
      +'</div>'
    +'</div>'
    +'<div class="card" id="fichaAcciones">'
      +'<div class="card-title">⚡ Acciones</div>'
      +'<div style="display:flex;flex-direction:column;gap:8px;">'
        +(estaVenc?'<button id="btnRenovarFicha" style="width:100%;padding:13px;background:rgba(45,158,95,0.1);color:var(--accent2);border:1.5px solid rgba(45,158,95,0.3);border-radius:14px;font-family:Outfit,sans-serif;font-weight:700;font-size:0.88rem;cursor:pointer;">🔄 Renovar acceso 30 días</button>':'')
        +(tieneNip?'<button id="btnNipFicha" style="width:100%;padding:13px;background:rgba(229,57,53,0.07);color:var(--danger);border:1.5px solid rgba(229,57,53,0.2);border-radius:14px;font-family:Outfit,sans-serif;font-weight:700;font-size:0.88rem;cursor:pointer;">🔓 Resetear NIP</button>':'')
        +'<button id="btnBorrarFicha" style="width:100%;padding:13px;background:rgba(229,57,53,0.06);color:var(--danger);border:1.5px solid rgba(229,57,53,0.15);border-radius:14px;font-family:Outfit,sans-serif;font-weight:700;font-size:0.88rem;cursor:pointer;">🗑 Eliminar usuario</button>'
      +'</div>'
    +'</div>';
  var btnC=document.getElementById('btnCopiarFicha');
  if(btnC) btnC.onclick=function(){ copiarCodigo(codigo); };
  var btnR=document.getElementById('btnRenovarFicha');
  if(btnR) btnR.onclick=function(){ renovarCodigo(codigo); };
  var btnN=document.getElementById('btnNipFicha');
  if(btnN) btnN.onclick=function(){ resetearNipUsuario(codigo); };
  var btnD=document.getElementById('btnBorrarFicha');
  if(btnD) btnD.onclick=function(){ borrarCodigo(codigo); };
}

function borrarCodigo(codigo){
  var cods = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  var idx  = cods.findIndex(function(x){ return x.codigo===codigo; });
  if(idx < 0) return;
  var _backup = JSON.parse(JSON.stringify(cods[idx]));
  var nombre  = _backup.nombreUsuario || _backup.nota || codigo;
  cods.splice(idx, 1);
  localStorage.setItem('usala_codigos', JSON.stringify(cods));
  goSub('codigos');
  mostrarUndo('🗑 Usuario "'+nombre+'" eliminado', function(){
    var c2 = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
    c2.splice(idx, 0, _backup);
    localStorage.setItem('usala_codigos', JSON.stringify(c2));
    showToast('↩ Usuario restaurado');
    goSub('codigos');
  });
}

function renovarCodigo(codigo){
  var cods=JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  var c=cods.find(function(x){ return x.codigo===codigo; });
  if(!c) return;
  var nombre=c.nombreUsuario||c.nota||codigo;
  var venc=new Date(); venc.setDate(venc.getDate()+30);
  c.vencimiento=venc.toISOString().split('T')[0];
  c.activo=true;
  localStorage.setItem('usala_codigos',JSON.stringify(cods));
  showToast('✅ Acceso de '+nombre+' renovado 30 días');
  goSub('codigos');
}

function desactivarCodigo(codigo){
  usalaConfirm('Desactivar el acceso de '+codigo+'?', function(){
    var cods=JSON.parse(localStorage.getItem('usala_codigos')||'[]');
      var ci=cods.find(function(x){ return x.codigo===codigo; });
      if(ci) ci.activo=false;
      localStorage.setItem('usala_codigos',JSON.stringify(cods));
      goSub('codigos');
  });
}


// ═══════════════════════════════════════════════════════
//  SISTEMA DE MODALES — reemplaza confirm() y prompt()
// ═══════════════════════════════════════════════════════

// Modal de confirmación (reemplaza confirm)
function usalaConfirm(msg, onOk, onCancel){
  var viejo = document.getElementById('_usalaConfirmModal');
  if(viejo) viejo.remove();
  var m = document.createElement('div');
  m.id = '_usalaConfirmModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;'
    +'display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;'
    +'padding:24px 20px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">'
    +'<div style="font-size:0.95rem;font-weight:700;color:var(--txt);margin-bottom:20px;line-height:1.45;">'
    + msg.replace(/\n/g,'<br>') +'</div>'
    +'<div style="display:flex;gap:10px;">'
    +'<button id="_usalaConfirmOk" class="btn-main" style="flex:1;">Confirmar</button>'
    +'<button id="_usalaConfirmCancel" class="btn-sec" style="flex:1;">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
  document.getElementById('_usalaConfirmOk').onclick = function(){
    m.remove(); if(onOk) onOk();
  };
  document.getElementById('_usalaConfirmCancel').onclick = function(){
    m.remove(); if(onCancel) onCancel();
  };
  m.onclick = function(e){ if(e.target===m){ m.remove(); if(onCancel) onCancel(); } };
}

// Modal de prompt con un campo (reemplaza prompt)
function usalaPrompt(msg, defaultVal, onOk, opts){
  var viejo = document.getElementById('_usalaPromptModal');
  if(viejo) viejo.remove();
  opts = opts || {};
  var tipo = opts.type || 'text';
  var placeholder = opts.placeholder || '';
  var m = document.createElement('div');
  m.id = '_usalaPromptModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;'
    +'display:flex;align-items:center;justify-content:center;padding:16px;';
  m.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;'
    +'padding:24px 20px;max-width:340px;width:100%;">'
    +'<div style="font-size:0.88rem;font-weight:700;color:var(--txt);margin-bottom:12px;">'+ msg +'</div>'
    +'<input id="_usalaPromptInp" class="inp" type="'+ tipo +'" '
    +'placeholder="'+ placeholder +'" value="'+(defaultVal||'')+'" '
    +'style="margin-bottom:14px;">'
    +'<div style="display:flex;gap:10px;">'
    +'<button id="_usalaPromptOk" class="btn-main" style="flex:1;">Aceptar</button>'
    +'<button id="_usalaPromptCancel" class="btn-sec" style="flex:1;">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
  var inp = document.getElementById('_usalaPromptInp');
  setTimeout(function(){ inp.focus(); inp.select(); }, 80);
  var doOk = function(){
    var val = inp.value;
    m.remove();
    if(onOk) onOk(val);
  };
  document.getElementById('_usalaPromptOk').onclick = doOk;
  inp.onkeydown = function(e){ if(e.key==='Enter') doOk(); if(e.key==='Escape') m.remove(); };
  document.getElementById('_usalaPromptCancel').onclick = function(){ m.remove(); };
  m.onclick = function(e){ if(e.target===m) m.remove(); };
}

// Modal de prompt con DOS campos (para editarMeta)
function usalaPrompt2(msg, fields, onOk){
  var viejo = document.getElementById('_usalaPrompt2Modal');
  if(viejo) viejo.remove();
  var m = document.createElement('div');
  m.id = '_usalaPrompt2Modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;'
    +'display:flex;align-items:center;justify-content:center;padding:16px;';
  var inputs = fields.map(function(f,i){
    return '<div style="margin-bottom:12px;">'
      +'<label class="inp-label">'+ f.label +'</label>'
      +'<input id="_usalaP2_'+i+'" class="inp" type="'+(f.type||'text')+'" '
      +'value="'+(f.value||'')+'" placeholder="'+(f.placeholder||'')+'">'
      +'</div>';
  }).join('');
  m.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:20px;'
    +'padding:24px 20px;max-width:340px;width:100%;">'
    +'<div style="font-size:0.9rem;font-weight:800;color:var(--txt);margin-bottom:14px;">'+ msg +'</div>'
    + inputs
    +'<div style="display:flex;gap:10px;">'
    +'<button id="_usalaP2Ok" class="btn-main" style="flex:1;">Guardar</button>'
    +'<button class="btn-sec" style="flex:1;" onclick="document.getElementById(\'_usalaPrompt2Modal\').remove()">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
  setTimeout(function(){ var el=document.getElementById('_usalaP2_0'); if(el){el.focus();el.select();}},80);
  document.getElementById('_usalaP2Ok').onclick = function(){
    var vals = fields.map(function(_,i){ return document.getElementById('_usalaP2_'+i).value; });
    m.remove();
    if(onOk) onOk(vals);
  };
  m.onclick = function(e){ if(e.target===m) m.remove(); };
}
