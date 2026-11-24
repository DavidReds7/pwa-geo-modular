// geo-helper.js - Módulo reutilizable de geolocalización (Promesas explícitas).
// Se carga ANTES que app.js; cualquier función puede usar obtenerUbicacionActual().then(...)

function traducirErrorGeolocalizacion(error) {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return 'Permiso de ubicación denegado. Puedes ingresar tu zona manualmente.';
    case 2: // POSITION_UNAVAILABLE
      return 'No fue posible determinar tu ubicación (señal GPS o Wi-Fi no disponible).';
    case 3: // TIMEOUT
      return 'Se agotó el tiempo de espera intentando obtener las coordenadas.';
    default:
      return 'Ocurrió un error inesperado al consultar la ubicación.';
  }
}

// Envuelve getCurrentPosition (callbacks) en una Promesa con salida normalizada.
function obtenerUbicacionActual(opcionesPersonalizadas) {
  const opciones = Object.assign(
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 30000 // acepta una lectura reciente de hasta 30 s
    },
    opcionesPersonalizadas
  );

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const sinSoporte = new Error('Este navegador no soporta la API de Geolocalización.');
      sinSoporte.code = 0;
      reject(sinSoporte);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolve({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precisionMetros: Math.round(posicion.coords.accuracy),
          timestamp: posicion.timestamp
        });
      },
      (error) => {
        // Se conserva el código numérico para que el consumidor pueda decidir (ej. reintentar en TIMEOUT)
        const traducido = new Error(traducirErrorGeolocalizacion(error));
        traducido.code = error.code;
        reject(traducido);
      },
      opciones
    );
  });
}

// Consulta (sin mostrar diálogo) si el permiso ya está 'granted', 'denied' o 'prompt'.
function consultarEstadoPermisoGeo() {
  if (!('permissions' in navigator)) {
    return Promise.resolve('prompt');
  }

  return navigator.permissions.query({ name: 'geolocation' })
    .then((resultado) => resultado.state)
    .catch(() => 'prompt'); // Safari antiguo / entornos restringidos
}

// Clasifica la calidad de la señal según coords.accuracy (metros).
function clasificarPrecision(precisionMetros) {
  if (precisionMetros < 30) {
    return { clase: 'alta', etiqueta: 'Precisión GPS Alta' };
  }
  return { clase: 'aprox', etiqueta: 'Ubicación Aproximada (Wi-Fi / IP)' };
}
