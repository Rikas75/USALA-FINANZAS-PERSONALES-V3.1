// ═════════════════════════════════════════════════════════════
//  USALA Suite — Créditos & Tarjetas de Crédito
//  js/creditos-tarjetas.js
//  Módulo completo: TC, Deudas, Préstamos, CxC
// ═════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────
//  TARJETAS DE CRÉDITO
// ──────────────────────────────────────────────────────────────

function renderTarjetasCredito(){
  var c=getCuentas(); var tcs=c.tarjetas||[];
  var txs=getTxs();
  var items=tcs.map(function(t,i){
    var pct=t.limite>0?Math.min(100,Math.round((t.balance/t.limite)*100)):0;
    var disp=Math.max(0,(t.limite||0)-(t.balance||0));
    var color=pct>=90?'var(--danger)':pct>=70?'#f57c00':'var(--accent)';
    var hoy=new Date(); var diasCorte='';
    var saldoAutoCorte = 0;
    if(t.fechaCorte){
      var fc=new Date(t.fechaCorte.split('-').join('/'));
      var diff=Math.ceil((fc-hoy)/(1000*60*60*24));
      diasCorte=diff>0?diff+' días para corte':'Cortó hace '+Math.abs(diff)+' días';
      var fcPrev = new Date(fc);
      fcPrev.setMonth(fcPrev.getMonth()-1);
      txs.forEach(function(tx){
        if(tx.cuenta==='tc_'+i && tx.tipo==='gasto'){
          var txDate = new Date(tx.fecha.split('-').join('/'));
          if(txDate >= fcPrev && txDate <= fc){
            saldoAutoCorte += Number(tx.monto);
          }
        }
      });
    } else {
      txs.forEach(function(tx){
        if(tx.cuenta==='tc_'+i && tx.tipo==='gasto'){
          saldoAutoCorte += Number(tx.monto);
        }
      });
    }
    return '<div class="cred-item">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
      +'<div style="width:42px;height:28px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#fff;font-weight:800;">'+t.banco.substring(0,4).toUpperCase()+'</div>'
      +'<div style="flex:1;"><div style="font-weight:800;font-size:0.9rem;">'+t.banco+'</div>'
      +'<div style="font-size:0.68rem;color:var(--dim);">'+t.tipo+(t.ultimos?' · ***'+t.ultimos:'')+'</div></div>'
      +'<span class="cred-badge '+(t.pagoPendiente?'badge-vencido':'badge-pagado')+'">'+(t.pagoPendiente?'⚠ Pago pend.':'✅ Al corriente')+'</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
      +'<div style="background:var(--inp);border-radius:10px;padding:10px;">'
      +'<div style="font-size:0.6rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.05em;">Saldo usado</div>'
      +'<div style="font-size:1rem;font-weight:900;color:var(--danger);">'+fmt(t.balance||0)+'</div></div>'
      +'<div style="background:var(--inp);border-radius:10px;padding:10px;">'
      +'<div style="font-size:0.6rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.05em;">Disponible</div>'
      +'<div style="font-size:1rem;font-weight:900;color:var(--accent);">'+fmt(disp)+'</div></div>'
      +'<div style="background:var(--inp);border-radius:10px;padding:10px;">'
      +'<div style="font-size:0.6rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.05em;">Límite</div>'
      +'<div style="font-size:1rem;font-weight:900;">'+fmt(t.limite||0)+'</div></div>'
      +'<div style="background:var(--inp);border-radius:10px;padding:10px;">'
      +'<div style="font-size:0.6rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.05em;">Corte</div>'
      +'<div style="font-size:0.78rem;font-weight:700;color:var(--dim);">'+(diasCorte||'—')+'</div></div>'
      +'</div>'
      +'<div style="margin-bottom:8px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--dim);margin-bottom:4px;">'
      +'<span>Uso de crédito</span><span style="color:'+color+';">'+pct+'%</span></div>'
      +'<div style="height:6px;background:var(--inp);border-radius:3px;overflow:hidden;">'
      +'<div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:3px;transition:width 0.5s ease;"></div></div>'
      +'</div>'
      +(saldoAutoCorte>0?'<div style="font-size:0.72rem;color:var(--dim);margin-bottom:8px;">📊 Gasto en período actual: <b style="color:var(--danger);">'+fmt(saldoAutoCorte)+'</b></div>':'')
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;">'
      +'<button class="cred-btn success" onclick="registrarPagoTC('+i+')">💳 Pagar</button>'
      +'<button class="cred-btn" onclick="abrirDetalleTC('+i+')" style="background:rgba(56,170,255,0.1);color:var(--blue);border-color:rgba(56,170,255,0.3);">📋 Detalle</button>'
      +'<button class="cred-btn" onclick="editarTC('+i+')">✏️</button>'
      +'<button class="cred-btn danger" onclick="borrarTC('+i+')">🗑️</button>'
      +'</div>'
      +'</div>';
  }).join('');

  var totalDeuda = tcs.reduce(function(s,t){ return s+(t.balance||0); },0);
  var totalLimite= tcs.reduce(function(s,t){ return s+(t.limite||0); },0);
  var totalDisp  = Math.max(0, totalLimite - totalDeuda);

  var html = '<div class="page-header">'+backSubBtn()+'<div class="page-title">💳 Tarjetas de Crédito</div></div>';

  if(tcs.length>0){
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">'
      +'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">'
      +'<div style="font-size:0.58rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Deuda total</div>'
      +'<div style="font-size:0.95rem;font-weight:900;color:var(--danger);">'+fmt(totalDeuda)+'</div></div>'
      +'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">'
      +'<div style="font-size:0.58rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Disponible</div>'
      +'<div style="font-size:0.95rem;font-weight:900;color:var(--accent);">'+fmt(totalDisp)+'</div></div>'
      +'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">'
      +'<div style="font-size:0.58rem;font-weight:700;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Límite total</div>'
      +'<div style="font-size:0.95rem;font-weight:900;">'+fmt(totalLimite)+'</div></div>'
      +'</div>';
  }

  html += '<button class="btn-main" style="margin-bottom:16px;" onclick="goSub(\'nueva_tarjeta\')">+ Nueva tarjeta</button>';
  html += items || '<div style="text-align:center;padding:40px 20px;color:var(--dim);">'+
    '<div style="font-size:3rem;margin-bottom:12px;">💳</div>'+
    '<div style="font-size:0.85rem;">Sin tarjetas registradas</div>'+
    '<div style="font-size:0.75rem;margin-top:4px;opacity:0.6;">Agrega tu primera tarjeta de crédito</div></div>';

  document.getElementById('mainContent').innerHTML = html;
}

function renderFormTC(data){
  var d=data||{}; var titulo=d.banco?'Editar tarjeta':'Nueva Tarjeta';
  return '<div class="page-header">'+backBtn('cuentas',1)+'<div class="page-title">💳 '+titulo+'</div></div>'
    +'<div class="card">'
    +'<label class="inp-label">Banco / Emisor</label>'
    +'<input class="inp" id="tcBanco" placeholder="Ej: BBVA, Santander, Citibanamex..." value="'+(d.banco||'')+'">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Tipo</label>'
    +'<select class="inp" id="tcTipo">'
    +'<option'+(d.tipo==='Visa'?' selected':'')+'>Visa</option>'
    +'<option'+(d.tipo==='Mastercard'?' selected':'')+'>Mastercard</option>'
    +'<option'+(d.tipo==='Amex'?' selected':'')+'>Amex</option>'
    +'<option'+(d.tipo==='Otro'?' selected':'')+'>Otro</option>'
    +'</select></div>'
    +'<div><label class="inp-label">Últimos 4 dígitos</label>'
    +'<input class="inp" id="tcUltimos" placeholder="1234" maxlength="4" inputmode="numeric" value="'+(d.ultimos||'')+'">'
    +'</div></div>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Límite de crédito ($)</label>'
    +'<input class="inp" id="tcLimite" type="number" inputmode="decimal" placeholder="0.00" value="'+(d.limite||'')+'"></div>'
    +'<div><label class="inp-label">Saldo usado ($)</label>'
    +'<input class="inp" id="tcBalance" type="number" inputmode="decimal" placeholder="0.00" value="'+(d.balance||'')+'"></div>'
    +'</div>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Interés anual (%)</label>'
    +'<input class="inp" id="tcInteres" type="number" inputmode="decimal" placeholder="Ej: 36" value="'+(d.interes||'')+'"></div>'
    +'<div><label class="inp-label">Día de pago</label>'
    +'<input class="inp" id="tcDiaPago" type="number" inputmode="numeric" placeholder="Ej: 15" min="1" max="31" value="'+(d.diaPago||'')+'"></div>'
    +'</div>'
    +'<label class="inp-label">Fecha de corte</label>'
    +'<input class="inp" id="tcFechaCorte" type="date" value="'+(d.fechaCorte||'')+'">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Pago mínimo ($)</label>'
    +'<input class="inp" id="tcPagoMin" type="number" inputmode="decimal" placeholder="0.00" value="'+(d.pagoMinimo||'')+'"></div>'
    +'<div><label class="inp-label">Pago total ($)</label>'
    +'<input class="inp" id="tcPagoTotal" type="number" inputmode="decimal" placeholder="0.00" value="'+(d.pagoTotal||'')+'"></div>'
    +'</div>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Saldo al corte ($)</label>'
    +'<input class="inp" id="tcSaldoCorte" type="number" inputmode="decimal" placeholder="0.00" value="'+(d.saldoCorte||'')+'"></div>'
    +'<div style="display:flex;align-items:flex-end;padding-bottom:4px;">'
    +'<label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--txt);cursor:pointer;">'
    +'<input type="checkbox" id="tcPagoPend" '+(d.pagoPendiente?'checked':'')+' style="width:16px;height:16px;accent-color:var(--accent);"> Pago pendiente'
    +'</label></div>'
    +'</div>'
    +'<button class="btn-main" onclick="guardarTC()">💾 Guardar</button>'
    +'<button class="btn-sec" onclick="goSub(\'tarjetas_credito\')">Cancelar</button>'
    +'</div>';
}

function guardarTC(){
  var banco=document.getElementById('tcBanco').value.trim();
  if(!banco){ showToast('⚠ Escribe el banco'); return; }
  var tc={
    banco:banco,
    tipo:document.getElementById('tcTipo').value,
    ultimos:document.getElementById('tcUltimos').value.trim(),
    limite:parseFloat(document.getElementById('tcLimite').value)||0,
    balance:parseFloat(document.getElementById('tcBalance').value)||0,
    interes:parseFloat(document.getElementById('tcInteres').value)||0,
    diaPago:document.getElementById('tcDiaPago').value,
    fechaCorte:document.getElementById('tcFechaCorte').value,
    pagoMinimo:parseFloat(document.getElementById('tcPagoMin').value)||0,
    pagoTotal:parseFloat(document.getElementById('tcPagoTotal').value)||0,
    saldoCorte:parseFloat(document.getElementById('tcSaldoCorte').value)||0,
    pagoPendiente:document.getElementById('tcPagoPend').checked
  };
  var c=getCuentas(); c.tarjetas=c.tarjetas||[];
  if(_editTCIdx!==null){ c.tarjetas[_editTCIdx]=tc; _editTCIdx=null; showToast('Tarjeta actualizada'); }
  else { c.tarjetas.push(tc); showToast('Tarjeta registrada'); }
  saveCuentas(c); goSub('tarjetas_credito');
}

function editarTC(i){
  var c=getCuentas(); _editTCIdx=i;
  document.getElementById('mainContent').innerHTML=renderFormTC(c.tarjetas[i]);
}

function borrarTC(i){
  var c=getCuentas(); c.tarjetas=c.tarjetas||[];
  var eli=c.tarjetas[i];
  usalaConfirm('Eliminar tarjeta '+eli.banco+'?', function(){
    c.tarjetas.splice(i,1); saveCuentas(c);
    showToast('Tarjeta eliminada');
    goSub('tarjetas_credito');
  });
}

// ── Registrar pago de TC ──────────────────────────
function registrarPagoTC(i){
  var c=getCuentas(); var tcs=c.tarjetas||[]; var t=tcs[i];
  if(!t){ showToast('Tarjeta no encontrada'); return; }

  // Crear modal de pago
  var m = document.createElement('div');
  m.className='modal open'; m.id='pagoTCModal';
  m.innerHTML='<div class="modal-body">'
    +'<div class="modal-title">💳 Pagar '+t.banco+'</div>'
    +'<div style="background:var(--inp);border-radius:12px;padding:12px;margin-bottom:14px;">'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:4px;">'
    +'<span style="font-size:0.75rem;color:var(--dim);">Saldo actual</span>'
    +'<span style="font-size:0.9rem;font-weight:900;color:var(--danger);">'+fmt(t.balance||0)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;">'
    +'<span style="font-size:0.75rem;color:var(--dim);">Pago mínimo</span>'
    +'<span style="font-size:0.8rem;font-weight:700;color:var(--accent);">'+fmt(t.pagoMinimo||0)+'</span></div>'
    +'</div>'
    +'<label class="inp-label">Monto del pago ($)</label>'
    +'<input class="inp" id="pagoTCMonto" type="number" inputmode="decimal" placeholder="0.00" '
    +'value="'+(t.pagoMinimo||'')+'"><br>'
    +'<label class="inp-label">¿De qué cuenta?</label>'
    +buildCuentaOpts('pagoTCCuenta')
    +'<div style="display:flex;gap:8px;margin-top:12px;">'
    +'<button class="btn-main" style="flex:1;" onclick="_confirmarPagoTC('+i+')">Registrar pago</button>'
    +'<button class="btn-sec" onclick="document.getElementById(\'pagoTCModal\').remove()">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
}

function _confirmarPagoTC(i){
  var monto = parseFloat(document.getElementById('pagoTCMonto').value)||0;
  var cuenta = document.getElementById('pagoTCCuenta').value;
  if(!monto||monto<=0){ showToast('Ingresa el monto'); return; }

  var c=getCuentas(); var t=c.tarjetas[i];
  if(!t){ showToast('Tarjeta no encontrada'); return; }

  // Reducir saldo de TC
  var saldoAnterior = t.balance||0;
  t.balance = Math.max(0, saldoAnterior - monto);
  t.pagoPendiente = t.balance > 0;
  c.tarjetas[i] = t;
  saveCuentas(c);

  // Registrar como gasto en la cuenta de origen
  if(cuenta && cuenta !== 'ninguna'){
    aplicarMovimientoCuenta(cuenta, monto, 'gasto', 'Pago tarjeta '+t.banco, today(), Date.now());
  }

  // Registrar transacción
  var txs = getTxs();
  txs.push({
    id: Date.now(), tipo:'gasto', desc:'Pago TC '+t.banco,
    monto:monto, fecha:today(), cat:'Tarjeta de crédito',
    cuenta:cuenta||'efectivo', nota:'Pago tarjeta'
  });
  save('txs', txs);

  document.getElementById('pagoTCModal').remove();
  showToast('Pago registrado: '+fmt(monto));
  goSub('tarjetas_credito');
}

// ── Detalle de TC (movimientos) ───────────────────
function abrirDetalleTC(i){
  var c=getCuentas(); var t=(c.tarjetas||[])[i];
  if(!t){ showToast('Tarjeta no encontrada'); return; }

  var txs = getTxs().filter(function(tx){ return tx.cuenta==='tc_'+i; });
  txs.sort(function(a,b){ return b.fecha.localeCompare(a.fecha); });

  var mc = document.getElementById('mainContent');
  var pct = t.limite>0 ? Math.min(100, Math.round((t.balance/t.limite)*100)) : 0;
  var color = pct>=90?'var(--danger)':pct>=70?'#f57c00':'var(--accent)';

  var html = '<div class="page-header">'+backSubBtn()+'<div class="page-title">💳 '+t.banco+'</div></div>'
    // Resumen
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">'
    +'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;">'
    +'<div style="font-size:0.6rem;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:4px;">Saldo usado</div>'
    +'<div style="font-size:1.2rem;font-weight:900;color:var(--danger);">'+fmt(t.balance||0)+'</div>'
    +'<div style="font-size:0.68rem;color:var(--dim);margin-top:2px;">de '+fmt(t.limite||0)+' de límite</div>'
    +'</div>'
    +'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;">'
    +'<div style="font-size:0.6rem;font-weight:700;color:var(--dim);text-transform:uppercase;margin-bottom:4px;">Disponible</div>'
    +'<div style="font-size:1.2rem;font-weight:900;color:var(--accent);">'+fmt(Math.max(0,(t.limite||0)-(t.balance||0)))+'</div>'
    +'<div style="font-size:0.68rem;color:var(--dim);margin-top:2px;">'+pct+'% usado</div>'
    +'</div></div>'
    // Barra de uso
    +'<div style="margin-bottom:16px;">'
    +'<div style="height:8px;background:var(--inp);border-radius:4px;overflow:hidden;">'
    +'<div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:4px;transition:width 0.5s;"></div></div>'
    +'</div>'
    // Detalles
    +(t.fechaCorte?'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:12px;font-size:0.78rem;display:flex;justify-content:space-between;align-items:center;">'
    +'<span style="color:var(--dim);">📅 Fecha de corte</span><b>'+t.fechaCorte+'</b></div>':'')
    +(t.diaPago?'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:12px;font-size:0.78rem;display:flex;justify-content:space-between;align-items:center;">'
    +'<span style="color:var(--dim);">💳 Día de pago</span><b>Día '+t.diaPago+' de cada mes</b></div>':'')
    +(t.interes?'<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:16px;font-size:0.78rem;display:flex;justify-content:space-between;align-items:center;">'
    +'<span style="color:var(--dim);">% Interés anual</span><b>'+t.interes+'%</b></div>':'')
    // Botones
    +'<div style="display:flex;gap:8px;margin-bottom:16px;">'
    +'<button class="btn-main" style="flex:1;" onclick="registrarPagoTC('+i+')">💳 Registrar pago</button>'
    +'<button class="btn-sec" onclick="editarTC('+i+')">✏️ Editar</button>'
    +'</div>'
    // Movimientos
    +'<div style="font-size:0.75rem;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Movimientos ('+txs.length+')</div>';

  if(txs.length===0){
    html += '<div style="text-align:center;padding:24px;color:var(--dim);font-size:0.8rem;">Sin movimientos registrados en esta tarjeta</div>';
  } else {
    txs.forEach(function(tx){
      html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">'
        +'<div><div style="font-size:0.82rem;font-weight:700;">'+tx.desc+'</div>'
        +'<div style="font-size:0.68rem;color:var(--dim);">'+tx.fecha+(tx.cat?' · '+tx.cat:'')+'</div></div>'
        +'<div style="font-size:0.95rem;font-weight:900;color:'+(tx.tipo==='ingreso'?'var(--accent)':'var(--danger)')+';">'
        +(tx.tipo==='ingreso'?'+':'-')+fmt(tx.monto)+'</div>'
        +'</div>';
    });
  }

  mc.innerHTML = html;
}

// ── Compras con TC (toggle + guardar) ────────────
function toggleFormCompraTC(i){
  var id='compraTC_'+i;
  var el=document.getElementById(id);
  if(el){ el.style.display=el.style.display==='none'?'block':'none'; return; }
  var div=document.createElement('div'); div.id=id;
  div.style.cssText='margin-top:8px;padding:12px;background:var(--inp);border-radius:12px;';
  div.innerHTML='<label class="inp-label">Descripción</label>'
    +'<input class="inp" id="compraDesc_'+i+'" placeholder="¿Qué compraste?">'
    +'<div class="form-row"><div>'
    +'<label class="inp-label">Monto ($)</label>'
    +'<input class="inp" id="compraMonto_'+i+'" type="number" inputmode="decimal" placeholder="0.00">'
    +'</div><div>'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="compraFecha_'+i+'" type="date" value="'+today()+'">'
    +'</div></div>'
    +'<label class="inp-label">Categoría</label>'
    +'<select class="inp" id="compraCat_'+i+'">'
    +'<option>Supermercado</option><option>Restaurante</option>'
    +'<option>Gasolina</option><option>Ropa</option>'
    +'<option>Salud</option><option>Entretenimiento</option>'
    +'<option>Servicios</option><option>Otro</option></select>'
    +'<button class="btn-main" onclick="guardarCompraTC('+i+')" style="margin-top:8px;">Guardar compra</button>';
  var parent=document.querySelector('[data-tc-idx="'+i+'"]');
  if(parent) parent.after(div);
  else document.getElementById('mainContent').appendChild(div);
}

function guardarCompraTC(i){
  var desc=(document.getElementById('compraDesc_'+i).value||'').trim();
  var monto=parseFloat(document.getElementById('compraMonto_'+i).value)||0;
  var fecha=document.getElementById('compraFecha_'+i).value||today();
  var cat=document.getElementById('compraCat_'+i).value||'Otro';
  if(!desc||!monto){ showToast('Completa descripción y monto'); return; }
  var c=getCuentas(); c.tarjetas=c.tarjetas||[];
  if(!c.tarjetas[i]){ showToast('Tarjeta no encontrada'); return; }
  c.tarjetas[i].balance=(c.tarjetas[i].balance||0)+monto;
  saveCuentas(c);
  var txs=getTxs();
  txs.push({id:Date.now(),tipo:'gasto',desc:desc,monto:monto,
    fecha:fecha,cat:cat,cuenta:'tc_'+i,nota:'Compra con tarjeta '+c.tarjetas[i].banco});
  save('txs',txs);
  showToast('Compra registrada: '+fmt(monto));
  goSub('tarjetas_credito');
}

// ──────────────────────────────────────────────────────────────
//  CRÉDITOS — Lo que debo / Lo que me deben
// ──────────────────────────────────────────────────────────────

function renderCreditos(){
  var mc=document.getElementById('mainContent');
  var creds=load('creditos',[]);
  var deudas   = creds.filter(function(c){ return c.tipo==='deuda'; });
  var prestamos= creds.filter(function(c){ return c.tipo==='prestamo'; });
  var totalDebo  = deudas.reduce(function(s,c){ return s+(c.monto-(c.abonado||0)); },0);
  var totalCobro = prestamos.reduce(function(s,c){ return s+(c.monto-(c.abonado||0)); },0);

  mc.innerHTML = '<div class="page-header">'+backBtn('creditos',2)+'<div class="page-title">🤝 Créditos</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">'
    +'<div class="cred-item" style="cursor:pointer;border:1.5px solid rgba(229,57,53,0.3);" onclick="goSub(\'creditos_debo\')">'
    +'<div style="font-size:1.5rem;margin-bottom:6px;">📤</div>'
    +'<div style="font-size:0.78rem;font-weight:800;color:var(--txt);">Lo que debo</div>'
    +'<div style="font-size:1.1rem;font-weight:900;color:var(--danger);margin-top:4px;">'+fmt(totalDebo)+'</div>'
    +'<div style="font-size:0.65rem;color:var(--dim);margin-top:2px;">'+deudas.length+' crédito'+(deudas.length!==1?'s':'')+'</div>'
    +'</div>'
    +'<div class="cred-item" style="cursor:pointer;border:1.5px solid rgba(43,192,112,0.3);" onclick="goSub(\'creditos_cobrar\')">'
    +'<div style="font-size:1.5rem;margin-bottom:6px;">📥</div>'
    +'<div style="font-size:0.78rem;font-weight:800;color:var(--txt);">Me deben</div>'
    +'<div style="font-size:1.1rem;font-weight:900;color:var(--accent);margin-top:4px;">'+fmt(totalCobro)+'</div>'
    +'<div style="font-size:0.65rem;color:var(--dim);margin-top:2px;">'+prestamos.length+' préstamo'+(prestamos.length!==1?'s':'')+'</div>'
    +'</div></div>'
    +'<div style="display:flex;gap:8px;margin-bottom:16px;">'
    +'<button class="btn-main" style="flex:1;" onclick="goSub(\'creditos_debo\')">📤 Mis deudas</button>'
    +'<button class="btn-main" style="flex:1;background:rgba(43,192,112,0.15);border:1px solid rgba(43,192,112,0.3);color:var(--accent);" onclick="goSub(\'creditos_cobrar\')">📥 Me deben</button>'
    +'</div>'
    +'<button class="btn-sec" style="width:100%;margin-bottom:12px;" onclick="goSub(\'cxc\')">📋 Cuentas por cobrar (CxC)</button>';
}

function renderCreditosDebo(){
  var mc=document.getElementById('mainContent');
  mc.innerHTML='<div class="page-header">'+backSubBtn()+'<div class="page-title">📤 Mis Deudas</div></div>';
  var bNew=document.createElement('button');
  bNew.className='btn-main';
  bNew.style.cssText='width:100%;margin-bottom:14px;';
  bNew.textContent='+ Nueva deuda';
  bNew.onclick=function(){ goSub('nueva_deuda'); };
  mc.appendChild(bNew);
  renderListaCreds('deuda');
}

function renderCreditosCobrar(){
  var mc=document.getElementById('mainContent');
  mc.innerHTML='<div class="page-header">'+backSubBtn()+'<div class="page-title">📥 Me deben</div></div>';
  var bNew=document.createElement('button');
  bNew.className='btn-main';
  bNew.style.cssText='width:100%;margin-bottom:14px;background:rgba(43,192,112,0.15);border:1px solid rgba(43,192,112,0.3);color:var(--accent);';
  bNew.textContent='+ Nuevo préstamo que hice';
  bNew.onclick=function(){ goSub('nuevo_prestamo'); };
  mc.appendChild(bNew);
  renderListaCreds('prestamo');
}

function renderListaCreds(tipo){
  var allCreds=load('creditos',[]);
  var creds=allCreds.filter(function(c){ return c.tipo===tipo; });
  var mc=document.getElementById('mainContent');
  if(!creds.length){
    var emptyDiv=document.createElement('div');
    emptyDiv.style.cssText='text-align:center;padding:40px 20px;color:var(--dim);';
    emptyDiv.innerHTML='<div style="font-size:3rem;margin-bottom:12px;">'+(tipo==='deuda'?'📤':'📥')+'</div>'
      +'<div style="font-size:0.85rem;">Sin registros</div>';
    mc.appendChild(emptyDiv);
    return;
  }
  var fragment=document.createDocumentFragment();
  creds.forEach(function(c,i){
    var ri=allCreds.indexOf(c);
    var pct=c.monto>0?Math.min(100,Math.round(((c.abonado||0)/c.monto)*100)):0;
    var hoy=new Date();
    var fv=c.fechaLimite?(function(){ var p=c.fechaLimite.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); })():null;
    var venc=fv&&fv<hoy&&c.estado!=='pagado';
    var div=document.createElement('div');
    div.className='cred-item';
    var badgeTxt=c.estado==='pagado'?'✅ Pagado':venc?'🔴 Vencido':'⏳ Pendiente';
    var badgeCls=c.estado==='pagado'?'badge-pagado':venc?'badge-vencido':'badge-pend';
    var _tiLabel=c.tipoInteres==='mensual'?'📅 mensual':c.tipoInteres==='anual'?'📆 anual':'📦 total';
    var descExtra=(c.interes?' · '+c.interes+'% ('+_tiLabel+')':'')
      +(c.fechaOrigen?' · Otorgado: '+c.fechaOrigen:'')
      +(c.fechaLimite?' · Vence: '+c.fechaLimite:'');
    var totalIntPag=c.interesesPagados||0;
    var totalCap=c.abonado||0;
    var resumenExtra='';
    if(totalIntPag>0){
      resumenExtra='<span style="font-size:0.73rem;background:#fff3e0;border-radius:6px;padding:3px 8px;color:#e07b00;">Intereses: <b>'+fmt(totalIntPag)+'</b></span>';
    } else if(c.interes>0){
      resumenExtra='<span style="font-size:0.73rem;background:var(--inp);border-radius:6px;padding:3px 8px;color:var(--dim);">Sin int. pagados</span>';
    }
    var histId='hist_'+tipo+'_'+i;
    var histDiv=null;
    if(c.historialAbonos&&c.historialAbonos.length){
      var totCapH=c.historialAbonos.reduce(function(s,a){ return s+(a.monto||0); },0);
      var totIntH=c.historialAbonos.reduce(function(s,a){ return s+(a.interes||0); },0);
      histDiv=document.createElement('div');
      histDiv.id=histId;
      histDiv.style.cssText='display:none;margin-top:8px;background:var(--inp);border-radius:10px;padding:8px 12px;';
      var tit=document.createElement('div');
      tit.style.cssText='font-size:0.72rem;font-weight:800;color:var(--dim);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em;';
      tit.textContent='Historial de abonos';
      histDiv.appendChild(tit);
      var idxsRev=c.historialAbonos.map(function(_,x){ return x; }).reverse();
      idxsRev.forEach(function(ai){
        var a=c.historialAbonos[ai];
        var fila=document.createElement('div');
        fila.style.cssText='padding:6px 0;border-bottom:1px solid var(--border);font-size:0.76rem;';
        var row=document.createElement('div');
        row.style.cssText='display:flex;justify-content:space-between;align-items:center;';
        var fechaSpan=document.createElement('span');
        fechaSpan.style.color='var(--dim)';
        fechaSpan.textContent=a.fecha;
        var rightSpan=document.createElement('span');
        rightSpan.style.cssText='display:flex;align-items:center;gap:6px;';
        if(a.monto>0){
          var ms=document.createElement('span');
          ms.style.cssText='font-weight:700;color:var(--accent);';
          ms.textContent=fmt(a.monto);
          rightSpan.appendChild(ms);
        }
        if(a.interes>0){
          var is=document.createElement('span');
          is.style.cssText='color:#e07b00;font-size:0.7rem;';
          is.textContent='+'+fmt(a.interes)+' int.';
          rightSpan.appendChild(is);
        }
        var bEditA=document.createElement('button');
        bEditA.style.cssText='background:none;border:1px solid var(--border);border-radius:6px;padding:2px 7px;font-size:0.7rem;cursor:pointer;color:var(--accent);';
        bEditA.textContent='✏️';
        (function(ri_,ai_,tipo_){ bEditA.onclick=function(e){ e.stopPropagation(); editarAbono(ri_,ai_,tipo_); }; })(ri,ai,tipo);
        rightSpan.appendChild(bEditA);
        var bDelA=document.createElement('button');
        bDelA.style.cssText='background:none;border:1px solid rgba(229,57,53,0.35);border-radius:6px;padding:2px 7px;font-size:0.7rem;cursor:pointer;color:var(--danger);';
        bDelA.textContent='🗑';
        (function(ri_,ai_,tipo_){ bDelA.onclick=function(e){ e.stopPropagation(); eliminarAbono(ri_,ai_,tipo_); }; })(ri,ai,tipo);
        rightSpan.appendChild(bDelA);
        row.appendChild(fechaSpan); row.appendChild(rightSpan);
        fila.appendChild(row);
        if(a.nota){
          var notaDiv=document.createElement('div');
          notaDiv.style.cssText='font-size:0.72rem;color:var(--dim);margin-top:2px;font-style:italic;';
          notaDiv.textContent='📝 '+a.nota;
          fila.appendChild(notaDiv);
        }
        histDiv.appendChild(fila);
      });
      var pie=document.createElement('div');
      pie.style.cssText='display:flex;justify-content:space-between;padding:6px 0 2px;font-size:0.74rem;font-weight:800;border-top:1.5px solid var(--border);margin-top:4px;';
      pie.innerHTML='<span>Total</span><span>Capital: '+fmt(totCapH)+(totIntH>0?' + Int: '+fmt(totIntH):'')+'</span>';
      histDiv.appendChild(pie);
    }
    var pendiente=c.monto-(c.abonado||0);
    div.innerHTML=
      '<div class="cred-top"><div>'
        +'<div class="cred-persona">'+c.persona+'</div>'
        +'<div class="cred-desc">'+c.descripcion+descExtra+'</div>'
      +'</div><span class="cred-badge '+badgeCls+'">'+badgeTxt+'</span></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">'
        +'<span style="font-size:0.73rem;background:var(--inp);border-radius:6px;padding:3px 8px;">Capital: <b>'+fmt(totalCap)+'</b> / '+fmt(c.monto)+'</span>'
        +'<span style="font-size:0.73rem;background:var(--inp);border-radius:6px;padding:3px 8px;">Pendiente: <b style="color:'+(tipo==='deuda'?'var(--danger)':'var(--accent)')+'">'+fmt(pendiente)+'</b></span>'
        +resumenExtra
      +'</div>'
      +'<div class="prog-wrap"><div class="prog-bar" style="width:'+pct+'%;'+(pct>=100?'background:#2d9e5f;':'')+'" ></div></div>'
      +'<div class="cred-btns" id="btns_'+tipo+'_'+i+'"></div>';
    if(histDiv) div.appendChild(histDiv);
    var btnsDiv=div.querySelector('#btns_'+tipo+'_'+i);
    if(c.estado!=='pagado'){
      var bAbonar=document.createElement('button');
      bAbonar.className='cred-btn success'; bAbonar.textContent='+ Abonar';
      (function(ri_,tipo_){ bAbonar.onclick=function(){ abonarCred(ri_,tipo_); }; })(ri,tipo);
      btnsDiv.appendChild(bAbonar);
      var bPagar=document.createElement('button');
      bPagar.className='cred-btn success'; bPagar.style.cssText='background:rgba(45,158,95,0.15);color:#2d9e5f;';
      bPagar.textContent='✅ Liquidar';
      (function(i_,tipo_){ bPagar.onclick=function(){ pagarCred(i_,tipo_); }; })(i,tipo);
      btnsDiv.appendChild(bPagar);
    }
    if(c.historialAbonos&&c.historialAbonos.length){
      var bHist=document.createElement('button');
      bHist.className='cred-btn';
      bHist.style.cssText='color:#fff;background:var(--accent);border-color:var(--accent);';
      bHist.innerHTML='📋 <b>'+c.historialAbonos.length+'</b>';
      (function(hid){ bHist.onclick=function(){
        var h=document.getElementById(hid);
        if(h) h.style.display=h.style.display==='none'?'block':'none';
      }; })(histId);
      btnsDiv.appendChild(bHist);
    }
    var bEdit=document.createElement('button');
    bEdit.className='cred-btn'; bEdit.textContent='✏️';
    (function(i_,tipo_){ bEdit.onclick=function(){ editarCred(i_,tipo_); }; })(i,tipo);
    btnsDiv.appendChild(bEdit);
    var bDel=document.createElement('button');
    bDel.className='cred-btn danger'; bDel.textContent='🗑️';
    (function(i_,tipo_){ bDel.onclick=function(){ borrarCred(i_,tipo_); }; })(i,tipo);
    btnsDiv.appendChild(bDel);
    fragment.appendChild(div);
  });
  mc.appendChild(fragment);
}

function renderFormCredito(tipo,data){
  var esD=tipo==='deuda';
  var d=data||{};
  var titulo=(d.persona?'Editar':'Nuevo')+(esD?' · Deuda':' · Préstamo');
  return '<div class="page-header">'+backSubBtn()+'<div class="page-title">'+(esD?'📤':'📥')+' '+titulo+'</div></div>'
    +'<div class="card">'
    +'<label class="inp-label">'+(esD?'¿A quién le debo?':'¿Quién me debe?')+'</label>'
    +'<input class="inp" id="crPersona" placeholder="Nombre" value="'+(d.persona||'')+'">'
    +'<label class="inp-label">Descripción / Concepto</label>'
    +'<input class="inp" id="crDesc" placeholder="Ej: Préstamo para auto" value="'+(d.descripcion||'')+'">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Monto ($)</label>'
    +'<input class="inp" id="crMonto" type="number" inputmode="decimal" placeholder="0.00" value="'+(d.monto||'')+'"></div>'
    +'<div><label class="inp-label">Interés (%)</label>'
    +'<input class="inp" id="crInteres" type="number" inputmode="decimal" placeholder="0" value="'+(d.interes||'')+'"></div>'
    +'</div>'
    +'<label class="inp-label">Tipo de interés</label>'
    +'<select class="inp" id="crTipoInteres">'
    +'<option value="total"'+(d.tipoInteres==='total'?' selected':'')+'>📦 Total (aplica una vez)</option>'
    +'<option value="mensual"'+(d.tipoInteres==='mensual'?' selected':'')+'>📅 Mensual</option>'
    +'<option value="anual"'+(d.tipoInteres==='anual'?' selected':'')+'>📆 Anual</option>'
    +'</select>'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Fecha otorgado</label>'
    +'<input class="inp" id="crFecha" type="date" value="'+(d.fechaOrigen||today())+'"></div>'
    +'<div><label class="inp-label">Fecha límite</label>'
    +'<input class="inp" id="crVencimiento" type="date" value="'+(d.fechaLimite||'')+'"></div>'
    +'</div>'
    +'<button class="btn-main" onclick="guardarCred(\''+tipo+'\')">💾 Guardar</button>'
    +'<button class="btn-sec" onclick="goSub(\''+(esD?'creditos_debo':'creditos_cobrar')+'\')">Cancelar</button>'
    +'</div>';
}

function guardarCred(tipo){
  var persona=document.getElementById('crPersona').value.trim();
  var desc=document.getElementById('crDesc').value.trim();
  var monto=parseFloat(document.getElementById('crMonto').value);
  var interes=parseFloat(document.getElementById('crInteres').value)||0;
  var tipoInteres=document.getElementById('crTipoInteres').value;
  var fecha=document.getElementById('crFecha').value;
  var vencimiento=document.getElementById('crVencimiento').value;
  if(!persona||!desc||!monto){ showToast('Completa persona, descripción y monto'); return; }
  var creds=load('creditos',[]);
  var item={
    tipo:tipo, persona:persona, descripcion:desc, monto:monto,
    interes:interes, tipoInteres:tipoInteres,
    fechaOrigen:fecha, fechaLimite:vencimiento,
    estado:'pendiente', abonado:0, interesesPagados:0, historialAbonos:[]
  };
  if(S.editCrediIdx!==null){
    var all=creds.filter(function(c){ return c.tipo===tipo; });
    var existing=all[S.editCrediIdx];
    var ri=creds.indexOf(existing);
    item.abonado=existing.abonado||0;
    item.interesesPagados=existing.interesesPagados||0;
    item.historialAbonos=existing.historialAbonos||[];
    item.estado=existing.estado||'pendiente';
    creds[ri]=item;
    S.editCrediIdx=null; S.editCrediTipo=null;
    showToast('Crédito actualizado');
  } else {
    creds.push(item);
    showToast('Crédito registrado');
  }
  save('creditos',creds);
  goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
}

function pagarCred(i,tipo){
  var creds=load('creditos',[]);
  var all=creds.filter(function(c){ return c.tipo===tipo; });
  var item=all[i]; var ri=creds.indexOf(item);
  creds[ri].estado='pagado'; creds[ri].abonado=creds[ri].monto;
  save('creditos',creds); showToast('Marcado como pagado');
  goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
}

function editarCred(i,tipo){
  var creds=load('creditos',[]).filter(function(c){ return c.tipo===tipo; });
  S.editCrediIdx=i; S.editCrediTipo=tipo;
  document.getElementById('mainContent').innerHTML=renderFormCredito(tipo,creds[i]);
}

function borrarCred(i,tipo){
  var creds=load('creditos',[]);
  var all=creds.filter(function(c){ return c.tipo===tipo; });
  var item=all[i]; var ri=creds.indexOf(item); var eli=creds[ri];
  usalaConfirm('Eliminar credito con '+eli.persona+'?', function(){
    creds.splice(ri,1); save('creditos',creds);
    goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
    mostrarUndo('Credito eliminado',function(){
      var c2=load('creditos',[]); c2.splice(ri,0,eli); save('creditos',c2);
      goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
    });
  });
}

function abonarCred(ri,tipo){
  var creds=load('creditos',[]);
  var item=creds[ri];
  if(!item){ showToast('Crédito no encontrado'); return; }
  window._abonoRi=ri; window._abonoTipo=tipo;
  var esCobrar=tipo==='prestamo';
  var pendiente=item.monto-(item.abonado||0);
  var mc=document.getElementById('mainContent');
  mc.innerHTML='';
  var d=document.createElement('div'); d.style.padding='20px 16px';
  var accentColor=esCobrar?'var(--accent2)':'var(--accent)';

  d.innerHTML='<div class="page-header">'+backSubBtn()+'<div class="page-title">'+(esCobrar?'📥 Cobrar abono':'📤 Registrar abono')+'</div></div>'
    +'<div class="card">'
    +'<div style="background:var(--inp);border-radius:12px;padding:12px;margin-bottom:14px;">'
    +'<div style="font-weight:800;font-size:0.9rem;margin-bottom:2px;">'+item.persona+'</div>'
    +'<div style="font-size:0.78rem;color:var(--dim);margin-bottom:8px;">'+item.descripcion+'</div>'
    +'<div style="display:flex;gap:12px;">'
    +'<div><div style="font-size:0.6rem;color:var(--dim);font-weight:700;text-transform:uppercase;">Total</div>'
    +'<div style="font-weight:900;font-size:0.9rem;">'+fmt(item.monto)+'</div></div>'
    +'<div><div style="font-size:0.6rem;color:var(--dim);font-weight:700;text-transform:uppercase;">Pagado</div>'
    +'<div style="font-weight:900;font-size:0.9rem;color:'+accentColor+';">'+fmt(item.abonado||0)+'</div></div>'
    +'<div><div style="font-size:0.6rem;color:var(--dim);font-weight:700;text-transform:uppercase;">Pendiente</div>'
    +'<div style="font-weight:900;font-size:0.9rem;color:var(--danger);">'+fmt(pendiente)+'</div></div>'
    +'</div></div>'
    +'<label class="inp-label">Monto del abono ($)</label>'
    +'<input class="inp" id="abonoMonto" type="number" inputmode="decimal" placeholder="0.00" value="'+pendiente+'">'
    +(item.interes>0
      ?'<label class="inp-label">Interés incluido ($)</label><input class="inp" id="abonoInteres" type="number" inputmode="decimal" placeholder="0.00" value="0">'
      :'')
    +'<div class="form-row"><div>'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="abonoFecha" type="date" value="'+today()+'"></div>'
    +(esCobrar
      ?'<div><label class="inp-label">¿A qué cuenta?</label>'+buildCuentaOpts('abonoCuenta')+'</div>'
      :'<div><label class="inp-label">¿De qué cuenta?</label>'+buildCuentaOpts('abonoCuenta')+'</div>')
    +'</div>'
    +'<label class="inp-label">Nota (opcional)</label>'
    +'<input class="inp" id="abonoNota" placeholder="Ej: Transferencia SPEI">'
    +'<button class="btn-main" onclick="_confirmarAbono()">✅ Registrar abono</button>'
    +'<button class="btn-sec" onclick="goSub(\''+(tipo==='deuda'?'creditos_debo':'creditos_cobrar')+'\')">Cancelar</button>'
    +'</div>';
  mc.appendChild(d);
}

function _confirmarAbono(){
  var ri=window._abonoRi;
  var tipo=window._abonoTipo;
  var monto=parseFloat(document.getElementById('abonoMonto').value)||0;
  var interesEl=document.getElementById('abonoInteres');
  var interes=interesEl?parseFloat(interesEl.value)||0:0;
  var fecha=document.getElementById('abonoFecha').value||today();
  var cuenta=document.getElementById('abonoCuenta')?document.getElementById('abonoCuenta').value:'efectivo';
  var nota=(document.getElementById('abonoNota').value||'').trim();
  if(!monto||monto<=0){ showToast('Ingresa el monto'); return; }

  var creds=load('creditos',[]);
  var item=creds[ri];
  if(!item){ showToast('Crédito no encontrado'); return; }

  item.abonado=(item.abonado||0)+monto;
  item.interesesPagados=(item.interesesPagados||0)+interes;
  if(item.abonado>=item.monto){ item.estado='pagado'; item.abonado=item.monto; }
  item.historialAbonos=item.historialAbonos||[];
  item.historialAbonos.push({fecha:fecha, monto:monto, interes:interes, nota:nota, cuenta:cuenta});
  creds[ri]=item;
  save('creditos',creds);

  // Mover dinero en la cuenta
  if(cuenta && cuenta!=='ninguna'){
    if(tipo==='deuda'){
      // Pagué una deuda → salida de mi cuenta
      aplicarMovimientoCuenta(cuenta, monto+interes, 'gasto', 'Abono deuda: '+item.persona, fecha, Date.now());
    } else {
      // Me pagaron un préstamo → entrada a mi cuenta
      aplicarMovimientoCuenta(cuenta, monto, 'ingreso', 'Cobro préstamo: '+item.persona, fecha, Date.now());
    }
  }

  showToast('Abono registrado: '+fmt(monto));
  goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
}

function editarAbono(ri,ai,tipo){
  var creds=load('creditos',[]);
  var item=creds[ri];
  if(!item||!item.historialAbonos||!item.historialAbonos[ai]){ showToast('Abono no encontrado'); return; }
  var a=item.historialAbonos[ai];
  var mc=document.getElementById('mainContent');
  mc.innerHTML='<div class="page-header">'+backSubBtn()+'<div class="page-title">✏️ Editar abono</div></div>'
    +'<div class="card">'
    +'<label class="inp-label">Monto ($)</label>'
    +'<input class="inp" id="editAbonoMonto" type="number" value="'+(a.monto||0)+'">'
    +'<label class="inp-label">Interés incluido ($)</label>'
    +'<input class="inp" id="editAbonoInt" type="number" value="'+(a.interes||0)+'">'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="editAbonoFecha" type="date" value="'+(a.fecha||today())+'">'
    +'<label class="inp-label">Nota</label>'
    +'<input class="inp" id="editAbonoNota" value="'+(a.nota||'')+'">'
    +'<button class="btn-main" onclick="_guardarEditAbono('+ri+','+ai+',\''+tipo+'\')">💾 Guardar cambios</button>'
    +'<button class="btn-sec" onclick="goSub(\''+(tipo==='deuda'?'creditos_debo':'creditos_cobrar')+'\')">Cancelar</button>'
    +'</div>';
}

function _guardarEditAbono(ri,ai,tipo){
  var creds=load('creditos',[]);
  var item=creds[ri];
  if(!item||!item.historialAbonos){ return; }
  var viejoMonto=item.historialAbonos[ai].monto||0;
  var viejoInt=item.historialAbonos[ai].interes||0;
  var nuevoMonto=parseFloat(document.getElementById('editAbonoMonto').value)||0;
  var nuevoInt=parseFloat(document.getElementById('editAbonoInt').value)||0;
  item.historialAbonos[ai]={
    fecha:document.getElementById('editAbonoFecha').value||today(),
    monto:nuevoMonto, interes:nuevoInt,
    nota:document.getElementById('editAbonoNota').value||''
  };
  // Recalcular totales
  item.abonado=(item.abonado||0)-viejoMonto+nuevoMonto;
  item.interesesPagados=(item.interesesPagados||0)-viejoInt+nuevoInt;
  item.estado=item.abonado>=item.monto?'pagado':'pendiente';
  creds[ri]=item;
  save('creditos',creds);
  showToast('Abono actualizado');
  goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
}

function eliminarAbono(ri,ai,tipo){
  var creds=load('creditos',[]);
  var item=creds[ri];
  if(!item||!item.historialAbonos||!item.historialAbonos[ai]){ showToast('No encontrado'); return; }
  usalaConfirm('Eliminar este abono?', function(){
    var a=item.historialAbonos[ai];
    item.abonado=Math.max(0,(item.abonado||0)-(a.monto||0));
    item.interesesPagados=Math.max(0,(item.interesesPagados||0)-(a.interes||0));
    item.historialAbonos.splice(ai,1);
    item.estado=item.abonado>=item.monto&&item.monto>0?'pagado':'pendiente';
    creds[ri]=item;
    save('creditos',creds);
    showToast('Abono eliminado');
    goSub(tipo==='deuda'?'creditos_debo':'creditos_cobrar');
  });
}

// ──────────────────────────────────────────────────────────────
//  CUENTAS POR COBRAR (CxC)
// ──────────────────────────────────────────────────────────────

function renderCxC(){
  var cxcs=load('cxc',[]);
  var mc=document.getElementById('mainContent');
  var total=cxcs.reduce(function(s,c){ return s+c.monto; },0);
  var html='<div class="page-header">'+backSubBtn()+'<div class="page-title">📋 CxC — Por Cobrar</div></div>'
    +'<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-size:0.62rem;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Total por cobrar</div>'
    +'<div style="font-size:1.3rem;font-weight:900;color:var(--accent);">'+fmt(total)+'</div></div>'
    +'<button class="btn-main" style="padding:10px 16px;" onclick="goSub(\'nueva_cxc\')">+ Nueva CxC</button>'
    +'</div>';

  if(!cxcs.length){
    html+='<div style="text-align:center;padding:40px 20px;color:var(--dim);">'
      +'<div style="font-size:3rem;margin-bottom:12px;">📋</div>'
      +'<div style="font-size:0.85rem;">Sin cuentas por cobrar</div></div>';
  } else {
    cxcs.forEach(function(c,i){
      var venc=c.fechaVence&&new Date(c.fechaVence)<new Date();
      html+='<div class="cred-item">'
        +'<div class="cred-top"><div>'
        +'<div class="cred-persona">'+c.nombre+'</div>'
        +'<div class="cred-desc">'+c.concepto+(c.fechaVence?' · Vence: '+c.fechaVence:'')+'</div></div>'
        +'<span class="cred-badge '+(venc?'badge-vencido':'badge-pend')+'">'+(venc?'🔴 Vencido':'⏳ Pendiente')+'</span>'
        +'</div>'
        +'<div style="font-size:1.1rem;font-weight:900;color:var(--accent);margin:8px 0;">'+fmt(c.monto)+'</div>'
        +'<div style="display:flex;gap:6px;">'
        +'<button class="cred-btn success" onclick="cobrarCxC('+i+')">✅ Cobrar</button>'
        +'<button class="cred-btn danger" onclick="borrarCxC('+i+')">🗑️</button>'
        +'</div></div>';
    });
  }

  mc.innerHTML=html;
}

function guardarCxC(){
  var nombre=(document.getElementById('cxcNombre').value||'').trim();
  var monto=parseFloat(document.getElementById('cxcMonto').value)||0;
  var concepto=(document.getElementById('cxcConcepto').value||'').trim();
  var fechaVence=document.getElementById('cxcFechaVence').value;
  if(!nombre||!monto){ showToast('Ingresa nombre y monto'); return; }
  var cxcs=load('cxc',[]);
  cxcs.push({nombre:nombre, monto:monto, concepto:concepto||'Deuda', fechaVence:fechaVence, fechaReg:today()});
  save('cxc',cxcs);
  showToast('CxC registrada');
  goSub('cxc');
}

function cobrarCxC(i){
  var cxcs=load('cxc',[]);
  var c=cxcs[i];
  if(!c){ showToast('No encontrado'); return; }

  var m=document.createElement('div');
  m.className='modal open'; m.id='cobrarCxCModal';
  m.innerHTML='<div class="modal-body">'
    +'<div class="modal-title">✅ Cobrar a '+c.nombre+'</div>'
    +'<div style="font-size:0.85rem;color:var(--dim);margin-bottom:14px;">'+c.concepto+' · '+fmt(c.monto)+'</div>'
    +'<label class="inp-label">¿A qué cuenta ingresa?</label>'
    +buildCuentaOpts('cobrarCxCCuenta')
    +'<label class="inp-label" style="margin-top:10px;">Fecha</label>'
    +'<input class="inp" id="cobrarCxCFecha" type="date" value="'+today()+'">'
    +'<div style="display:flex;gap:8px;margin-top:12px;">'
    +'<button class="btn-main" style="flex:1;" onclick="_confirmarCobrarCxC('+i+')">Cobrar</button>'
    +'<button class="btn-sec" onclick="document.getElementById(\'cobrarCxCModal\').remove()">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
}

function _confirmarCobrarCxC(i){
  var cxcs=load('cxc',[]);
  var c=cxcs[i];
  if(!c) return;
  var cuenta=document.getElementById('cobrarCxCCuenta').value||'efectivo';
  var fecha=document.getElementById('cobrarCxCFecha').value||today();

  // Registrar ingreso
  var txs=load('txs',[]);
  txs.push({id:Date.now(),tipo:'ingreso',monto:c.monto,
    desc:'Cobré a: '+c.nombre,cat:'Cobro de deuda',
    fecha:fecha,cuenta:cuenta});
  save('txs',txs);

  // Mover saldo en la cuenta
  aplicarMovimientoCuenta(cuenta, c.monto, 'ingreso', 'Cobro: '+c.nombre, fecha, Date.now());

  cxcs.splice(i,1);
  save('cxc',cxcs);
  var modal=document.getElementById('cobrarCxCModal');
  if(modal) modal.remove();
  showToast('Cobro registrado: '+fmt(c.monto));
  goSub('cxc');
}

function borrarCxC(i){
  var cxcs=load('cxc',[]);
  usalaConfirm('Eliminar esta cuenta por cobrar?', function(){
    var eli=cxcs[i];
    cxcs.splice(i,1);
    save('cxc',cxcs);
    goSub('cxc');
    mostrarUndo('CxC eliminada',function(){
      var c2=load('cxc',[]); c2.splice(i,0,eli); save('cxc',c2); goSub('cxc');
    });
  });
}

// ── Formulario nueva CxC ──────────────────────────
function renderNuevaCxC(){
  document.getElementById('mainContent').innerHTML=
    '<div class="page-header">'+backSubBtn()+'<div class="page-title">📋 Nueva CxC</div></div>'
    +'<div class="card">'
    +'<label class="inp-label">¿Quién te debe?</label>'
    +'<input class="inp" id="cxcNombre" placeholder="Nombre">'
    +'<label class="inp-label">Monto ($)</label>'
    +'<input class="inp" id="cxcMonto" type="number" inputmode="decimal" placeholder="0.00">'
    +'<label class="inp-label">Concepto</label>'
    +'<input class="inp" id="cxcConcepto" placeholder="Ej: Préstamo para renta">'
    +'<label class="inp-label">Fecha límite (opcional)</label>'
    +'<input class="inp" id="cxcFechaVence" type="date">'
    +'<button class="btn-main" onclick="guardarCxC()">💾 Guardar</button>'
    +'<button class="btn-sec" onclick="goSub(\'cxc\')">Cancelar</button>'
    +'</div>';
}

// ── Modales rápidos desde inicio ─────────────────
function _abrirModalPreste(){
  var m=document.createElement('div');
  m.className='modal open'; m.id='presteModal';
  m.innerHTML='<div class="modal-body">'
    +'<div class="modal-title">🤝 Presté dinero</div>'
    +'<p style="color:var(--dim);font-size:0.82rem;margin-bottom:14px;">Se registrará en <b>Créditos → Me deben</b></p>'
    +'<label class="inp-label">¿A quién le presté?</label>'
    +'<input class="inp" id="ptPersona" placeholder="Nombre">'
    +'<div class="form-row"><div>'
    +'<label class="inp-label">Monto ($)</label>'
    +'<input class="inp" id="ptMonto" type="number" inputmode="decimal" placeholder="0.00">'
    +'</div><div>'
    +'<label class="inp-label">Interés (%)</label>'
    +'<input class="inp" id="ptInteres" type="number" inputmode="decimal" placeholder="0">'
    +'</div></div>'
    +'<label class="inp-label">Concepto</label>'
    +'<input class="inp" id="ptDesc" placeholder="Ej: Para renta">'
    +'<div class="form-row"><div>'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="ptFecha" type="date" value="'+today()+'">'
    +'</div><div>'
    +'<label class="inp-label">Vence</label>'
    +'<input class="inp" id="ptVence" type="date">'
    +'</div></div>'
    +'<label class="inp-label">¿De qué cuenta sale?</label>'
    +buildCuentaOpts('ptCuenta')
    +'<div style="display:flex;gap:8px;margin-top:12px;">'
    +'<button class="btn-main" style="flex:1;" onclick="_guardarPreste()">💾 Registrar</button>'
    +'<button class="btn-sec" onclick="document.getElementById(\'presteModal\').remove()">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
}

function _guardarPreste(){
  var persona=(document.getElementById('ptPersona').value||'').trim();
  var monto=parseFloat(document.getElementById('ptMonto').value||0);
  var interes=parseFloat(document.getElementById('ptInteres').value||0);
  var desc=(document.getElementById('ptDesc').value||'').trim();
  var fecha=document.getElementById('ptFecha').value;
  var vence=document.getElementById('ptVence').value;
  var cuenta=document.getElementById('ptCuenta').value;
  if(!persona||!monto){ showToast('Ingresa a quién y el monto'); return; }
  if(!desc) desc='Prestamo a '+persona;
  var creds=load('creditos',[]);
  creds.push({tipo:'prestamo',persona:persona,descripcion:desc,monto:monto,
    interes:interes,tipoInteres:'total',fechaOrigen:fecha,fechaLimite:vence,
    estado:'pendiente',abonado:0,interesesPagados:0,historialAbonos:[]});
  save('creditos',creds);
  if(cuenta&&cuenta!=='ninguna'){
    aplicarMovimientoCuenta(cuenta,monto,'gasto','Prestamo a: '+persona,fecha,Date.now());
  }
  document.getElementById('presteModal').remove();
  showToast('Préstamo registrado: '+fmt(monto));
}

function _abrirModalPrestamoRecibido(){
  var m=document.createElement('div');
  m.className='modal open'; m.id='prestamoRecibidoModal';
  m.innerHTML='<div class="modal-body">'
    +'<div class="modal-title">📥 Recibí un préstamo</div>'
    +'<p style="color:var(--dim);font-size:0.82rem;margin-bottom:14px;">Se registrará en <b>Créditos → Lo que debo</b></p>'
    +'<label class="inp-label">¿Quién me prestó?</label>'
    +'<input class="inp" id="prPersona" placeholder="Nombre">'
    +'<div class="form-row"><div>'
    +'<label class="inp-label">Monto ($)</label>'
    +'<input class="inp" id="prMonto" type="number" inputmode="decimal" placeholder="0.00">'
    +'</div><div>'
    +'<label class="inp-label">Interés (%)</label>'
    +'<input class="inp" id="prInteres" type="number" inputmode="decimal" placeholder="0">'
    +'</div></div>'
    +'<label class="inp-label">Concepto</label>'
    +'<input class="inp" id="prDesc" placeholder="Ej: Para emergencia">'
    +'<div class="form-row"><div>'
    +'<label class="inp-label">Fecha</label>'
    +'<input class="inp" id="prFecha" type="date" value="'+today()+'">'
    +'</div><div>'
    +'<label class="inp-label">Vence</label>'
    +'<input class="inp" id="prVence" type="date">'
    +'</div></div>'
    +'<label class="inp-label">¿A qué cuenta entra?</label>'
    +buildCuentaOpts('prCuenta')
    +'<div style="display:flex;gap:8px;margin-top:12px;">'
    +'<button class="btn-main" style="flex:1;" onclick="_guardarPrestamoRecibido()">💾 Registrar</button>'
    +'<button class="btn-sec" onclick="document.getElementById(\'prestamoRecibidoModal\').remove()">Cancelar</button>'
    +'</div></div>';
  document.body.appendChild(m);
}

function _guardarPrestamoRecibido(){
  var persona=(document.getElementById('prPersona').value||'').trim();
  var monto=parseFloat(document.getElementById('prMonto').value||0);
  var interes=parseFloat(document.getElementById('prInteres').value||0);
  var desc=(document.getElementById('prDesc').value||'').trim();
  var fecha=document.getElementById('prFecha').value;
  var vence=document.getElementById('prVence').value;
  var cuenta=document.getElementById('prCuenta').value;
  if(!persona||!monto){ showToast('Ingresa quién y el monto'); return; }
  if(!desc) desc='Prestamo de '+persona;
  var creds=load('creditos',[]);
  creds.push({tipo:'deuda',persona:persona,descripcion:desc,monto:monto,
    interes:interes,tipoInteres:'total',fechaOrigen:fecha,fechaLimite:vence,
    estado:'pendiente',abonado:0,interesesPagados:0,historialAbonos:[]});
  save('creditos',creds);
  if(cuenta&&cuenta!=='ninguna'){
    aplicarMovimientoCuenta(cuenta,monto,'ingreso','Prestamo recibido: '+persona,fecha,Date.now());
  }
  document.getElementById('prestamoRecibidoModal').remove();
  showToast('Préstamo recibido: '+fmt(monto));
}

function _abrirModalCobrarCxC(){
  var cxcs=load('cxc',[]);
  if(!cxcs.length){ showToast('No tienes cuentas por cobrar'); return; }
  var m=document.createElement('div');
  m.className='modal open'; m.id='cobrarCxCModal';
  var lista=cxcs.map(function(c,i){
    return '<button onclick="_confirmarCobrarCxC('+i+')" style="'
      +'display:flex;align-items:center;justify-content:space-between;'
      +'padding:14px 16px;border-radius:16px;border:1.5px solid var(--border);'
      +'background:var(--card);cursor:pointer;width:100%;color:var(--txt);margin-bottom:10px;'
      +'font-family:Outfit,sans-serif;">'
      +'<div style="text-align:left;">'
      +'<div style="font-weight:800;font-size:0.9rem;">'+c.nombre+'</div>'
      +'<div style="font-size:0.72rem;color:var(--dim);">'+c.concepto+'</div></div>'
      +'<div style="font-size:0.95rem;font-weight:900;color:var(--accent);">'+fmt(c.monto)+'</div>'
      +'</button>';
  }).join('');
  m.innerHTML='<div class="modal-body">'
    +'<div class="modal-title">✅ ¿Qué cobras?</div>'
    +'<div style="max-height:280px;overflow-y:auto;margin-bottom:10px;">'+lista+'</div>'
    +'<button class="btn-sec" onclick="document.getElementById(\'cobrarCxCModal\').remove()">Cancelar</button>'
    +'</div>';
  document.body.appendChild(m);
}
