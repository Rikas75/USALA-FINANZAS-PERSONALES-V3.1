// ─────────────────────────────────────────────
//  USALA Suite — Dashboard & UI
//  js/dashboard.js
// ─────────────────────────────────────────────

function renderInicio(){
  var txs = getTxs();
  var ing = txs.filter(function(t){ return t.tipo==='ingreso'; }).reduce(function(s,t){ return s+Number(t.monto); },0);
  var gas = txs.filter(function(t){ return t.tipo==='gasto'; }).reduce(function(s,t){ return s+Number(t.monto); },0);
  var creds = load('creditos',[]);
  var debo   = creds.filter(function(c){ return c.tipo==='deuda'&&c.estado!=='pagado'; }).reduce(function(s,c){ return s+Number(c.monto-(c.abonado||0)); },0);
  var meDebn = creds.filter(function(c){ return c.tipo==='prestamo'&&c.estado!=='pagado'; }).reduce(function(s,c){ return s+Number(c.monto-(c.abonado||0)); },0);
  var cu = getCuentas();
  var efec  = cu.efectivo || 0;
  var banco = (cu.cheques||[]).reduce(function(s,x){ return s+Number(x.saldo||0); },0);
  var deudaTC = (cu.tarjetas||[]).reduce(function(s,t){ return s+Number(t.balance||0); },0);
  var totalDisp = efec + banco;
  var actP = load('activos_personales',[]).reduce(function(s,a){ return s+(a.valor||0); },0);
  var pn = (efec+banco+actP)-(deudaTC+debo);
  var nombre = S.user.nombre.split(' ')[0];
  var hora = new Date().getHours();
  var saludo = hora<12 ? '☀️ Buenos días' : hora<19 ? '👋 Buenas tardes' : '🌙 Buenas noches';
  var _u=S.user, _prefix=(_u?(_u.isAdmin?'usala_admin':'usala_u_'+_u.codigo)+'_snap_':'');
  var _mes=new Date().toISOString().slice(0,7);
  var _prevKeys=[]; for(var _k in localStorage){ if(_prefix&&_k.indexOf(_prefix)===0&&_k!==_prefix+_mes) _prevKeys.push(_k); }
  _prevKeys.sort(); var _prevSnap=null;
  if(_prevKeys.length){ try{ _prevSnap=JSON.parse(localStorage.getItem(_prevKeys[_prevKeys.length-1])); }catch(e){} }
  var _diff=_prevSnap?pn-_prevSnap.patrimonioNeto:null;
  var trendStr = _diff===null ? '' :
    (_diff>=0
      ? '<span style="font-size:0.7rem;color:rgba(255,255,255,0.75);margin-left:8px;">↑ '+fmt(Math.abs(_diff))+' vs mes ant.</span>'
      : '<span style="font-size:0.7rem;color:rgba(255,200,200,0.8);margin-left:8px;">↓ '+fmt(Math.abs(_diff))+' vs mes ant.</span>');
  var heroCard = '<div class="hero-card" onclick="irProgreso()">'
    +'<div style="position:relative;z-index:1;">'
    +'<div class="hero-label">'+saludo+', '+nombre+'</div>'
    +'<div class="hero-amount">'+fmt(totalDisp)+'</div>'
    +'<div class="hero-sub">Total disponible · Toca para ver progreso'+trendStr+'</div>'
    +'<div class="hero-pills">'
    +'<div class="hero-pill" onclick="event.stopPropagation();goSub(\'efectivo\');goTab(\'cuentas\',document.querySelectorAll(\'.nb\')[1])"><span class="hero-pill-ico">💵</span>'+fmt(efec)+'</div>'
    +'<div class="hero-pill" onclick="event.stopPropagation();goSub(\'cheques\');goTab(\'cuentas\',document.querySelectorAll(\'.nb\')[1])"><span class="hero-pill-ico">🏧</span>'+fmt(banco)+'</div>'
    +'</div>'
    +'</div>'
    +'</div>';
  var quickActions = '<div class="quick-grid">'
    +'<div class="quick-item" onclick="abrirTxModal(\'gasto\')">'
    +'<div class="quick-ico">➖</div>'
    +'<div class="quick-lbl">Nuevo gasto</div></div>'
    +'<div class="quick-item" onclick="abrirTxModal(\'ingreso\')">'
    +'<div class="quick-ico">➕</div>'
    +'<div class="quick-lbl">Ingreso</div></div>'
    +'<div class="quick-item" onclick="abrirPP()">'
    +'<div class="quick-ico" style="position:relative;">'
    +(function(){
      var _h=new Date(); _h.setHours(0,0,0,0);
      var _pp=loadPagosBase(),_pe=loadPagosEstado();
      var _nV=0;
      _pp.forEach(function(p){
        if(_pe[p.id]&&_pe[p.id].pagado) return;
        var _dia=Math.min(p.dia||1,28);
        var _f; if(p.proximoPago){ var _pts=p.proximoPago.split('-'); _f=new Date(+_pts[0],+_pts[1]-1,+_pts[2]); }
        else { _f=new Date(_h.getFullYear(),_h.getMonth(),_dia); } _f.setHours(0,0,0,0);
        if(Math.round((_f-_h)/86400000)<=7) _nV++;
      });
      return '⏰'+(_nV>0?'<div style="position:absolute;top:-4px;right:-4px;background:#ff5f57;color:#fff;font-size:0.55rem;font-weight:900;min-width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;">'+_nV+'</div>':'');
    })()
    +'</div><div class="quick-lbl">Pagos</div></div>'
    +'<div class="quick-item" onclick="goTab(\'creditos\',document.querySelectorAll(\'.nb\')[2])">'
    +'<div class="quick-ico">🤝</div>'
    +'<div class="quick-lbl">Créditos</div></div>'
    +'<div class="quick-item" onclick="goTab(\'cuentas\',document.querySelectorAll(\'.nb\')[1]);setTimeout(function(){goSub(\'carrito\');},80)">'
    +'<div class="quick-ico">🛒</div>'
    +'<div class="quick-lbl">Lista del súper</div></div>'
    +'</div>';
  var noticiasBanner = '';
  if(!S.user.isAdmin){
    var noticias = JSON.parse(localStorage.getItem('usala_noticias')||'[]');
    var sinLeer = noticias.filter(function(n){
      var leidas = JSON.parse(localStorage.getItem('usala_leidas_'+S.user.codigo)||'[]');
      return leidas.indexOf(n.id) === -1;
    });
    if(sinLeer.length){
      noticiasBanner = '<div class="noticia-banner" onclick="goSub(\'noticias\')">'
        +'<div style="display:flex;align-items:center;gap:10px;">'
        +'<span style="font-size:1.4rem;">📢</span>'
        +'<div><div style="font-weight:800;font-size:0.85rem;color:var(--text);">'+sinLeer.length+' mensaje nuevo'+(sinLeer.length>1?'s':'')+' del admin</div>'
        +'<div style="font-size:0.7rem;color:var(--accent2);margin-top:2px;font-weight:600;">Toca para leer →</div></div>'
        +'</div></div>';
    }
  }
  var pnColor = pn>=0?'var(--accent2)':'var(--danger)';
  var insightCards = '<div class="insight-row">'
    +'<div class="insight-card accent" onclick="irProgreso()">'
    +'<span class="insight-ico">📈</span>'
    +'<div class="insight-label">Patrimonio Neto</div>'
    +'<div class="insight-val" style="color:'+pnColor+';">'+fmt(pn)+'</div>'
    +(_diff!==null?'<div class="insight-trend" style="color:'+(_diff>=0?'var(--accent2)':'var(--danger)')+';">'
      +(_diff>=0?'↑':'↓')+' '+fmt(Math.abs(_diff))+'</div>':'')
    +'</div>'
    +'<div class="insight-card danger" onclick="goTab(\'creditos\',document.querySelectorAll(\'.nb\')[2])">'
    +'<span class="insight-ico">🔴</span>'
    +'<div class="insight-label">Total Deudas</div>'
    +'<div class="insight-val" style="color:var(--danger);">'+fmt(deudaTC+debo)+'</div>'
    +'<div class="insight-trend" style="color:var(--dim);">'
    +'<span>💳'+fmt(deudaTC)+'</span></div>'
    +'</div>'
    +'</div>'
    +'<div class="insight-row">'
    +'<div class="insight-card" onclick="goSub(\'ingresos\');goTab(\'cuentas\',document.querySelectorAll(\'.nb\')[1])">'
    +'<span class="insight-ico">💚</span>'
    +'<div class="insight-label">Ingresos</div>'
    +'<div class="insight-val" style="color:var(--accent2);">'+fmt(ing)+'</div>'
    +'</div>'
    +'<div class="insight-card" onclick="goSub(\'gastos\');goTab(\'cuentas\',document.querySelectorAll(\'.nb\')[1])">'
    +'<span class="insight-ico">🔥</span>'
    +'<div class="insight-label">Gastos</div>'
    +'<div class="insight-val" style="color:var(--danger);">'+fmt(gas)+'</div>'
    +'</div>'
    +'</div>';
  var _pagosMes = load('pagos_mensuales',[]);
  var _estadoPagos = (function(){ try{ var mes=new Date().toISOString().slice(0,7); var u=S.user; var base=u.isAdmin?'usala_admin':'usala_u_'+u.codigo; return JSON.parse(localStorage.getItem(base+'_pagos_estado_'+mes)||'{}'); }catch(e){ return {}; } })();
  var _totalPagosMes = _pagosMes.reduce(function(s,p){ return s+(p.monto||0); },0);
  var _pagadosN = _pagosMes.filter(function(p){ return _estadoPagos[p.id]&&_estadoPagos[p.id].pagado; }).length;
  var _totalPagado = _pagosMes.filter(function(p){ return _estadoPagos[p.id]&&_estadoPagos[p.id].pagado; }).reduce(function(s,p){ return s+(_estadoPagos[p.id].montoPagado||p.monto||0); },0);
  var _pctPagos = _totalPagosMes>0?Math.min(100,Math.round((_totalPagado/_totalPagosMes)*100)):0;
  var secPagos = '';
  if(_pagosMes.length){
    var _col = _pctPagos>=100?'var(--accent2)':_pctPagos>=70?'var(--gold)':'var(--danger)';
    secPagos = '<div class="sec-title">📅 Pagos del mes</div>'
      +'<div class="insight-card full" onclick="goSub(\'pagos_mes\')" style="margin-bottom:10px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
      +'<div><div class="insight-label">Este mes</div>'
      +'<div style="font-size:1.4rem;font-weight:900;color:var(--text);">'+fmt(_totalPagosMes)+'</div></div>'
      +'<div style="text-align:right;">'
      +'<div style="font-size:1.6rem;font-weight:900;color:'+_col+';">'+_pctPagos+'%</div>'
      +'<div style="font-size:0.65rem;color:var(--dim);">'+_pagadosN+' / '+_pagosMes.length+'</div>'
      +'</div></div>'
      +'<div class="prog-wrap" style="height:8px;margin-bottom:8px;"><div class="prog-bar" style="width:'+_pctPagos+'%;background:'+_col+';"></div></div>'
      +'<div style="display:flex;justify-content:space-between;font-size:0.72rem;">'
      +'<span style="color:var(--accent2);font-weight:700;">✅ '+fmt(_totalPagado)+'</span>'
      +(_pctPagos>=100?'<span style="color:var(--accent2);font-weight:800;">🎉 ¡Al corriente!</span>':'<span style="color:var(--danger);font-weight:600;">⏳ '+fmt(_totalPagosMes-_totalPagado)+' pendiente</span>')
      +'</div></div>';
  }
  var secPres = (function(){
    var pres=load('presupuesto',{});
    var mesAct=new Date().toISOString().slice(0,7);
    var txsP=getTxs().filter(function(t){ return t.tipo==='gasto'&&t.fecha&&t.fecha.slice(0,7)===mesAct; });
    var totalLim=0, totalGas=0, excedidos=0;
    ['Pagos','Compras','Servicios','Alimentación','Transporte','Salud','Entretenimiento','Educación','Otros'].forEach(function(c){
      var lim=pres[c]||0; if(!lim) return;
      var g=txsP.filter(function(t){ return t.cat===c; }).reduce(function(s,t){ return s+Number(t.monto||0); },0);
      totalLim+=lim; totalGas+=g;
      if(g>=lim) excedidos++;
    });
    if(!totalLim) return '';
    var pct=Math.min(100,Math.round((totalGas/totalLim)*100));
    var col=pct>=100?'var(--danger)':pct>=80?'var(--gold)':'var(--accent2)';
    return '<div class="sec-title">🗂️ Presupuesto</div>'
      +'<div class="insight-card full" onclick="irPresupuesto()" style="margin-bottom:10px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
      +'<div><div class="insight-label">Gasto vs límite</div>'
      +'<div style="font-size:1.2rem;font-weight:900;color:var(--text);">'+fmt(totalGas)+' <span style="font-size:0.7rem;font-weight:500;color:var(--dim);">/ '+fmt(totalLim)+'</span></div></div>'
      +(excedidos?'<div style="background:rgba(255,95,87,0.15);border:1px solid rgba(255,95,87,0.25);border-radius:12px;padding:5px 10px;font-size:0.65rem;font-weight:800;color:var(--danger);">⚠️ '+excedidos+' excedido'+(excedidos>1?'s':'')+'</div>':'<div style="background:rgba(43,192,112,0.12);border:1px solid rgba(43,192,112,0.2);border-radius:12px;padding:5px 10px;font-size:0.65rem;font-weight:800;color:var(--accent2);">✅ En control</div>')
      +'</div>'
      +'<div class="prog-wrap" style="height:8px;"><div class="prog-bar" style="width:'+pct+'%;background:'+col+';"></div></div>'
      +'</div>';
  })();
  var invCard = '';
  if(S.user.isAdmin){
    var codigos = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
    var hoy2 = new Date();
    var codActivos = codigos.filter(function(c){ return c.activo && new Date(c.vencimiento.split('-').join('/'))>=hoy2; });
    var codUsados  = codigos.filter(function(c){ return c.usado; });
    invCard = '<div class="sec-title">👥 Invitados</div>'
      +'<div class="insight-card full" onclick="goSub(\'codigos\')" style="margin-bottom:10px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;">'
      +'<div style="display:flex;gap:20px;">'
      +'<div><div class="insight-label">Conectados</div><div class="insight-val" style="color:var(--accent2);">'+codUsados.length+'</div></div>'
      +'<div><div class="insight-label">Códigos activos</div><div class="insight-val">'+codActivos.length+'</div></div>'
      +'</div>'
      +'<div style="font-size:1.5rem;opacity:0.4;">›</div>'
      +'</div></div>';
  }
  var rec = txs.slice(-5).reverse().map(function(t){ return txItem(t,true); }).join('')
    || '<div style="text-align:center;padding:28px 20px;color:var(--dim);font-size:0.83rem;">Sin transacciones aún<br><span style="font-size:0.7rem;">Toca ➕ para agregar la primera</span></div>';
  var consejeroCard = renderConsejero(ing, gas, debo, totalDisp, pn);
  return ''
    + noticiasBanner
    + heroCard
    + quickActions
    + '<div class="sec-title">🤖 Mi Consejero</div>'
    + consejeroCard
    + '<div class="sec-title">📊 Resumen financiero</div>'
    + insightCards
    + secPagos
    + secPres
    + invCard
    +'<div style="margin-top:4px;">'
    +'<div class="tx-feed-header">'
    +'<div class="tx-feed-title">Últimas transacciones</div>'
    +'<span class="tx-feed-link" onclick="goSub(\'historial\');goTab(\'cuentas\',document.querySelectorAll(\'.nb\')[1])">Ver todas →</span>'
    +'</div>'
    +'<div class="card" style="padding:8px 16px;">'+rec+'</div>'
    +'</div>';
}


function renderMas(){
  var isAdmin = S.user && S.user.isAdmin;
  var inicialNombre = S.user ? S.user.nombre.charAt(0).toUpperCase() : '?';
  var rolLabel = isAdmin ? 'Administrador' : 'Invitado';
  var rolBadge = isAdmin ? '👑 Admin' : '🔑 Invitado';
  var profileSection = '<div class="profile-header">'
    +'<div class="profile-avatar">'+inicialNombre+'</div>'
    +'<div><div class="profile-name">'+S.user.nombre+'</div>'
    +'<div class="profile-role">'+rolLabel+' · USALA Finanzas</div></div>'
    +'<div class="profile-badge">'+rolBadge+'</div>'
    +'</div>';
  var secHerramientas = '<div class="mod-section">'
    +'<div class="mod-section-title">Herramientas</div>'
    +'<div class="mod-list">'
    +'<div class="mod-item" onclick="irProgreso()"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(43,192,112,0.2),rgba(43,192,112,0.08));">📈</div><div><div class="mod-label">Mi Progreso Financiero</div><div class="mod-sub">Patrimonio, gráficas y salud</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'activos\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,179,64,0.2),rgba(255,179,64,0.08));">🏦</div><div><div class="mod-label">Mis Activos</div><div class="mod-sub">Casa, carro, inversiones...</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'presupuesto\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(56,170,255,0.2),rgba(56,170,255,0.08));">🗂️</div><div><div class="mod-label">Presupuesto mensual</div><div class="mod-sub">Límites por categoría</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'metas\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,95,87,0.2),rgba(255,95,87,0.08));">🎯</div><div><div class="mod-label">Metas de ahorro</div><div class="mod-sub">Progreso hacia tus objetivos</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'alertas\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,179,64,0.2),rgba(255,179,64,0.08));">🔔</div><div><div class="mod-label">Alertas financieras</div><div class="mod-sub">Notificaciones personalizadas</div></div><div class="mod-arrow">›</div></div>'
    +'</div></div>';
  var secExtras = '<div class="mod-section">'
    +'<div class="mod-section-title">Extras</div>'
    +'<div class="mod-list">'
    +'<div class="mod-item" onclick="goSub(\'conversor\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(43,192,112,0.15),rgba(43,192,112,0.06));">💱</div><div><div class="mod-label">Conversor de monedas</div><div class="mod-sub">Tipos de cambio en tiempo real</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'noticias\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(56,170,255,0.15),rgba(56,170,255,0.06));">📢</div><div><div class="mod-label">Mensajes del admin</div><div class="mod-sub">Noticias y comunicados</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'ayuda\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04));">❓</div><div><div class="mod-label">Ayuda y soporte</div><div class="mod-sub">Guía de uso y preguntas frecuentes</div></div><div class="mod-arrow">›</div></div>'
    +'</div></div>';
  var secAdmin = '';
  if(isAdmin){
    secAdmin = '<div class="mod-section">'
      +'<div class="mod-section-title">Administración</div>'
      +'<div class="mod-list">'
      +'<div class="mod-item" onclick="goSub(\'codigos\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,179,64,0.2),rgba(255,179,64,0.08));">🔑</div><div><div class="mod-label">Códigos de acceso</div><div class="mod-sub">Gestionar invitados y solicitudes</div></div><div class="mod-arrow">›</div></div>'
      +'<div class="mod-item" onclick="goSub(\'noticias_admin\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(56,170,255,0.2),rgba(56,170,255,0.08));">📝</div><div><div class="mod-label">Enviar mensajes</div><div class="mod-sub">Comunicados a todos los usuarios</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'panel_admin\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(100,100,255,0.22),rgba(100,100,255,0.08));">🛡️</div><div><div class="mod-label">Panel Administrador</div><div class="mod-sub">Usuarios, métricas y configuración</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="goSub(\'dashboard_admin\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(43,192,112,0.2),rgba(43,192,112,0.08));">📊</div><div><div class="mod-label">Dashboard usuarios</div><div class="mod-sub">Resumen financiero de todos</div></div><div class="mod-arrow">›</div></div>'
      +'<div class="mod-item" onclick="goSub(\'version\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04));">ℹ️</div><div><div class="mod-label">Versión y estado</div><div class="mod-sub">Info técnica de la app</div></div><div class="mod-arrow">›</div></div>'
      +'</div></div>';
  }
  var secCuenta = '<div class="mod-section">'
    +'<div class="mod-section-title">Cuenta</div>'
    +'<div class="mod-list">'
    +'<div class="mod-item" onclick="goSub(\'config\')"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04));">⚙️</div><div><div class="mod-label">Configuración</div><div class="mod-sub">Tema, moneda, NIP y privacidad</div></div><div class="mod-arrow">›</div></div>'
    +'<div class="mod-item" onclick="cerrarSesion()" style="cursor:pointer;"><div class="mod-icon" style="background:linear-gradient(135deg,rgba(255,95,87,0.2),rgba(255,95,87,0.08));">🚪</div><div><div class="mod-label" style="color:var(--danger);">Cerrar sesión</div><div class="mod-sub">Volver a la pantalla de inicio</div></div></div>'
    +'</div></div>';
  return profileSection + secHerramientas + secExtras + secAdmin + secCuenta;
}

function renderTab(tab){
  var map = {
    inicio: renderInicio,
    cuentas: renderCuentas,
    creditos: renderCreditos,
    reportes: renderReportes,
    mas: renderMas
  };
  var fn = map[tab] || function(){ return '<p>En construcción</p>'; };
  document.getElementById('mainContent').innerHTML = fn();
}

function goTab(tab, btn){
  S.tab = tab; S.subtab = null;
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  var mc = document.getElementById('mainContent');
  mc.style.opacity = '0';
  mc.style.transform = 'translateY(8px)';
  mc.style.transition = 'none';
  renderTab(tab);
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      mc.style.transition = 'opacity 0.28s ease, transform 0.28s cubic-bezier(0.16,1,0.3,1)';
      mc.style.opacity = '1';
      mc.style.transform = 'translateY(0)';
    });
  });
}

function goSub(sub){
  S.subtab = sub;
  if(sub && sub.indexOf('banco_')===0){
    var idx = parseInt(sub.replace('banco_',''));
    document.getElementById('mainContent').innerHTML = renderBancoDetalle(idx);
    return;
  }
  // ── Rutas que manejan su propio mc.innerHTML ──
  if(sub==='tarjetas_credito')  { renderTarjetasCredito(); return; }
  if(sub==='creditos_debo')     { renderCreditosDebo(); return; }
  if(sub==='creditos_cobrar')   { renderCreditosCobrar(); return; }
  if(sub==='cxc')               { renderCxC(); return; }
  if(sub==='nueva_tc'){
    document.getElementById('mainContent').innerHTML = renderFormTC(null); return;
  }
  if(sub==='nueva_tarjeta'){
    document.getElementById('mainContent').innerHTML = renderFormTC(null); return;
  }
  if(sub==='nueva_deuda'){
    document.getElementById('mainContent').innerHTML = renderFormCredito('deuda', null); return;
  }
  if(sub==='nuevo_prestamo'){
    document.getElementById('mainContent').innerHTML = renderFormCredito('prestamo', null); return;
  }
  if(sub==='nueva_cxc')         { renderNuevaCxC(); return; }

  var renders = {
    efectivo: renderEfectivo, cheques: renderCheques,
    pagos_mes:       renderPagosMes,
    activos:         renderActivos,
    progreso:        renderProgreso,
    ingresos_activos: renderIngresosActivos,
    metas: renderMetas, alertas: renderAlertas,
    historial: renderHistorial, conversor: renderConversor,
    reportes: renderReportes,
    codigos: null, config: renderConfig, ayuda: renderAyuda,
    version: renderVersion, noticias: renderNoticias,
    carrito: renderCarrito
  };
  if(sub==='ingresos_activos'){ document.getElementById('mainContent').innerHTML=renderIngresosActivos(); return; }
  if(sub==='presupuesto'){ renderPresupuesto(); return; }
  if(sub==='dashboard_admin'){ renderDashboardAdmin(); return; }
  if(sub==='panel_admin')     { renderAdminPanel(); return; }
  if(sub==='codigos')         { renderCodigos(); return; }
  if(sub==='autolock')        { abrirConfigAutolock(); return; }
  if(sub==='config_nip')      { goTab('mas',document.querySelectorAll('.nb')[4]); setTimeout(function(){ goSub('config'); setTimeout(abrirConfigNip,120); },80); return; }
  // ── Rutas adicionales ──
  if(sub==='gastos')          { _renderMainContent(renderGastos()); return; }
  if(sub==='compras')         { _renderMainContent(renderCompras()); return; }
  if(sub==='pagos')           { _renderMainContent(renderPagos()); return; }
  if(sub==='servicios')       { _renderMainContent(renderServicios()); return; }
  if(sub==='ingresos')        { _renderMainContent(renderIngresos()); return; }
  if(sub==='noticias_admin')  { _renderMainContent(renderNoticiasAdmin()); return; }
  var fn = renders[sub];
  if(fn){
    var _mc = document.getElementById('mainContent');
    _mc.style.cssText += ';opacity:0;transform:translateY(6px);transition:none;';
    _mc.innerHTML = fn();
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      _mc.style.transition = 'opacity 0.24s ease,transform 0.24s cubic-bezier(0.16,1,0.3,1)';
      _mc.style.opacity = '1'; _mc.style.transform = 'translateY(0)';
    }); });
  }
}

function _renderMainContent(htmlStr){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  mc.style.cssText += ';opacity:0;transform:translateY(6px);transition:none;';
  mc.innerHTML = htmlStr;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    mc.style.transition = 'opacity 0.22s ease,transform 0.22s cubic-bezier(0.16,1,0.3,1)';
    mc.style.opacity = '1'; mc.style.transform = 'translateY(0)';
  }); });
}

function renderReportes(){
  var txs = getTxs();
  var ing = txs.filter(function(t){ return t.tipo==='ingreso'; }).reduce(function(s,t){ return s+Number(t.monto); },0);
  var gas = txs.filter(function(t){ return t.tipo==='gasto'; }).reduce(function(s,t){ return s+Number(t.monto); },0);
  var bal = ing - gas;
  var mesAct = new Date().toISOString().slice(0,7);
  var porCat = {};
  txs.filter(function(t){ return t.tipo==='gasto'; }).forEach(function(t){
    porCat[t.cat] = (porCat[t.cat]||0) + Number(t.monto);
  });
  var cats = Object.keys(porCat).sort(function(a,b){ return porCat[b]-porCat[a]; }).slice(0,6);
  var maxCat = cats.length ? Math.max.apply(null, cats.map(function(c){ return porCat[c]; })) : 1;
  var barChart = cats.length ? (
    '<div class="bar-chart">'
    + cats.map(function(c){
        var h = Math.max(8, Math.round((porCat[c]/maxCat)*80));
        var pct = gas>0?Math.round((porCat[c]/gas)*100):0;
        return '<div class="bar-col">'
          +'<div class="bar-fill danger" style="height:'+h+'px;" title="'+c+': '+fmt(porCat[c])+'"></div>'
          +'<div class="bar-lbl">'+c.slice(0,5)+'</div>'
          +'</div>';
      }).join('')
    +'</div>'
  ) : '';
  var catItems = cats.map(function(cat){
    var pct = gas>0 ? Math.round((porCat[cat]/gas)*100) : 0;
    return '<div style="margin-bottom:12px;">'
      +'<div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:5px;">'
      +'<span style="font-weight:700;color:var(--text);">'+cat+'</span>'
      +'<span style="font-weight:800;color:var(--danger);font-family:JetBrains Mono,monospace;">'+fmt(porCat[cat])+' <span style="font-weight:500;color:var(--dim);font-family:Outfit,sans-serif;">'+pct+'%</span></span>'
      +'</div>'
      +'<div class="prog-wrap"><div class="prog-bar danger" style="width:'+pct+'%;background:var(--danger);opacity:0.8;"></div></div>'
      +'</div>';
  }).join('') || '<div style="color:var(--dim);font-size:0.82rem;text-align:center;padding:20px;">Sin gastos registrados</div>';
  var meses6 = [];
  for(var i=5;i>=0;i--){
    var d=new Date(); d.setMonth(d.getMonth()-i);
    var m=d.toISOString().slice(0,7);
    var label=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()];
    var g=txs.filter(function(t){ return t.tipo==='gasto'&&t.fecha&&t.fecha.slice(0,7)===m; }).reduce(function(s,t){ return s+Number(t.monto); },0);
    var ing2=txs.filter(function(t){ return t.tipo==='ingreso'&&t.fecha&&t.fecha.slice(0,7)===m; }).reduce(function(s,t){ return s+Number(t.monto); },0);
    meses6.push({m:m,label:label,gas:g,ing:ing2,act:m===mesAct});
  }
  var maxMes = Math.max.apply(null, meses6.map(function(m){ return Math.max(m.gas,m.ing); }))||1;
  var mesChart = '<div class="bar-chart" style="height:110px;">'
    + meses6.map(function(m){
        var hg = Math.max(4, Math.round((m.gas/maxMes)*90));
        var hi = Math.max(4, Math.round((m.ing/maxMes)*90));
        return '<div class="bar-col">'
          +'<div style="display:flex;gap:2px;align-items:flex-end;height:90px;">'
          +'<div class="bar-fill danger" style="height:'+hg+'px;flex:1;opacity:'+(m.act?1:0.5)+';"></div>'
          +'<div class="bar-fill" style="height:'+hi+'px;flex:1;opacity:'+(m.act?1:0.5)+';"></div>'
          +'</div>'
          +'<div class="bar-lbl" style="color:'+(m.act?'var(--text)':'var(--dim)')+';">'+m.label+'</div>'
          +'</div>';
    }).join('')
    +'</div>'
    +'<div style="display:flex;gap:14px;margin-top:8px;">'
    +'<div style="display:flex;align-items:center;gap:5px;font-size:0.68rem;color:var(--dim);"><div style="width:10px;height:10px;border-radius:3px;background:var(--danger);"></div>Gastos</div>'
    +'<div style="display:flex;align-items:center;gap:5px;font-size:0.68rem;color:var(--dim);"><div style="width:10px;height:10px;border-radius:3px;background:var(--accent);"></div>Ingresos</div>'
    +'</div>';
  return ''
    +'<div class="insight-row" style="margin-bottom:10px;">'
    +'<div class="insight-card accent">'
    +'<span class="insight-ico">💚</span>'
    +'<div class="insight-label">Ingresos totales</div>'
    +'<div class="insight-val" style="color:var(--accent2);">'+fmt(ing)+'</div>'
    +'</div>'
    +'<div class="insight-card danger">'
    +'<span class="insight-ico">🔥</span>'
    +'<div class="insight-label">Gastos totales</div>'
    +'<div class="insight-val" style="color:var(--danger);">'+fmt(gas)+'</div>'
    +'</div>'
    +'</div>'
    +'<div class="insight-card full" style="margin-bottom:16px;">'
    +'<div class="insight-label">Balance neto</div>'
    +'<div style="font-size:1.6rem;font-weight:900;color:'+(bal>=0?'var(--accent2)':'var(--danger)')+';">'+fmt(bal)+'</div>'
    +'<div class="insight-trend" style="color:var(--dim);">'+(bal>=0?'✅ Positivo — gastas menos de lo que ganas':'⚠️ Negativo — gastas más de lo que ingresas')+'</div>'
    +'</div>'
    +'<div class="sec-title">📅 Evolución 6 meses</div>'
    +'<div class="card">'+mesChart+'</div>'
    +'<div class="sec-title">📊 Gastos por categoría</div>'
    +'<div class="card">'
    + barChart
    + catItems
    +'</div>';
}

function kpi(label,val,ant,inv){
    var diff=ant!==null&&ant!==undefined?val-ant:null;
    var pct=(diff!==null&&ant!==0)?Math.round((diff/Math.abs(ant))*100):null;
    var sube=diff!==null?diff>0:null;
    var pos=inv?(sube===null?null:!sube):sube;
    var col=pos===null?'var(--dim)':pos?'#2d9e5f':'var(--danger)';
    var flecha=sube===null?'':sube?'↑':'↓';
    var d=document.createElement('div');
    d.style.cssText='background:var(--card);border-radius:14px;padding:12px 13px;border:1.5px solid var(--border);';
    d.innerHTML='<div style="font-size:0.67rem;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">'+label+'</div>'
      +'<div style="font-size:1.05rem;font-weight:900;color:var(--text);">'+fmt(val)+'</div>'
      +(diff!==null
        ?'<div style="font-size:0.7rem;margin-top:3px;color:'+col+';">'+flecha+' '+fmt(Math.abs(diff))+(pct!==null?' ('+Math.abs(pct)+'%)':'')+'</div>'
        :'<div style="font-size:0.7rem;color:var(--dim);margin-top:3px;">Primer registro</div>');
    return d;
  }

function renderConversor(){
  return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">💱 Conversor</div></div>'
    +'<div class="card">'
    +'<label class="inp-label">Monto</label><input class="inp" id="convMonto" type="number" placeholder="0.00" oninput="convertir()">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">De</label><select class="inp" id="convDe" onchange="convertir()"><option value="1">MXN</option><option value="0.05">USD</option><option value="0.046">EUR</option><option value="7.8">CNY</option></select></div>'
    +'<div><label class="inp-label">A</label><select class="inp" id="convA" onchange="convertir()"><option value="0.05">USD</option><option value="1">MXN</option><option value="0.046">EUR</option><option value="7.8">CNY</option></select></div>'
    +'</div>'
    +'<div id="convResult" style="text-align:center;padding:16px;font-size:1.6rem;font-weight:900;color:var(--accent);font-family:\'JetBrains Mono\',monospace;"></div>'
    +'<div style="font-size:0.65rem;color:var(--dim);text-align:center;">Tasas aproximadas de referencia</div>'
    +'</div>';
}

function convertir(){
  var m=parseFloat(document.getElementById('convMonto').value)||0;
  var de=parseFloat(document.getElementById('convDe').value);
  var a=parseFloat(document.getElementById('convA').value);
  var res=(m/de)*a;
  document.getElementById('convResult').textContent=res.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:4});
}

function renderMetas(){
  var metas=load('metas',[]);
  var items=metas.length?metas.map(function(m,i){
    var pct=m.meta>0?Math.min(100,Math.round((m.actual/m.meta)*100)):0;
    return '<div class="card" style="margin-bottom:8px;">'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><div style="font-weight:700;">'+m.nombre+'</div><span style="font-size:0.75rem;color:var(--dim);">'+pct+'%</span></div>'
      +'<div class="prog-wrap"><div class="prog-bar" style="width:'+pct+'%;'+(pct>=100?'background:#2d9e5f;':'')+'"></div></div>'
      +'<div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--dim);margin-top:5px;margin-bottom:10px;"><span>'+fmt(m.actual)+'</span><span>Meta: '+fmt(m.meta)+'</span></div>'
      +'<div style="display:flex;gap:6px;">'
      +'<button class="cred-btn success" style="flex:2;" onclick="abonarMeta('+i+')">+ Abonar</button>'
      +'<button class="cred-btn" onclick="editarMeta('+i+')">✏️</button>'
      +'<button class="cred-btn danger" onclick="borrarMeta('+i+')">🗑️</button>'
      +'</div></div>';
  }).join(''):'<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin metas aún</div>';
  return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">🎯 Metas de Ahorro</div></div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<label class="inp-label">Nombre de la meta</label><input class="inp" id="metaNombre" placeholder="Ej: Fondo de emergencia">'
    +'<div class="form-row"><div><label class="inp-label">Objetivo ($)</label><input class="inp" id="metaObjetivo" type="number" placeholder="0.00"></div><div><label class="inp-label">Ya tengo ($)</label><input class="inp" id="metaActual" type="number" placeholder="0.00"></div></div>'
    +'<button class="btn-main" onclick="guardarMeta()">+ Agregar meta</button>'
    +'</div>'+items;
}

function guardarMeta(){
  var n=document.getElementById('metaNombre').value.trim();
  var o=parseFloat(document.getElementById('metaObjetivo').value);
  var a=parseFloat(document.getElementById('metaActual').value)||0;
  if(!n||!o){ showToast('⚠ Completa nombre y objetivo'); return; }
  var m=load('metas',[]); m.push({nombre:n,meta:o,actual:a}); save('metas',m);
  showToast('✓ Meta agregada'); goSub('metas');
}

function borrarMeta(i){ var m=load('metas',[]); var e=m[i]; m.splice(i,1); save('metas',m); goSub('metas'); mostrarUndo('Meta eliminada',function(){ var m2=load('metas',[]); m2.splice(i,0,e); save('metas',m2); goSub('metas'); }); }

function renderAlertas(){
  var alertas=load('alertas',[]);
  var txs=getTxs();
  var items=alertas.length?alertas.map(function(a,i){
    var gastado=txs.filter(function(t){ return t.tipo==='gasto' && t.cat===a.nombre; }).reduce(function(s,t){ return s+Number(t.monto); },0);
    var pct=a.limite>0?Math.min(100,Math.round((gastado/a.limite)*100)):0;
    var color=pct>=100?'var(--danger)':pct>=75?'#f59e0b':'var(--accent2)';
    return '<div class="card" style="margin-bottom:10px;padding:14px;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
      +'<div style="font-weight:800;font-size:0.9rem;">'+(pct>=100?'🔴':pct>=75?'⚡':'🟢')+' '+a.nombre+'</div>'
      +'<div style="display:flex;gap:6px;">'
      +'<button class="ic-btn" onclick="editarAlerta('+i+')">✏️</button>'
      +'<button class="ic-btn" onclick="borrarAlerta('+i+')">🗑️</button>'
      +'</div></div>'
      +'<div style="font-size:0.75rem;color:var(--dim);margin-bottom:6px;">'+fmt(gastado)+' de '+fmt(a.limite)+' · Vence: '+a.fecha+'</div>'
      +'<div style="background:rgba(0,0,0,0.08);border-radius:8px;height:7px;overflow:hidden;">'
      +'<div style="height:100%;border-radius:8px;background:'+color+';width:'+pct+'%;transition:width 0.4s;"></div></div>'
      +'</div>';
  }).join(''):'<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin alertas configuradas</div>';
  return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">🔔 Alertas de Gasto</div></div>'
    +'<div class="card" style="margin-bottom:14px;" id="alertaForm">'
    +'<div class="card-title">+ Nueva alerta</div>'
    +'<label class="inp-label">Nombre / Categoría a vigilar</label>'
    +'<input class="inp" id="alNombre" placeholder="Ej: Alimentación, Entretenimiento...">'
    +'<div class="form-row">'
    +'<div><label class="inp-label">Límite ($)</label><input class="inp" id="alLimite" type="number" inputmode="decimal" placeholder="0.00"></div>'
    +'<div><label class="inp-label">Fecha límite</label><input class="inp" id="alFecha" type="date" value="'+today()+'"></div>'
    +'</div>'
    +'<button class="btn-main" id="alSaveBtn" onclick="guardarAlerta()">+ Agregar alerta</button>'
    +'</div>'+items;
}

function guardarAlerta(){
  var n=document.getElementById('alNombre').value.trim();
  var l=parseFloat(document.getElementById('alLimite').value);
  var f=document.getElementById('alFecha').value;
  if(!n||!l||!f){ showToast('⚠ Completa todos los campos'); return; }
  var alertas=load('alertas',[]);
  if(window._editAlerta!==undefined){
    alertas[window._editAlerta]=Object.assign(alertas[window._editAlerta],{nombre:n,limite:l,fecha:f});
    delete window._editAlerta; showToast('✓ Alerta actualizada');
  } else {
    alertas.push({nombre:n,limite:l,fecha:f,activa:true});
    showToast('✓ Alerta guardada');
  }
  save('alertas',alertas); goSub('alertas');
}

function borrarAlerta(i){ var a=load('alertas',[]); var e=a[i]; a.splice(i,1); save('alertas',a); goSub('alertas'); mostrarUndo('Alerta eliminada',function(){ var a2=load('alertas',[]); a2.splice(i,0,e); save('alertas',a2); goSub('alertas'); }); }

function renderPresupuesto(){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  mc.innerHTML = '';
  var pres    = load('presupuesto', {});
  var mesAct  = new Date().toISOString().slice(0,7);
  var txs     = getTxs().filter(function(t){
    return t.tipo==='gasto' && t.fecha && t.fecha.slice(0,7)===mesAct;
  });
  var cats = getPresCats();
  var totalLimite = 0, totalGastado = 0;
  var catData = cats.map(function(c){
    var lim = pres[c.id] || 0;
    var gas = txs.filter(function(t){ return t.cat === c.id; })
                 .reduce(function(s,t){ return s + Number(t.monto||0); }, 0);
    totalLimite  += lim;
    totalGastado += gas;
    var pct    = lim>0 ? Math.min(100, Math.round((gas/lim)*100)) : (gas>0?100:0);
    var estado = lim===0 ? 'sin-limite' : pct>=100 ? 'excedido' : pct>=80 ? 'alerta' : 'ok';
    return { id:c.id, color:c.color||'#78909c', lim:lim, gas:gas, pct:pct, estado:estado };
  });
  var conLimite = catData.filter(function(c){ return c.lim>0; }).length;
  var pctTotal  = totalLimite>0 ? Math.min(100, Math.round((totalGastado/totalLimite)*100)) : 0;
  var heroCol   = pctTotal>=100 ? '#e53935' : pctTotal>=80 ? '#f57c00' : '#2d9e5f';
  var libre     = totalLimite - totalGastado;
  var mesLabel = new Date(mesAct+'-02').toLocaleString('es-MX',{month:'long',year:'numeric'});
  mesLabel = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
  var hdr = document.createElement('div');
  hdr.innerHTML = '<div class="page-header">'+backBtn('mas',4)
    +'<div class="page-title">🗂️ Presupuesto Mensual</div></div>';
  mc.appendChild(hdr);
  var hero = document.createElement('div');
  hero.style.cssText = 'border-radius:20px;padding:20px;margin-bottom:14px;'
    +'background:linear-gradient(135deg,var(--card) 0%,var(--inp) 100%);'
    +'border:1.5px solid var(--border);position:relative;overflow:hidden;';
  hero.innerHTML =
     '<div style="position:absolute;top:-24px;right:-24px;width:110px;height:110px;border-radius:50%;background:'+heroCol+';opacity:0.08;"></div>'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">'
      +'<div>'
        +'<div style="font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.09em;color:var(--dim);margin-bottom:4px;">'+mesLabel+'</div>'
        +'<div style="font-size:1.7rem;font-weight:900;color:var(--text);line-height:1;">'+fmt(totalGastado)+'</div>'
        +'<div style="font-size:0.73rem;color:var(--dim);margin-top:3px;">de <b>'+fmt(totalLimite)+'</b> presupuestado</div>'
      +'</div>'
      +'<div style="text-align:right;">'
        +'<div style="font-size:2.2rem;font-weight:900;color:'+heroCol+';line-height:1;">'+pctTotal+'%</div>'
        +'<div style="font-size:0.68rem;color:var(--dim);">usado</div>'
      +'</div>'
    +'</div>'
    +'<div style="background:var(--border);border-radius:999px;height:8px;margin-bottom:12px;overflow:hidden;">'
      +'<div style="height:100%;border-radius:999px;background:'+heroCol+';width:'+pctTotal+'%;"></div>'
    +'</div>'
    +'<div style="display:flex;gap:20px;flex-wrap:wrap;">'
      +(totalLimite>0 ? '<div style="font-size:0.72rem;"><span style="color:var(--dim);">Libre: </span>'
        +'<b style="color:'+heroCol+';">'+fmt(Math.max(0,libre))+'</b></div>' : '')
      +'<div style="font-size:0.72rem;"><span style="color:var(--dim);">Con límite: </span>'
        +'<b>'+conLimite+' / '+cats.length+'</b></div>'
    +'</div>';
  mc.appendChild(hero);
  if(conLimite === 0){
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:28px 20px;background:var(--card);border-radius:16px;border:1.5px dashed var(--border);margin-bottom:12px;';
    empty.innerHTML = '<div style="font-size:2rem;margin-bottom:8px;">🎯</div>'
      +'<div style="font-weight:800;margin-bottom:6px;">Sin límites configurados</div>'
      +'<div style="font-size:0.78rem;color:var(--dim);">Escribe un límite en cada categoría<br>para empezar a controlar tus gastos</div>';
    mc.appendChild(empty);
  }
  var excedidos  = catData.filter(function(c){ return c.estado==='excedido'; });
  var enAlerta   = catData.filter(function(c){ return c.estado==='alerta'; });
  if(excedidos.length || enAlerta.length){
    var ab = document.createElement('div');
    ab.style.cssText = 'border-radius:14px;padding:12px 14px;margin-bottom:12px;'
      +'background:rgba(229,57,53,0.06);border:1.5px solid rgba(229,57,53,0.22);';
    var msgs = excedidos.map(function(c){
      return '<span style="color:#e53935;font-weight:700;">⚠️ '+c.id+' ('+c.pct+'%)</span>';
    }).concat(enAlerta.map(function(c){
      return '<span style="color:#f57c00;font-weight:700;">🔶 '+c.id+' ('+c.pct+'%)</span>';
    }));
    ab.innerHTML = '<div style="font-size:0.75rem;line-height:2;">'+msgs.join(' &nbsp;·&nbsp; ')+'</div>';
    mc.appendChild(ab);
  }
  var lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:0.68rem;font-weight:800;text-transform:uppercase;'
    +'letter-spacing:0.08em;color:var(--dim);margin-bottom:8px;';
  lbl.textContent = 'Control por categoría';
  mc.appendChild(lbl);
  catData.forEach(function(c){
    var borderCol = c.estado==='excedido' ? '#e53935'
                  : c.estado==='alerta'   ? '#f57c00'
                  : c.estado==='ok'       ? c.color
                  : 'var(--border)';
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--card);border-radius:16px;padding:14px 16px;'
      +'margin-bottom:8px;border:1.5px solid var(--border);border-left:3.5px solid '+borderCol+';';
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    var nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-weight:700;font-size:0.9rem;';
    nameEl.textContent = c.id;
    var badge = document.createElement('div');
    badge.style.cssText = 'font-size:0.7rem;font-weight:800;padding:2px 8px;border-radius:20px;'
      +'background:'+borderCol+'22;color:'+borderCol+';white-space:nowrap;';
    badge.textContent = c.lim>0 ? c.pct+'%' : (c.gas>0 ? fmt(c.gas) : 'Sin límite');
    topRow.appendChild(nameEl);
    topRow.appendChild(badge);
    card.appendChild(topRow);
    var botRow = document.createElement('div');
    botRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;'
      +'font-size:0.75rem;color:var(--dim);margin-bottom:'+(c.lim>0?'8':'0')+'px;';
    var gasEl = document.createElement('span');
    gasEl.innerHTML = 'Gastado: <b style="color:var(--text);">'+fmt(c.gas)+'</b>';
    var limWrap = document.createElement('div');
    limWrap.style.cssText = 'display:flex;align-items:center;gap:5px;';
    var limLbl = document.createElement('span');
    limLbl.textContent = 'Límite:';
    var inp = document.createElement('input');
    inp.type = 'number'; inp.min = '0';
    inp.value = c.lim || '';
    inp.placeholder = '—';
    inp.style.cssText = 'width:82px;padding:4px 8px;background:var(--inp);'
      +'border:1px solid var(--border);border-radius:8px;'
      +'font-family:\'Outfit\',sans-serif;font-size:0.76rem;color:var(--text);text-align:right;';
    (function(catId){
      inp.onchange = function(){
        var p = load('presupuesto',{});
        p[catId] = parseFloat(this.value) || 0;
        save('presupuesto', p);
        showToast('✓ Límite guardado');
        renderPresupuesto();
      };
    })(c.id);
    limWrap.appendChild(limLbl);
    limWrap.appendChild(inp);
    botRow.appendChild(gasEl);
    botRow.appendChild(limWrap);
    card.appendChild(botRow);
    if(c.lim > 0){
      var barWrap = document.createElement('div');
      barWrap.style.cssText = 'background:var(--border);border-radius:999px;height:5px;overflow:hidden;';
      var bar = document.createElement('div');
      bar.style.cssText = 'height:100%;border-radius:999px;background:'+borderCol+';width:0%;'
        +'transition:width 0.6s cubic-bezier(.4,0,.2,1);';
      barWrap.appendChild(bar);
      card.appendChild(barWrap);
      setTimeout((function(b, pct){ return function(){ b.style.width = pct+'%'; }; })(bar, c.pct), 80);
    }
    mc.appendChild(card);
  });
  var tip = document.createElement('div');
  tip.style.cssText = 'text-align:center;padding:16px;font-size:0.73rem;color:var(--dim);';
  tip.innerHTML = '💡 Los gastos se clasifican automáticamente<br>según la categoría que eliges al registrarlos';
  mc.appendChild(tip);
}

function renderProgreso(){
  var mc=document.getElementById('mainContent');
  mc.innerHTML='';
  var hdr=document.createElement('div');
  hdr.innerHTML='<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">📈 Mi Progreso Financiero</div></div>';
  mc.appendChild(hdr);
  var mes=new Date().toISOString().slice(0,7);
  var key=_snapKey()+mes;
  localStorage.removeItem(key);
  _forzarSnapshot(mes, key);
  var snaps=getSnapshots();
  var ultimo=snaps.length?snaps[snaps.length-1]:null;
  var penultimo=snaps.length>1?snaps[snaps.length-2]:null;
  if(!ultimo){
    var empty=document.createElement('div'); empty.className='card';
    empty.innerHTML='<div style="text-align:center;padding:24px;color:var(--dim);font-size:0.85rem;">Sin datos todavía.<br>Agrega cuentas o transacciones y regresa aquí.</div>';
    mc.appendChild(empty); return;
  }
  var score=0;
  if(penultimo){
    if(ultimo.patrimonioNeto>penultimo.patrimonioNeto) score++;
    if(ultimo.totalDeudas<penultimo.totalDeudas) score++;
    if(ultimo.ingresos>ultimo.gastos) score++;
  } else {
    if(ultimo.patrimonioNeto>0) score++;
    if(ultimo.ingresos>ultimo.gastos) score++;
    score=Math.min(score,2);
  }
  var si=score>=3
    ?{emoji:'🟢',label:'Progresando',  color:'#2d9e5f', bg:'rgba(45,158,95,0.08)'}
    :score>=2
    ?{emoji:'🟡',label:'Estable',      color:'#e07b00', bg:'rgba(224,123,0,0.08)'}
    :{emoji:'🔴',label:'Atención',     color:'var(--danger)',bg:'rgba(229,57,53,0.08)'};
  var salud=document.createElement('div');
  salud.style.cssText='border-radius:16px;padding:14px 16px;margin-bottom:12px;background:'+si.bg+';border:1.5px solid '+si.color+';';
  salud.innerHTML='<div style="display:flex;align-items:center;gap:12px;">'
    +'<div style="font-size:2rem;">'+si.emoji+'</div>'
    +'<div><div style="font-size:1rem;font-weight:900;color:'+si.color+';">'+si.label+'</div>'
    +'<div style="font-size:0.74rem;color:var(--dim);margin-top:2px;">Salud financiera · '+new Date().toLocaleString('es-MX',{month:'long',year:'numeric'})+'</div></div></div>';
  mc.appendChild(salud);
  
  var grid=document.createElement('div');
  grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;';
  var p=penultimo;
  grid.appendChild(kpi('🏛 Patrimonio neto', ultimo.patrimonioNeto, p?p.patrimonioNeto:null, false));
  grid.appendChild(kpi('💰 Efectivo+Banco',  ultimo.efectivo+ultimo.banco, p?p.efectivo+p.banco:null, false));
  grid.appendChild(kpi('🔴 Total deudas',    ultimo.totalDeudas, p?p.totalDeudas:null, true));
  grid.appendChild(kpi('🏦 Activos',         ultimo.totalActivos, p?p.totalActivos:null, false));
  grid.appendChild(kpi('📥 Ingresos mes',    ultimo.ingresos, p?p.ingresos:null, false));
  grid.appendChild(kpi('📤 Gastos mes',      ultimo.gastos, p?p.gastos:null, true));
  mc.appendChild(grid);
  var ultimos6=snaps.slice(-6);
  if(ultimos6.length>=1){
    var secG=document.createElement('div'); secG.className='card'; secG.style.marginBottom='12px';
    var titG=document.createElement('div'); titG.style.cssText='font-size:0.8rem;font-weight:800;margin-bottom:10px;'; titG.textContent='📈 Evolución del Patrimonio Neto';
    secG.appendChild(titG);
    var vals=ultimos6.map(function(s){ return s.patrimonioNeto; });
    var minV=Math.min.apply(null,vals), maxV=Math.max.apply(null,vals);
    var rango=maxV-minV||1;
    var W=300,H=90,px=12,py=10;
    var n=ultimos6.length;
    var pts=vals.map(function(v,i){
      var x=n>1?px+(i/(n-1))*(W-2*px):W/2;
      var y=H-py-((v-minV)/rango)*(H-2*py);
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    var lc=vals[vals.length-1]>=vals[0]?'#2d9e5f':'#e53935';
    var svg='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:90px;overflow:visible;">';
    if(minV<0&&maxV>0){
      var yz=H-py-((-minV)/rango)*(H-2*py);
      svg+='<line x1="'+px+'" y1="'+yz.toFixed(1)+'" x2="'+(W-px)+'" y2="'+yz.toFixed(1)+'" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,3"/>';
    }
    if(n>1) svg+='<polyline points="'+pts+'" fill="none" stroke="'+lc+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    vals.forEach(function(v,i){
      var x=n>1?px+(i/(n-1))*(W-2*px):W/2;
      var y=H-py-((v-minV)/rango)*(H-2*py);
      svg+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="'+lc+'" stroke="var(--card)" stroke-width="1.5"/>';
      var anchor=i===0?'start':i===n-1?'end':'middle';
      svg+='<text x="'+x.toFixed(1)+'" y="'+(y-7).toFixed(1)+'" text-anchor="'+anchor+'" font-size="8" fill="var(--dim)">'+fmt(v)+'</text>';
    });
    svg+='</svg>';
    var labelsRow=document.createElement('div');
    labelsRow.style.cssText='display:flex;justify-content:space-between;font-size:0.63rem;color:var(--dim);margin-top:2px;';
    ultimos6.forEach(function(s){
      var sp=document.createElement('span');
      sp.textContent=new Date(s.mes+'-02').toLocaleString('es-MX',{month:'short',year:'2-digit'});
      labelsRow.appendChild(sp);
    });
    secG.innerHTML+=svg;
    secG.appendChild(labelsRow);
    mc.appendChild(secG);
  }
  var secT=document.createElement('div'); secT.className='card'; secT.style.marginBottom='12px';
  var titT=document.createElement('div'); titT.style.cssText='font-size:0.8rem;font-weight:800;margin-bottom:10px;'; titT.textContent='📋 Historial mes a mes';
  secT.appendChild(titT);
  snaps.slice(-6).reverse().forEach(function(s){
    var idx2=snaps.indexOf(s);
    var prev=idx2>0?snaps[idx2-1]:null;
    var diff2=prev?s.patrimonioNeto-prev.patrimonioNeto:null;
    var col2=diff2===null?'var(--dim)':diff2>=0?'#2d9e5f':'var(--danger)';
    var fl2=diff2===null?'':diff2>=0?' ↑':' ↓';
    var mesLabel=new Date(s.mes+'-02').toLocaleString('es-MX',{month:'long',year:'numeric'});
    mesLabel=mesLabel.charAt(0).toUpperCase()+mesLabel.slice(1);
    var fila=document.createElement('div');
    fila.style.cssText='padding:9px 0;border-bottom:1px solid var(--border);font-size:0.75rem;';
    fila.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'
      +'<span style="font-weight:700;">'+mesLabel+'</span>'
      +'<span style="color:'+col2+';font-weight:800;">'+fmt(s.patrimonioNeto)+fl2+'</span>'
      +'</div>'
      +'<div style="display:flex;gap:10px;color:var(--dim);flex-wrap:wrap;">'
      +'<span>💰 '+fmt(s.efectivo+s.banco)+'</span>'
      +'<span style="color:var(--danger);">🔴 '+fmt(s.totalDeudas)+'</span>'
      +'<span style="color:var(--accent2);">🏦 '+fmt(s.totalActivos)+'</span>'
      +'<span>📥 '+fmt(s.ingresos)+'</span>'
      +'<span>📤 '+fmt(s.gastos)+'</span>'
      +'</div>';
    secT.appendChild(fila);
  });
  mc.appendChild(secT);
  var bSnap=document.createElement('button');
  bSnap.style.cssText='width:100%;padding:12px;background:var(--inp);color:var(--text);border:1.5px solid var(--border);border-radius:12px;font-family:\'Outfit\',sans-serif;font-weight:700;cursor:pointer;margin-bottom:14px;font-size:0.85rem;';
  bSnap.textContent='🔄 Actualizar datos ahora';
  bSnap.onclick=function(){
    var m2=new Date().toISOString().slice(0,7);
    localStorage.removeItem(_snapKey()+m2);
    _forzarSnapshot(m2,_snapKey()+m2);
    showToast('✓ Datos actualizados');
    renderProgreso();
  };
  mc.appendChild(bSnap);
}

function renderActivos(){
  var mc = document.getElementById('mainContent');
  mc.innerHTML = '';
  var activos = load('activos_personales',[]);
  var totalActivos = activos.reduce(function(s,a){ return s+(a.valor||0); },0);
  var hdr = document.createElement('div');
  hdr.innerHTML = '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">🏦 Mis Activos</div></div>';
  mc.appendChild(hdr);
  var res = document.createElement('div');
  res.className='card'; res.style.marginBottom='10px';
  res.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;">'
    +'<div><div style="font-size:0.75rem;color:var(--dim);">Valor total de activos</div>'
    +'<div style="font-size:1.5rem;font-weight:900;color:var(--accent2);">'+fmt(totalActivos)+'</div></div>'
    +'<div style="font-size:2rem;">🏦</div></div>';
  mc.appendChild(res);
  var bAdd = document.createElement('button');
  bAdd.style.cssText='width:100%;padding:13px;background:var(--accent);color:var(--navtext);border:none;border-radius:12px;font-family:\'Outfit\',sans-serif;font-weight:700;cursor:pointer;margin-bottom:14px;font-size:0.95rem;';
  bAdd.textContent='+ Registrar activo';
  bAdd.onclick=function(){ renderFormActivo(null); };
  mc.appendChild(bAdd);
  if(!activos.length){
    var empty=document.createElement('div');
    empty.style.cssText='text-align:center;padding:30px;color:var(--dim);font-size:0.83rem;';
    empty.textContent='Sin activos registrados. Agrega casa, carro, inversiones, etc.';
    mc.appendChild(empty); return;
  }
  var grupos={};
  activos.forEach(function(a){ var c=a.categoria||'📦 Otros'; if(!grupos[c]) grupos[c]=[]; grupos[c].push(a); });
  getActivosCats().forEach(function(cat){
    if(!grupos[cat]) return;
    var tit=document.createElement('div');
    tit.style.cssText='font-size:0.72rem;font-weight:800;color:var(--dim);text-transform:uppercase;letter-spacing:0.06em;margin:10px 0 6px;';
    tit.textContent=cat; mc.appendChild(tit);
    grupos[cat].forEach(function(a){
      var idx=activos.indexOf(a);
      var card=document.createElement('div');
      card.style.cssText='background:var(--card);border-radius:14px;padding:12px 14px;margin-bottom:8px;border:1.5px solid var(--border);';
      var row=document.createElement('div');
      row.style.cssText='display:flex;justify-content:space-between;align-items:flex-start;';
      var left=document.createElement('div'); left.style.flex='1';
      var nom=document.createElement('div'); nom.style.cssText='font-weight:700;font-size:0.9rem;'; nom.textContent=a.nombre; left.appendChild(nom);
      var meta=document.createElement('div'); meta.style.cssText='font-size:0.72rem;color:var(--dim);margin-top:2px;';
      meta.textContent=(a.descripcion||'')+(a.fecha?' · Desde '+a.fecha:''); left.appendChild(meta);
      var right=document.createElement('div'); right.style.cssText='display:flex;flex-direction:column;align-items:flex-end;gap:6px;';
      var val=document.createElement('div'); val.style.cssText='font-weight:800;font-size:0.95rem;color:var(--accent2);'; val.textContent=fmt(a.valor); right.appendChild(val);
      var btns=document.createElement('div'); btns.style.cssText='display:flex;gap:5px;';
      var bEd=document.createElement('button'); bEd.style.cssText='border:1px solid var(--border);border-radius:8px;padding:4px 8px;font-size:0.75rem;cursor:pointer;background:none;color:var(--accent);'; bEd.textContent='✏️';
      (function(i_){ bEd.onclick=function(){ renderFormActivo(i_); }; })(idx); btns.appendChild(bEd);
      var bDel=document.createElement('button'); bDel.style.cssText='border:1px solid rgba(229,57,53,0.3);border-radius:8px;padding:4px 8px;font-size:0.75rem;cursor:pointer;background:none;color:var(--danger);'; bDel.textContent='🗑';
      (function(i_){ bDel.onclick=function(){ borrarActivo(i_); }; })(idx); btns.appendChild(bDel);
      right.appendChild(btns); row.appendChild(left); row.appendChild(right); card.appendChild(row); mc.appendChild(card);
    });
  });
}

function borrarActivo(i){
  var aa=load('activos_personales',[]);
  if(!aa[i]) return;
  var eli=JSON.parse(JSON.stringify(aa[i]));
  aa.splice(i,1); save('activos_personales',aa);
  renderActivos();
  mostrarUndo('🏦 '+eli.nombre+' eliminado', function(){
    var aa2=load('activos_personales',[]); aa2.splice(i,0,eli); save('activos_personales',aa2); renderActivos();
  });
}

function renderConsejero(ing, gas, debo, totalDisp, pn){
  var nombre = S && S.user ? S.user.nombre.split(' ')[0] : 'tú';
  var balance      = ing - gas;           // flujo neto del periodo
  var balanceLibre = ing - gas - debo;    // flujo descontando deudas
  var tasaAhorro = ing > 0 ? (balance / ing) * 100 : (balance > 0 ? 100 : -100);
  var cargaDeuda = ing > 0 ? (debo / ing) * 100 : (debo > 0 ? 999 : 0);
  var cobertura = gas > 0 ? (totalDisp / gas) : (totalDisp > 0 ? 3 : 0);
  var puntos = 0;
  if(tasaAhorro >= 20)       puntos += 45;
  else if(tasaAhorro >= 10)  puntos += 32;
  else if(tasaAhorro >= 1)   puntos += 18;
  else if(tasaAhorro >= -10) puntos += 8;
  else                       puntos += 0;  // gasta mucho más de lo que gana
  if(cargaDeuda === 0)       puntos += 35;
  else if(cargaDeuda < 20)   puntos += 28;
  else if(cargaDeuda < 50)   puntos += 18;
  else if(cargaDeuda < 100)  puntos += 8;
  else                       puntos += 0;  // debe más de lo que gana
  if(cobertura >= 3)         puntos += 20;
  else if(cobertura >= 1)    puntos += 13;
  else if(cobertura >= 0.5)  puntos += 6;
  else                       puntos += 0;
  puntos = Math.min(100, Math.round(puntos));
  var expresion, colorBarra, tituloCard, mensaje, chips;
  if(puntos >= 78){
    expresion  = 'feliz';
    colorBarra = 'linear-gradient(90deg,#2bc070,#52d48e)';
    tituloCard = '¡Flujo de dinero sano! 🏆';
    mensaje    = '¡Excelente manejo, '+nombre+'! '
      + 'Tus ingresos superan tus gastos por '+fmt(balance)+' '
      + 'y tu carga de deuda es '+(cargaDeuda===0?'cero':'del '+Math.round(cargaDeuda)+'% de tus ingresos')+'. '
      + (cobertura >= 2 ? 'Tienes cobertura para ~'+Math.round(cobertura)+' meses sin ingresos. ' : '')
      + (balanceLibre > 0 ? '¡Con '+fmt(balanceLibre)+' libres podrías considerar invertir! 🚀' : '');
    chips = [
      {label:'Ahorro '+Math.round(Math.max(0,tasaAhorro))+'%', cls:'chip-verde'},
      debo===0 ? {label:'Sin deudas 🎉', cls:'chip-verde'} : {label:'Deuda manejable', cls:'chip-gold'},
      balanceLibre > 0 ? {label:'Invertir posible', cls:'chip-azul'} : null,
    ];
  } else if(puntos >= 55){
    expresion  = 'contento';
    colorBarra = 'linear-gradient(90deg,#3dbf7a,#ffb340)';
    tituloCard = 'Buen camino 👍';
    mensaje    = '¡Vas bien, '+nombre+'! '
      + (balance >= 0 ? 'Tu flujo es positivo: ingresas '+fmt(ing)+' y gastas '+fmt(gas)+'. '
                      : 'Tus gastos ('+fmt(gas)+') superan ligeramente tus ingresos ('+fmt(ing)+'). ')
      + (debo > 0 ? 'Tienes deudas por '+fmt(debo)+' — abónalas antes de gastar en extras. ' : '')
      + 'Con disciplina puedes llegar a una tasa de ahorro del 20%. 💪';
    chips = [
      {label:'Balance '+fmt(balance), cls: balance>=0?'chip-verde':'chip-rojo'},
      debo>0 ? {label:'Reduce deuda: '+fmt(debo), cls:'chip-gold'} : {label:'Sin deudas 🎉', cls:'chip-verde'},
      {label:'Meta: ahorro 20%', cls:'chip-azul'},
    ];
  } else if(puntos >= 28){
    expresion  = 'preocupado';
    colorBarra = 'linear-gradient(90deg,#ffb340,#ff6057)';
    tituloCard = 'Hay que ajustar ⚠️';
    mensaje    = (balance < 0
      ? '¡Cuidado, '+nombre+'! Gastaste '+fmt(Math.abs(balance))+' más de lo que ingresaste. '
      : 'Tu flujo es ajustado, '+nombre+'. Apenas queda '+fmt(balance)+' de margen. ')
      + (debo > 0 ? 'Más tus deudas de '+fmt(debo)+' — eso pesa fuerte. ' : '')
      + 'Detén gastos no esenciales esta semana y haz una lista de lo que debes. 🛑';
    chips = [
      balance < 0 ? {label:'Déficit '+fmt(Math.abs(balance)), cls:'chip-rojo'} : {label:'Margen ajustado', cls:'chip-gold'},
      debo > 0 ? {label:'Deuda: '+fmt(debo), cls:'chip-rojo'} : null,
      {label:'Cortar gastos ya', cls:'chip-gold'},
    ];
  } else {
    expresion  = 'triste';
    colorBarra = 'linear-gradient(90deg,#ff6057,#ff2010)';
    tituloCard = 'Flujo en rojo 🚨';
    mensaje    = '¡Necesitas actuar hoy, '+nombre+'! '
      + 'Gastas '+fmt(gas)+' pero solo ingresas '+fmt(ing)
      + (debo > 0 ? ', y además debes '+fmt(debo) : '')
      + '. Cada día que pasa el hoyo crece. '
      + 'Prioridad #1: detener el sangrado de gastos. Prioridad #2: generar un ingreso extra, aunque sea pequeño. ❤️';
    chips = [
      {label:'Déficit '+fmt(Math.abs(balance)), cls:'chip-rojo'},
      debo > 0 ? {label:'Deuda urgente: '+fmt(debo), cls:'chip-rojo'} : null,
      {label:'Plan de emergencia', cls:'chip-azul'},
    ];
  }
  var svg = _consejeroSVG(expresion);
  var chipsHtml = (chips||[]).filter(Boolean).map(function(c){
    return '<span class="consejero-chip '+c.cls+'">'+c.label+'</span>';
  }).join('');
  var barId = 'saludBar_' + Date.now();
  setTimeout(function(){
    var el = document.getElementById(barId);
    if(el) el.style.width = puntos + '%';
  }, 300);
  var nota = '<div style="font-size:0.68rem;color:var(--dim);margin-top:8px;padding:6px 10px;'
    +'background:rgba(0,0,0,0.05);border-radius:8px;border-left:2px solid var(--accent);">'
    +'ℹ️ Este análisis usa solo tu <b>flujo de dinero real</b> (ingresos, gastos y deudas). '
    +'El Patrimonio Neto <b>no se considera</b> para darte una lectura más honesta.'
    +'</div>';
  return '<div class="consejero-card" onclick="renderConsejeroDetalle()">'    +'<div class="consejero-avatar">'+svg+'</div>'    +'<div class="consejero-body">'    +'<div class="consejero-titulo">💡 Consejero Financiero</div>'    +'<div class="consejero-estado">'+tituloCard+'</div>'    +'<div class="consejero-msg">'+mensaje+'</div>'    +'<div class="consejero-chips">'+chipsHtml+'</div>'    +'<div style="margin-top:8px;">'    +'<div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--dim);margin-bottom:4px;">'    +'<span>Salud de flujo (sin patrimonio)</span>'    +'<span style="font-weight:700;color:var(--text);">'+puntos+'/100</span>'    +'</div>'    +'<div class="salud-bar-wrap"><div class="salud-bar-fill" id="'+barId+'" style="width:0%;background:'+colorBarra+';"></div></div>'    +'</div>'    +nota    +'</div>'    +'</div>';
}


function actualizarUMenu(){
  var c = getCuentas();
  var efectivo = Number(c.efectivo||0);
  var banco = (c.cheques||[]).reduce(function(s,x){ return s+Number(x.saldo||0); },0);
  var deudaTC = (c.tarjetas||[]).reduce(function(s,t){ return s+Number(t.balance||0); },0);
  var ef = document.getElementById('uMenuEfectivo');
  var ba = document.getElementById('uMenuBanco');
  var tc = document.getElementById('uMenuTC');
  if(ef) ef.textContent = '$' + efectivo.toLocaleString('es-MX', {minimumFractionDigits:2});
  if(ba) ba.textContent = '$' + banco.toLocaleString('es-MX', {minimumFractionDigits:2});
  if(tc) tc.textContent = 'Deuda: $' + deudaTC.toLocaleString('es-MX', {minimumFractionDigits:2});
}

function cerrarUMenu(){
  var menu = document.getElementById('uFabMenu');
  var btn  = document.getElementById('uFabBtn');
  if(!menu) return;
  menu.style.opacity = '0';
  menu.style.transform = 'scale(0.85) translateY(-10px)';
  setTimeout(function(){ menu.style.display = 'none'; }, 220);
  if(btn) btn.style.background = 'linear-gradient(135deg,var(--accent),var(--accent2))';
}

function toggleUMenu(){
  var menu = document.getElementById('uFabMenu');
  var btn  = document.getElementById('uFabBtn');
  if(!menu) return;
  var abierto = menu.style.display === 'block';
  if(abierto){
    cerrarUMenu();
  } else {
    actualizarUMenu();
    menu.style.display = 'block';
    requestAnimationFrame(function(){
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1) translateY(0)';
    });
    if(btn) btn.style.background = 'var(--accent2,#4f8ef7)';
    setTimeout(function(){
      function cerrarFuera(e){
        var dentroMenu = menu.contains(e.target);
        var esBtn = btn && (btn === e.target || btn.contains(e.target));
        if(!dentroMenu && !esBtn){
          cerrarUMenu();
          document.removeEventListener('touchstart', cerrarFuera);
          document.removeEventListener('click', cerrarFuera);
        }
      }
      document.addEventListener('touchstart', cerrarFuera, {passive:true});
      document.addEventListener('click', cerrarFuera);
    }, 300);
  }
}

function abrirMenu(){ toggleUMenu(); }

function menuAccion(accion){
  document.getElementById('menuModal').classList.remove('open');
  var nbs = document.querySelectorAll('.nb');
  function irMas(sub){
    nbs.forEach(function(b){ b.classList.remove('active'); });
    nbs[4].classList.add('active');
    S.tab='mas'; S.subtab=sub;
    var renders = {config:renderConfig, codigos:renderCodigos, noticias:renderNoticias};
    document.getElementById('mainContent').innerHTML = renders[sub] ? renders[sub]() : '';
  }
  if(accion==='tema'){ pickTema(); }
  else if(accion==='salir'){ cerrarSesion(); }
  else if(accion==='config'){ irMas('config'); }
  else if(accion==='codigos'){ irMas('codigos'); }
  else if(accion==='noticias'){ irMas('noticias'); }
}

function cerrarMenu(){ var m=document.getElementById('menuModal'); if(m) m.classList.remove('open'); }

function renderConfig(){
  var isAdmin=S.user&&S.user.isAdmin;
  return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">⚙️ Configuración</div></div>'
    +'<div class="card">'
    +'<div class="set-item" onclick="pickTema()"><div><div class="set-label">🎨 Cambiar tema</div></div><div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="abrirSelectorMoneda()"><div><div class="set-label">💱 Moneda de la app</div><div class="set-sub">'+_getMonedaApp()+'</div></div><div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="abrirConfigNip()"><div><div class="set-label">🔒 NIP de seguridad</div><div class="set-sub">'+(localStorage.getItem('usala_nip_'+(S.user&&S.user.isAdmin?'admin':'u_'+(S.user&&S.user.codigo)))?'Activado ✓':'Sin NIP')+'</div></div><div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="abrirConfigAutolock()"><div><div class="set-label">⏱ Bloqueo automático</div><div class="set-sub" id="autolockSubLabel">'
    +(function(){ var m=getLockTimeout(); var op=LOCK_OPCIONES.find(function(o){return o.val===m;}); return op?op.label:'Desactivado'; })()
    +'</div></div><div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="restablecerMic()"><div><div class="set-label">🎤 Restablecer micrófono</div><div class="set-sub" id="micEstadoLabel">'+_getMicEstado()+'</div></div><div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="goSub(\'version\')"><div><div class="set-label">📋 Versión</div><div class="set-sub">v'+APP_VERSION+'</div></div><div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="cerrarSesion()"><div><div class="set-label" style="color:var(--danger);">🚪 Cerrar sesión</div></div><div class="set-arrow">›</div></div>'
    +'</div>'
    +(isAdmin?'<div class="card" style="margin-top:12px;"><div class="card-title">Admin</div>'
    +'<div class="set-item"><div><div class="set-label">🔐 Nueva contraseña</div></div></div>'
    +'<input class="inp" id="np1" type="password" placeholder="Nueva contraseña" style="margin-bottom:8px;">'
    +'<input class="inp" id="np2" type="password" placeholder="Confirmar contraseña" style="margin-bottom:10px;">'
    +'<button class="btn-main" onclick="cambiarPass()">Cambiar contraseña</button>'
    +'</div>':'')
    +'<div class="card" style="margin-top:12px;">'
    +'<div class="card-title" style="margin-top:14px;">🏷️ Mis categorías</div>'
  +'<div style="font-size:0.75rem;color:var(--dim);margin-bottom:10px;">Categorías personalizadas en toda la app</div>'
  +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">'
  +'<button class="cat-add-btn" onclick="abrirCatModal(\'gasto\',null)">💸 Gastos</button>'
  +'<button class="cat-add-btn" onclick="abrirCatModal(\'ingreso\',null)">💰 Ingresos</button>'
  +'<button class="cat-add-btn" onclick="abrirCatModal(\'activos\',null)">🏦 Activos</button>'
  +'<button class="cat-add-btn" onclick="abrirCatModal(\'pagos\',null)">📅 Pagos fijos</button>'
  +'</div>'
  +'<div class="danger-zone">'
    +'<div class="danger-title">⚠️ Zona de peligro</div>'
    +'<button class="danger-btn" onclick="resetTxs()">🗑️ Borrar mis transacciones</button>'
    +'<button class="danger-btn" onclick="resetCuenta()">♻️ Restablecer toda mi cuenta</button>'
    +'</div></div>';
}

function renderAyuda(){
  var st = _getSecurityStatus();
  var nipOk   = st.nip;
  var lockOk  = st.autolock;
  var ambos   = nipOk && lockOk;
  var secCard = '<div style="border-radius:18px;padding:16px;margin-bottom:16px;'
    +(ambos
      ? 'background:rgba(45,158,95,0.08);border:1.5px solid rgba(45,158,95,0.25);'
      : 'background:rgba(229,57,53,0.06);border:1.5px solid rgba(229,57,53,0.2);')
    +'">'
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">'
      +'<div style="font-size:2rem;line-height:1;">'+(ambos?'🛡️':'⚠️')+'</div>'
      +'<div>'
        +'<div style="font-weight:900;font-size:0.9rem;">'
          +(ambos?'Tu cuenta está protegida ✓':'Tu seguridad necesita atención')
        +'</div>'
        +'<div style="font-size:0.72rem;color:var(--dim);margin-top:2px;">'
          +(ambos?'NIP activo + bloqueo automático configurado':'Configura NIP y bloqueo para proteger tus datos')
        +'</div>'
      +'</div>'
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">'
      +'<div style="display:flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:700;padding:5px 10px;border-radius:20px;'
        +(nipOk?'background:rgba(45,158,95,0.12);color:#2d7a4f;':'background:rgba(229,57,53,0.1);color:#c62828;')
        +'">'+( nipOk?'✅':'❌')+' NIP de seguridad</div>'
      +'<div style="display:flex;align-items:center;gap:5px;font-size:0.72rem;font-weight:700;padding:5px 10px;border-radius:20px;'
        +(lockOk?'background:rgba(45,158,95,0.12);color:#2d7a4f;':'background:rgba(229,57,53,0.1);color:#c62828;')
        +'">'+( lockOk?'✅':'❌')+' Bloqueo automático</div>'
    +'</div>';
  if(!ambos){
    secCard += '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
      +(!nipOk?'<button onclick="goSub(\'config_nip\')" style="background:#c62828;color:#fff;border:none;border-radius:20px;padding:7px 14px;font-family:Outfit,sans-serif;font-size:0.72rem;font-weight:800;cursor:pointer;">🔒 Activar NIP</button>':'')
      +(!lockOk?'<button onclick="abrirConfigAutolock()" style="background:#e65100;color:#fff;border:none;border-radius:20px;padding:7px 14px;font-family:Outfit,sans-serif;font-size:0.72rem;font-weight:800;cursor:pointer;">⏱ Bloqueo auto</button>':'')
    +'</div>';
  }
  secCard += '</div>';
  var html = '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">❓ Ayuda</div></div>'
    + secCard
    +'<div style="position:relative;margin-bottom:16px;">'
      +'<input class="inp" id="ayudaBusca" placeholder="🔍 Buscar en la ayuda..." oninput="filtrarAyuda()" style="padding-left:16px;">'
    +'</div>'
    +'<div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px;scrollbar-width:none;">'
      +'<div style="display:flex;gap:7px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px;scrollbar-width:none;">'
      +'<button class="ayuda-chip active" id="chip_todos" data-cat="" onclick="ayudaChipEv(this)">Todos</button>'
      +'<button class="ayuda-chip" data-cat="Seguridad" onclick="ayudaChipEv(this)">🔐 Seguridad</button>'
      +'<button class="ayuda-chip" data-cat="Pagos" onclick="ayudaChipEv(this)">📅 Pagos</button>'
      +'<button class="ayuda-chip" data-cat="Cuentas" onclick="ayudaChipEv(this)">🏦 Cuentas</button>'
      +'<button class="ayuda-chip" data-cat="Créditos" onclick="ayudaChipEv(this)">🤝 Créditos</button>'
      +'<button class="ayuda-chip" data-cat="Voz" onclick="ayudaChipEv(this)">🎙️ Voz</button>'
      +'<button class="ayuda-chip" data-cat="Config" onclick="ayudaChipEv(this)">⚙️ Config</button>'
    +'</div>'
    +'<div id="ayudaLista">'+renderFaqs('')+'</div>';
  return html;
}

function renderVersion(){
  var isAdmin=S.user&&S.user.isAdmin;
  return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">📋 Versión</div></div>'
    +'<div class="card" style="text-align:center;padding:28px 20px;">'
    +'<div style="font-size:2rem;font-weight:900;color:var(--accent);font-family:\'JetBrains Mono\',monospace;">v'+APP_VERSION+'</div>'
    +'<div style="font-size:0.8rem;color:var(--dim);margin-top:8px;">'+APP_NOTAS+'</div>'
    +'</div>'
    +(isAdmin?'<div class="card"><div class="card-title">Editar versión</div>'
    +'<label class="inp-label">Número</label><input class="inp" id="vNum" value="'+APP_VERSION+'">'
    +'<label class="inp-label">Notas</label><textarea class="inp" id="vNotas" rows="3" style="resize:none;">'+APP_NOTAS+'</textarea>'
    +'<button class="btn-main" onclick="guardarVersion()">💾 Guardar</button>'
    +'</div>':'');
}


function backBtn(tab, idx){
  return '<button class="back-btn" onclick="goTab(\''+tab+'\',document.querySelectorAll(\'.nb\')['+idx+'])" style="width:36px;height:36px;border-radius:50%;background:var(--inp);border:1px solid var(--border);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:var(--text);cursor:pointer;flex-shrink:0;transition:background 0.15s;">‹</button>';
}

function backSubBtn(label){
  return '<button class="back-btn" onclick="goTab(S.tab,document.querySelector(\'.nb.active\'))" style="width:36px;height:36px;border-radius:50%;background:var(--inp);border:1px solid var(--border);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:var(--text);cursor:pointer;flex-shrink:0;transition:background 0.15s;">‹</button>';
}

function showScreen(id){
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
}

function showToast(msg){ var t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(function(){ t.remove(); },2500); }

function mostrarUndo(msg, fn){
  if(_undoTimer) clearTimeout(_undoTimer);
  var old = document.getElementById('undoBar'); if(old) old.remove();
  _undoFn = fn;
  setTimeout(function(){
    var d = document.createElement('div'); d.id='undoBar'; d.className='undo-bar';
    d.innerHTML = '<div style="display:flex;align-items:center;gap:8px;flex:1;">'
      +'<span style="flex:1;">'+msg+'</span>'
      +'<button class="undo-btn" onclick="ejecutarUndo()">↩ Deshacer</button>'
      +'</div>'
      +'<div class="undo-prog" id="undoProg"></div>';
    document.body.appendChild(d);
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        var p=document.getElementById('undoProg'); if(p) p.style.width='0%';
      });
    });
    _undoTimer = setTimeout(function(){
      var u=document.getElementById('undoBar'); if(u){ u.style.opacity='0'; u.style.transform='translateY(10px)'; u.style.transition='opacity 0.3s,transform 0.3s'; setTimeout(function(){ if(u.parentNode) u.remove(); },300); } _undoFn=null;
    }, 7000);
  }, 0);
}

function ejecutarUndo(){
  if(_undoTimer) clearTimeout(_undoTimer);
  var u=document.getElementById('undoBar'); if(u) u.remove();
  if(_undoFn){ _undoFn(); _undoFn=null; }
}

