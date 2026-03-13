
// ── Validación de contraseña (6 reglas) ──────────
function validarPassword(pass){
  var errores = [];

  // 1. Longitud mínima 8 caracteres
  if(pass.length < 8){
    errores.push('Mínimo 8 caracteres');
  }

  // 2. Al menos una mayúscula
  if(!/[A-Z]/.test(pass)){
    errores.push('Al menos una mayúscula (A-Z)');
  }

  // 3. Al menos una minúscula
  if(!/[a-z]/.test(pass)){
    errores.push('Al menos una minúscula (a-z)');
  }

  // 4. Al menos un carácter especial (no letra, no número)
  if(!/[^A-Za-z0-9]/.test(pass)){
    errores.push('Al menos un carácter especial (!@#$%...)');
  }

  // 5. No números consecutivos (3+ seguidos en secuencia: 123, 234, 345...)
  var digits = pass.split('');
  for(var i = 0; i <= digits.length - 3; i++){
    var a = digits[i].charCodeAt(0);
    var b = digits[i+1].charCodeAt(0);
    var c = digits[i+2].charCodeAt(0);
    var isDigitSeq = (
      digits[i] >= '0' && digits[i] <= '9' &&
      digits[i+1] >= '0' && digits[i+1] <= '9' &&
      digits[i+2] >= '0' && digits[i+2] <= '9'
    );
    if(isDigitSeq && b === a+1 && c === b+1){
      errores.push('No se permiten números consecutivos (ej: 123, 456)');
      break;
    }
  }

  // 6. No letras consecutivas del abecedario (3+ seguidas: abc, bcd, xyz...)
  var letras = pass.toLowerCase().split('');
  for(var j = 0; j <= letras.length - 3; j++){
    var l1 = letras[j];
    var l2 = letras[j+1];
    var l3 = letras[j+2];
    var esLetra = function(ch){ return ch >= 'a' && ch <= 'z'; };
    if(esLetra(l1) && esLetra(l2) && esLetra(l3)){
      var c1 = l1.charCodeAt(0);
      var c2 = l2.charCodeAt(0);
      var c3 = l3.charCodeAt(0);
      if(c2 === c1+1 && c3 === c2+1){
        errores.push('No se permiten letras consecutivas del abecedario (ej: abc, xyz)');
        break;
      }
    }
  }

  return errores; // [] = válida, [msg1, msg2...] = inválida
}

// ── Indicador visual de fortaleza de contraseña ──
function renderPasswordStrength(pass, containerId){
  var el = document.getElementById(containerId);
  if(!el) return;

  var errores = validarPassword(pass);
  var reglas = [
    { label:'8+ caracteres',         ok: pass.length >= 8 },
    { label:'Mayúscula',             ok: /[A-Z]/.test(pass) },
    { label:'Minúscula',             ok: /[a-z]/.test(pass) },
    { label:'Carácter especial',     ok: /[^A-Za-z0-9]/.test(pass) },
    { label:'Sin números seguidos',  ok: !/(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)){2}/.test(pass) },
    { label:'Sin letras seguidas',   ok: !/(?:a(?=b)|b(?=c)|c(?=d)|d(?=e)|e(?=f)|f(?=g)|g(?=h)|h(?=i)|i(?=j)|j(?=k)|k(?=l)|l(?=m)|m(?=n)|n(?=o)|o(?=p)|p(?=q)|q(?=r)|r(?=s)|s(?=t)|t(?=u)|u(?=v)|v(?=w)|w(?=x)|x(?=y)|y(?=z)){2}/i.test(pass) },
  ];

  var cumplidas = reglas.filter(function(r){ return r.ok; }).length;
  var pct = Math.round((cumplidas / reglas.length) * 100);

  // Color de la barra
  var barColor = pct < 40 ? '#ff5f57' : pct < 70 ? '#ffd60a' : pct < 100 ? '#38aaff' : '#2bc070';

  var html = '<div style="margin-top:10px;">'
    + '<div style="display:flex;justify-content:space-between;margin-bottom:4px;">'
    + '<span style="font-size:0.65rem;color:rgba(255,255,255,0.4);font-weight:600;">Seguridad</span>'
    + '<span style="font-size:0.65rem;font-weight:700;color:'+barColor+';">'
    + (pct===100?'Contraseña segura ✅':pct>=70?'Casi lista':'Muy débil')
    + '</span></div>'
    + '<div style="height:4px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;margin-bottom:10px;">'
    + '<div style="height:100%;width:'+pct+'%;background:'+barColor+';border-radius:4px;transition:width 0.3s ease,background 0.3s ease;"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">';

  reglas.forEach(function(r){
    html += '<div style="display:flex;align-items:center;gap:5px;font-size:0.65rem;color:'
      + (r.ok ? 'rgba(43,192,112,0.9)' : 'rgba(255,255,255,0.3)') + ';">'
      + '<span style="font-size:0.6rem;">' + (r.ok ? '✓' : '○') + '</span>'
      + r.label + '</div>';
  });

  html += '</div></div>';
  el.innerHTML = html;
}

// ── Mostrar errores de validación inline ──────────
function mostrarErroresPass(errores, containerId){
  var el = document.getElementById(containerId);
  if(!el) return;
  if(!errores || errores.length === 0){ el.innerHTML = ''; return; }
  var html = '<div style="background:rgba(255,95,87,0.08);border:1px solid rgba(255,95,87,0.2);border-radius:10px;padding:10px 12px;margin-top:8px;">'
    + '<div style="font-size:0.68rem;font-weight:700;color:#ff8a80;margin-bottom:6px;">La contraseña no cumple con:</div>';
  errores.forEach(function(e){
    html += '<div style="font-size:0.65rem;color:rgba(255,138,128,0.8);margin-bottom:2px;">• ' + e + '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}
// ─────────────────────────────────────────────
//  USALA Suite — Autenticación y Sesión
//  js/auth.js
// ─────────────────────────────────────────────

// ── Variables de estado ──


function arrancarApp(){
    var raw = localStorage.getItem('usala_session');
    if(raw){
      try{
        var ses = JSON.parse(raw);
        if(ses.isAdmin){
          var nipKeyA = 'usala_nip_admin';
          var nipA = localStorage.getItem(nipKeyA);
          if(nipA){
            showScreen('accessScreen');
            _sesionPendiente = ses;
            mostrarPanelConNip('Admin');
          } else {
            showScreen('accessScreen');
            document.getElementById('panelSesion').style.display = 'block';
            document.getElementById('panelCodigo').style.display  = 'none';
            document.getElementById('nipZona').style.display = 'none';
            document.getElementById('sinNipZona').style.display = 'block';
            var elNomA = document.getElementById('sesionNombre');
            if(elNomA) elNomA.textContent = 'Administrador';
            var elAvA = document.getElementById('sesionAvatar');
            if(elAvA) elAvA.textContent = '👑';
            _sesionPendiente = ses;
          }
          return;
        }
        // Sesión de usuario invitado — confiar en la sesión guardada
        // (la validación real de vencimiento ocurre en Supabase al entrar)
        showScreen('accessScreen');
        var nipKey2 = 'usala_nip_u_' + ses.codigo;
        var nip2 = localStorage.getItem(nipKey2);
        if(nip2){
          _sesionPendiente = ses;
          mostrarPanelConNip(ses.nombre ? ses.nombre.split(' ')[0] : 'Hola');
        } else {
          document.getElementById('panelSesion').style.display = 'block';
          document.getElementById('panelCodigo').style.display  = 'none';
          document.getElementById('nipZona').style.display = 'none';
          document.getElementById('sinNipZona').style.display = 'block';
          var elNom = document.getElementById('sesionNombre');
          if(elNom) elNom.textContent = ses.nombre || 'Bienvenido';
          var elAv = document.getElementById('sesionAvatar');
          if(elAv) elAv.textContent = ses.nombre ? ses.nombre.charAt(0).toUpperCase() : '👤';
          _sesionPendiente = ses;
        }
        return;
      }catch(e){ localStorage.removeItem('usala_session'); }
    }
    showScreen('accessScreen');
    document.getElementById('panelSesion').style.display = 'none';
    document.getElementById('panelCodigo').style.display  = 'block';
  }

function verificarCodigo(){
  var codigo   = (document.getElementById('accCodigo').value||'').trim().toUpperCase();
  var errEl    = document.getElementById('accessErr');
  var btn      = document.querySelector('#panelCodigo .lg-btn');
  var nombreInp= document.getElementById('accNombre');
  var passEl   = document.getElementById('accPassword');
  var passRow  = document.getElementById('accPassRow');
  var nombreRow= document.getElementById('accNombreRow');

  function showErr(msg){
    if(errEl){ errEl.textContent=msg; errEl.style.display='block'; }
    if(btn){ btn.textContent='Entrar →'; btn.disabled=false; }
  }
  function clearErr(){
    if(errEl) errEl.style.display='none';
  }

  clearErr();
  if(!codigo){ showErr('Ingresa tu código de acceso'); return; }
  if(btn){ btn.textContent='Verificando...'; btn.disabled=true; }

  dbVerificarCodigo(codigo).then(async function(u){
    // ── CASO A: usuario encontrado en Supabase ──
    if(u){
      // Verificar si está bloqueado
      if(u.activo === false){ showErr('Tu acceso ha sido suspendido. Contacta al administrador.'); return; }

      // Verificar vencimiento
      if(u.vencimiento){
        var venc = new Date(u.vencimiento);
        if(!isNaN(venc.getTime()) && venc < new Date()){ showErr('Tu acceso ha vencido. Pide al admin que lo renueve.'); return; }
      }

      // Nombre: de Supabase o del input
      var nombre = (nombreInp ? nombreInp.value.trim() : '') || u.nombre || '';

      // Contraseña: si tiene, verificar
      if(u.password_hash && !_accPassVerificada){
        if(!passEl || !passEl.value.trim()){
          if(passRow) passRow.style.display = 'block';
          if(nombreRow) nombreRow.style.display = 'none';
          showErr('Ingresa tu contraseña');
          if(passEl) passEl.focus();
          return;
        }
        var ok = await dbVerificarPass(codigo, passEl.value);
        if(!ok){ showErr('Contraseña incorrecta'); _accPassVerificada=false; return; }
        _accPassVerificada = true;
      }

      // Contraseña nueva opcional
      if(!u.password_hash && !_saltarPass){
        var npEl = document.getElementById('accNuevaPass');
        if(npEl && npEl.value && npEl.value.length >= 1){
          // Validar contraseña con las 6 reglas
          var passErrList = validarPassword(npEl.value);
          if(passErrList.length > 0){
            var errEl2 = document.getElementById('accessErr');
            if(errEl2){
              errEl2.innerHTML = '<b style="display:block;margin-bottom:4px;">La contraseña no cumple:</b>'
                + passErrList.map(function(e){ return '• '+e; }).join('<br>');
              errEl2.style.display = 'block';
            }
            if(btn){ btn.textContent='Entrar →'; btn.disabled=false; }
            if(npEl) npEl.focus();
            return;
          }
          await dbGuardarPass(codigo, npEl.value);
          // ── Registro completado → redirigir al login ──
          _saltarPass = false; _accPassVerificada = false;
          if(btn){ btn.textContent='Entrar →'; btn.disabled=false; }
          mostrarExitoRegistro(nombre, codigo);
          return;
        }
      }

      // Nombre obligatorio si no se tiene
      if(!nombre){
        if(nombreRow) nombreRow.style.display='block';
        showErr('Escribe tu nombre para continuar');
        return;
      }

      // Actualizar registros
      _saltarPass=false; _accPassVerificada=false;
      DB.update('usala_usuarios','codigo=eq.'+encodeURIComponent(codigo),
        {nombre:nombre, ultimo_acceso:new Date().toISOString()}).catch(function(){});
      _guardarCodigoLocal(codigo, nombre, u.vencimiento||'2099-12-31');
      if(btn){ btn.textContent='Entrar →'; btn.disabled=false; }
      _entrarComoUsuario(nombre, codigo);
      return;
    }

    // ── CASO B: no está en Supabase — buscar en localStorage ──
    var cods = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
    var cod  = cods.find(function(c){ return c.codigo===codigo && c.activo!==false; });

    if(!cod){
      showErr('Código incorrecto o no existe');
      return;
    }

    // Verificar vencimiento local
    if(cod.vencimiento && cod.vencimiento !== '3650'){
      var vencL = new Date((cod.vencimiento||'2099-12-31').replace(/-/g,'/'));
      if(vencL < new Date()){ showErr('Este código ha vencido. Pide al admin que lo renueve.'); return; }
    }

    // Nombre
    var nombreLocal = (nombreInp ? nombreInp.value.trim() : '') || cod.nombreUsuario || cod.nombre || '';
    if(!nombreLocal){
      if(nombreRow) nombreRow.style.display='block';
      showErr('Escribe tu nombre para continuar');
      return;
    }

    if(btn){ btn.textContent='Entrar →'; btn.disabled=false; }
    _entrarComoUsuario(nombreLocal, codigo);

  }).catch(function(e){
    // ── CASO C: sin conexión — usar localStorage ──
    console.warn('verificarCodigo sin conexion:', e);
    var cods = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
    var cod  = cods.find(function(c){ return c.codigo===codigo && c.activo!==false; });
    if(cod){
      var nombre = (nombreInp ? nombreInp.value.trim() : '') || cod.nombreUsuario || cod.nombre || '';
      if(!nombre){
        if(nombreRow) nombreRow.style.display='block';
        showErr('Escribe tu nombre para continuar');
        return;
      }
      showToast('Sin conexion — entrando con datos locales');
      _entrarComoUsuario(nombre, codigo);
    } else {
      showErr('Sin conexion y codigo no encontrado localmente');
    }
  });
}

function _entrarComoUsuario(nombre, codigo){
  var btn = document.querySelector('#panelCodigo .lg-btn');
  if(btn){ btn.textContent='Entrar →'; btn.disabled=false; }
  localStorage.setItem('usala_session', JSON.stringify({nombre:nombre,codigo:codigo,isAdmin:false}));
  var nip = localStorage.getItem('usala_nip_u_'+codigo);
  if(nip){ _sesionPendiente={nombre:nombre,codigo:codigo,isAdmin:false}; mostrarPanelConNip(nombre.split(' ')[0]); }
  else   { S.user={nombre:nombre,codigo:codigo,isAdmin:false}; initDashboard(); }
}

function entrarSesionGuardada(){
  var ses = _sesionPendiente || JSON.parse(localStorage.getItem('usala_session')||'null');
  if(!ses){ mostrarPanelCodigo(); return; }
  S.user = { nombre: ses.nombre, codigo: ses.codigo, isAdmin: !!ses.isAdmin };
  localStorage.setItem('usala_session', JSON.stringify(S.user));
  _sesionPendiente = null;
  initDashboard();
}

function verificarAdmin(){
  var pass=(document.getElementById('adminPass').value||'').trim();
  var err=document.getElementById('adminErr');
  var guardada=localStorage.getItem('usala_admin_pass')||'admin1234';
  if(pass==='admin1234'||pass===guardada){
    cerrarAdminModal();
    var nip=localStorage.getItem('usala_nip_admin');
    if(nip){
      _sesionPendiente={nombre:'Administrador',codigo:'admin',isAdmin:true};
      mostrarPanelConNip('Admin');
    } else {
      S.user={nombre:'Administrador',codigo:'admin',isAdmin:true};
      localStorage.setItem('usala_session',JSON.stringify({nombre:'Administrador',codigo:'admin',isAdmin:true}));
      dbEnsureUser('admin','Administrador',true).then(function(){
        dbSyncFromLocal();
      });
      initDashboard();
    }
  } else {
    if(err){ err.textContent='Contraseña incorrecta'; err.style.display='block'; }
    var p=document.getElementById('adminPass'); if(p) p.value='';
  }
}

function verificarNip(){
  var key=nipKey();
  if(!key) return;
  var stored=localStorage.getItem(key);
  if(_nipBuffer===stored){
    var err=document.getElementById('nipErr'); if(err) err.style.display='none';
    if(_sesionPendiente.isAdmin){
      S.user={nombre:'Administrador',codigo:'ADMIN',isAdmin:true};
    } else {
      S.user={nombre:_sesionPendiente.nombre,codigo:_sesionPendiente.codigo,isAdmin:false};
    }
    localStorage.setItem('usala_session',JSON.stringify(S.user));
    _sesionPendiente=null; _nipBuffer='';
    initDashboard();
  } else {
    _nipBuffer='';
    _actualizarNipDots();
    var err=document.getElementById('nipErr');
    if(err){ err.textContent='NIP incorrecto'; err.style.display='block'; }
    var nd=document.querySelector('.nip-dots');
    if(nd){ nd.style.animation='none'; setTimeout(function(){ nd.style.animation=''; },10); }
  }
}

function mostrarPanelConNip(nombre){
  // Ocultar todos los paneles y mostrar el de sesión con NIP
  ['panelCodigo','panelSolicitud','panelEnviada'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  var ps=document.getElementById('panelSesion'); if(ps) ps.style.display='block';
  document.getElementById('nipZona').style.display='block';
  document.getElementById('sinNipZona').style.display='none';
  document.getElementById('nipErr').style.display='none';
  var sn=document.getElementById('sesionNombre'); if(sn) sn.textContent=nombre;
  _nipBuffer='';
  _actualizarNipDots();
}

function abrirAdminModal(){
  var m=document.getElementById('adminModal');
  if(m){ m.classList.add('open'); }
  var p=document.getElementById('adminPass'); if(p){ p.value=''; setTimeout(function(){p.focus();},100); }
  var e=document.getElementById('adminErr'); if(e) e.style.display='none';
}

function cerrarAdminModal(){
  var m=document.getElementById('adminModal');
  if(m) m.classList.remove('open');
}

function cerrarSesion(){
  usalaConfirm('Cerrar sesion?\n\nTus datos quedan guardados localmente.', function(){
    localStorage.removeItem('usala_session');
      S.user=null; S.tab='inicio';
      document.getElementById('accNombre').value='';
      document.getElementById('accCodigo').value='';
      _accMostrarNombreRow(true);  // resetear UI al estado inicial
      document.getElementById('panelSesion').style.display='none';
      document.getElementById('panelCodigo').style.display='block';
      var ub = document.getElementById('uFabBtn');
      var um = document.getElementById('uFabMenu');
      if(ub) ub.style.display='none';
      if(um) um.style.display='none';
      showScreen('accessScreen');
  });
}

function initDashboard(){
  showScreen('dashboard');
  _lockIniciarEscuchas();
  _lockReiniciar();
  dbRestaurarDatos().then(function(){
    renderTab(S.tab || 'inicio');
    setTimeout(iniciarRealtime, 1000);
    if(S.user && S.user.isAdmin){
      actualizarBadgeSolicitudes();
      setInterval(actualizarBadgeSolicitudes, 30000);
    }
  });
  var ub = document.getElementById('uFabBtn');
  if(ub) ub.style.display = 'flex';
  actualizarUMenu();
  if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window){
    var bv = document.getElementById('btnVoz');
    if(bv) bv.style.display = 'flex';
  }
  var u = S.user;
  var un = document.getElementById('topUserName');
  if(un) un.textContent = u.isAdmin ? '⚙️ Admin' : '👤 ' + u.nombre;
  var vb = document.getElementById('verBadge'); if(vb) vb.textContent = 'v' + APP_VERSION;
  if(u.isAdmin){
    actualizarBadgeSolicitudes();
  }
  goTab('inicio', document.querySelector('.nb'));
  setTimeout(guardarSnapshotMes, 1500); // snapshot silencioso al arrancar
  if(!u.isAdmin){
    var keyVisto = 'usala_bienvenida_' + u.codigo;
    if(!localStorage.getItem(keyVisto)){
      setTimeout(function(){
        var wn = document.getElementById('welcomeName');
        if(wn) wn.textContent = '¡Bienvenid@, ' + u.nombre.split(' ')[0] + '! 👋';
        var m = document.getElementById('welcomeModal');
        var bd = document.getElementById('welcomeBackdrop');
        var sh = document.getElementById('welcomeSheet');
        if(m){
          m.style.display = 'flex';
          requestAnimationFrame(function(){
            if(bd) bd.style.background = 'rgba(0,0,0,0.55)';
            if(sh) sh.style.transform = 'translateY(0)';
          });
        }
      }, 700);
    }
  }
}

function mostrarPanelCodigo(forzar){
  ['panelSesion','panelSolicitud','panelEnviada'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.style.display='none';
  });
  var pc = document.getElementById('panelCodigo');
  if(pc){ pc.style.display='block'; }
  var err = document.getElementById('accessErr');
  if(err){ err.style.display='none'; }
  if(forzar){
    localStorage.removeItem('usala_session');
    var ci = document.getElementById('accCodigo'); if(ci) ci.value='';
    var ni = document.getElementById('accNombre'); if(ni) ni.value='';
    var nr = document.getElementById('accNombreRow'); if(nr) nr.style.display='block';
    var sa = document.getElementById('accSaludo');   if(sa) sa.style.display='none';
  }
}

async function dbVerificarCodigo(codigo){
  try {
    var rows = await DB.get('usala_usuarios',
      'codigo=eq.' + encodeURIComponent(codigo) +
      '&activo=eq.true'
    );
    if(!rows || rows.length === 0) return null;
    var u = rows[0];
    if(u.is_admin) return null;
    if(u.vencimiento){
      var venc = new Date(u.vencimiento);
      if(!isNaN(venc.getTime()) && venc < new Date()) return null;
    }
    return u;
  } catch(e) { console.warn('dbVerificarCodigo:', e); return null; }
}

async function dbVerificarPass(codigo, pass){
  var hash = await _hashPass(pass);
  try {
    var rows = await DB.get('usala_usuarios',
      'codigo=eq.' + encodeURIComponent(codigo) +
      '&password_hash=eq.' + encodeURIComponent(hash));
    return rows && rows.length > 0;
  } catch(e){ return false; }
}

async function dbGuardarPass(codigo, pass){
  var hash = await _hashPass(pass);
  try {
    await DB.update('usala_usuarios', 'codigo=eq.' + encodeURIComponent(codigo), { password_hash: hash });
    return true;
  } catch(e){ return false; }
}

async function dbEnsureUser(codigo, nombre, isAdmin){
  try {
    var rows = await DB.get('usala_usuarios', 'codigo=eq.' + encodeURIComponent(codigo));
    if(rows && rows.length > 0){
      DB.update('usala_usuarios', 'codigo=eq.' + encodeURIComponent(codigo), { ultimo_acceso: new Date().toISOString() });
      return rows[0];
    }
    var res = await DB.insert('usala_usuarios', { codigo: codigo, nombre: nombre, is_admin: isAdmin, activo: true });
    return res[0];
  } catch(e) { console.warn('dbEnsureUser:', e); return null; }
}

async function dbCrearCodigo(codigo, nombre, vencimiento, contacto, nota){
  try {
    var res = await DB.insert('usala_usuarios', {
      codigo: codigo, nombre: nombre, is_admin: false,
      activo: true, vencimiento: vencimiento, contacto: contacto, nota: nota
    });
    _cacheInvalid('codigos');
    return res[0];
  } catch(e) { console.warn('dbCrearCodigo:', e); return null; }
}

async function dbActualizarSolicitud(id, estado, codigoGenerado){
  try {
    var data = { estado: estado };
    if(codigoGenerado) data.codigo_generado = codigoGenerado;
    await DB.update('usala_solicitudes', 'id=eq.'+id, data);
  } catch(e){ console.warn('dbActualizarSolicitud:', e); }
}

async function dbGetSolicitudes(){
  try {
    // Traer pendientes Y aprobadas (para poder revocar códigos al eliminar)
    var rows = await DB.get('usala_solicitudes',
      'estado=in.(pendiente,aprobada)&order=fecha.desc');
    return rows || [];
  } catch(e){
    return JSON.parse(localStorage.getItem('usala_solicitudes')||'[]')
      .filter(function(s){ return s.estado==='pendiente' || s.estado==='aprobada'; });
  }
}

function _guardarCodigoLocal(codigo, nombre, vencimiento){
  var cods = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  var ex = cods.find(function(c){ return c.codigo===codigo; });
  if(!ex){ cods.push({codigo:codigo, nombre:nombre, nombreUsuario:nombre, activo:true, vencimiento:vencimiento}); }
  else   { ex.nombreUsuario=nombre; ex.nombre=nombre; ex.activo=true; if(vencimiento) ex.vencimiento=vencimiento; }
  localStorage.setItem('usala_codigos', JSON.stringify(cods));
}

function accCodigoLookup(val){
  if(_accLookupTimer) clearTimeout(_accLookupTimer);
  val = (val||'').toUpperCase().trim();
  var passRow  = document.getElementById('accPassRow');
  var crearRow = document.getElementById('accCrearPassRow');
  var nombreRow= document.getElementById('accNombreRow');
  var errEl    = document.getElementById('accessErr');
  if(passRow)  passRow.style.display  = 'none';
  if(crearRow) crearRow.style.display = 'none';
  if(errEl)    errEl.style.display    = 'none';
  if(val.length >= 4){
    var cods = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
    var cod  = cods.find(function(c){ return c.codigo===val; });
    if(cod && cod.nombreUsuario){
      _accMostrarNombreRow(false, cod.nombreUsuario);
    }
  }
  if(!val || val.length < 4) { _accMostrarNombreRow(true); return; }
  _accLookupTimer = setTimeout(function(){
    dbVerificarCodigo(val).then(function(u){
      if(!u){
        return;
      }
      if(u.nombre) _accMostrarNombreRow(false, u.nombre);
      if(u.password_hash){
        if(passRow)  passRow.style.display  = 'block';
        if(nombreRow) nombreRow.style.display = 'none';
        var passEl = document.getElementById('accPassword');
        if(passEl) passEl.focus();
      } else {
        if(crearRow) crearRow.style.display = 'block';
        if(!u.nombre && nombreRow) nombreRow.style.display = 'block';
      }
    }).catch(function(){}); // silencioso — offline no es error
  }, 600);
}

function _accMostrarNombreRow(mostrar,nombre){
  var row    = document.getElementById('accNombreRow');
  var saludo = document.getElementById('accSaludo');
  var av     = document.getElementById('accSaludoAvatar');
  var sNom   = document.getElementById('accSaludoNombre');
  var titulo = document.getElementById('accTitulo');
  var sub    = document.getElementById('accSubtitulo');
  if(mostrar){
    if(row)    row.style.display='block';
    if(saludo) saludo.style.display='none';
    if(titulo) titulo.textContent='Ingresa tu código';
    if(sub)    sub.textContent='El administrador te lo compartió';
  } else {
    if(row)    row.style.display='none';
    if(saludo) saludo.style.display='block';
    if(av)     av.textContent=nombre.charAt(0).toUpperCase();
    if(sNom)   sNom.textContent=nombre;
    if(titulo) titulo.textContent='¡Hola, '+nombre.split(' ')[0]+'!';
    if(sub)    sub.textContent='Confirma tu código para continuar';
  }
}

function saltarCrearPass(){
  _saltarPass = true;
  var crearRow = document.getElementById('accCrearPassRow');
  if(crearRow) crearRow.style.display = 'none';
  verificarCodigo();
}

function toggleAccPass(){
  var inp = document.getElementById('accPassword');
  if(!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function toggleAccNuevaPass(){
  var inp = document.getElementById('accNuevaPass');
  if(!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function abrirConfigNip(){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  var isAdmin = S.user && S.user.isAdmin;
  var nipKey  = isAdmin ? 'usala_nip_admin' : 'usala_nip_u_'+(S.user&&S.user.codigo);
  var tiene   = !!localStorage.getItem(nipKey);
  var modal   = document.createElement('div');
  modal.id    = 'nipConfigModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9300;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;margin:0 auto;">'
    +'<div style="font-weight:900;font-size:1rem;margin-bottom:4px;">🔒 NIP de seguridad</div>'
    +'<div style="font-size:0.78rem;color:var(--dim);margin-bottom:18px;">'+(tiene?'Ya tienes un NIP configurado':'Protege tu acceso con un NIP de 4 dígitos')+'</div>'
    +(tiene
      ? '<button onclick="_nipCambiar()" class="btn-main" style="margin-bottom:8px;">🔄 Cambiar NIP</button>'
        +'<button onclick="_nipEliminar()" style="width:100%;padding:12px;background:rgba(255,95,87,0.08);border:1px solid rgba(255,95,87,0.2);border-radius:14px;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--danger);cursor:pointer;margin-bottom:8px;">🗑 Eliminar NIP</button>'
      : '<button onclick="_nipCrear()" class="btn-main" style="margin-bottom:8px;">✅ Crear NIP</button>')
    +'<button onclick="_cerrarNipModal()" style="width:100%;padding:12px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;">Cancelar</button>'
    +'</div>';
  document.body.appendChild(modal);
}

function _nipCrear(){
  var modal=document.getElementById('nipConfigModal'); if(modal) modal.remove();
  usalaPrompt('Elige tu NIP (4 digitos):', '', function(nip1){
    if(!nip1||nip1.length!==4||!(/^[0-9]{4}$/.test(nip1))){ showToast('El NIP debe ser 4 digitos'); return; }
    usalaPrompt('Confirma tu NIP:', '', function(nip2){
      if(nip1!==nip2){ showToast('Los NIPs no coinciden'); return; }
      var k=S.user&&S.user.isAdmin?'usala_nip_admin':'usala_nip_u_'+(S.user&&S.user.codigo);
      localStorage.setItem(k, nip1);
      showToast('NIP configurado');
      goSub('config');
    },{type:'tel',placeholder:'4 digitos'});
  },{type:'tel',placeholder:'4 digitos'});
}

function _nipCambiar(){
  var m=document.getElementById('nipConfigModal'); if(m) m.remove();
  var isAdmin=S.user&&S.user.isAdmin;
  var nipKey  = isAdmin ? 'usala_nip_admin' : 'usala_nip_u_'+(S.user&&S.user.codigo);
  usalaPrompt('Ingresa tu NIP actual:', '', function(actual){
    if(actual!==localStorage.getItem(nipKey)){ showToast('NIP incorrecto'); return; }
    usalaPrompt('Nuevo NIP (4 digitos):', '', function(nuevo){
      if(!nuevo||nuevo.length!==4||!(/^[0-9]{4}$/.test(nuevo))){ showToast('NIP debe ser 4 digitos'); return; }
      localStorage.setItem(nipKey, nuevo);
      showToast('NIP actualizado');
      goSub('config');
    },{type:'tel',placeholder:'4 digitos'});
  },{type:'tel',placeholder:'4 digitos'});
}

function _nipEliminar(){
  usalaConfirm('Eliminar tu NIP? Podras entrar sin NIP.', function(){
    var isAdmin = S.user && S.user.isAdmin;
      var nipKey  = isAdmin ? 'usala_nip_admin' : 'usala_nip_u_'+(S.user&&S.user.codigo);
      localStorage.removeItem(nipKey);
      showToast('NIP eliminado');
      goSub('config');
  });
}

function _cerrarNipModal(){ var m=document.getElementById("nipConfigModal"); if(m) m.remove(); }

async function renderCodigos(){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  mc.innerHTML = '<div class="page-header">'+backSubBtn()+'<div class="page-title">👥 Códigos & Solicitudes</div></div>'
    + '<div style="text-align:center;padding:40px;color:var(--dim);font-size:0.85rem;">Cargando...</div>';
  var solicitudes = await dbGetSolicitudes();
  var pendientes  = solicitudes.filter(function(s){ return s.estado==='pendiente'; });
  var codigos = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var solBlock = '';
  if(pendientes.length){
    var solItems = pendientes.map(function(s){
      return '<div style="border:1.5px solid rgba(255,179,64,0.4);border-radius:14px;padding:12px 14px;margin-bottom:8px;background:rgba(255,179,64,0.07);">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">'
        +'<div>'
        +'<div style="font-weight:800;font-size:0.88rem;">'+s.nombre+'</div>'
        +'<div style="font-size:0.7rem;color:var(--dim);">'+s.contacto+' · '+s.fecha+'</div>'
        +(s.motivo?'<div style="font-size:0.75rem;color:var(--dim);margin-top:3px;">'+s.motivo+'</div>':'')
        +'</div>'
        +'<span style="font-size:0.65rem;background:#ffb340;color:#fff;border-radius:8px;padding:3px 8px;font-weight:700;">PENDIENTE</span>'
        +'</div>'
        +'<div style="display:flex;gap:6px;">'
        +'<button data-sol-id="'+s.id+'" data-sol-nombre="'+encodeURIComponent(s.nombre)+'" onclick="aprobarSolicitudDB(this.dataset.solId, decodeURIComponent(this.dataset.solNombre))" style="flex:1;background:var(--accent);border:none;border-radius:10px;padding:8px;font-family:Outfit,sans-serif;font-size:0.78rem;font-weight:700;color:#fff;cursor:pointer;">✅ Aprobar</button>'
        +'<button data-sol-id="'+s.id+'" onclick="rechazarSolicitudDB(this.dataset.solId)" style="background:rgba(255,179,64,0.12);border:1px solid rgba(255,179,64,0.3);border-radius:10px;padding:8px 10px;font-family:Outfit,sans-serif;font-size:0.75rem;color:#c07a10;cursor:pointer;">✕ Rechazar</button>'
        +'<button data-sol-id="'+s.id+'" data-sol-codigo="'+(s.codigo_generado||'')+'" onclick="eliminarSolicitudDB(this.dataset.solId, this.dataset.solCodigo)" style="background:rgba(255,95,87,0.1);border:1px solid rgba(255,95,87,0.25);border-radius:10px;padding:8px 10px;font-family:Outfit,sans-serif;font-size:0.75rem;color:var(--danger);cursor:pointer;">🗑</button>'
        +'</div>'
        +'</div>';
    }).join('');
    solBlock = '<div style="background:rgba(255,179,64,0.06);border:1px solid rgba(255,179,64,0.2);border-radius:18px;padding:14px 16px;margin-bottom:14px;">'
      +'<div style="font-size:0.72rem;font-weight:800;color:#c07a10;margin-bottom:10px;">📩 SOLICITUDES PENDIENTES ('+pendientes.length+')</div>'
      +solItems+'</div>';
  }
  var codsHtml = codigos.length ? codigos.slice().reverse().map(function(c){
    var venc = new Date((c.vencimiento||'2099-12-31').split('-').join('/'));
    var vencida = venc < hoy;
    var color = vencida ? '#ff6057' : (c.usado ? 'var(--accent2)' : 'var(--accent)');
    var badge  = vencida ? 'Vencido' : (c.usado ? 'En uso' : 'Disponible');
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;background:var(--inp);margin-bottom:8px;">'
      +'<div>'
      +'<div style="font-weight:800;font-size:0.88rem;color:var(--text);">'+c.codigo+'</div>'
      +'<div style="font-size:0.68rem;color:var(--dim);">'+(c.nota||c.nombreUsuario||'—')+' · Vence: '+c.vencimiento+'</div>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:8px;">'
      +'<span style="font-size:0.65rem;background:'+color+';color:#fff;border-radius:8px;padding:3px 8px;font-weight:700;">'+badge+'</span>'
      +'<button data-codigo="'+c.codigo+'" onclick="copiarCodigo(this.dataset.codigo)" style="background:none;border:none;font-size:1rem;cursor:pointer;" title="Copiar">📋</button>'
      +'</div>'
      +'</div>';
  }).join('') : '<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.82rem;">Sin códigos creados aún</div>';
  mc.innerHTML = '<div class="page-header">'+backSubBtn()+'<div class="page-title">👥 Códigos & Solicitudes</div></div>'
    + solBlock
    + '<div class="sec-title">🔑 Crear nuevo código</div>'
    + '<div class="card" style="margin-bottom:14px;padding:14px 16px;">'
    + '<input class="inp" id="codPrefijo" placeholder="Prefijo (ej: MARI)" style="margin-bottom:8px;" autocapitalize="characters">'
    + '<input class="inp" id="codNota" placeholder="Nombre del usuario *" style="margin-bottom:8px;">'
    + '<input class="inp" id="codContacto" placeholder="WhatsApp o email" style="margin-bottom:8px;">'
    + '<select class="inp" id="codVence" style="margin-bottom:12px;">'
    + '<option value="30">30 días</option><option value="90">90 días</option>'
    + '<option value="180">6 meses</option><option value="365">1 año</option>'
    + '<option value="3650">Sin vencimiento</option>'
    + '</select>'
    + '<button class="btn-main" onclick="generarCodigo()">🔑 Generar código</button>'
    + '</div>'
    + '<div class="sec-title">📋 Códigos existentes</div>'
    + codsHtml;
}

function aprobarSolicitudDB(solId, nombre){
  var prefijo = nombre.split(' ')[0].toUpperCase().slice(0,4).replace(/[^A-Z]/g,'') || 'FIN';
  var modal = document.createElement('div');
  modal.id = 'modalAprobSol';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9200;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;margin:0 auto;">'
    +'<div style="font-size:1rem;font-weight:900;margin-bottom:4px;">✅ Aprobar solicitud</div>'
    +'<div style="font-size:0.8rem;color:var(--dim);margin-bottom:18px;">👤 '+nombre+'</div>'
    +'<label class="inp-label">Prefijo del código</label>'
    +'<input class="inp" id="_asPrefijo" value="'+prefijo+'" maxlength="5" style="text-transform:uppercase;margin-bottom:10px;">'
    +'<label class="inp-label">Vigencia del acceso</label>'
    +'<select class="inp" id="_asVence" style="margin-bottom:16px;">'
    +'<option value="8">8 días</option>'
    +'<option value="15">15 días</option>'
    +'<option value="30" selected>1 mes</option>'
    +'<option value="90">3 meses</option>'
    +'<option value="180">6 meses</option>'
    +'<option value="365">1 año</option>'
    +'<option value="3650">Sin vencimiento</option>'
    +'</select>'
    +'<button class="btn-main" id="_btnConfAprobSol">🔑 Generar código</button>'
    +'<button onclick="document.getElementById(\'modalAprobSol\').remove()" style="width:100%;margin-top:8px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;">Cancelar</button>'
    +'</div>';
  document.body.appendChild(modal);
  // Asignar handler al botón DESPUÉS de insertar en DOM
  var _sid = solId, _snm = nombre;
  document.getElementById('_btnConfAprobSol').onclick = function(){
    _confirmarAprobSol(_sid, encodeURIComponent(_snm));
  };
}

async function _confirmarAprobSol(solId, nombreEnc){
  var nombre  = decodeURIComponent(nombreEnc);
  var prefijo = (document.getElementById('_asPrefijo').value.trim().toUpperCase()||'FIN').slice(0,5);
  var dias    = parseInt(document.getElementById('_asVence').value)||30;
  var codigo  = _generarCodigoUnico(prefijo);
  var venc    = new Date(); venc.setDate(venc.getDate()+dias);
  var vencStr = venc.toISOString().split('T')[0];
  var modal = document.getElementById('modalAprobSol'); if(modal) modal.remove();
  var codigos = JSON.parse(localStorage.getItem('usala_codigos')||'[]');
  codigos.push({codigo:codigo, vencimiento:vencStr, nota:nombre, activo:true, usado:false, creado:today(), nombreUsuario:nombre});
  localStorage.setItem('usala_codigos', JSON.stringify(codigos));
  await dbCrearCodigo(codigo, nombre, vencStr+'T23:59:59Z', '', nombre);
  await dbActualizarSolicitud(solId, 'aprobada', codigo);
  navigator.clipboard.writeText(codigo).catch(function(){});
  showToast('✅ Código '+codigo+' ('+dias+' días) copiado — compártelo con '+nombre);
  renderCodigos();
}

async function rechazarSolicitudDB(solId){
  usalaConfirm('¿Rechazar esta solicitud?', async function(){
    await dbActualizarSolicitud(solId, 'rechazada', null);
      showToast('✕ Solicitud rechazada');
      renderCodigos();
  });
}

async function eliminarSolicitudDB(solId, codigoGenerado){
  var tieneCode = codigoGenerado && codigoGenerado.trim() !== '';
    var msg = tieneCode
      ? ('Eliminar esta solicitud y REVOCAR el codigo ' + codigoGenerado + '? El usuario perdera el acceso.')
      : 'Eliminar permanentemente esta solicitud?';
  usalaConfirm(msg, async function(){
    
  });
}


function recuperarAdmin(){
  usalaConfirm('Restablecer la contrasena de administrador?\nSolo hazlo si olvidaste la contrasena.', function(){
    localStorage.removeItem('usala_admin_pass');
      showToast('✓ Contraseña restablecida — usa admin1234');
      cerrarAdminModal();
  });
}

function limpiarTodasSolicitudes(){
  usalaConfirm('Borrar TODAS las solicitudes?', function(){
    localStorage.removeItem('usala_solicitudes');
      showToast('✓ Solicitudes borradas');
      goSub('codigos');
  });
}

function abrirConfigAutolock(){
  var mc = document.getElementById('mainContent');
  mc.innerHTML = '';
  var actual = getLockTimeout();
  var d = document.createElement('div');
  d.style.padding = '20px 16px';
  d.innerHTML =
    '<div class="page-header">'+backSubBtn()+'<div class="page-title">⏱ Bloqueo automático</div></div>'
    +'<div style="font-size:0.8rem;color:var(--dim);margin-bottom:20px;line-height:1.5;">'
      +'Bloquea la app automáticamente si no la usas durante el tiempo elegido. '
      +'Al bloquearse pedirá tu NIP para volver a entrar.'
    +'</div>';
  var lista = document.createElement('div');
  lista.className = 'card';
  lista.style.padding = '4px 0';
  LOCK_OPCIONES.forEach(function(op){
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 18px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;';
    row.innerHTML =
      '<div style="font-weight:600;font-size:0.9rem;">'+(op.val===0?'🔓 ':'⏱ ')+op.label+'</div>'
      +'<div id="lockOpt_'+op.val+'" style="font-size:1.1rem;">'+(op.val===actual?'✅':'')+'</div>';
    row.onmouseenter = function(){ this.style.background='var(--inp)'; };
    row.onmouseleave = function(){ this.style.background=''; };
    (function(v, lbl){
      row.onclick = function(){
        setLockTimeout(v);
        LOCK_OPCIONES.forEach(function(o){
          var el=document.getElementById('lockOpt_'+o.val);
          if(el) el.textContent = (o.val===v?'✅':'');
        });
        var sub = document.getElementById('autolockSubLabel');
        if(sub) sub.textContent = lbl;
      };
    })(op.val, op.label);
    lista.appendChild(row);
  });
  lista.lastChild.style.borderBottom = 'none';
  var nipK = S.user && S.user.isAdmin ? 'usala_nip_admin' : 'usala_nip_u_'+(S.user&&S.user.codigo);
  var tieneNip = !!localStorage.getItem(nipK);
  var nota = document.createElement('div');
  nota.style.cssText = 'font-size:0.74rem;margin-top:12px;padding:10px 14px;border-radius:12px;'
    +(tieneNip
      ? 'background:rgba(45,158,95,0.08);color:var(--accent2);border:1px solid rgba(45,158,95,0.2);'
      : 'background:rgba(245,124,0,0.08);color:#f57c00;border:1px solid rgba(245,124,0,0.2);');
  nota.innerHTML = tieneNip
    ? '🔒 Tienes NIP activo — se pedirá al desbloquear'
    : '⚠️ No tienes NIP configurado. Al bloquearse solo habrá un botón de desbloquear. <b>Configura tu NIP para mayor seguridad.</b>';
  d.appendChild(lista);
  d.appendChild(nota);
  mc.appendChild(d);
  S.subtab = 'config';
}

async function renderAdminPanel(){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  var tab = _adminPanelTab;
  var tabs = ['resumen','usuarios','config_app'].map(function(t){
    var labels = {resumen:'📊 Resumen', usuarios:'👥 Usuarios', config_app:'⚙️ Config'};
    var act = tab === t;
    return '<button onclick="_adminTab(\''+t+'\')" style="flex:1;padding:9px 4px;border-radius:12px;border:none;'
      +'font-family:Outfit,sans-serif;font-size:0.7rem;font-weight:700;cursor:pointer;transition:all 0.18s;'
      +'background:'+(act?'var(--accent)':'var(--inp)')+';color:'+(act?'#fff':'var(--dim)')+';">'+labels[t]+'</button>';
  }).join('');
  var tabBar = '<div style="display:flex;gap:6px;margin-bottom:16px;">'+tabs+'</div>';
  mc.innerHTML = '<div class="page-header">'+backSubBtn()
    +'<div class="page-title">🛡️ Panel Admin</div>'
    +'<button onclick="renderAdminPanel()" style="background:var(--inp);border:1px solid var(--border);'
    +'border-radius:10px;padding:6px 10px;font-size:0.75rem;color:var(--text);cursor:pointer;">🔄</button>'
    +'</div>'
    + tabBar
    + '<div id="adminPanelBody"><div style="text-align:center;padding:40px;color:var(--dim);">Cargando...</div></div>';
  if(tab === 'resumen')    await _adminRenderResumen();
  else if(tab === 'usuarios') await _adminRenderUsuarios();
  else if(tab === 'config_app') _adminRenderConfig();
}

async function _adminRenderResumen(){
  var body = document.getElementById('adminPanelBody');
  if(!body) return;
  var usuarios = [];
  try { usuarios = await DB.get('usala_usuarios','is_admin=eq.false&activo=eq.true&order=creado_en.desc'); }
  catch(e){ usuarios = []; }
  var totalIng = 0, totalGas = 0, totalTxs = 0, activos = 0;
  var usuariosData = [];
  for(var i=0; i<(usuarios||[]).length; i++){
    var u = usuarios[i];
    try {
      var kvRows = await DB.get('usala_kv',
        'user_id=eq.'+encodeURIComponent(u.codigo)+'&key=in.(txs,cuentas)');
      var txsRow = (kvRows||[]).find(function(r){ return r.key==='txs'; });
      var txs = txsRow ? JSON.parse(txsRow.value||'[]') : [];
      var ing = txs.filter(function(t){ return t.tipo==='ingreso'; }).reduce(function(s,t){ return s+Number(t.monto||0); },0);
      var gas = txs.filter(function(t){ return t.tipo==='gasto'; }).reduce(function(s,t){ return s+Number(t.monto||0); },0);
      totalIng += ing; totalGas += gas; totalTxs += txs.length;
      if(txs.length > 0) activos++;
      usuariosData.push({ u:u, ing:ing, gas:gas, txs:txs.length });
    } catch(e){ usuariosData.push({ u:u, ing:0, gas:0, txs:0 }); }
  }
  var totalUsuarios = (usuarios||[]).length;
  var solPend = 0;
  try {
    var sols = await DB.get('usala_solicitudes','estado=eq.pendiente');
    solPend = (sols||[]).length;
  } catch(e){}
  // Actividad reciente (últimas txs de todos)
  var hoy = today();
  var txsHoy = usuariosData.reduce(function(s,d){
    return s + d.txs; // simplificado — en futuro filtrar por fecha
  }, 0);
  var html = '';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">';
  html += _adminMetric('👥 Usuarios', totalUsuarios, 'total registrados', 'var(--accent)');
  html += _adminMetric('🟢 Activos', activos, 'con transacciones', '#2d9e5f');
  html += _adminMetric('💰 Ingresos', fmt(totalIng), 'suma global', 'var(--accent2)');
  html += _adminMetric('💸 Gastos', fmt(totalGas), 'suma global', 'var(--danger)');
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">';
  html += _adminMetric('🔄 Transacciones', totalTxs, 'movimientos totales', '#7c6fff');
  html += _adminMetric('📩 Solicitudes', solPend, 'esperando aprobación', solPend>0?'#ffb340':'var(--dim)');
  html += '</div>';
  var balance = totalIng - totalGas;
  html += '<div class="card" style="margin-bottom:14px;padding:14px 16px;background:linear-gradient(135deg,rgba(43,192,112,0.1),rgba(43,192,112,0.04));border:1px solid rgba(43,192,112,0.2);">'
    +'<div style="font-size:0.68rem;color:var(--dim);font-weight:700;">FLUJO NETO GLOBAL (todos los usuarios)</div>'
    +'<div style="font-size:1.5rem;font-weight:900;color:'+(balance>=0?'var(--accent)':'var(--danger)')+';">'
    +(balance>=0?'+':'')+fmt(balance)+'</div></div>';
  var topUsers = usuariosData.sort(function(a,b){ return b.txs-a.txs; }).slice(0,5);
  if(topUsers.length > 0){
    html += '<div style="font-size:0.72rem;font-weight:800;color:var(--dim);margin-bottom:8px;">🏆 USUARIOS MÁS ACTIVOS</div>';
    html += '<div class="card" style="padding:8px 14px;">';
    topUsers.forEach(function(d,i){
      var pct = totalTxs > 0 ? Math.round(d.txs/totalTxs*100) : 0;
      html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;'+(i<topUsers.length-1?'border-bottom:1px solid var(--border);':'') +'">'
        +'<div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:800;color:#fff;flex-shrink:0;">'+(d.u.nombre||'?').charAt(0).toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0;">'
        +'<div style="font-size:0.82rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(d.u.nombre||d.u.codigo)+'</div>'
        +'<div style="font-size:0.65rem;color:var(--dim);">'+d.txs+' transacciones · '+pct+'% del total</div>'
        +'</div>'
        +'<div style="font-size:0.8rem;font-weight:800;color:var(--accent2);">'+fmt(d.ing)+'</div>'
        +'</div>';
    });
    html += '</div>';
  }
  body.innerHTML = html;
}

async function _adminRenderUsuarios(){
  var body = document.getElementById('adminPanelBody');
  if(!body) return;
  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--dim);">Cargando usuarios...</div>';
  var usuarios = [];
  try { usuarios = await DB.get('usala_usuarios','is_admin=eq.false&order=creado_en.desc'); }
  catch(e){ body.innerHTML = '<div class="card" style="text-align:center;padding:30px;color:var(--danger);">Error al cargar usuarios</div>'; return; }
  var hoy = new Date(); hoy.setHours(0,0,0,0);
  var buscador = '<input class="inp" id="adminBuscarUser" placeholder="🔍 Buscar usuario..." '
    +'oninput="_adminFiltrarUsers(this.value)" style="margin-bottom:12px;">';
  var lista = '<div id="adminUserLista">';
  (usuarios||[]).forEach(function(u, i){
    var venc   = u.vencimiento ? new Date(u.vencimiento) : null;
    var vencida = venc && venc < hoy;
    var bloq   = !u.activo;
    var estado = bloq ? '🔴 Bloqueado' : vencida ? '🟡 Vencido' : '🟢 Activo';
    var colorE = bloq ? 'var(--danger)' : vencida ? '#ffb340' : 'var(--accent)';
    lista += '<div class="card" style="margin-bottom:8px;padding:14px 16px;" data-user-nombre="'+(u.nombre||'').toLowerCase()+'" data-user-cod="'+(u.codigo||'').toLowerCase()+'">'
      +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
      +'<div style="width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem;color:#fff;flex-shrink:0;">'+(u.nombre||'?').charAt(0).toUpperCase()+'</div>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-weight:800;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(u.nombre||'Sin nombre')+'</div>'
      +'<div style="font-size:0.68rem;color:var(--dim);">'+u.codigo+(u.contacto?' · '+u.contacto:'')+'</div>'
      +'<div style="font-size:0.65rem;color:var(--dim);">Vence: '+(u.vencimiento||'Sin vencimiento')+(u.password_hash?' · 🔐':'')+'</div>'
      +'</div>'
      +'<span style="font-size:0.65rem;font-weight:700;color:'+colorE+';">'+estado+'</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">'
      +'<button data-uid="'+u.codigo+'" data-unombre="'+encodeURIComponent(u.nombre||'')+'" data-uvenc="'+(u.vencimiento||'')+'" onclick="_adminEditarUser(this.dataset.uid, decodeURIComponent(this.dataset.unombre), this.dataset.uvenc)" '
      +'style="background:var(--inp);border:1px solid var(--border);border-radius:10px;padding:8px;font-family:Outfit,sans-serif;font-size:0.75rem;cursor:pointer;">✏️ Editar</button>'
      +(bloq
        ? '<button data-uid="'+u.codigo+'" onclick="_adminDesbloquear(this.dataset.uid)" style="background:rgba(43,192,112,0.1);border:1px solid rgba(43,192,112,0.3);border-radius:10px;padding:8px;font-family:Outfit,sans-serif;font-size:0.75rem;color:var(--accent);cursor:pointer;">🔓 Desbloquear</button>'
        : '<button data-uid="'+u.codigo+'" onclick="_adminBloquear(this.dataset.uid)" style="background:rgba(255,95,87,0.08);border:1px solid rgba(255,95,87,0.2);border-radius:10px;padding:8px;font-family:Outfit,sans-serif;font-size:0.75rem;color:var(--danger);cursor:pointer;">🔒 Bloquear</button>')
      +'<button data-uid="'+u.codigo+'" onclick="_adminResetNip(this.dataset.uid)" style="background:var(--inp);border:1px solid var(--border);border-radius:10px;padding:8px;font-family:Outfit,sans-serif;font-size:0.75rem;cursor:pointer;">🔑 Reset NIP</button>'
      +'<button data-uid="'+u.codigo+'" data-unombre="'+encodeURIComponent(u.nombre||'')+'" onclick="_adminEliminarUser(this.dataset.uid, decodeURIComponent(this.dataset.unombre))" style="background:rgba(255,95,87,0.08);border:1px solid rgba(255,95,87,0.2);border-radius:10px;padding:8px;font-family:Outfit,sans-serif;font-size:0.75rem;color:var(--danger);cursor:pointer;">🗑 Eliminar</button>'
      +'</div>'
      +'</div>';
  });
  lista += '</div>';
  if(!usuarios || usuarios.length === 0){
    lista = '<div class="card" style="text-align:center;padding:30px;color:var(--dim);">Sin usuarios registrados</div>';
  }
  body.innerHTML = buscador + lista;
}

function _adminRenderConfig(){
  var body = document.getElementById('adminPanelBody');
  if(!body) return;
  var cfgGlobal = JSON.parse(localStorage.getItem('usala_cfg_global')||'{}');
  body.innerHTML = ''
    +'<div style="font-size:0.72rem;font-weight:800;color:var(--dim);margin-bottom:8px;">⚙️ CONFIGURACIÓN GLOBAL</div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<div class="set-item" onclick="_adminCfgNombreApp()">'
    +'<div><div class="set-label">📛 Nombre de la app</div>'
    +'<div class="set-sub">'+(cfgGlobal.nombreApp||'USALA Finanzas')+'</div></div>'
    +'<div class="set-arrow">›</div></div>'
    +'<div class="set-item" onclick="_adminCfgBienvenida()">'
    +'<div><div class="set-label">👋 Mensaje de bienvenida</div>'
    +'<div class="set-sub">'+(cfgGlobal.msgBienvenida||'Configura aquí')+'</div></div>'
    +'<div class="set-arrow">›</div></div>'
    +'<div class="set-item">'
    +'<div><div class="set-label">🔑 Registro abierto</div>'
    +'<div class="set-sub">Permitir solicitudes de nuevos usuarios</div></div>'
    +'<label style="position:relative;display:inline-block;width:42px;height:24px;flex-shrink:0;">'
    +'<input type="checkbox" id="cfgRegistroAbierto" '+(cfgGlobal.registroAbierto!==false?'checked':'')+' '
    +'onchange="_adminToggleCfg(\'registroAbierto\',this.checked)" style="opacity:0;width:0;height:0;">'
    +'<span onclick="this.previousElementSibling.click()" style="position:absolute;cursor:pointer;inset:0;background:'+(cfgGlobal.registroAbierto!==false?'var(--accent)':'#ccc')+';border-radius:24px;transition:0.2s;">'
    +'<span style="position:absolute;height:18px;width:18px;left:'+(cfgGlobal.registroAbierto!==false?'21px':'3px')+';bottom:3px;background:white;border-radius:50%;transition:0.2s;"></span></span>'
    +'</label></div>'
    +'<div class="set-item">'
    +'<div><div class="set-label">📊 Vigencia predeterminada</div>'
    +'<div class="set-sub">Al crear códigos nuevos</div></div>'
    +'<select class="inp" style="width:120px;" onchange="_adminToggleCfg(\'vigenciaDefault\',this.value)">'
    +['8','15','30','90','180','365','3650'].map(function(d){
        var labels={8:'8 días',15:'15 días',30:'1 mes',90:'3 meses',180:'6 meses',365:'1 año',3650:'Sin límite'};
        return '<option value="'+d+'"'+(String(cfgGlobal.vigenciaDefault||30)===d?' selected':'')+'>'+labels[d]+'</option>';
      }).join('')
    +'</select></div>'
    +'</div>'
    +'<div style="font-size:0.72rem;font-weight:800;color:var(--dim);margin:14px 0 8px;">🏷️ CATEGORÍAS DE GASTOS</div>'
    +'<div class="card" style="margin-bottom:14px;padding:14px 16px;">'
    +_adminListaCats('gasto')
    +'<button onclick="_adminNuevaCat(\'gasto\')" style="width:100%;margin-top:10px;padding:10px;background:var(--inp);border:1px dashed var(--border);border-radius:12px;font-family:Outfit,sans-serif;font-size:0.8rem;color:var(--dim);cursor:pointer;">+ Nueva categoría de gasto</button>'
    +'</div>'
    +'<div style="font-size:0.72rem;font-weight:800;color:var(--dim);margin-bottom:8px;">💰 CATEGORÍAS DE INGRESOS</div>'
    +'<div class="card" style="margin-bottom:14px;padding:14px 16px;">'
    +_adminListaCats('ingreso')
    +'<button onclick="_adminNuevaCat(\'ingreso\')" style="width:100%;margin-top:10px;padding:10px;background:var(--inp);border:1px dashed var(--border);border-radius:12px;font-family:Outfit,sans-serif;font-size:0.8rem;color:var(--dim);cursor:pointer;">+ Nueva categoría de ingreso</button>'
    +'</div>'
    +'<div style="font-size:0.72rem;font-weight:800;color:var(--danger);margin-bottom:8px;">⚠️ ZONA DE RIESGO</div>'
    +'<div class="card" style="border:1px solid rgba(255,95,87,0.2);padding:14px 16px;">'
    +'<div class="set-item" onclick="_adminCambiarPass()">'
    +'<div><div class="set-label" style="color:var(--danger);">🔐 Cambiar contraseña admin</div>'
    +'<div class="set-sub">Modifica la clave de administrador</div></div>'
    +'<div class="set-arrow">›</div></div>'
    +'</div>';
}

function _adminMetric(titulo, valor, sub, color){
  return '<div class="card" style="padding:14px;text-align:center;">'
    +'<div style="font-size:0.65rem;color:var(--dim);font-weight:700;margin-bottom:4px;">'+titulo+'</div>'
    +'<div style="font-size:1.3rem;font-weight:900;color:'+(color||'var(--text)')+';">'+valor+'</div>'
    +'<div style="font-size:0.62rem;color:var(--dim);margin-top:2px;">'+sub+'</div>'
    +'</div>';
}

function _adminFiltrarUsers(q){
  var cards = document.querySelectorAll('#adminUserLista .card');
  cards.forEach(function(c){
    var nombre = c.getAttribute('data-user-nombre')||'';
    var cod    = c.getAttribute('data-user-cod')||'';
    c.style.display = (nombre+cod).indexOf(q.toLowerCase()) > -1 ? '' : 'none';
  });
}

function _adminEditarUser(uid, nombre, vencActual){
  var modal = document.createElement('div');
  modal.id  = 'modalEditUser';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9200;background:rgba(0,0,0,0.55);display:flex;align-items:flex-end;';
  modal.innerHTML = '<div style="background:var(--bg);border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;margin:0 auto;">'
    +'<div style="font-size:1rem;font-weight:900;margin-bottom:16px;">✏️ Editar usuario</div>'
    +'<label class="inp-label">Nombre</label>'
    +'<input class="inp" id="_euNombre" value="'+nombre+'" style="margin-bottom:10px;">'
    +'<label class="inp-label">Nuevo vencimiento</label>'
    +'<select class="inp" id="_euVence" style="margin-bottom:10px;">'
    +'<option value="">— Mantener actual ('+(vencActual||'sin límite')+') —</option>'
    +'<option value="8">+8 días desde hoy</option>'
    +'<option value="15">+15 días desde hoy</option>'
    +'<option value="30">+1 mes desde hoy</option>'
    +'<option value="90">+3 meses desde hoy</option>'
    +'<option value="180">+6 meses desde hoy</option>'
    +'<option value="365">+1 año desde hoy</option>'
    +'<option value="3650">Sin vencimiento</option>'
    +'</select>'
    +'<label class="inp-label">Resetear contraseña</label>'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">'
    +'<input type="checkbox" id="_euResetPass" style="width:18px;height:18px;">'
    +'<label for="_euResetPass" style="font-size:0.82rem;cursor:pointer;">Eliminar contraseña (usuario deberá crear una nueva)</label>'
    +'</div>'
    +'<button class="btn-main" onclick="_adminGuardarUser(\''+uid+'\')">💾 Guardar cambios</button>'
    +'<button onclick="document.getElementById(\'modalEditUser\').remove()" style="width:100%;margin-top:8px;background:none;border:none;font-family:Outfit,sans-serif;font-size:0.85rem;color:var(--dim);cursor:pointer;">Cancelar</button>'
    +'</div>';
  document.body.appendChild(modal);
}

async function _adminGuardarUser(uid){
  var nombre = document.getElementById('_euNombre').value.trim();
  var diasStr= document.getElementById('_euVence').value;
  var resetPw= document.getElementById('_euResetPass').checked;
  var data   = {};
  if(nombre) data.nombre = nombre;
  if(diasStr){
    var venc = new Date(); venc.setDate(venc.getDate()+parseInt(diasStr));
    data.vencimiento = venc.toISOString().split('T')[0]+'T23:59:59Z';
  }
  if(resetPw) data.password_hash = null;
  try {
    await DB.update('usala_usuarios','codigo=eq.'+encodeURIComponent(uid), data);
    var modal = document.getElementById('modalEditUser'); if(modal) modal.remove();
    showToast('✅ Usuario actualizado');
    _adminRenderUsuarios();
  } catch(e){ showToast('⚠ Error al guardar: '+e.message); }
}

async function _adminBloquear(uid){
  usalaConfirm('¿Bloquear acceso a este usuario?', async function(){
    try {
        await DB.update('usala_usuarios','codigo=eq.'+encodeURIComponent(uid),{activo:false});
        showToast('🔒 Usuario bloqueado');
        _adminRenderUsuarios();
      } catch(e){ showToast('⚠ Error: '+e.message); }
  });
}

async function _adminDesbloquear(uid){
  try {
    await DB.update('usala_usuarios','codigo=eq.'+encodeURIComponent(uid),{activo:true});
    showToast('🔓 Usuario desbloqueado');
    _adminRenderUsuarios();
  } catch(e){ showToast('⚠ Error: '+e.message); }
}

async function _adminResetNip(uid){
  usalaConfirm('¿Resetear el NIP de este usuario?', async function(){
    localStorage.removeItem('usala_nip_u_'+uid);
      showToast('🔑 NIP reseteado — el usuario podrá crear uno nuevo');
  });
}

async function _adminEliminarUser(uid, nombre){
  usalaConfirm('ELIMINAR a '+nombre+' permanentemente?\nEsto borra su acceso y todos sus datos.', async function(){
    try {
        await DB.update('usala_usuarios','codigo=eq.'+encodeURIComponent(uid),{activo:false, nombre:'[eliminado]'});
        showToast('🗑 Usuario eliminado');
        _adminRenderUsuarios();
      } catch(e){ showToast('⚠ Error: '+e.message); }
  });
}

function _adminToggleCfg(key, val){
  var cfg = JSON.parse(localStorage.getItem('usala_cfg_global')||'{}');
  cfg[key] = val;
  localStorage.setItem('usala_cfg_global', JSON.stringify(cfg));
  showToast('✓ Configuración guardada');
}

function _adminListaCats(tipo){
  var key = 'cats_'+tipo+'_custom';
  var defaults = tipo==='gasto'
    ? ['Alimentación','Transporte','Salud','Entretenimiento','Ropa','Servicios','Educación','Hogar']
    : ['Salario','Freelance','Negocio','Inversiones','Regalo','Otros'];
  var custom = load(key, []);
  var all = defaults.map(function(n){ return {nombre:n, default:true}; })
    .concat(custom.map(function(c){ return {nombre:c, default:false}; }));
  return all.map(function(c){
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);">'
      +'<span style="font-size:0.82rem;">'+c.nombre+'</span>'
      +(c.default
        ? '<span style="font-size:0.62rem;color:var(--dim);background:var(--inp);border-radius:6px;padding:2px 7px;">default</span>'
        : '<button data-tipo="'+tipo+'" data-cat="'+encodeURIComponent(c.nombre)+'" onclick="_adminBorrarCat(this.dataset.tipo, decodeURIComponent(this.dataset.cat))" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.8rem;padding:2px 6px;">✕</button>')
      +'</div>';
  }).join('');
}

function _adminNuevaCat(tipo){
  usalaPrompt('Nueva categoria de '+tipo+':', '', function(nombre){
    if(!nombre||!nombre.trim()) return;
    if(!nombre || !nombre.trim()) return;
      var key = 'cats_'+tipo+'_custom';
      var custom = load(key, []);
      if(custom.indexOf(nombre.trim()) > -1){ showToast('Ya existe esa categoría'); return; }
      custom.push(nombre.trim());
      save(key, custom);
      showToast('✓ Categoría "'+nombre.trim()+'" creada');
      _adminRenderConfig();
  });
}

function _adminBorrarCat(tipo, nombre){
  usalaConfirm('Eliminar la categoria "'+nombre+'"?', function(){
    var key = 'cats_'+tipo+'_custom';
      var custom = load(key, []).filter(function(c){ return c !== nombre; });
      save(key, custom);
      showToast('🗑 Categoría eliminada');
      _adminRenderConfig();
  });
}

function _adminCambiarPass(){
  usalaPrompt('Contrasena actual:', '', function(actual){
    var guardada = localStorage.getItem('usala_admin_pass')||'admin1234';
    if(actual !== guardada){ showToast('Contrasena incorrecta'); return; }
    usalaPrompt('Nueva contrasena (minimo 6 caracteres):', '', function(nueva){
      if(!nueva||nueva.length<6){ showToast('Minimo 6 caracteres'); return; }
      usalaPrompt('Confirmar nueva contrasena:', '', function(confirma){
        if(nueva!==confirma){ showToast('Las contrasenas no coinciden'); return; }
        localStorage.setItem('usala_admin_pass', nueva);
        showToast('Contrasena actualizada');
      },{type:'password',placeholder:'Repetir contrasena'});
    },{type:'password',placeholder:'Nueva contrasena'});
  },{type:'password',placeholder:'Contrasena actual'});
}

function actualizarBadgeSolicitudes(){
  var solicitudes = JSON.parse(localStorage.getItem('usala_solicitudes')||'[]');
  var pendientes = solicitudes.filter(function(s){ return s.estado==='pendiente'; }).length;
  var btn = document.getElementById('btnSolicitudes');
  var badge = document.getElementById('badgeSolicitudes');
  if(btn){
    btn.style.display = pendientes > 0 ? 'flex' : 'none';
    if(badge) badge.textContent = pendientes > 0 ? pendientes : '';
  }
}


async function renderDashboardAdmin(){
  var mc = document.getElementById('mainContent');
  if(!mc) return;
  mc.innerHTML = '<div class="page-header">'
    + backSubBtn()
    + '<div class="page-title">📊 Dashboard Admin</div>'
    + '</div>'
    + '<div style="padding:20px;text-align:center;color:var(--dim);">'
    + '<div style="font-size:2rem;animation:consejeroFloat 1.5s ease-in-out infinite;">📊</div>'
    + '<div style="margin-top:10px;font-size:0.85rem;">Cargando datos de usuarios...</div>'
    + '</div>';
  try {
    // 1. Obtener todos los usuarios invitados
    var usuarios = await DB.get('usala_usuarios',
      'is_admin=eq.false&activo=eq.true&order=ultimo_acceso.desc');
    if(!usuarios) usuarios = [];
    var datosUsuarios = [];
    for(var i=0; i<usuarios.length; i++){
      var u = usuarios[i];
      try {
        var kvRows = await DB.get('usala_kv',
          'user_codigo=eq.' + encodeURIComponent(u.codigo));
        var kv = {};
        if(kvRows) kvRows.forEach(function(r){
          try{ kv[r.key] = JSON.parse(r.value); }catch(e){}
        });
        var txs     = kv.txs || [];
        var creds   = kv.creditos || [];
        var ing     = txs.filter(function(t){ return t.tipo==='ingreso'; })
                        .reduce(function(s,t){ return s+Number(t.monto||0); },0);
        var gas     = txs.filter(function(t){ return t.tipo==='gasto'; })
                        .reduce(function(s,t){ return s+Number(t.monto||0); },0);
        var debo    = creds.filter(function(c){ return c.tipo==='deuda'&&c.estado!=='pagado'; })
                        .reduce(function(s,c){ return s+Number((c.monto||0)-(c.abonado||0)); },0);
        var cobrar  = creds.filter(function(c){ return c.tipo==='prestamo'&&c.estado!=='pagado'; })
                        .reduce(function(s,c){ return s+Number((c.monto||0)-(c.abonado||0)); },0);
        var balance = ing - gas;
        var salud = 'ok';
        if(balance < 0 || debo > ing) salud = 'critico';
        else if(debo > 0 || (ing > 0 && (gas/ing) > 0.8)) salud = 'atencion';
        datosUsuarios.push({
          u: u, ing: ing, gas: gas, debo: debo,
          cobrar: cobrar, balance: balance,
          txCount: txs.length, salud: salud
        });
      } catch(e){
        datosUsuarios.push({ u: u, ing:0, gas:0, debo:0, cobrar:0, balance:0, txCount:0, salud:'sin_datos' });
      }
    }
    var totalIng    = datosUsuarios.reduce(function(s,d){ return s+d.ing; },0);
    var totalGas    = datosUsuarios.reduce(function(s,d){ return s+d.gas; },0);
    var totalDebo   = datosUsuarios.reduce(function(s,d){ return s+d.debo; },0);
    var totalCobrar = datosUsuarios.reduce(function(s,d){ return s+d.cobrar; },0);
    var criticos    = datosUsuarios.filter(function(d){ return d.salud==='critico'; }).length;
    var atencion    = datosUsuarios.filter(function(d){ return d.salud==='atencion'; }).length;
    var resumenGlobal = '<div class="sec-title">🌐 Resumen global</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">'
      + _adminMetricCard('👥 Usuarios', usuarios.length + ' activos', 'var(--accent)')
      + _adminMetricCard('💰 Ingresos totales', fmt(totalIng), '#2bc070')
      + _adminMetricCard('💸 Gastos totales', fmt(totalGas), '#ff6057')
      + _adminMetricCard('🤝 Deudas totales', fmt(totalDebo), '#ffb340')
      + '</div>';
    var alertasHtml = '';
    if(criticos > 0 || atencion > 0){
      alertasHtml = '<div class="sec-title">⚠️ Alertas</div>'
        + '<div class="card" style="margin-bottom:14px;padding:12px 16px;">';
      if(criticos > 0) alertasHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
        + '<span style="background:#ff6057;color:#fff;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:800;">🚨 '+criticos+' en rojo</span>'
        + '<span style="font-size:0.78rem;color:var(--dim);">Gastos superan ingresos</span></div>';
      if(atencion > 0) alertasHtml += '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span style="background:#ffb340;color:#fff;border-radius:20px;padding:3px 10px;font-size:0.72rem;font-weight:800;">⚠️ '+atencion+' con alerta</span>'
        + '<span style="font-size:0.78rem;color:var(--dim);">Requieren atención</span></div>';
      alertasHtml += '</div>';
    }
    var usuariosHtml = '<div class="sec-title">👤 Usuarios</div>';
    if(datosUsuarios.length === 0){
      usuariosHtml += '<div class="card" style="text-align:center;padding:28px;color:var(--dim);font-size:0.85rem;">Sin usuarios invitados aún</div>';
    } else {
      usuariosHtml += datosUsuarios.map(function(d){
        var saludColor = d.salud==='critico' ? '#ff6057' : d.salud==='atencion' ? '#ffb340' : d.salud==='sin_datos' ? 'var(--dim)' : '#2bc070';
        var saludIco   = d.salud==='critico' ? '🚨' : d.salud==='atencion' ? '⚠️' : d.salud==='sin_datos' ? '💤' : '✅';
        var ultimoAcc  = d.u.ultimo_acceso ? new Date(d.u.ultimo_acceso).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : 'Nunca';
        var venc       = d.u.vencimiento ? new Date(d.u.vencimiento).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
        var vencPasada = d.u.vencimiento && new Date(d.u.vencimiento) < new Date();
        return '<div class="card" style="margin-bottom:10px;padding:14px 16px;">'
          + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">'
          + '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1rem;flex-shrink:0;">'
          + (d.u.nombre||'?').charAt(0).toUpperCase()
          + '</div>'
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-weight:800;font-size:0.9rem;color:var(--text);">' + (d.u.nombre||d.u.codigo) + '</div>'
          + '<div style="font-size:0.68rem;color:var(--dim);">'
          + d.u.codigo
          + (d.u.password_hash ? ' · 🔐' : ' · sin contraseña')
          + '</div>'
          + '</div>'
          + '<div style="text-align:right;">'
          + '<div style="font-size:1.1rem;">' + saludIco + '</div>'
          + '<div style="font-size:0.62rem;color:' + saludColor + ';font-weight:700;">'
          + (d.salud==='critico'?'En rojo':d.salud==='atencion'?'Atención':d.salud==='sin_datos'?'Sin datos':'Al día')
          + '</div>'
          + '</div>'
          + '</div>'
          + (d.txCount > 0 ? ''
            + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">'
            + '<div style="text-align:center;background:var(--inp);border-radius:10px;padding:8px 4px;">'
            + '<div style="font-size:0.65rem;color:var(--dim);">Ingresos</div>'
            + '<div style="font-size:0.82rem;font-weight:800;color:#2bc070;">' + fmt(d.ing) + '</div>'
            + '</div>'
            + '<div style="text-align:center;background:var(--inp);border-radius:10px;padding:8px 4px;">'
            + '<div style="font-size:0.65rem;color:var(--dim);">Gastos</div>'
            + '<div style="font-size:0.82rem;font-weight:800;color:#ff6057;">' + fmt(d.gas) + '</div>'
            + '</div>'
            + '<div style="text-align:center;background:var(--inp);border-radius:10px;padding:8px 4px;">'
            + '<div style="font-size:0.65rem;color:var(--dim);">Balance</div>'
            + '<div style="font-size:0.82rem;font-weight:800;color:' + (d.balance>=0?'#2bc070':'#ff6057') + ';">' + fmt(d.balance) + '</div>'
            + '</div>'
            + '</div>'
            + (d.debo > 0 ? '<div style="font-size:0.72rem;color:#ffb340;margin-bottom:6px;">🤝 Debe: <b>'+fmt(d.debo)+'</b></div>' : '')
            + (d.cobrar > 0 ? '<div style="font-size:0.72rem;color:#3dbf7a;margin-bottom:6px;">📥 Le deben: <b>'+fmt(d.cobrar)+'</b></div>' : '')
          : '<div style="font-size:0.75rem;color:var(--dim);text-align:center;padding:8px;">Sin transacciones registradas</div>')
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">'
          + '<span style="font-size:0.65rem;color:var(--dim);">Último acceso: ' + ultimoAcc + '</span>'
          + '<span style="font-size:0.65rem;color:' + (vencPasada?'#ff6057':'var(--dim)') + ';">Vence: ' + venc + '</span>'
          + '</div>'
          + '</div>';
      }).join('');
    }
    mc.innerHTML = '<div class="page-header">'
      + backSubBtn()
      + '<div class="page-title">📊 Dashboard Admin</div>'
      + '<button onclick="renderDashboardAdmin()" style="background:var(--inp);border:1px solid var(--border);border-radius:10px;padding:6px 12px;font-size:0.75rem;color:var(--text);cursor:pointer;">🔄 Actualizar</button>'
      + '</div>'
      + resumenGlobal
      + alertasHtml
      + usuariosHtml;
  } catch(e){
    mc.innerHTML = '<div class="page-header">'+backSubBtn()+'<div class="page-title">📊 Dashboard Admin</div></div>'
      + '<div class="card" style="text-align:center;padding:28px;color:var(--dim);">'
      + '<div style="font-size:2rem;margin-bottom:10px;">😕</div>'
      + '<div>Error cargando datos<br><span style="font-size:0.75rem;">'+e.message+'</span></div>'
      + '<button class="btn-main" onclick="renderDashboardAdmin()" style="margin-top:16px;">Reintentar</button>'
      + '</div>';
    console.error('Dashboard admin:', e);
  }
}

function renderNoticiasAdmin(){
  var noticias = JSON.parse(localStorage.getItem('usala_noticias')||'[]');
  var html = '<div class="page-header">'+backSubBtn()+'<div class="page-title">📢 Noticias (Admin)</div></div>'
    +'<div class="card" style="margin-bottom:14px;">'
    +'<div class="card-title">📝 Publicar noticia</div>'
    +'<label class="inp-label">Título</label>'
    +'<input class="inp" id="noticiasTitulo" placeholder="Título de la noticia" autocomplete="off">'
    +'<label class="inp-label">Mensaje</label>'
    +'<textarea class="inp" id="noticiasMsg" rows="3" placeholder="Contenido de la noticia..." style="resize:vertical;"></textarea>'
    +'<div class="form-row" style="margin-top:4px;">'
    +'<div><label class="inp-label">Tipo</label>'
    +'<select class="inp" id="noticiasTipo">'
    +'<option value="info">ℹ️ Info</option>'
    +'<option value="aviso">⚠️ Aviso</option>'
    +'<option value="promo">🎉 Promo</option>'
    +'<option value="update">🆕 Update</option>'
    +'</select></div>'
    +'<div style="display:flex;align-items:flex-end;">'
    +'<button class="btn-main" style="margin-bottom:0;" onclick="publicarNoticia()">📢 Publicar</button>'
    +'</div></div></div>'
    +'<div class="card"><div class="card-title">📋 Publicadas ('+noticias.length+')</div>';
  if(noticias.length===0){
    html += '<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin noticias publicadas</div>';
  } else {
    noticias.slice().reverse().forEach(function(n,i){
      var ri = noticias.length-1-i;
      html += '<div class="tx-item" style="align-items:flex-start;gap:10px;">'
        +'<div style="font-size:1.1rem;margin-top:2px;">'+(n.tipo==='aviso'?'⚠️':n.tipo==='promo'?'🎉':n.tipo==='update'?'🆕':'ℹ️')+'</div>'
        +'<div style="flex:1;">'
        +'<div style="font-weight:700;font-size:0.88rem;">'+n.titulo+'</div>'
        +'<div style="font-size:0.78rem;color:var(--dim);margin-top:2px;">'+n.msg+'</div>'
        +'<div style="font-size:0.68rem;color:var(--dim);margin-top:4px;">'+n.fecha+'</div>'
        +'</div>'
        +'<button class="ic-btn" onclick="borrarNoticia('+ri+')" style="color:var(--danger);">🗑️</button>'
        +'</div>';
    });
  }
  html += '</div>';
  return html;
}

function publicarNoticia(){
  var titulo = document.getElementById('notTitulo').value.trim();
  var mensaje = document.getElementById('notMensaje').value.trim();
  var tipo = document.getElementById('notTipo').value;
  if(!titulo || !mensaje){ showToast('⚠ Escribe título y mensaje'); return; }
  var noticias = getNoticias();
  noticias.push({
    id: Date.now(),
    titulo: titulo,
    mensaje: mensaje,
    tipo: tipo,
    fecha: today()
  });
  saveNoticias(noticias);
  showToast('✅ Mensaje publicado para todos los invitados');
  goSub('noticias');
}

function borrarNoticia(i){
  var noticias = getNoticias();
  var _eliNot = JSON.parse(JSON.stringify(noticias[i]));
  noticias.splice(i, 1);
  saveNoticias(noticias);
  goSub('noticias');
  mostrarUndo('📢 Mensaje eliminado', function(){
    var n2=getNoticias(); n2.splice(i,0,_eliNot); saveNoticias(n2); goSub('noticias');
  });
}

function renderNoticias(){
  var isAdmin = S.user && S.user.isAdmin;
  var noticias = getNoticias();
  if(isAdmin){
    var lista = noticias.length ? noticias.slice().reverse().map(function(n,i){
      var ri = noticias.length - 1 - i;
      var leidas = JSON.parse(localStorage.getItem('usala_leidas_count_'+n.id)||'0');
      return '<div class="card" style="margin-bottom:8px;">'
        +'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">'
        +'<div style="flex:1;">'
        +'<div style="font-weight:800;font-size:0.88rem;">'+n.titulo+'</div>'
        +'<div style="font-size:0.75rem;color:var(--dim);margin-top:4px;line-height:1.5;">'+n.mensaje+'</div>'
        +'<div style="font-size:0.65rem;color:var(--dim);margin-top:6px;">📅 '+n.fecha+' &nbsp; 👁️ '+leidas+' lecturas</div>'
        +'</div>'
        +'<button class="ic-btn" onclick="borrarNoticia('+ri+')" style="flex-shrink:0;">🗑️</button>'
        +'</div></div>';
    }).join('') : '<div style="text-align:center;padding:20px;color:var(--dim);font-size:0.83rem;">Sin mensajes enviados</div>';
    return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">📢 Centro de Mensajes</div></div>'
      +'<div class="card" style="margin-bottom:14px;">'
      +'<div class="card-title">✍️ Nuevo mensaje</div>'
      +'<label class="inp-label">Título</label>'
      +'<input class="inp" id="notTitulo" placeholder="Ej: Nueva actualización disponible">'
      +'<label class="inp-label">Mensaje</label>'
      +'<textarea class="inp" id="notMensaje" rows="4" placeholder="Escribe aquí las novedades, mejoras o información importante para tus invitados..." style="resize:none;line-height:1.5;"></textarea>'
      +'<label class="inp-label">Tipo</label>'
      +'<select class="inp" id="notTipo">'
      +'<option value="📢">📢 Anuncio general</option>'
      +'<option value="🆕">🆕 Nueva función</option>'
      +'<option value="🔧">🔧 Mejora / corrección</option>'
      +'<option value="⚠️">⚠️ Aviso importante</option>'
      +'<option value="🎉">🎉 Celebración</option>'
      +'</select>'
      +'<button class="btn-main" onclick="publicarNoticia()">📤 Publicar para todos los invitados</button>'
      +'</div>'
      +'<div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--dim);margin-bottom:8px;">Mensajes publicados ('+noticias.length+')</div>'
      + lista;
  } else {
    var leidas = JSON.parse(localStorage.getItem('usala_leidas_'+S.user.codigo)||'[]');
    var items = noticias.length ? noticias.slice().reverse().map(function(n){
      var yaLeida = leidas.indexOf(n.id) !== -1;
      if(!yaLeida){
        leidas.push(n.id);
        localStorage.setItem('usala_leidas_'+S.user.codigo, JSON.stringify(leidas));
        var cnt = parseInt(localStorage.getItem('usala_leidas_count_'+n.id)||'0');
        localStorage.setItem('usala_leidas_count_'+n.id, cnt+1);
      }
      return '<div class="card" style="margin-bottom:10px;'+(yaLeida?'':'border-left:3px solid var(--accent);')+'">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'
        +'<span style="font-size:1.2rem;">'+n.tipo+'</span>'
        +'<div style="font-weight:800;font-size:0.9rem;flex:1;">'+n.titulo+'</div>'
        +(yaLeida?'':'<span style="font-size:0.6rem;background:var(--accent);color:var(--navtext);padding:2px 7px;border-radius:10px;font-weight:700;">NUEVO</span>')
        +'</div>'
        +'<div style="font-size:0.8rem;color:var(--dim);line-height:1.6;">'+n.mensaje+'</div>'
        +'<div style="font-size:0.65rem;color:var(--dim);margin-top:8px;">'+n.fecha+'</div>'
        +'</div>';
    }).join('') : '<div style="text-align:center;padding:30px;color:var(--dim);font-size:0.83rem;">📭 No hay mensajes aún</div>';
    return '<div class="page-header">'+backBtn('mas',4)+'<div class="page-title">📢 Mensajes</div></div>'
      + items;
  }
}

function getNoticias(){ return JSON.parse(localStorage.getItem('usala_noticias')||'[]'); }


// ════════════════════════════════════════════════════
//  PANTALLA: Registro completado → redirige al login
// ════════════════════════════════════════════════════
function mostrarExitoRegistro(nombre, codigo){
  // Limpiar campos
  var campos = ['accNuevaPass','accPassword','accCodigo','accNombre'];
  campos.forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.value = '';
  });
  var sb = document.getElementById('passStrengthBox');
  if(sb) sb.innerHTML = '';

  // Ocultar todos los paneles
  ['panelSesion','panelCodigo','panelSolicitud','panelEnviada'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });

  // Mostrar panel de éxito (si ya existe, limpiarlo; si no, crearlo)
  var container = document.querySelector('.lg-wrap');
  if(!container) { location.reload(); return; }

  // Eliminar panel anterior si existe
  var viejo = document.getElementById('panelRegistroOk');
  if(viejo) viejo.remove();

  var div = document.createElement('div');
  div.id = 'panelRegistroOk';
  div.className = 'lg-card';
  div.style.textAlign = 'center';
  div.innerHTML = ''
    + '<div style="font-size:3.5rem;margin-bottom:12px;animation:consejeroFloat 2s ease-in-out infinite;">🎉</div>'
    + '<div style="font-size:1.1rem;font-weight:900;color:#fff;margin-bottom:6px;letter-spacing:-0.02em;">'
    +   '¡Registro completado!'
    + '</div>'
    + '<div style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin-bottom:6px;">'
    +   'Bienvenid@ a USALA, <b style="color:#fff;">' + (nombre||'').split(' ')[0] + '</b>'
    + '</div>'
    + '<div style="font-size:0.72rem;color:rgba(255,255,255,0.3);margin-bottom:24px;">'
    +   'Tu contraseña ha sido guardada de forma segura.'
    + '</div>'

    // Código visible
    + '<div style="background:rgba(43,192,112,0.08);border:1px solid rgba(43,192,112,0.2);'
    +   'border-radius:14px;padding:14px 20px;margin-bottom:20px;">'
    +   '<div style="font-size:0.62rem;color:rgba(43,192,112,0.7);font-weight:700;'
    +     'letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">Tu código de acceso</div>'
    +   '<div style="font-size:1.5rem;font-weight:900;letter-spacing:0.1em;color:#2bc070;">'
    +     codigo
    +   '</div>'
    +   '<div style="font-size:0.65rem;color:rgba(255,255,255,0.3);margin-top:4px;">'
    +     'Guárdalo — lo necesitarás para entrar'
    +   '</div>'
    + '</div>'

    // Checklist de lo que se configuró
    + '<div style="text-align:left;margin-bottom:20px;">'
    +   '<div style="font-size:0.68rem;font-weight:700;color:rgba(255,255,255,0.4);'
    +     'text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Lo que configuraste</div>'
    +   '<div style="font-size:0.78rem;color:rgba(43,192,112,0.9);margin-bottom:4px;">✓ Código de acceso</div>'
    +   '<div style="font-size:0.78rem;color:rgba(43,192,112,0.9);margin-bottom:4px;">✓ Contraseña segura</div>'
    +   '<div style="font-size:0.78rem;color:rgba(255,255,255,0.3);">○ NIP (opcional — configúralo después)</div>'
    + '</div>'

    // Botón ir al login
    + '<button class="lg-btn" onclick="irAlLogin()">'
    +   '🔐 Iniciar sesión →'
    + '</button>'
    + '<div style="font-size:0.68rem;color:rgba(255,255,255,0.25);margin-top:10px;">'
    +   'Usa tu código + contraseña para entrar'
    + '</div>';

  container.appendChild(div);
  // Scroll al panel
  div.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Ir al login limpio ────────────────────────────
function irAlLogin(){
  // Ocultar panel de éxito
  var ok = document.getElementById('panelRegistroOk');
  if(ok) ok.style.display = 'none';

  // Limpiar campos y errores
  var errEl = document.getElementById('accessErr');
  if(errEl){ errEl.textContent=''; errEl.style.display='none'; }
  var sb = document.getElementById('passStrengthBox');
  if(sb) sb.innerHTML='';

  // Restablecer estado
  _saltarPass = false;
  _accPassVerificada = false;

  // Mostrar el panel de código (login normal)
  var panelCodigo = document.getElementById('panelCodigo');
  var panelSesion = document.getElementById('panelSesion');
  if(panelCodigo){
    panelCodigo.style.display = 'block';
    // Ocultar rows opcionales
    var rows = ['accCrearPassRow','accPassRow'];
    rows.forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.display = 'none';
    });
    // Mostrar el row de nombre
    var nr = document.getElementById('accNombreRow');
    if(nr) nr.style.display = 'block';
    // Mostrar el row de código
    var cr = document.getElementById('accCodigo');
    if(cr){ cr.value = ''; cr.focus(); }
  }
  if(panelSesion) panelSesion.style.display = 'none';

  // Texto del input de código con hint
  var codInp = document.getElementById('accCodigo');
  if(codInp) codInp.focus();

  // Toast guía
  showToast('Ingresa tu código y contraseña para entrar');
}
