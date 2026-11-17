/* ==========================================================
   DEPORZONE WALLY PARK - LÓGICA DE INTERACCIÓN CON JQUERY + PWA
   Materia: Diseño Web II (Ingeniería de Sistemas)
   Funcionalidades incluidas:
     1. Service Worker PWA Offline-First + Fetch manifest.json + Estado Red
     2. Detección Móvil (mobile.html) e Hidratación SSR en cada <button>
     3. Menú Hamburguesa (.slideToggle) + Navegación Móvil sin Scroll (Tabs/Subtabs)
     4. Modo Oscuro/Claro persistente en localStorage + Tema Dinámico
     5. Filtrado Multinivel + Buscador en Vivo (keyup)
     6. Validación blur/input + Cola Blindada (44px) + Anti-XSS (.text()) + Modal 30s
   ========================================================== */

// ==========================================================
// [PWA 1]: REGISTRO DE SERVICE WORKER OFFLINE-FIRST (sw.js)
// ==========================================================
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        console.log('[PWA DeporZone] Service Worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA DeporZone] Service Worker omitido:', err);
      });
  });
}

// ==========================================================
// [PWA 2]: DETECCIÓN DE DISPOSITIVO (CELULAR / TABLET / ESCRITORIO)
// ==========================================================
function esDispositivoMovilOTablet() {
  const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
  const esMovilTabletUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|silk|kindle/i.test(ua);
  const esIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const tieneTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const ancho = Math.min(window.innerWidth || 9999, (window.screen && window.screen.width) || 9999);
  return esMovilTabletUA || esIPadOS || (tieneTouch && ancho <= 1024);
}

function detectarDispositivoMovil() {
  const esMovil = esDispositivoMovilOTablet() || window.innerWidth <= 768;
  const banner = document.getElementById('bannerDeteccionMovil');
  if (banner) {
    banner.classList.toggle('visible', esMovil);
  }
}

window.addEventListener('resize', detectarDispositivoMovil);
detectarDispositivoMovil();

$(document).ready(function() {

  // ==========================================================
  // [PWA 3]: CONSULTA FETCH ASÍNCRONA DE MANIFIESTO (response.ok + catch)
  // ==========================================================
  if (window.location.protocol !== 'file:') {
    fetch('manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error('Error al leer manifest.json');
        return response.json();
      })
      .then((manifest) => {
        console.log('[PWA DeporZone] Manifest verificado:', manifest.short_name);
      })
      .catch((err) => {
        console.warn('[PWA DeporZone] Lectura de manifest en modo local:', err.message);
      });
  }

  // ==========================================================
  // [PWA 4]: HIDRATACIÓN SSR TRANSPARENTE EN CADA <button> (.off().on())
  // ==========================================================
  function hidratarBotonesDOM(raiz) {
    const $contenedor = $('#contenedorMenu');
    if ($contenedor.length && $contenedor.attr('data-hidratado') !== 'true') {
      $contenedor.attr('data-hidratado', 'true');
    }

    $(raiz)
      .find('button')
      .each(function () {
        const $btn = $(this);
        if ($btn.attr('data-hidratado') === 'true') return;

        $btn
          .attr('data-hidratado', 'true')
          .off('click.deporzoneHidratacion')
          .on('click.deporzoneHidratacion', function () {
            $(this).attr('data-ultimo-evento', 'hidratado');
          });
      });
  }

  setTimeout(function () {
    hidratarBotonesDOM(document);
  }, 150);

  // ==========================================================
  // SISTEMA DE BITÁCORA DE EVENTOS CON TIMESTAMP (ANTI-XSS .text())
  // ==========================================================
  let historialEventos = JSON.parse(localStorage.getItem('deporzone_logs') || '[]');
  let contadorFiltros = parseInt(localStorage.getItem('deporzone_filters') || '0');
  let contadorReservas = parseInt(localStorage.getItem('deporzone_orders') || '0');

  function registrarEventoTimestamp(tipo, descripcion) {
    const ahoraLog = new Date();
    const fechaHora = ahoraLog.toLocaleString('es-BO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    historialEventos.unshift({
      timestamp: fechaHora,
      tipo: tipo,
      mensaje: descripcion
    });

    historialEventos = historialEventos.slice(0, 40);
    localStorage.setItem('deporzone_logs', JSON.stringify(historialEventos));

    renderizarBitacora();
  }

  function renderizarBitacora() {
    let $lista = $('#activity-log-list');
    $lista.empty();

    $('#stat-total-events').text(historialEventos.length);
    $('#stat-filter-events').text(contadorFiltros);
    $('#stat-order-events').text(contadorReservas);

    if (historialEventos.length === 0) {
      const $vacio = $('<div>').addClass('log-entry').append(
        $('<span>').addClass('log-message').text('Bitácora vacía. Interactúa con el catálogo o formulario para registrar eventos.')
      );
      $lista.append($vacio);
      return;
    }

    historialEventos.forEach(function(item) {
      // Construcción segura Anti-XSS usando .text() en vez de concatenar HTML
      const $fila = $('<div>').addClass('log-entry');
      const $hora = $('<span>').addClass('log-timestamp').append(
        $('<i>').addClass('fa-regular fa-clock'),
        ' ' + item.timestamp
      );
      const $msg = $('<span>').addClass('log-message').text(item.mensaje);
      const $tag = $('<span>').addClass('log-type-tag').text(item.tipo);
      $fila.append($hora, $msg, $tag);
      $lista.append($fila);
    });
  }

  // Botón Mostrar / Ocultar Bitácora con .fadeToggle()
  $('#toggle-log-btn').off('click').on('click', function() {
    $('#log-collapsible-box').fadeToggle(300);
    registrarEventoTimestamp('UI', 'Alternó visibilidad de la Bitácora con .fadeToggle()');
  });

  // Botón Limpiar Historial
  $('#clear-log-btn').off('click').on('click', function() {
    historialEventos = [];
    contadorFiltros = 0;
    contadorReservas = 0;
    localStorage.removeItem('deporzone_logs');
    localStorage.setItem('deporzone_filters', '0');
    localStorage.setItem('deporzone_orders', '0');
    renderizarBitacora();
    mostrarToastAlert('🧹 Bitácora Reiniciada', 'El historial de eventos con Timestamp fue limpiado correctamente.', false);
  });


  // ==========================================================
  // FUNCIÓN 1: MENÚ HAMBURGUESA Y NAVEGACIÓN MÓVIL SIN SCROLL
  // ==========================================================
  function cambiarTabMovil(tabId) {
    if (!tabId) return;
    $('.mobile-tab-panel').removeClass('active');
    $('#' + tabId).addClass('active');
    $('.btn-nav-tab').removeClass('active');
    $('.btn-nav-tab[data-tab="' + tabId + '"]').addClass('active');
  }

  function activarSubpanelMovil($panelPadre, subpanelId) {
    if (!$panelPadre || !$panelPadre.length || !subpanelId) return;
    $panelPadre.find('.mobile-subpanel').removeClass('active');
    $panelPadre.find('#' + subpanelId).addClass('active');
    $panelPadre.find('.btn-subtab').removeClass('active');
    $panelPadre.find('.btn-subtab[data-subtab="' + subpanelId + '"]').addClass('active');
  }

  $('.btn-nav-tab, .btn-go-tab').off('click').on('click', function () {
    const targetTab = $(this).data('tab');
    cambiarTabMovil(targetTab);
  });

  $('.btn-subtab').off('click').on('click', function () {
    const subpanelId = $(this).data('subtab');
    const $panelPadre = $(this).closest('.mobile-tab-panel');
    activarSubpanelMovil($panelPadre, subpanelId);
  });

  // Al hacer clic en el botón de hamburguesa, despliega o recoge el menú
  $('#hamburger-btn').off('click').on('click', function(e) {
    e.stopPropagation(); // Evitar que el clic en el botón cierre el menú de inmediato
    $('#navbar').slideToggle(250);
    registrarEventoTimestamp('NAV', 'Desplegó / ocultó el menú hamburguesa (.slideToggle)');
  });

  // Al hacer clic en un enlace del menú, navega (o cambia pestaña móvil), cierra y marca activo
  $('.nav-link').off('click').on('click', function(e) {
    const targetTab = $(this).data('tab');
    if (targetTab && document.body.classList.contains('vista-mobile')) {
      e.preventDefault();
      cambiarTabMovil(targetTab);
    }
    $('#navbar').slideUp(200);
    $('.nav-link').removeClass('active');
    $(this).addClass('active');
    registrarEventoTimestamp('NAV', `Navegó a la sección: ${$(this).text().trim()}`);
  });

  // Cerrar el menú si el usuario hace clic fuera de la cabecera
  $(document).off('click.menuFuera').on('click.menuFuera', function(e) {
    if (!$(e.target).closest('#main-header, #navbar').length) {
      $('#navbar').slideUp(200);
    }
  });


  // ==========================================================
  // FUNCIÓN 2: MODO OSCURO Y CLARO PERSISTENTE EN LOCALSTORAGE
  // ==========================================================
  if (localStorage.getItem('deporzone_tema') === 'oscuro') {
    $('body').removeClass('theme-light').addClass('theme-dark');
    $('.icon-moon').hide();
    $('.icon-sun').show();
  }

  $('#theme-toggle-btn').off('click').on('click', function() {
    // Alterna la clase theme-dark en la etiqueta body
    $('body').toggleClass('theme-dark');

    // Alterna los iconos de Luna y Sol con animación jQuery y persiste preferencia
    if ($('body').hasClass('theme-dark')) {
      $('.icon-moon').hide();
      $('.icon-sun').show().fadeIn(200);
      $(this).attr('title', 'Cambiar a modo claro');
      localStorage.setItem('deporzone_tema', 'oscuro');
      registrarEventoTimestamp('TEMA', 'Activó el Modo Oscuro (.theme-dark)');
    } else {
      $('.icon-sun').hide();
      $('.icon-moon').show().fadeIn(200);
      $(this).attr('title', 'Cambiar a modo oscuro');
      localStorage.setItem('deporzone_tema', 'claro');
      registrarEventoTimestamp('TEMA', 'Activó el Modo Claro (.theme-light)');
    }
  });


  // ==========================================================
  // FUNCIÓN 3: FILTRADO MULTINIVEL + BUSCADOR EN VIVO (KEYUP)
  // ==========================================================
  let filtroTipoActual = 'all';
  let filtroSubtipoActual = 'all';
  let filtroBusquedaActual = '';

  // 3.1 Clic en botones de Tipo de Superficie
  $('.type-btn').off('click').on('click', function() {
    $('.type-btn').removeClass('active');
    $(this).addClass('active');

    filtroTipoActual = $(this).data('type');
    contadorFiltros++;
    localStorage.setItem('deporzone_filters', String(contadorFiltros));
    registrarEventoTimestamp('FILTRO', `Filtró superficie: ${$(this).text().trim()}`);
    aplicarFiltros();
  });

  // 3.2 Clic en botones de Subtipo de Ambiente
  $('.subtype-btn').off('click').on('click', function() {
    $('.subtype-btn').removeClass('active');
    $(this).addClass('active');

    filtroSubtipoActual = $(this).data('subtype');
    contadorFiltros++;
    localStorage.setItem('deporzone_filters', String(contadorFiltros));
    registrarEventoTimestamp('FILTRO', `Filtró ambiente: ${$(this).text().trim()}`);
    aplicarFiltros();
  });

  // 3.2b Buscador en vivo por nombre, descripción o etiquetas mediante keyup
  $('#searchCancha').off('keyup').on('keyup', function () {
    filtroBusquedaActual = $(this).val().trim().toLowerCase();
    aplicarFiltros();
  });

  // 3.3 Función que evalúa superficie, subtipo y texto en vivo
  function aplicarFiltros() {
    $('.court-card').each(function() {
      let cardTipo = $(this).data('type');
      let cardSubtipos = $(this).data('subtype') ? $(this).data('subtype').split(' ') : [];
      let contenidoTexto = $(this).text().toLowerCase();

      let coincideTipo = (filtroTipoActual === 'all') || (cardTipo === filtroTipoActual);
      let coincideSubtipo = (filtroSubtipoActual === 'all') || (cardSubtipos.includes(filtroSubtipoActual));
      let coincideTexto = !filtroBusquedaActual || contenidoTexto.indexOf(filtroBusquedaActual) !== -1;

      if (coincideTipo && coincideSubtipo && coincideTexto) {
        $(this).fadeIn(250);
      } else {
        $(this).fadeOut(250);
      }
    });
  }

  // 3.4 Botón "Seleccionar" en una tarjeta del catálogo
  $('.btn-select-court').off('click').on('click', function() {
    let courtId = $(this).data('court-id');
    let courtName = $(this).data('court-name');
    
    // Seleccionar automáticamente la cancha en el dropdown de la sección de reserva
    $('#select-cancha-reserva').val(courtId).trigger('change');
    registrarEventoTimestamp('CANCHA', `Seleccionó desde catálogo: ${courtName}`);

    if (document.body.classList.contains('vista-mobile')) {
      cambiarTabMovil('tab-reservar');
      activarSubpanelMovil($('#tab-reservar'), 'sub-horarios');
    } else {
      // Desplazamiento suave hasta el formulario de reserva en vista PC
      $('html, body').animate({
        scrollTop: $('#booking-section').offset().top - 80
      }, 500);
    }
  });

  // Botón en vista móvil para avanzar de Horario (#sub-horarios) a Titular (#sub-titular)
  $('#btn-ir-titular').off('click').on('click', function () {
    const fechaOk = validarCampoFecha();
    const horasOk = validarHorarios();
    if (fechaOk && horasOk) {
      activarSubpanelMovil($('#tab-reservar'), 'sub-titular');
    }
  });

  // 3.5 Pestaña Acordeón: Plegar y Desplegar Catálogo (Optimización de Espacio con .slideToggle)
  $('#toggle-catalog-btn').click(function() {
    let $btn = $(this);
    let $wrapper = $('#catalog-collapsible-wrapper');

    $wrapper.slideToggle(350, function() {
      if ($wrapper.is(':visible')) {
        $btn.removeClass('collapsed').attr('aria-expanded', 'true');
        $btn.find('.toggle-text').empty().append(
          $('<i>').addClass('fa-solid fa-eye-slash'),
          document.createTextNode(' Ocultar Catálogo de Canchas')
        );
        registrarEventoTimestamp('UI', 'Desplegó el catálogo de canchas (.slideToggle)');
      } else {
        $btn.addClass('collapsed').attr('aria-expanded', 'false');
        $btn.find('.toggle-text').empty().append(
          $('<i>').addClass('fa-solid fa-eye'),
          document.createTextNode(' Ver / Mostrar Catálogo de Canchas')
        );
        registrarEventoTimestamp('UI', 'Ocultó el catálogo de canchas (.slideToggle)');
      }
    });
  });


  // ==========================================================
  // FUNCIÓN 4: GESTIÓN DINÁMICA DE DISPONIBILIDAD, HORARIOS Y RESERVAS
  // ==========================================================
  
  // 4.1 Configurar rango de fechas permitidas (HOY hasta máximo 30 días a futuro)
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  const fechaHoyFormato = `${yyyy}-${mm}-${dd}`;

  // Límite máximo de reserva a futuro: 30 días de anticipación (evita fechas lejanas como 2077)
  const DIAS_ANTICIPACION_MAX = 30;
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + DIAS_ANTICIPACION_MAX);
  const yyyyMax = fechaLimite.getFullYear();
  const mmMax = String(fechaLimite.getMonth() + 1).padStart(2, '0');
  const ddMax = String(fechaLimite.getDate()).padStart(2, '0');
  const fechaMaxFormato = `${yyyyMax}-${mmMax}-${ddMax}`;

  // Establecer valor inicial y atributos min/max en los inputs de fecha (HTML5 Datepicker)
  $('#fecha-reserva')
    .attr('min', fechaHoyFormato)
    .attr('max', fechaMaxFormato)
    .val(fechaHoyFormato);

  // Variables de control de horas y precios
  let precioPorHora = 80;
  let horaInicio = null;
  let horaFin = null;
  let horasValidas = false;

  // Estado dinámico de reservas confirmadas (en memoria y sincronizado en localStorage)
  let reservasConfirmadas = JSON.parse(localStorage.getItem('deporzone_reservas_sistema') || '[]');

  // Función para obtener reservas de una fecha y cancha específicas
  function obtenerReservasParaFechaYCancha(fecha, canchaId) {
    if (!fecha) return [];
    return reservasConfirmadas.filter(function(r) {
      if (canchaId && r.canchaId) {
        return r.fecha === fecha && r.canchaId === canchaId;
      }
      return r.fecha === fecha;
    });
  }

  // 1. GESTIÓN DINÁMICA DE DISPONIBILIDAD Y HORARIOS POR FECHA
  // Estado inicial: franjas libres; al reservar: franja en rojo (ocupado) para esa fecha exacta
  function actualizarDisponibilidadHorarios() {
    const fechaSeleccionada = $('#fecha-reserva').val();
    const canchaSeleccionada = $('#select-cancha-reserva').val();
    const reservasFecha = obtenerReservasParaFechaYCancha(fechaSeleccionada, canchaSeleccionada);
    const esMovil = document.body.classList.contains('vista-mobile');

    $('.btn-slot').each(function() {
      const inicio = parseInt($(this).data('inicio'));
      const fin = parseInt($(this).data('fin'));

      // Verificar si alguna reserva confirmada ocupa esta franja horaria
      const estaOcupada = reservasFecha.some(function(r) {
        return Math.max(inicio, r.horaInicio) < Math.min(fin, r.horaFin);
      });

      if (estaOcupada) {
        $(this).removeClass('active-slot').addClass('ocupado');
        const textoOcupado = esMovil ? `${inicio}:00 (Ocup.)` : `${inicio}:00 - ${fin}:00 (Ocupado)`;
        $(this).text(textoOcupado);
      } else {
        $(this).removeClass('ocupado');
        $(this).text(`${inicio}:00 - ${fin}:00`);
      }
    });

    // Si la selección actual coincide con una hora que ahora está ocupada, deseleccionarla
    if (horaInicio !== null && horaFin !== null) {
      const seleccionOcupada = reservasFecha.some(function(r) {
        return Math.max(horaInicio, r.horaInicio) < Math.min(horaFin, r.horaFin);
      });

      if (seleccionOcupada) {
        $('.btn-slot').removeClass('active-slot');
        horaInicio = null;
        horaFin = null;
        horasValidas = false;
        $('#select-inicio').prop('selectedIndex', 0);
        $('#select-fin').prop('selectedIndex', 0);
        calcularTotalReserva();
        verificarFormularioCompleto();
      }
    }
  }

  // 2. FUNCIÓN DE LIMPIEZA TOTAL DEL FORMULARIO DE RESERVA (Req 2)
  function limpiarFormularioReserva() {
    // Limpiar campos de texto del titular
    $('#client-name, #client-phone, #client-email, #client-notes').val('');
    $('#client-name, #client-phone, #client-email, #select-inicio, #select-fin').removeClass('input-valid input-invalid');

    // Desmarcar checkboxes adicionales
    $('input[name="add-ball"], input[name="add-vests"], input[name="add-water"]').prop('checked', false);

    // Resetear selector de modalidad y método de pago
    $('#game-mode').prop('selectedIndex', 0);
    $('#payment-method').prop('selectedIndex', 0);

    // Resetear selector de cancha
    $('#select-cancha-reserva').prop('selectedIndex', 0);
    let optInicial = $('#select-cancha-reserva').find('option:first');
    precioPorHora = parseInt(optInicial.data('precio')) || 80;
    $('#summary-court').text(optInicial.text().split('(')[0].trim());

    // Deseleccionar franjas de horarios
    $('.btn-slot').removeClass('active-slot');
    horaInicio = null;
    horaFin = null;
    horasValidas = false;
    $('#select-inicio').prop('selectedIndex', 0);
    $('#select-fin').prop('selectedIndex', 0);

    // Ocultar mensajes de error
    $('#err-date, #err-hours, #err-name, #err-phone, #err-email, #booking-alert-error').hide().text('');
    $('#booking-alert-success').hide();

    // Resetear resumen
    $('#summary-hours').text('0 Horas');
    $('#summary-time').text('No asignado');
    $('#summary-total').text('0 BOB').css('color', '#333333');

    // Actualizar estado del botón de envío
    verificarFormularioCompleto();

    // Refrescar disponibilidad visual de franjas según fecha actual
    actualizarDisponibilidadHorarios();
  }

  // 4.2 Clic en los botones de Turnos Rápidos (.btn-slot)
  $('.btn-slot').off('click').on('click', function() {
    let hIni = parseInt($(this).data('inicio'));
    let hF = parseInt($(this).data('fin'));

    if ($(this).hasClass('ocupado')) {
      mostrarAlertaError(`⛔ El turno de las ${hIni}:00 a ${hF}:00 ya se encuentra reservado para esta fecha. Elige otro horario disponible.`);
      registrarEventoTimestamp('ALERTA', `Intentó seleccionar turno ocupado (${hIni}:00 a ${hF}:00)`);
      return;
    }

    // Remover estado activo de los demás y ponérselo al seleccionado
    $('.btn-slot').removeClass('active-slot');
    $(this).addClass('active-slot');

    // Sincronizar con los selectores de hora inicio y fin
    horaInicio = hIni;
    horaFin = hF;

    $('#select-inicio').val(horaInicio);
    $('#select-fin').val(horaFin);

    registrarEventoTimestamp('TURNO', `Seleccionó turno rápido ${horaInicio}:00 a ${horaFin}:00`);
    validarHorarios();
    calcularTotalReserva();
    verificarFormularioCompleto();
  });

  // 4.3 Cambio en selectores de Hora Inicio y Fin
  $('#select-inicio, #select-fin').on('change blur', function() {
    const valIni = $('#select-inicio').val();
    const valFin = $('#select-fin').val();
    if (!valIni || !valFin) return;

    horaInicio = parseInt(valIni);
    horaFin = parseInt(valFin);

    validarHorarios();
    calcularTotalReserva();
    verificarFormularioCompleto();
  });

  // Función dedicada a validar los horarios
  function validarHorarios() {
    $('#select-inicio, #select-fin').removeClass('input-invalid input-valid');
    $('#err-hours').hide().text('');
    horasValidas = false;

    if (horaInicio === null || horaFin === null) {
      $('.btn-slot').removeClass('active-slot');
      return false;
    }

    // Regla 1: Fin debe ser estrictamente mayor a inicio
    if (horaFin <= horaInicio) {
      $('#err-hours').text('⚠️ La hora de fin debe ser posterior a la de inicio (mínimo 1 hora de juego).').slideDown('fast');
      $('#select-inicio, #select-fin').addClass('input-invalid');
      $('.btn-slot').removeClass('active-slot');
      mostrarAlertaError('⚠️ Horario no válido: la hora fin debe ser mayor a la hora de inicio.');
      return false;
    }

    // Regla 2: Verificar si el rango abarca algún turno ocupado dinámico para la fecha
    const fechaActual = $('#fecha-reserva').val();
    const canchaActual = $('#select-cancha-reserva').val();
    const reservasFecha = obtenerReservasParaFechaYCancha(fechaActual, canchaActual);

    let tieneTurnoOcupado = false;
    let turnoChocado = '';
    for (let r of reservasFecha) {
      if (Math.max(horaInicio, r.horaInicio) < Math.min(horaFin, r.horaFin)) {
        tieneTurnoOcupado = true;
        turnoChocado = `${r.horaInicio}:00 a ${r.horaFin}:00`;
        break;
      }
    }

    if (tieneTurnoOcupado) {
      $('#err-hours').text(`⛔ Tu selección abarca el horario ${turnoChocado}, el cual ya está ocupado en esta fecha.`).slideDown('fast');
      $('#select-inicio, #select-fin').addClass('input-invalid');
      $('.btn-slot').removeClass('active-slot');
      mostrarAlertaError(`⛔ El rango seleccionado incluye turnos ocupados (${turnoChocado}). Elige horas libres.`);
      return false;
    }

    // Horario válido
    horasValidas = true;
    $('#select-inicio, #select-fin').addClass('input-valid');
    $('#err-hours').slideUp('fast');
    $('#booking-alert-error').slideUp('fast');

    // Sincronizar botón rápido si coincide exactamente con 1 turno
    $('.btn-slot').removeClass('active-slot');
    if (horaFin - horaInicio === 1) {
      $(`.btn-slot[data-inicio="${horaInicio}"][data-fin="${horaFin}"]:not(.ocupado)`).addClass('active-slot');
    }

    return true;
  }

  // 4.4 Cambio de Cancha Seleccionada
  $('#select-cancha-reserva').change(function() {
    let optSeleccionada = $(this).find('option:selected');
    precioPorHora = parseInt(optSeleccionada.data('precio')) || 80;

    let nombreCancha = optSeleccionada.text().split('(')[0].trim();
    $('#summary-court').text(nombreCancha);

    actualizarDisponibilidadHorarios();
    validarHorarios();
    calcularTotalReserva();
  });

  // 4.5 Cambio en Adicionales
  $('input[name="add-ball"], input[name="add-vests"], input[name="add-water"]').change(function() {
    calcularTotalReserva();
  });

  // 4.6 Función central de cálculo y actualización en vivo del resumen
  function calcularTotalReserva() {
    let totalHoras = horaFin - horaInicio;

    if (!horasValidas || totalHoras <= 0) {
      $('#summary-hours').text('0 Horas (Horario inválido)');
      $('#summary-time').text('No asignado');
      $('#summary-total').text('0 BOB').css('color', '#e53935');
      return;
    }

    let subtotalCancha = totalHoras * precioPorHora;

    // Sumar adicionales seleccionados
    let totalAdicionales = 0;
    if ($('#add-ball').is(':checked')) totalAdicionales += parseInt($('#add-ball').val());
    if ($('#add-vests').is(':checked')) totalAdicionales += parseInt($('#add-vests').val());
    if ($('#add-water').is(':checked')) totalAdicionales += parseInt($('#add-water').val());

    let granTotal = subtotalCancha + totalAdicionales;

    // Actualizar texto del resumen
    $('#summary-hours').text(`${totalHoras} Hora(s)`);
    $('#summary-time').text(`${horaInicio}:00 a ${horaFin}:00`);

    // Animación jQuery para resaltar el cambio en el monto total (.animate)
    if (document.body.classList.contains('vista-mobile')) {
      $('#summary-total')
        .text(`${granTotal} BOB`)
        .css('color', '#27ae60')
        .stop(true, true)
        .animate({ opacity: 0.5 }, 120)
        .animate({ opacity: 1 }, 120);
    } else {
      $('#summary-total')
        .text(`${granTotal} BOB`)
        .css('color', '#27ae60')
        .animate({ fontSize: '1.4rem' }, 120)
        .animate({ fontSize: '1.25rem' }, 120);
    }
  }

  // 4.7 Función auxiliar para mostrar alertas de error con .text() y slideDown (Anti-XSS)
  function mostrarAlertaError(mensaje) {
    $('#booking-alert-success').hide();
    $('#booking-alert-error').text(mensaje).slideDown('fast');
  }


  // ==========================================================
  // FUNCIONES DE VALIDACIÓN INDIVIDUAL (PARA BLUR / INPUT)
  // ==========================================================

  // Validación de Fecha (No vacía y no en el pasado)
  function validarCampoFecha() {
    let valorFecha = $('#fecha-reserva').val();
    $('#fecha-reserva').removeClass('input-invalid input-valid');
    $('#err-date').hide().text('');

    if (!valorFecha) {
      $('#err-date').text('⚠️ Debes seleccionar una fecha para la reserva.').slideDown('fast');
      $('#fecha-reserva').addClass('input-invalid');
      return false;
    }

    if (valorFecha < fechaHoyFormato) {
      $('#err-date').text('⚠️ No puedes reservar en una fecha pasada. Elige hoy o un día posterior.').slideDown('fast');
      $('#fecha-reserva').addClass('input-invalid');
      return false;
    }

    if (valorFecha > fechaMaxFormato) {
      $('#err-date').text(`⚠️ Solo se permite reservar con un máximo de ${DIAS_ANTICIPACION_MAX} días de anticipación (fecha límite: ${fechaMaxFormato}).`).slideDown('fast');
      $('#fecha-reserva').addClass('input-invalid');
      return false;
    }

    $('#fecha-reserva').addClass('input-valid');
    return true;
  }

  // Validación de Nombre Completo
  function validarCampoNombre() {
    let nombre = $('#client-name').val().trim();
    let regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/;

    $('#client-name').removeClass('input-invalid input-valid');
    $('#err-name').hide().text('');

    if (nombre === '') {
      $('#err-name').text('⚠️ El nombre completo es obligatorio.').slideDown('fast');
      $('#client-name').addClass('input-invalid');
      return false;
    }

    if (!regexNombre.test(nombre)) {
      $('#err-name').text('⚠️ Ingresa un nombre válido (al menos 3 letras, sin números ni símbolos).').slideDown('fast');
      $('#client-name').addClass('input-invalid');
      return false;
    }

    $('#client-name').addClass('input-valid');
    return true;
  }

  // Validación de Celular / WhatsApp
  function validarCampoTelefono() {
    let tel = $('#client-phone').val().trim();
    let regexTel = /^[0-9]{7,10}$/;

    $('#client-phone').removeClass('input-invalid input-valid');
    $('#err-phone').hide().text('');

    if (tel === '') {
      $('#err-phone').text('⚠️ El número de celular / WhatsApp es obligatorio.').slideDown('fast');
      $('#client-phone').addClass('input-invalid');
      return false;
    }

    if (!regexTel.test(tel)) {
      $('#err-phone').text('⚠️ Ingresa un número válido de 7 a 10 dígitos numéricos (ej: 78854844).').slideDown('fast');
      $('#client-phone').addClass('input-invalid');
      return false;
    }

    $('#client-phone').addClass('input-valid');
    return true;
  }

  // Validación de Correo Electrónico
  function validarCampoEmail() {
    let correo = $('#client-email').val().trim();
    let regexEmail = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

    $('#client-email').removeClass('input-invalid input-valid');
    $('#err-email').hide().text('');

    if (correo === '') {
      $('#err-email').text('⚠️ El correo electrónico es obligatorio.').slideDown('fast');
      $('#client-email').addClass('input-invalid');
      return false;
    }

    if (!regexEmail.test(correo)) {
      $('#err-email').text('⚠️ Ingresa un formato de correo válido (ej: usuario@correo.com).').slideDown('fast');
      $('#client-email').addClass('input-invalid');
      return false;
    }

    $('#client-email').addClass('input-valid');
    return true;
  }

  // ==========================================================
  // EVENTOS BLUR / INPUT: VALIDAR AL SALIR DEL CAMPO O TOCARLO
  // ==========================================================
  // Al salir del campo (blur) o cambiar fecha, se valida y actualiza la disponibilidad de horarios
  $('#fecha-reserva').on('blur change', function() {
    validarCampoFecha();
    actualizarDisponibilidadHorarios();
    validarHorarios();
    calcularTotalReserva();
    verificarFormularioCompleto();
  });

  $('#client-name').on('blur input', function() {
    validarCampoNombre();
    verificarFormularioCompleto();
  });

  $('#client-phone').on('blur input', function() {
    validarCampoTelefono();
    verificarFormularioCompleto();
  });

  $('#client-email').on('blur input', function() {
    validarCampoEmail();
    verificarFormularioCompleto();
  });

  // ==========================================================
  // ACTIVACIÓN DINÁMICA DEL BOTÓN CUANDO TODO ESTÁ VÁLIDO
  // ==========================================================
  function verificarFormularioCompleto() {
    let fechaOk = validarCampoFechaSilencioso();
    let horasOk = horasValidas;
    let nombreOk = validarCampoNombreSilencioso();
    let telefonoOk = validarCampoTelefonoSilencioso();
    let emailOk = validarCampoEmailSilencioso();

    let todoValido = fechaOk && horasOk && nombreOk && telefonoOk && emailOk;

    let $btn = $('#btn-submit-booking');

    if (todoValido) {
      // Habilitar botón, ponerlo en verde listo para enviar
      $btn
        .prop('disabled', false)
        .removeClass('btn-disabled')
        .addClass('btn-ready')
        .empty()
        .append(
          $('<i>').addClass('fa-solid fa-circle-check'),
          document.createTextNode(' Confirmar y Reservar en Wally Park')
        );
    } else {
      // Deshabilitar botón y mantenerlo en gris
      $btn
        .prop('disabled', true)
        .removeClass('btn-ready')
        .addClass('btn-disabled')
        .empty()
        .append(
          $('<i>').addClass('fa-solid fa-lock'),
          document.createTextNode(' Completa los campos para reservar')
        );
    }

    return todoValido;
  }

  // Funciones de validación silenciosa (comprueba estado sin mostrar errores antes de tiempo)
  function validarCampoFechaSilencioso() {
    let f = $('#fecha-reserva').val();
    return f && (f >= fechaHoyFormato) && (f <= fechaMaxFormato);
  }

  function validarCampoNombreSilencioso() {
    let n = $('#client-name').val().trim();
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,50}$/.test(n);
  }

  function validarCampoTelefonoSilencioso() {
    let t = $('#client-phone').val().trim();
    return /^[0-9]{7,10}$/.test(t);
  }

  function validarCampoEmailSilencioso() {
    let e = $('#client-email').val().trim();
    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(e);
  }


  // Validación en tiempo real de Cola de Retos (#inputCancion)
  function validarCampoCola() {
    const val = ($('#inputCancion').val() || '').trim();
    $('#inputCancion').removeClass('input-invalid input-valid');
    $('#errInputCancion').hide().text('');

    if (val.length < 3) {
      $('#errInputCancion').text('⚠️ Escribe el nombre del equipo o reto (mínimo 3 caracteres).').slideDown('fast');
      $('#inputCancion').addClass('input-invalid');
      return false;
    }

    $('#inputCancion').addClass('input-valid');
    return true;
  }

  $('#inputCancion').off('blur.cola input.cola').on('blur.cola', function () {
    $(this).attr('data-tocado', 'true');
    validarCampoCola();
  }).on('input.cola', function () {
    if ($(this).attr('data-tocado') === 'true' || $(this).hasClass('input-invalid')) {
      validarCampoCola();
    }
  });

  // Cola Blindada de Retos y Espera (44px, Truncado seguro .text() y delegación .off().on())
  function agregarElementoACola(texto) {
    const $fila = $('<div>').addClass('fila-cancion');
    const $titulo = $('<span>').addClass('titulo-truncado').text(texto);
    const $btnQuitar = $('<button>')
      .addClass('btn-tactil btn-quitar btn-hidratable')
      .attr('data-hidratado', 'false')
      .attr('type', 'button')
      .attr('aria-label', 'Quitar de la cola')
      .text('✕');

    $fila.append($titulo, $btnQuitar);
    $('#listaCanciones').prepend($fila);
    hidratarBotonesDOM($fila);
  }

  agregarElementoACola('Reto Estelar: Los Halcones vs Club Altiplano — Cancha 2 Tunari Master (21:00)');
  agregarElementoACola('Lista de Espera VIP: Equipo Illimani Volley — Cancha 1 Climatizada (20:00)');

  $('#btnPedir').off('click').on('click', function () {
    if (!validarCampoCola()) return;
    const texto = $('#inputCancion').val().trim();
    agregarElementoACola(texto);
    registrarEventoTimestamp('COLA', 'Agregó reto a la cola: ' + texto);
    $('#inputCancion').val('').removeClass('input-invalid input-valid').removeAttr('data-tocado');
    $('#errInputCancion').hide();
  });

  $('#listaCanciones')
    .off('click', '.btn-quitar')
    .on('click', '.btn-quitar', function () {
      const eliminado = $(this).siblings('.titulo-truncado').text();
      $(this).closest('.fila-cancion').remove();
      registrarEventoTimestamp('COLA', 'Retiró de la cola: ' + eliminado);
    });

  // ==========================================================
  // 3. GESTIÓN CONDICIONAL DEL BOTÓN Y LISTA DE CANCELACIÓN DE RESERVAS ACTIVAS (Req 3)
  // ==========================================================
  function actualizarVisibilidadBotonCancelar() {
    const cant = reservasConfirmadas.length;
    $('#cant-reservas-activas').text(cant);
    contadorReservas = cant;
    localStorage.setItem('deporzone_orders', String(contadorReservas));
    $('#stat-order-events').text(contadorReservas);

    // Condición estricta: visible únicamente si el usuario tiene una o más reservas realizadas
    if (cant > 0) {
      $('#seccionCancelarReserva').stop(true, true).slideDown(250);
    } else {
      $('#seccionCancelarReserva').stop(true, true).slideUp(250);
    }
  }

  function renderizarHistorialReservasDOM() {
    const $lista = $('#listaReservas');
    $lista.empty();

    if (reservasConfirmadas.length === 0) {
      const $vacio = $('<li>')
        .addClass('item-reserva-vacio')
        .append(
          $('<i>').addClass('fa-solid fa-calendar-xmark'),
          document.createTextNode(' No tienes reservas activas por el momento.')
        );
      $lista.append($vacio);
      return;
    }

    reservasConfirmadas.forEach(function(r) {
      const $item = $('<li>').addClass('item-reserva');
      const $info = $('<div>').addClass('item-reserva-info');
      const $titulo = $('<strong>').text(r.cliente + ' — ');
      const $detalle = $('<span>').text(`${r.canchaNombre} (${r.fecha} • ${r.horarioTexto}) • ${r.total}`);
      $info.append($titulo, $detalle);

      const $btnCancelar = $('<button>')
        .addClass('btn-cancelar-item btn-hidratable')
        .attr('type', 'button')
        .attr('data-id', r.id)
        .attr('title', 'Cancelar esta reserva activa')
        .append(
          $('<i>').addClass('fa-solid fa-trash-can'),
          document.createTextNode(' Cancelar')
        );

      $item.append($info, $btnCancelar);
      $lista.append($item);
    });

    hidratarBotonesDOM($lista);
  }

  // Cancelar reserva individual desde el botón en el historial
  $('#listaReservas').off('click', '.btn-cancelar-item').on('click', '.btn-cancelar-item', function() {
    const resId = $(this).attr('data-id');
    cancelarReservaPorId(resId);
  });

  // Cancelar la reserva más reciente desde el botón condicional principal
  $('#btn-cancelar-reserva-activa').off('click').on('click', function() {
    if (reservasConfirmadas.length === 0) return;
    const ultimaReserva = reservasConfirmadas[reservasConfirmadas.length - 1];
    cancelarReservaPorId(ultimaReserva.id);
  });

  function cancelarReservaPorId(id) {
    const index = reservasConfirmadas.findIndex(r => r.id === id);
    if (index === -1) return;

    const eliminada = reservasConfirmadas.splice(index, 1)[0];
    localStorage.setItem('deporzone_reservas_sistema', JSON.stringify(reservasConfirmadas));

    // Refrescar vistas sincronizadas
    actualizarVisibilidadBotonCancelar();
    renderizarHistorialReservasDOM();
    actualizarDisponibilidadHorarios();

    registrarEventoTimestamp('CANCELACION', `Canceló reserva de ${eliminada.cliente} (${eliminada.canchaNombre} • ${eliminada.horarioTexto})`);
    mostrarToastAlert('🗑️ Reserva Cancelada', `El turno de ${eliminada.horarioTexto} en ${eliminada.canchaNombre} quedó libre nuevamente.`, false);
  }

  // ==========================================================
  // [PWA 5]: DETECTOR ONLINE / OFFLINE + SINCRONIZACIÓN LOCALSTORAGE
  // ==========================================================
  function actualizarEstadoRedPWA() {
    if (navigator.onLine) {
      $('#estadoRed')
        .text('🟢 En Línea')
        .css({ backgroundColor: '#dcfce7', color: '#166534' });

      const pendientes = JSON.parse(localStorage.getItem('deporzone_cola_offline') || '[]');
      if (pendientes.length > 0) {
        mostrarToastAlert(
          '🌐 Conexión Restablecida',
          'Se sincronizaron ' + pendientes.length + ' reserva(s) guardadas sin conexión.',
          false
        );
        localStorage.removeItem('deporzone_cola_offline');
      }
    } else {
      $('#estadoRed')
        .text('🟠 Sin Conexión (Modo Local)')
        .css({ backgroundColor: '#ffedd5', color: '#9a3412' });
    }
  }

  $(window).off('online offline').on('online offline', actualizarEstadoRedPWA);
  actualizarEstadoRedPWA();

  // ==========================================================
  // SUBMIT DEL FORMULARIO DE RESERVA -> APERTURA DEL MODAL UI
  // ==========================================================
  let timerInterval = null;
  let tiempoRestante = 30;

  $('#reservation-form').submit(function(e) {
    e.preventDefault();

    // Ejecutar todas las validaciones con alerta visible
    let vFecha = validarCampoFecha();
    let vHoras = validarHorarios();
    let vNombre = validarCampoNombre();
    let vTel = validarCampoTelefono();
    let vEmail = validarCampoEmail();

    if (!vFecha || !vHoras || !vNombre || !vTel || !vEmail) {
      mostrarAlertaError('⚠️ Revisa los campos resaltados en rojo antes de proceder.');
      verificarFormularioCompleto();
      if (document.body.classList.contains('vista-mobile') && (!vFecha || !vHoras)) {
        activarSubpanelMovil($('#tab-reservar'), 'sub-horarios');
      }
      return;
    }

    // Datos listos para pasar a la Ventana Modal UI
    let nombreCliente = $('#client-name').val().trim();
    let cancha = $('#summary-court').text();
    let total = $('#summary-total').text();
    let fecha = $('#fecha-reserva').val();
    let horas = horaFin - horaInicio;

    // Poblar datos en la Ventana Modal UI (incluyendo la garantía requerida)
    $('#modal-court-name').text(cancha);
    $('#modal-client-name').text(nombreCliente);
    $('#modal-schedule').text(`${fecha} (${horaInicio}:00 - ${horaFin}:00)`);
    $('#modal-guarantee').text('50 BOB (Reembolsable)');
    $('#modal-total-amount').text(`${total} (${horas} Horas)`);

    // Abrir Modal UI con fade
    registrarEventoTimestamp('MODAL', `Abrió modal de confirmación para ${nombreCliente} (${total})`);
    $('#modal-overlay').fadeIn(250);

    // Iniciar Temporizador Asíncrono de 30s
    iniciarTemporizadorModal();
  });

  // Función del Temporizador Asíncrono de Reserva Expirable (setInterval)
  function iniciarTemporizadorModal() {
    clearInterval(timerInterval);
    tiempoRestante = 30;
    actualizarTextoTimer();

    timerInterval = setInterval(function() {
      tiempoRestante--;
      actualizarTextoTimer();

      if (tiempoRestante <= 0) {
        clearInterval(timerInterval);
        // Al expirar el tiempo: cerrar modal y limpiar el formulario por completo (Req 2)
        $('#modal-overlay').fadeOut(300, function() {
          registrarEventoTimestamp('TIMER', 'Expiró el temporizador de 30s de la reserva');
          limpiarFormularioReserva();
          mostrarToastAlert(
            '⚠️ Tarifa Flash Expirada',
            'Se agotó el tiempo límite de 30 segundos. Formulario restablecido.',
            true
          );
        });
      }
    }, 1000);
  }

  function actualizarTextoTimer() {
    let seg = tiempoRestante < 10 ? `0${tiempoRestante}` : tiempoRestante;
    $('#modal-countdown').text(`00:${seg}s`);
  }

  // 2. Cerrar Modal al hacer clic en [X] o en "Cancelar" -> LIMPIEZA COMPLETA DEL FORMULARIO (Req 2)
  $('#modal-close-btn, #modal-cancel-btn').click(function() {
    registrarEventoTimestamp('MODAL', 'Canceló confirmación en modal: formulario limpiado por completo');
    cerrarModal();
    limpiarFormularioReserva();
    mostrarToastAlert('ℹ️ Proceso Cancelado', 'Todos los campos del formulario han sido limpiados por completo.', false);
  });

  // Cerrar al hacer clic en el fondo oscuro -> Limpieza completa del formulario
  $('#modal-overlay').click(function(e) {
    if ($(e.target).is('#modal-overlay')) {
      cerrarModal();
      limpiarFormularioReserva();
    }
  });

  function cerrarModal() {
    clearInterval(timerInterval);
    $('#modal-overlay').fadeOut(250);
  }

  // ==========================================================
  // BOTÓN "PROCESAR PAGO" EN EL MODAL -> RESERVAR + MARCAR HORARIO ROJO
  // ==========================================================
  $('#modal-confirm-btn').off('click').on('click', function() {
    clearInterval(timerInterval);

    const clienteConfirmado = $('#modal-client-name').text();
    const canchaConfirmada = $('#modal-court-name').text();
    const horarioConfirmado = $('#modal-schedule').text();
    const montoConfirmado = $('#modal-total-amount').text();
    const fechaReserva = $('#fecha-reserva').val();
    const canchaId = $('#select-cancha-reserva').val();

    // 1. Guardar la reserva activa en memoria y localStorage
    const nuevaReserva = {
      id: 'res_' + Date.now(),
      cliente: clienteConfirmado,
      canchaId: canchaId,
      canchaNombre: canchaConfirmada,
      fecha: fechaReserva,
      horaInicio: horaInicio,
      horaFin: horaFin,
      horarioTexto: `${horaInicio}:00 - ${horaFin}:00`,
      total: montoConfirmado,
      fechaRegistro: new Date().toISOString()
    };

    reservasConfirmadas.push(nuevaReserva);
    localStorage.setItem('deporzone_reservas_sistema', JSON.stringify(reservasConfirmadas));

    // 2. Refrescar estado: marcar horario reservado en rojo para esa fecha y mostrar botón de cancelar
    actualizarDisponibilidadHorarios();
    actualizarVisibilidadBotonCancelar();
    renderizarHistorialReservasDOM();
    registrarEventoTimestamp('RESERVA', `Confirmó reserva para ${clienteConfirmado} (${montoConfirmado})`);

    // Si está sin conexión, respalda la reserva en localStorage para sincronizarla luego
    if (!navigator.onLine) {
      const colaOffline = JSON.parse(localStorage.getItem('deporzone_cola_offline') || '[]');
      colaOffline.push({ clienteConfirmado, canchaConfirmada, horarioConfirmado, montoConfirmado });
      localStorage.setItem('deporzone_cola_offline', JSON.stringify(colaOffline));
    }

    // Cerrar modal suavemente
    $('#modal-overlay').fadeOut(250, function() {
      mostrarToastAlert(
        navigator.onLine ? '¡Reserva Procesada con Éxito! 🏆' : '🟠 Guardada en Modo Offline',
        navigator.onLine
          ? `Titular: ${clienteConfirmado} | Total: ${montoConfirmado}`
          : 'Sin internet: tu reserva quedó guardada localmente y se sincronizará al volver en línea.',
        !navigator.onLine
      );

      // Resumen en panel de éxito con garantía requerida
      const $alerta = $('#booking-alert-success').empty();
      $alerta.append(
        $('<strong>').text(navigator.onLine ? '¡Reserva Registrada y Procesada! 🎉' : '🟠 Reserva Guardada en Modo Local'),
        $('<br>'),
        document.createTextNode('Canjea tu comprobante en caja de DeporZone Wally Park.'),
        $('<br>'),
        document.createTextNode('Garantía requerida: '),
        $('<strong>').text('50 BOB (Reembolsable)'),
        document.createTextNode(' | Total abonado: '),
        $('<strong>').text(montoConfirmado)
      ).slideDown(300);

      // Limpiar formulario tras procesar la reserva
      setTimeout(function() {
        limpiarFormularioReserva();
      }, 3500);
    });
  });

  // Función para mostrar el Toast Alert Dinámico
  function mostrarToastAlert(titulo, mensaje, esWarning) {
    let $toast = $('#toast-alert');
    $('#toast-title').text(titulo);
    $('#toast-message').text(mensaje);

    if (esWarning) {
      $toast.addClass('toast-warning');
      $toast.find('.toast-icon i').attr('class', 'fa-solid fa-triangle-exclamation');
    } else {
      $toast.removeClass('toast-warning');
      $toast.find('.toast-icon i').attr('class', 'fa-solid fa-circle-check');
    }

    $toast.stop(true, true).slideDown(300).delay(3000).fadeOut(400);
  }

  // ==========================================================
  // FUNCIÓN 5: REDES SOCIALES INTERACTIVAS Y .fadeToggle()
  // ==========================================================
  $('#toggle-social-btn').click(function() {
    $('#social-collapsible-box').fadeToggle(300);
    registrarEventoTimestamp('UI', 'Alternó visibilidad de Redes Sociales (.fadeToggle)');
  });

  $('.social-card').click(function(e) {
    e.preventDefault();
    let redNombre = $(this).data('network');
    let urlDestino = $(this).attr('href');

    registrarEventoTimestamp('SOCIAL', `Abrió red social oficial: ${redNombre}`);
    mostrarToastAlert(
      '🌐 Canal Oficial DeporZone',
      `Abriendo ${redNombre}...`,
      false
    );

    setTimeout(function() {
      window.open(urlDestino, '_blank', 'noopener');
    }, 650);
  });

  // Inicialización de la pantalla al cargar: disponibilidad limpia, historial y validaciones
  $('#select-cancha-reserva').trigger('change');
  actualizarDisponibilidadHorarios();
  actualizarVisibilidadBotonCancelar();
  renderizarHistorialReservasDOM();
  validarHorarios();
  verificarFormularioCompleto();
  renderizarBitacora();
  registrarEventoTimestamp('SISTEMA', 'Inició sesión en DeporZone Wally Park');

});
