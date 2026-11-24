// app.js - UI, flujo de Pre-Permiso y consumo de geo-helper.js.
// Asincronía solo con Promesas (then / catch).

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((reg) => console.log('[App] SW registrado. Scope:', reg.scope))
    .catch((err) => console.error('[App] Error registrando SW:', err));
}

const elEstado = document.getElementById('estado');
const btnAdjuntar = document.getElementById('btn-adjuntar');
const avisoPermiso = document.getElementById('aviso-permiso');
const seccionResultado = document.getElementById('resultado');
const seccionPlanB = document.getElementById('plan-b');
const msgPlanB = document.getElementById('msg-plan-b');
const ayudaDenegado = document.getElementById('ayuda-denegado');

function mostrarMensaje(texto) {
  elEstado.textContent = texto;
}

function mostrarCargando(texto) {
  mostrarMensaje(texto);
  btnAdjuntar.disabled = true;
}

// ---------- Plan B ----------
function habilitarSelectorManualZona(motivo, denegado) {
  msgPlanB.textContent = motivo;
  ayudaDenegado.hidden = !denegado;
  seccionPlanB.hidden = false;
}

document.getElementById('btn-zona-manual').addEventListener('click', () => {
  const zona = document.getElementById('zona-manual').value;
  const elegida = document.getElementById('zona-elegida');
  if (!zona) {
    elegida.hidden = false;
    elegida.textContent = 'Selecciona una zona de la lista.';
    return;
  }
  elegida.hidden = false;
  elegida.textContent = 'Zona registrada manualmente: ' + zona;
  mostrarMensaje('Ubicación manual: ' + zona);
});

// ---------- Resultado + calidad de señal ----------
function renderizarResultadoUbicacion(ubicacion) {
  const calidad = clasificarPrecision(ubicacion.precisionMetros);

  const etiqueta = document.getElementById('etiqueta-precision');
  etiqueta.textContent = calidad.etiqueta;
  etiqueta.className = 'etiqueta ' + calidad.clase;

  document.getElementById('val-lat').textContent = ubicacion.latitud.toFixed(6);
  document.getElementById('val-lon').textContent = ubicacion.longitud.toFixed(6);
  document.getElementById('val-precision').textContent = '± ' + ubicacion.precisionMetros + ' m';
  document.getElementById('val-hora').textContent = new Date(ubicacion.timestamp).toLocaleTimeString('es-MX');

  document.getElementById('enlace-mapa').href =
    'https://www.openstreetmap.org/?mlat=' + ubicacion.latitud +
    '&mlon=' + ubicacion.longitud + '#map=17/' + ubicacion.latitud + '/' + ubicacion.longitud;

  seccionResultado.hidden = false;
  seccionPlanB.hidden = true;
  mostrarMensaje('Ubicación adjuntada al reporte.');
}

// ---------- Lectura real (siempre nace de un clic del usuario) ----------
function adjuntarUbicacion() {
  mostrarCargando('Obteniendo coordenadas...');
  seccionResultado.hidden = true;

  return obtenerUbicacionActual({ enableHighAccuracy: true, timeout: 8000 })
    .catch((error) => {
      // En laptops sin GPS, enableHighAccuracy suele terminar en TIMEOUT:
      // se reintenta una vez con baja precisión (Wi-Fi / IP) antes de ir al Plan B.
      if (error.code === 3) {
        mostrarMensaje('Sin señal GPS. Reintentando con ubicación aproximada...');
        return obtenerUbicacionActual({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
      }
      throw error;
    })
    .then((ubicacion) => {
      renderizarResultadoUbicacion(ubicacion);
    })
    .catch((error) => {
      console.warn('[Geo] Fallback activado:', error.message);
      mostrarMensaje(error.message);
      habilitarSelectorManualZona(error.message, error.code === 1);
    })
    .finally(() => {
      btnAdjuntar.disabled = false;
    });
}

// ---------- Flujo de Pre-Permiso ----------
btnAdjuntar.addEventListener('click', () => {
  avisoPermiso.hidden = true;

  consultarEstadoPermisoGeo().then((estado) => {
    if (estado === 'granted') {
      adjuntarUbicacion();
    } else if (estado === 'denied') {
      mostrarMensaje('El permiso de ubicación está bloqueado.');
      habilitarSelectorManualZona('Tu navegador tiene bloqueada la ubicación para este sitio.', true);
    } else {
      // 'prompt': explicar ANTES de disparar el diálogo nativo
      avisoPermiso.hidden = false;
    }
  });
});

document.getElementById('btn-confirmar-geo').addEventListener('click', () => {
  avisoPermiso.hidden = true;
  adjuntarUbicacion();
});

document.getElementById('btn-cancelar-geo').addEventListener('click', () => {
  avisoPermiso.hidden = true;
  mostrarMensaje('Ubicación no compartida.');
  habilitarSelectorManualZona('Puedes indicar tu zona manualmente.', false);
});
