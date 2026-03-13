// ─────────────────────────────────────────────
//  USALA Suite — Transacciones
//  js/transacciones.js
// ─────────────────────────────────────────────

function getTxs(){
  var txs = load('txs',[]);
  var dirty = false;
  txs.forEach(function(t){
    var m = migrarCat(t.cat);
    if(m !== t.cat){ t.cat = m; dirty = true; }
  });
  if(dirty) save('txs', txs);
  return txs;
}

function saveTxs(txs){ save('txs',txs); }

function txItem(t, showEdit){
  var es = showEdit !== false;
  var isIng = t.tipo==='ingreso';
  var ico = isIng ? '💰' : (t.cat==='Comida'||t.cat==='Alimentación'?'🍽️':t.cat==='Transporte'?'🚗':t.cat==='Servicios'?'⚡':t.cat==='Salud'?'💊':t.cat==='Entretenimiento'?'🎬':t.cat==='Educación'?'📚':t.cat==='Pagos'?'📅':'💳');
  var fechaFmt = (function(){
    if(!t.fecha) return '';
    var p=t.fecha.split('-'); if(p.length<3) return t.fecha;
    var meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return p[2]+' '+meses[+p[1]-1];
  })();
  return '<div class="tx-item">'
    +'<div class="tx-ico" style="background:'+(isIng?'rgba(43,192,112,0.12)':'rgba(255,95,87,0.1)')+';border-color:'+(isIng?'rgba(43,192,112,0.2)':'rgba(255,95,87,0.15)')+';font-size:1rem;">'+ico+'</div>'
    +'<div class="tx-info">'
    +'<div class="tx-name">'+t.desc+'</div>'
    +'<div class="tx-date">'+fechaFmt+(t.cat?' · <span style="color:var(--accent);opacity:0.7;">'+t.cat+'</span>':'')+'</div>'
    +'</div>'
    +'<div class="tx-right">'
    +'<div class="tx-amt '+(isIng?'ing':'gas')+'">'+(isIng?'+':'-')+fmt(t.monto)+'</div>'
    +(es?'<button class="ic-btn" onclick="editarTx(\"'+t.id+'\")" style="font-size:0.8rem;">✏️</button>':'')
    +(es?'<button class="ic-btn" onclick="borrarTx(\"'+t.id+'\")" style="font-size:0.8rem;">🗑️</button>':'')
    +'</div></div>';
}

function borrarTx(id){
  var txs = getTxs();
  // Comparar como string para soportar IDs 'tx_123' y numéricos
  var idStr = String(id);
  var eli = txs.find(function(t){ return String(t.id)===idStr; });
  if(!eli) return;
  if(eli.cuenta) revertirMovimientoCuenta(eli.cuenta, Number(eli.monto), eli.tipo);
  saveTxs(txs.filter(function(t){ return String(t.id)!==idStr; }));
  renderTab(S.tab);
  mostrarUndo('Transaccion eliminada', function(){
    var t2=getTxs();
    var eliId=String(eli.id);
    if(!t2.find(function(x){ return String(x.id)===eliId; })) t2.push(eli);
    saveTxs(t2);
    if(eli.cuenta) aplicarMovimientoCuenta(eli.cuenta, Number(eli.monto), eli.tipo, eli.desc, eli.fecha, eli.id);
    showToast('Restaurado'); renderTab(S.tab);
  });
}

function editarTx(id){
  var txs = getTxs();
  var idStr = String(id);
  var t = txs.find(function(x){ return String(x.id)===idStr; });
  if(!t) return;
  S.editTxId = t.id; // usar el id tal como está guardado
  document.getElementById('txModalTitle').textContent = 'Editar Transacción';
  document.getElementById('tipoSelector').style.display = 'none';
  document.getElementById('txDesc').value = t.desc;
  document.getElementById('txMonto').value = t.monto;
  document.getElementById('txFecha').value = t.fecha;
  document.getElementById('txSaveBtn').textContent = '💾 Guardar cambios';
  var _catMigrado = migrarCat(t.cat);
  var sel = document.getElementById('txCat');
  sel.innerHTML = t.tipo==='ingreso' ? buildIngresoCatSelect('txCat',_catMigrado) : buildGastoCatSelect('txCat',_catMigrado);
  poblarCuentas(t.cuenta||'');
  document.getElementById('txModal').classList.add('open');
  setTimeout(function(){ document.getElementById('txDesc').focus(); }, 400);
}

function guardarTx(){
  var desc  = document.getElementById('txDesc').value.trim();
  var monto = parseFloat(document.getElementById('txMonto').value);
  var cat   = document.getElementById('txCat').value;
  var fecha = document.getElementById('txFecha').value || today();
  var cuenta = document.getElementById('txCuenta').value;
  var tipo  = document.getElementById('tipoGasto').classList.contains('selected') ? 'gasto' : 'ingreso';
  if(!desc){ showToast('⚠ Escribe una descripción'); return; }
  if(!monto || monto<=0){ showToast('⚠ Escribe un monto válido'); return; }
  var txs = getTxs();
  if(S.editTxId){
    var _eid=String(S.editTxId); var ei = txs.findIndex(function(t){ return String(t.id)===_eid; });
    if(ei>-1){
      var prev = txs[ei];
      if(prev.cuenta) revertirMovimientoCuenta(prev.cuenta, Number(prev.monto), prev.tipo);
      tipo = prev.tipo;
      txs[ei] = Object.assign(prev, {desc:desc, monto:monto, cat:cat, fecha:fecha, cuenta:cuenta});
      if(cuenta) aplicarMovimientoCuenta(cuenta, monto, tipo, desc, fecha, S.editTxId);
    }
    showToast('✓ Actualizado correctamente');
  } else {
    var id = Date.now();
    txs.push({id:id, tipo:tipo, desc:desc, monto:monto, cat:cat, fecha:fecha, cuenta:cuenta});
    if(cuenta) aplicarMovimientoCuenta(cuenta, monto, tipo, desc, fecha, id);
    showToast('✓ '+( tipo==='ingreso'?'Ingreso':'Gasto')+' guardado'+(cuenta?' → '+nombreCuenta(cuenta):''));
  }
  saveTxs(txs);
  cerrarTxModal();
  renderTab(S.tab);
}

function guardarTxInline(tipo, cat){
  var sufijo = tipo==='ingreso' ? 'ingreso' : cat;
  var descEl  = document.getElementById('inDesc_'+sufijo);
  var montoEl = document.getElementById('inMonto_'+sufijo);
  var fechaEl = document.getElementById('inFecha_'+sufijo);
  var cuentaEl= document.getElementById('inCuenta_'+sufijo);
  if(!descEl||!montoEl){ showToast('⚠ Error de formulario'); return; }
  var desc  = descEl.value.trim();
  var monto = parseFloat(montoEl.value);
  var fecha = fechaEl ? fechaEl.value||today() : today();
  var cuenta = cuentaEl ? cuentaEl.value : '';
  var catFinal = tipo==='ingreso'
    ? (document.getElementById('inCat_ingreso') ? document.getElementById('inCat_ingreso').value : 'Salario')
    : cat;
  if(!desc){ showToast('⚠ Escribe una descripción'); return; }
  if(!monto||monto<=0){ showToast('⚠ Escribe un monto válido'); return; }
  var txs = getTxs();
  var id = Date.now();
  txs.push({id:id, tipo:tipo, desc:desc, monto:monto, cat:catFinal, fecha:fecha, cuenta:cuenta});
  saveTxs(txs);
  if(cuenta) aplicarMovimientoCuenta(cuenta, monto, tipo, desc, fecha, id);
  showToast('✓ Guardado'+(cuenta?' → '+nombreCuenta(cuenta):''));
  var mapSub = {Pagos:'pagos', Compras:'compras', Servicios:'servicios', ingreso:'activos'};
  var sub = mapSub[cat]||mapSub[tipo];
  if(sub) goSub(sub);
}

function aplicarMovimientoCuenta(cuentaVal, monto, tipo, desc, fecha, txId){
  if(!cuentaVal) return;
  var c = getCuentas();
  var delta = tipo==='ingreso' ? monto : -monto;
  if(cuentaVal==='efectivo'){
    c.movEfectivo = c.movEfectivo||[];
    c.movEfectivo.push({desc:desc, monto:Math.abs(delta), fecha:fecha, tipo:tipo==='ingreso'?'entrada':'salida', txId:txId});
    c.efectivo = (c.efectivo||0) + delta;
  } else if(cuentaVal.indexOf('cheque_')===0){
    var idx = parseInt(cuentaVal.replace('cheque_',''));
    if(c.cheques && c.cheques[idx]){
      c.cheques[idx].saldo = (c.cheques[idx].saldo||0) + delta;
    }
  } else if(cuentaVal.indexOf('tc_')===0){
    var ti = parseInt(cuentaVal.replace('tc_',''));
    if(c.tarjetas && c.tarjetas[ti]){
      var cambio = tipo==='gasto' ? monto : -monto;
      c.tarjetas[ti].balance = (Number(c.tarjetas[ti].balance)||0) + cambio;
    }
  }
  saveCuentas(c);
}

function revertirMovimientoCuenta(cuentaVal, monto, tipo){
  if(!cuentaVal) return;
  var c = getCuentas();
  var delta = tipo==='ingreso' ? -monto : monto;
  if(cuentaVal==='efectivo'){
    c.efectivo = (c.efectivo||0) + delta;
  } else if(cuentaVal.indexOf('cheque_')===0){
    var idx = parseInt(cuentaVal.replace('cheque_',''));
    if(c.cheques && c.cheques[idx]){
      c.cheques[idx].saldo = (c.cheques[idx].saldo||0) + delta;
    }
  } else if(cuentaVal.indexOf('tc_')===0){
    var ti = parseInt(cuentaVal.replace('tc_',''));
    if(c.tarjetas && c.tarjetas[ti]){
      var cambio = tipo==='gasto' ? -monto : monto;
      c.tarjetas[ti].balance = (Number(c.tarjetas[ti].balance)||0) + cambio;
    }
  }
  saveCuentas(c);
}

function nombreCuenta(val){
  if(!val) return '';
  if(val==='efectivo') return 'Efectivo';
  if(val.indexOf('cheque_')===0){
    var c=getCuentas(); var idx=parseInt(val.replace('cheque_',''));
    return c.cheques&&c.cheques[idx] ? c.cheques[idx].banco : 'Banco';
  }
  return val;
}

function renderGastos(){
  return '<div class="page-header" style="padding-top:4px;margin-bottom:16px;"><div style="font-size:1.05rem;font-weight:800;">💳 Gastos</div></div>'
    +'<div class="mod-list">'
    +'<div class="mod-item" onclick="goSub(\'pagos\')"><div class="mod-icon">💵</div><div><div class="mod-label">Pagos</div><div class="mod-sub">Facturas, servicios, rentas</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'compras\')"><div class="mod-icon">🛍️</div><div><div class="mod-label">Compras</div><div class="mod-sub">Productos y artículos</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'carrito\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,179,64,0.2),rgba(255,179,64,0.08));">🛒</div><div><div class="mod-label">Carrito inteligente</div><div class="mod-sub">Listas, precios e historial</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'servicios\')"><div class="mod-icon">⚡</div><div><div class="mod-label">Servicios</div><div class="mod-sub">Luz, agua, internet, etc.</div></div><div class="mod-arrow">›</div></div>'
    +'</div>';
}

function renderSubTxs(titulo, icono, cat){
  var txs = getTxs().filter(function(t){ return t.tipo==='gasto' && (cat==='all' || t.cat===cat); });
  var total = txs.reduce(function(s,t){ return s+Number(t.monto); },0);
  var items = txs.slice().reverse().map(function(t){
    var cuentaLabel = t.cuenta ? ' <span style="font-size:0.65rem;background:var(--inp);padding:2px 6px;border-radius:6px;color:var(--dim);">'+nombreCuenta(t.cuenta)+'</span>' : '';
    return txItem(t,true).replace('</div></div>','</div>'+cuentaLabel+'</div>');
  }).join('') || '<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin registros</div>';
  var cuentaOpts = buildCuentaOpts('');
  return '<div class="page-header">'+backSubBtn()+'<div class="page-title">'+icono+' '+titulo+'</div></div>'
    +'<div class="card" style="margin-bottom:12px;"><div class="stat-label">Total gastado</div><div class="stat-val red">'+fmt(total)+'</div></div>'
    +'<div class="card" style="margin-bottom:14px;" id="formInline_'+cat+'">'
    +'<div class="card-title">+ Agregar gasto</div>'
    +'<label class="inp-label">Descripción</label><input class="inp" id="inDesc_'+cat+'" placeholder="Ej: Supermercado" autocomplete="off">'
    +'<div class="form-row"><div><label class="inp-label">Monto ($)</label><input class="inp" id="inMonto_'+cat+'" type="number" inputmode="decimal" placeholder="0.00"></div>'
    +'<div><label class="inp-label">Fecha</label><input class="inp" id="inFecha_'+cat+'" type="date" value="'+today()+'"></div></div>'
    +'<label class="inp-label">💼 ¿De qué cuenta sale?</label>'
    +'<select class="inp" id="inCuenta_'+cat+'">'+cuentaOpts+'</select>'
    +'<button class="btn-main" onclick="guardarTxInline(\'gasto\',\''+cat+'\')">💾 Guardar gasto</button>'
    +'</div>'
    +'<div class="card"><div class="card-title">Registros</div>'+items+'</div>';
}

function renderPagos(){ return renderSubTxs('Pagos','💵','Pagos'); }

function renderCompras(){ return renderSubTxs('Compras','🛍️','Compras'); }

function renderServicios(){ return renderSubTxs('Servicios','⚡','Servicios'); }

function renderIngresos(){
  return '<div class="page-header" style="padding-top:4px;margin-bottom:16px;"><div style="font-size:1.05rem;font-weight:800;">💰 Ingresos</div></div>'
    +'<div class="mod-list">'
    +'<div class="mod-item" onclick="goSub(\'ingresos_activos\')"><div class="mod-icon">📥</div><div><div class="mod-label">Activos</div><div class="mod-sub">Salario, rentas, negocios</div></div><div class="mod-arrow">›</div></div>'
    +'</div>';
}

function renderIngresosActivos(){
  var txs = getTxs().filter(function(t){ return t.tipo==='ingreso'; });
  var total = txs.reduce(function(s,t){ return s+Number(t.monto); },0);
  var items = txs.slice().reverse().map(function(t){
    var cuentaLabel = t.cuenta ? ' <span style="font-size:0.65rem;background:var(--inp);padding:2px 6px;border-radius:6px;color:var(--dim);">'+nombreCuenta(t.cuenta)+'</span>' : '';
    return txItem(t,true).replace('</div></div>','</div>'+cuentaLabel+'</div>');
  }).join('') || '<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin ingresos aún</div>';
  var cuentaOpts = buildCuentaOpts('');
  return '<div class="page-header">'+backSubBtn()+'<div class="page-title">📥 Activos</div></div>'
    +'<div class="card" style="margin-bottom:12px;"><div class="stat-label">Total ingresos</div><div class="stat-val">'+fmt(total)+'</div></div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<div class="card-title">+ Agregar ingreso</div>'
    +'<label class="inp-label">Descripción</label><input class="inp" id="inDesc_ingreso" placeholder="Ej: Salario quincenal" autocomplete="off">'
    +'<div class="form-row"><div><label class="inp-label">Monto ($)</label><input class="inp" id="inMonto_ingreso" type="number" inputmode="decimal" placeholder="0.00"></div>'
    +'<div><label class="inp-label">Categoría</label><select class="inp" id="inCat_ingreso"><option>Salario</option><option>Activos</option><option>Freelance</option><option>Renta</option><option>Inversión</option><option>Otros</option></select></div></div>'
    +'<label class="inp-label">💼 ¿A qué cuenta entra?</label>'
    +'<select class="inp" id="inCuenta_ingreso">'+cuentaOpts+'</select>'
    +'<label class="inp-label">Fecha</label><input class="inp" id="inFecha_ingreso" type="date" value="'+today()+'">'
    +'<button class="btn-main" onclick="guardarTxInline(\'ingreso\',\'ingreso\')">💾 Guardar ingreso</button>'
    +'</div>'
    +'<div class="card"><div class="card-title">Registros</div>'+items+'</div>';
}

function renderHistorial(){
  var txs = getTxs().slice().reverse();
  var filtro = window._histFiltro || 'todos';
  var txsFilt = txs.filter(function(t){
    if(filtro==='ingresos') return t.tipo==='ingreso';
    if(filtro==='gastos') return t.tipo==='gasto';
    return true;
  });
  function fmtFecha(f){
    if(!f) return '';
    var p=f.split('-');
    var meses=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return p[2]+' '+meses[parseInt(p[1])-1]+' '+p[0];
  }
  var ing = txs.filter(function(t){ return t.tipo==='ingreso'; }).reduce(function(s,t){ return s+Number(t.monto); },0);
  var gas = txs.filter(function(t){ return t.tipo==='gasto'; }).reduce(function(s,t){ return s+Number(t.monto); },0);
  var items = txsFilt.length ? txsFilt.map(function(t){
    var cuentaLabel = t.cuenta ? '<span style="font-size:0.6rem;background:rgba(45,158,95,0.12);color:var(--accent2);padding:1px 5px;border-radius:8px;margin-left:4px;">'+nombreCuenta(t.cuenta)+'</span>' : '';
    return '<div class="tx-item" style="padding:12px 0;">'
      +'<div class="tx-ico" style="font-size:1.3rem;">'+(t.tipo==='ingreso'?'💰':'💸')+'</div>'
      +'<div class="tx-info" style="flex:1;">'
      +'<div class="tx-name" style="font-size:0.88rem;font-weight:700;">'+t.desc+cuentaLabel+'</div>'
      +'<div class="tx-date" style="font-size:0.7rem;margin-top:2px;">'+fmtFecha(t.fecha)+' · '+t.cat+'</div>'
      +'</div>'
      +'<div class="tx-right" style="align-items:flex-end;gap:6px;">'
      +'<div class="tx-amt '+(t.tipo==='ingreso'?'ing':'gas')+'" style="font-size:0.95rem;">'+(t.tipo==='ingreso'?'+':'-')+fmt(t.monto)+'</div>'
      +'<div style="display:flex;gap:4px;">'
      +'<button class="ic-btn" onclick="editarTx(\"'+t.id+'\")" title="Editar">✏️</button>'
      +'<button class="ic-btn" onclick="borrarTx(\"'+t.id+'\")" title="Eliminar">🗑️</button>'
      +'</div></div></div>';
  }).join('') : '<div style="text-align:center;padding:30px;color:var(--dim);font-size:0.83rem;">Sin movimientos '+(filtro!=='todos'?'en esta categoría':'aún')+'</div>';
  function filtBtn(val, label){
    var act = filtro===val;
    return '<button onclick="window._histFiltro=\''+val+'\';goSub(\'historial\')" style="padding:7px 14px;border:none;border-radius:20px;font-family:\'Outfit\',sans-serif;font-size:0.75rem;font-weight:700;cursor:pointer;background:'+(act?'var(--accent)':'rgba(0,0,0,0.06)')+';color:'+(act?'var(--navtext)':'var(--dim)')+';">'+label+'</button>';
  }
  return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">📋 Historial</div></div>'
    +'<div class="stat-grid" style="margin-bottom:12px;">'
    +'<div class="stat-card" style="padding:12px;"><div class="stat-label" style="font-size:0.6rem;">💰 Total ingresos</div><div style="font-size:1rem;font-weight:900;color:var(--accent2);">'+fmt(ing)+'</div></div>'
    +'<div class="stat-card" style="padding:12px;"><div class="stat-label" style="font-size:0.6rem;">💸 Total gastos</div><div style="font-size:1rem;font-weight:900;color:var(--danger);">'+fmt(gas)+'</div></div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:12px;">'
    +filtBtn('todos','Todos ('+txs.length+')')
    +filtBtn('ingresos','💰 Ingresos')
    +filtBtn('gastos','💸 Gastos')
    +'</div>'
    +'<div class="card">'+items+'</div>';
}

function migrarCat(cat){
  return _CAT_MIGRA[cat] || cat;
}

function buildCuentaOpts(selVal){
  var c = getCuentas();
  var ops = '<option value="">— Sin asignar —</option>'
    +'<option value="efectivo"'+(selVal==='efectivo'?' selected':'')+'>💵 Efectivo</option>';
  (c.cheques||[]).forEach(function(ch, i){
    var val='cheque_'+i;
    ops+='<option value="'+val+'"'+(selVal===val?' selected':'')+'>🏧 '+ch.banco+' — '+ch.tipo+'</option>';
  });
  return ops;
}

function irPresupuesto(){
  var nbs=document.querySelectorAll('.nb');
  nbs.forEach(function(b){ b.classList.remove('active'); });
  if(nbs[4]) nbs[4].classList.add('active');
  S.tab='mas'; S.subtab='presupuesto';
  renderPresupuesto();
}

function irProgreso(){
  var nbs=document.querySelectorAll('.nb');
  nbs.forEach(function(b){ b.classList.remove('active'); });
  if(nbs[4]) nbs[4].classList.add('active');
  S.tab='mas'; S.subtab='progreso';
  renderProgreso();
}

function abrirTxModal(tipo){
  if(tipo === 'ingreso'){
    document.getElementById('ingresoTipoModal').classList.add('open');
    return;
  }
  if(tipo === 'gasto'){
    document.getElementById('gastoTipoModal').classList.add('open');
    return;
  }
  _abrirTxModalDirecto(tipo || 'gasto');
}

function cerrarTxModal(){ document.getElementById('txModal').classList.remove('open'); }

function carritoConfirmarFin(){
  var modal = document.getElementById('modalFinCarrito');
  var actual   = getCarritoActual();
  var comprados= actual.items.filter(function(i){ return i.comprado; });
  var total    = comprados.reduce(function(s,i){ return s+(i.precio||0)*(i.qty||1); },0);
  var regGasto = document.getElementById('finRegGasto').checked;
  var cuentaSel= document.getElementById('finCuentaGasto').value;
  var hist = getCarritoHistorial();
  var listaGuardar = JSON.parse(JSON.stringify(actual));
  listaGuardar.fechaFin = today();
  listaGuardar.totalReal = total;
  hist.unshift(listaGuardar);
  if(hist.length > 50) hist = hist.slice(0,50);
  saveCarritoHistorial(hist);
  comprados.forEach(function(i){
    if(i.precio) carritoRegistrarPrecio(i.nombre, i.precio, actual.tienda);
  });
  if(regGasto && total > 0){
    var cats = getCarritoCats();
    var cat  = cats.find(function(c){ return c.id===actual.catId; });
    var desc = (actual.nombre||'Compra') + (actual.tienda?' en '+actual.tienda:'');
    var txId = 'tx_'+Date.now();
    var tx = {
      id: txId,
      tipo: 'gasto',
      monto: total,
      cat: cat ? cat.nombre : 'Compras',
      desc: desc,
      fecha: today(),
      cuenta: cuentaSel,
      nota: comprados.length+' productos'
    };
    var txs = load('txs',[]);
    txs.push(tx);
    save('txs', txs);
    if(cuentaSel){
      aplicarMovimientoCuenta(cuentaSel, total, 'gasto', desc, today(), txId);
    }
  }
  saveCarritoActual({nombre:'',catId:'super',items:[],fecha:'',tienda:''});
  var _m = document.getElementById('modalFinCarrito'); if(_m) _m.remove();
  showToast('✅ Compra guardada'+(regGasto?' y registrada como gasto':''));
  S._carritoTab = 'historial';
  goSub('carrito');
}

