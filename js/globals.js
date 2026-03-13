// USALA Suite - Variables globales & Arranque
// js/globals.js

var _cache = {};
var _cacheTs = {};
var CACHE_TTL = 30000;
var _syncQueue = [];
var _syncTimer = null;
var _syncIndicatorTimer = null;
var _realtimeInterval = null;
var _lastSyncTs = null;
var _realtimeActivo = false;
var _syncToastTimer = null;
var _dbOnline = true;
var _SYNC_KEYS = [
  'txs','cuentas','creditos','cxc','metas','pagos_mensuales',
  'activos_personales','presupuesto','alertas',
  'cats_gasto_custom','cats_ingreso_custom',
  'cats_activos_custom','cats_pagos_custom'
];
var S = {
  user: null,       // {nombre, codigo, isAdmin}
  tab: 'inicio',
  subtab: null,
  editTxId: null,
  editCrediIdx: null,
  editCrediTipo: null,
  theme: 'default'
};
var APP_VERSION = localStorage.getItem('usala_version') || '3.0.0';
var APP_NOTAS   = localStorage.getItem('usala_notas') || 'Versión 2 — Rediseño completo';
var _sesionPendiente = null;
var _nipBuffer = '';
var _accLookupTimer = null;
var _saltarPass = false;
var _accPassVerificada = false;
var _adminPanelTab = 'resumen';
var _aprobarIdx = -1;
var _undoFn = null, _undoTimer = null;
var _calcExpr = '', _calcResult = '0', _calcNewNum = true, _calcScale = 1.0;
var _carritoUndoTimer = null;
var GASTO_CATS_BASE = [
  {id:'🍽️ Alimentación',  color:'#ef6c00'},
  {id:'🚗 Transporte',    color:'#1e88e5'},
  {id:'🏠 Hogar',         color:'#8d6e63'},
  {id:'💡 Servicios',     color:'#26a69a'},
  {id:'💳 Pagos / Deudas',color:'#5c6bc0'},
  {id:'🛍️ Compras',       color:'#ab47bc'},
  {id:'🎬 Entretenimiento',color:'#f9a825'},
  {id:'💊 Salud',         color:'#e53935'},
  {id:'📚 Educación',     color:'#43a047'},
  {id:'👗 Ropa / Moda',   color:'#ec407a'},
  {id:'✈️ Viajes',        color:'#00acc1'},
  {id:'🍺 Restaurantes',  color:'#ff7043'},
  {id:'📦 Otros gastos',  color:'#78909c'}
];
var INGRESO_CATS_BASE = [
  {id:'💼 Salario'},
  {id:'🔧 Freelance'},
  {id:'🏢 Negocio'},
  {id:'🏠 Renta'},
  {id:'📈 Inversión'},
  {id:'🎁 Regalo'},
  {id:'💰 Venta'},
  {id:'📥 Otros ingresos'}
];
var _CAT_MIGRA = {
  'Alimentación':'🍽️ Alimentación',
  'Transporte':'🚗 Transporte',
  'Servicios':'💡 Servicios',
  'Compras':'🛍️ Compras',
  'Pagos':'💳 Pagos / Deudas',
  'Entretenimiento':'🎬 Entretenimiento',
  'Salud':'💊 Salud',
  'Educación':'📚 Educación',
  'Ropa':'👗 Ropa / Moda',
  'Otros':'📦 Otros gastos',
  'Otros gastos':'📦 Otros gastos',
  'Pago de servicio':'💡 Servicios',
  'Transferencia enviada':'💳 Pagos / Deudas',
  'Transferencia a banco':'💳 Pagos / Deudas',
  'Compra':'🛍️ Compras',
  'Retiro':'📦 Otros gastos',
  'Salario':'💼 Salario',
  'Activos':'📈 Inversión',
  'Freelance':'🔧 Freelance',
  'Renta':'🏠 Renta',
  'Inversión':'📈 Inversión',
  'Otros ingresos':'📥 Otros ingresos',
  'Negocio':'🏢 Negocio',
  'Venta':'💰 Venta',
  'Regalo':'🎁 Regalo',
  'Depósito':'📥 Otros ingresos',
  'Transferencia recibida':'📥 Otros ingresos',
  'Nómina':'💼 Salario'
};
var _CAT_KEYS = {
  gasto:   'cats_gasto_custom',
  ingreso: 'cats_ingreso_custom',
  activos: 'cats_activos_custom',
  pagos:   'cats_pagos_custom'
};
var _CAT_BASE = {
  gasto:   GASTO_CATS_BASE.map(function(c){ return c.id; }),
  ingreso: INGRESO_CATS_BASE.map(function(c){ return c.id; }),
  activos: ACTIVOS_CATS.slice(),
  pagos:   PAGOS_CATS.slice()
};
var _CAT_TITLES = {
  gasto:   { title:'💸 Categorías de Gasto',   sub:'Añade tus propias categorías de gasto' },
  ingreso: { title:'💰 Categorías de Ingreso',  sub:'Añade tus propias fuentes de ingreso' },
  activos: { title:'🏦 Tipos de Activo',        sub:'Añade tipos de activo personalizados' },
  pagos:   { title:'📅 Tipos de Pago Fijo',     sub:'Añade categorías de pagos recurrentes' }
};
var PAGOS_CATS = ['💳 Tarjetas','💡 Servicios','🏠 Renta / Hipoteca','🏛 Impuestos','🚗 Auto','📱 Telefonía','🌐 Internet / Cable','🏥 Salud / Seguros','🎓 Educación','📦 Suscripciones','🔧 Otros'];
var ACTIVOS_CATS = ['🏠 Inmueble','🚗 Vehículo','💼 Negocio','📈 Inversión','💰 Ahorro / Efectivo','🌐 Criptomonedas','🏭 Maquinaria / Equipo','💍 Joyas / Arte','📦 Otros'];
var _tipoInteresActual = 'total';
var _catModalTipo = null, _catSelectId = null, _catSelectVal = null;
var _ppTab = 'hoy';
var LOCK_OPCIONES = [
  {val:0,   label:'Desactivado'},
  {val:1,   label:'1 minuto'},
  {val:2,   label:'2 minutos'},
  {val:5,   label:'5 minutos'},
  {val:10,  label:'10 minutos'},
  {val:15,  label:'15 minutos'},
  {val:30,  label:'30 minutos'},
  {val:60,  label:'1 hora'}
];
var _lockTimer = null, _lockPin = '', _lockActivo = false;
var _editCuentaIdx = null, _editTCIdx = null;
var _vozRec = null, _vozActivo = false;
var FAQS = [
  {cat:'🏠 Inicio', q:'¿Qué muestra la pantalla de Inicio?',
   a:'Tu resumen financiero completo: Total disponible, Patrimonio Neto, Deudas, Pagos Pendientes, últimas transacciones y alertas de seguridad activas.'},
  {cat:'🏠 Inicio', q:'¿Qué es el botón ⏰ Pago Pendiente?',
   a:'Muestra cuántos pagos vencen pronto. El badge es rojo si hay vencidos, naranja si vencen esta semana. Tócalo para ver el detalle.'},
  {cat:'🏠 Inicio', q:'¿Qué es el aviso de seguridad en el inicio?',
   a:'Si tu cuenta no tiene NIP o bloqueo automático, aparece un banner de alerta. Puedes configurarlo desde ahí mismo o cerrarlo temporalmente.'},
  {cat:'🏠 Inicio', q:'¿Cómo registro un ingreso o gasto rápido?',
   a:'Usa el botón U azul flotante para acceder en un toque a Efectivo, Banco o Tarjetas. O di un comando de voz: "gasté 200" o "ingresé 500".'},
  {cat:'🔵 Botón U', q:'¿Para qué sirve el botón U azul?',
   a:'Acceso rápido a tus 3 cuentas desde cualquier pantalla. Tócalo y aparece un menú con Efectivo, Banco y Tarjetas con el saldo actual.'},
  {cat:'🎙️ Voz', q:'¿Cómo funciona el control por voz?',
   a:'Toca 🎙️ en la barra superior. Se activa y escucha. Di tu comando claramente. Ejecuta la acción al instante. Sin IA, solo acción.'},
  {cat:'🎙️ Voz', q:'¿Necesita internet para funcionar?',
   a:'Sí. En Chrome (Android) el reconocimiento de voz envía el audio a Google para procesarlo. Sin conexión el botón 🎙️ no funciona.'},
  {cat:'🎙️ Voz', q:'¿Qué comandos de navegación puedo usar?',
   a:'"inicio", "cuentas", "créditos", "reportes", "más", "efectivo", "banco", "tarjetas", "calculadora", "historial", "metas", "presupuesto", "conversor", "ayuda".'},
  {cat:'🎙️ Voz', q:'¿Puedo registrar gastos con voz?',
   a:'Sí. "Gasté 200" registra $200 de gasto en Efectivo. "Ingresé 500" registra un ingreso. El saldo se actualiza al instante.'},
  {cat:'🎙️ Voz', q:'El micrófono está bloqueado, ¿qué hago?',
   a:'Más → Configuración → 🎤 Restablecer micrófono. O en Chrome: ⋮ → Configuración → Privacidad → Micrófono → busca la app → Permitir.'},
  {cat:'🏦 Cuentas', q:'¿Qué módulos tiene Cuentas?',
   a:'3 secciones: 💵 Efectivo, 🏧 Banco y 💳 Tarjetas de Crédito. Cada una con historial y formulario de movimientos.'},
  {cat:'🏦 Cuentas', q:'¿Cómo transfiero efectivo a mi banco?',
   a:'Efectivo → Salida → en "¿A qué banco?" elige tu cuenta. Resta de Efectivo y suma al banco destino automáticamente.'},
  {cat:'🏦 Cuentas', q:'¿Qué pasa si borro una transacción?',
   a:'El saldo se revierte automáticamente. Tienes 6 segundos para tocar "Deshacer" y restaurar todo.'},
  {cat:'🏦 Cuentas', q:'¿Las compras con TC afectan mi efectivo?',
   a:'No. Las compras con tarjeta solo aumentan la deuda de esa TC. Tu efectivo y banco NO se ven afectados.'},
  {cat:'💳 Tarjetas', q:'¿Qué es el Saldo al Corte AUTO?',
   a:'Se calcula sumando todas las compras del período actual. Aparece con badge naranja "AUTO". No tienes que calcularlo manualmente.'},
  {cat:'💳 Tarjetas', q:'¿Cómo registro un pago de TC?',
   a:'Toca "💳 Pago" en la tarjeta. El saldo se reduce. Al llegar a $0 se marca "Al corriente".'},
  {cat:'📅 Pagos del Mes', q:'¿Para qué sirven los Pagos del Mes?',
   a:'Para registrar todos tus pagos fijos: servicios, renta, seguros, TC, etc. Llevas control de cuánto has pagado y cuánto falta cada mes.'},
  {cat:'📅 Pagos del Mes', q:'¿Cómo agrego un pago fijo?',
   a:'Créditos → Pagos del Mes → + Agregar. Escribe nombre, categoría, monto estimado, frecuencia y día de vencimiento.'},
  {cat:'📅 Pagos del Mes', q:'¿Cómo funciona el panel ⏰ de la pantalla principal?',
   a:'Muestra los pagos que vencen próximamente en 4 vistas: Hoy, Esta semana, Este mes y Este año. Badge rojo = pagos ya vencidos.'},
  {cat:'📅 Pagos del Mes', q:'¿Los pagos se resetean solos cada mes?',
   a:'Sí. El estado (pagado/pendiente) se resetea automáticamente cada mes. Tus pagos fijos permanecen.'},
  {cat:'🤝 Créditos', q:'¿Qué son los Créditos?',
   a:'"Mis Deudas" = dinero que tú pediste prestado. "Por Cobrar" = dinero que tú prestaste. Con seguimiento de abonos, intereses y fechas límite.'},
  {cat:'🤝 Créditos', q:'¿Cómo abono a una deuda?',
   a:'Toca "+ Abonar". La barra de progreso se actualiza. Al 100% se marca como pagado automáticamente.'},
  {cat:'🔐 Seguridad', q:'¿Por qué me aparece un aviso de seguridad?',
   a:'Tu cuenta no tiene NIP o bloqueo automático activos. Son medidas opcionales pero muy recomendadas para que nadie más vea tus finanzas.'},
  {cat:'🔐 Seguridad', q:'¿Qué es el NIP y para qué sirve?',
   a:'Un código secreto de 4 dígitos. Aunque alguien tenga tu dispositivo o código de invitado, sin el NIP no puede entrar a tus finanzas.'},
  {cat:'🔐 Seguridad', q:'¿Cómo activo mi NIP?',
   a:'Más → Configuración → 🔒 NIP de seguridad → escribe 4 dígitos y confirma. Desde ese momento se pedirá cada vez que entres.'},
  {cat:'🔐 Seguridad', q:'¿Qué es el bloqueo automático?',
   a:'La app se bloquea sola si no la usas por el tiempo elegido (1 min a 1 hora). Al bloquearse pedirá tu NIP para volver a entrar.'},
  {cat:'🔐 Seguridad', q:'¿Cómo activo el bloqueo automático?',
   a:'Más → Configuración → ⏱ Bloqueo automático → elige el tiempo. Cualquier toque reinicia el contador. Recomendamos 5 minutos.'},
  {cat:'🔐 Seguridad', q:'¿Qué pasa si me bloquea y no tengo NIP?',
   a:'Aparece un botón "Desbloquear" directo. Por eso recomendamos ambos: NIP + bloqueo automático. Sin NIP el bloqueo no protege realmente.'},
  {cat:'🔐 Seguridad', q:'¿Puedo cerrar sesión desde la pantalla bloqueada?',
   a:'Sí. En la pantalla de bloqueo hay un botón "Salir" que cierra sesión completamente.'},
  {cat:'🔐 Seguridad', q:'Olvidé mi NIP, ¿qué hago?',
   a:'El admin puede resetearlo: Más → Códigos de Acceso → busca tu código → toca 🔓. El NIP se elimina y puedes configurar uno nuevo.'},
  {cat:'🔐 Seguridad', q:'¿Mis datos son privados respecto a otros usuarios?',
   a:'Sí. Cada usuario tiene su espacio completamente aislado. Nadie puede ver los datos de otro, ni el administrador.'},
  {cat:'🏦 Activos', q:'¿Qué son los Activos Personales?',
   a:'Todo lo que posees con valor: casa, carro, negocio, inversiones, joyas, etc. Su valor suma a tu Patrimonio Neto.'},
  {cat:'🏦 Activos', q:'¿Cada cuánto actualizo el valor?',
   a:'Cuando cambie significativamente. Edita con ✏️ y actualiza el monto. Afectará tu Patrimonio Neto en el siguiente snapshot.'},
  {cat:'📈 Progreso', q:'¿Qué es el Patrimonio Neto?',
   a:'Efectivo + Banco + Activos − Total Deudas. Si sube mes a mes, estás progresando financieramente.'},
  {cat:'📈 Progreso', q:'¿Qué significa el semáforo de salud financiera?',
   a:'🟢 Progresando = patrimonio sube, deudas bajan. 🟡 Estable = sin cambios. 🔴 Atención = deudas suben o patrimonio baja.'},
  {cat:'📈 Progreso', q:'¿Cuándo se guarda el snapshot mensual?',
   a:'Automáticamente al abrir la app, una vez por mes. También puedes forzarlo con 📸 Guardar snapshot ahora dentro del módulo.'},
  {cat:'🔑 Acceso', q:'¿Cómo entran otras personas?',
   a:'El admin genera un código en Más → Códigos de Acceso. O el visitante solicita acceso y el admin aprueba desde el badge 🔴.'},
  {cat:'🔑 Acceso', q:'¿Los códigos de invitado tienen vencimiento?',
   a:'Sí. El admin define la fecha de vencimiento al crear el código. Pasada esa fecha el código deja de funcionar.'},
  {cat:'🔑 Acceso', q:'¿Olvidé mi contraseña de admin?',
   a:'Login → 🔐 Admin → "¿Olvidaste tu contraseña?". Usa la clave maestra admin1234 para recuperar el acceso.'},
  {cat:'⚙️ Config', q:'¿Cómo cambio el tema visual?',
   a:'Más → Configuración → 🎨 Cambiar tema. 5 temas: Verde Natural, Oscuro Pro, Dorado Élite, Océano y Rosa Elegante.'},
  {cat:'⚙️ Config', q:'¿Cómo cambio la moneda?',
   a:'Más → Configuración → 💱 Moneda. 9 monedas disponibles: MXN, USD, EUR, CAD, GBP, COP, ARS, GTQ, PEN.'},
  {cat:'⚙️ Config', q:'¿Cómo agrego categorías personalizadas?',
   a:'Más → Configuración → 🏷️ Mis categorías. Categorías ilimitadas para Gastos, Ingresos, Activos y Pagos fijos.'},
  {cat:'⚙️ Config', q:'¿Cómo borro mis datos?',
   a:'Más → Configuración → Zona de peligro. Borra transacciones o restablece toda la cuenta. ⚠️ No se puede deshacer.'},
  {cat:'↩️ General', q:'¿Puedo deshacer un borrado?',
   a:'Sí. Tienes 6 segundos para tocar "Deshacer". El saldo también se restaura automáticamente.'},
  {cat:'↩️ General', q:'¿Funciona sin internet?',
   a:'Sí, casi todo. Solo el reconocimiento de voz y el conversor de monedas requieren conexión.'},
  {cat:'↩️ General', q:'¿Cómo uso la calculadora?',
   a:'Toca 🔢 en la barra superior. Arrástrala, minimízala con − sin perder el cálculo, o ciérrala con ×.'},
];
(function(){
  var t = localStorage.getItem('usala_theme');
  if(t){ S.theme = t; if(typeof applyTheme === 'function') applyTheme(t); }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      if(typeof arrancarApp === 'function') arrancarApp();
    });
  } else {
    if(typeof arrancarApp === 'function') arrancarApp();
  }
})();