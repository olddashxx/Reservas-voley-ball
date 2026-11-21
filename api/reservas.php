<?php
// ============================================================================
// ENDPOINT CRUD DE RESERVAS Y CANCHAS (PHP PDO + CONSULTAS PREPARADAS)
// DeporZone Wally Park
// ============================================================================

require_once __DIR__ . '/conexion.php';

$metodo = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------------------------
// 1. GET: Listar canchas y reservas
// ----------------------------------------------------------------------------
if ($metodo === 'GET') {
    try {
        // Listar canchas
        $stmtCanchas = $pdo->query("SELECT id_cancha, nombre, superficie, precio_hora, estado FROM canchas ORDER BY id_cancha ASC");
        $canchas = $stmtCanchas->fetchAll();

        // Listar reservas con nombre de cancha
        $sqlReservas = "
            SELECT 
                r.id_reserva,
                r.titular_nombre,
                r.celular,
                r.correo,
                r.id_cancha,
                c.nombre AS cancha_nombre,
                c.superficie,
                r.fecha,
                r.hora_inicio,
                r.duracion_horas,
                r.modalidad,
                r.adicionales,
                r.total_bs,
                r.estado,
                r.creado_en
            FROM reservas r
            LEFT JOIN canchas c ON r.id_cancha = c.id_cancha
            ORDER BY r.fecha DESC, r.hora_inicio DESC, r.id_reserva DESC
        ";
        $stmtReservas = $pdo->query($sqlReservas);
        $reservas = $stmtReservas->fetchAll();

        responderJSON([
            'ok' => true,
            'canchas' => $canchas,
            'reservas' => $reservas
        ]);
    } catch (PDOException $e) {
        responderJSON([
            'ok' => false,
            'mensaje' => 'Error al consultar reservas en MySQL.',
            'error' => $e->getMessage()
        ], 500);
    }
}

// ----------------------------------------------------------------------------
// 2. POST: Crear nueva reserva con validaciones de servidor
// ----------------------------------------------------------------------------
if ($metodo === 'POST') {
    $rawBody = file_get_contents('php://input');
    $data = json_decode($rawBody, true);
    if (!$data && !empty($_POST)) {
        $data = $_POST;
    }

    $nombre = isset($data['titular_nombre']) ? trim($data['titular_nombre']) : '';
    $celular = isset($data['celular']) ? trim($data['celular']) : '';
    $correo = isset($data['correo']) ? trim($data['correo']) : '';
    $idCancha = isset($data['id_cancha']) ? trim($data['id_cancha']) : '';
    $fecha = isset($data['fecha']) ? trim($data['fecha']) : '';
    $horaInicio = isset($data['hora_inicio']) ? trim($data['hora_inicio']) : '';
    $duracion = isset($data['duracion_horas']) ? (int)$data['duracion_horas'] : 1;
    $modalidad = isset($data['modalidad']) ? trim($data['modalidad']) : 'Terna Varones (3 vs 3)';
    $adicionales = isset($data['adicionales']) ? trim($data['adicionales']) : '';
    $totalBs = isset($data['total_bs']) ? (float)$data['total_bs'] : 0.0;

    // Validación estricta de Nombre
    if (empty($nombre) || !preg_match('/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/u', $nombre)) {
        responderJSON(['ok' => false, 'mensaje' => 'Nombre inválido: solo se permiten letras y espacios.'], 400);
    }
    $palabras = array_filter(explode(' ', $nombre));
    if (count($palabras) < 2) {
        responderJSON(['ok' => false, 'mensaje' => 'Debes ingresar al menos nombre y apellido.'], 400);
    }

    // Validación estricta de Celular (8 dígitos empezando con 6 o 7)
    if (!preg_match('/^[67][0-9]{7}$/', $celular)) {
        responderJSON(['ok' => false, 'mensaje' => 'Celular inválido: debe tener exactamente 8 dígitos comenzando con 6 o 7.'], 400);
    }

    // Validación de Correo
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
        responderJSON(['ok' => false, 'mensaje' => 'Formato de correo electrónico inválido.'], 400);
    }

    // Validación de campos obligatorios de fecha y cancha
    if (empty($idCancha) || empty($fecha) || empty($horaInicio)) {
        responderJSON(['ok' => false, 'mensaje' => 'Faltan datos obligatorios de cancha, fecha u horario.'], 400);
    }

    try {
        // Verificar disponibilidad: ningún turno activo en misma fecha, cancha y horario
        $stmtCheck = $pdo->prepare("
            SELECT id_reserva FROM reservas 
            WHERE id_cancha = ? AND fecha = ? AND hora_inicio = ? AND estado != 'cancelada'
            LIMIT 1
        ");
        $stmtCheck->execute([$idCancha, $fecha, $horaInicio]);
        if ($stmtCheck->fetch()) {
            responderJSON([
                'ok' => false,
                'mensaje' => "El turno de las {$horaInicio} en esta cancha ya se encuentra reservado para la fecha seleccionada."
            ], 409);
        }

        // Inserción con consulta preparada contra Inyección SQL
        $stmtInsert = $pdo->prepare("
            INSERT INTO reservas (titular_nombre, celular, correo, id_cancha, fecha, hora_inicio, duracion_horas, modalidad, adicionales, total_bs, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
        ");
        $stmtInsert->execute([
            $nombre,
            $celular,
            $correo,
            $idCancha,
            $fecha,
            $horaInicio,
            $duracion,
            $modalidad,
            $adicionales,
            $totalBs
        ]);

        $idReserva = (int)$pdo->lastInsertId();

        responderJSON([
            'ok' => true,
            'mensaje' => 'Reserva guardada con éxito en la base de datos MySQL.',
            'id_reserva' => $idReserva,
            'reserva' => [
                'id_reserva' => $idReserva,
                'titular_nombre' => $nombre,
                'celular' => $celular,
                'correo' => $correo,
                'id_cancha' => $idCancha,
                'fecha' => $fecha,
                'hora_inicio' => $horaInicio,
                'duracion_horas' => $duracion,
                'modalidad' => $modalidad,
                'adicionales' => $adicionales,
                'total_bs' => $totalBs,
                'estado' => 'pendiente'
            ]
        ], 201);
    } catch (PDOException $e) {
        responderJSON([
            'ok' => false,
            'mensaje' => 'Error al registrar la reserva en MySQL.',
            'error' => $e->getMessage()
        ], 500);
    }
}

// ----------------------------------------------------------------------------
// 3. PUT / PATCH: Actualizar estado de reserva (Trabajador) o editar cancha (Admin)
// ----------------------------------------------------------------------------
if ($metodo === 'PUT' || $metodo === 'PATCH') {
    $rawBody = file_get_contents('php://input');
    $data = json_decode($rawBody, true);

    if (!$data) {
        responderJSON(['ok' => false, 'mensaje' => 'Cuerpo de petición JSON inválido.'], 400);
    }

    $accion = isset($data['accion']) ? $data['accion'] : '';

    // Acción A: Cambiar estado de reserva (ej: 'en_cancha', 'completada', 'cancelada') o entregar adicionales
    if ($accion === 'cambiar_estado_reserva' || $accion === 'entregar_adicionales' || (isset($data['id_reserva']) && !isset($data['id_cancha']))) {
        $idReserva = (int)$data['id_reserva'];
        $nuevoEstado = isset($data['nuevo_estado']) ? trim($data['nuevo_estado']) : '';
        $nuevosAdicionales = isset($data['adicionales']) ? trim($data['adicionales']) : null;

        $estadosValidos = ['pendiente', 'en_cancha', 'completada', 'cancelada'];
        if ($nuevoEstado !== '' && !in_array($nuevoEstado, $estadosValidos, true)) {
            responderJSON(['ok' => false, 'mensaje' => 'Estado no válido. Valores permitidos: pendiente, en_cancha, completada, cancelada.'], 400);
        }

        try {
            if ($nuevoEstado !== '' && $nuevosAdicionales !== null) {
                $stmt = $pdo->prepare("UPDATE reservas SET estado = ?, adicionales = ? WHERE id_reserva = ?");
                $stmt->execute([$nuevoEstado, $nuevosAdicionales, $idReserva]);
            } elseif ($nuevoEstado !== '') {
                $stmt = $pdo->prepare("UPDATE reservas SET estado = ? WHERE id_reserva = ?");
                $stmt->execute([$nuevoEstado, $idReserva]);
            } elseif ($nuevosAdicionales !== null) {
                $stmt = $pdo->prepare("UPDATE reservas SET adicionales = ? WHERE id_reserva = ?");
                $stmt->execute([$nuevosAdicionales, $idReserva]);
            }

            responderJSON([
                'ok' => true,
                'mensaje' => "Reserva #{$idReserva} actualizada con éxito en MySQL."
            ]);
        } catch (PDOException $e) {
            responderJSON(['ok' => false, 'mensaje' => 'Error al actualizar reserva en MySQL.', 'error' => $e->getMessage()], 500);
        }
    }

    // Acción B: Editar tarifa o estado de cancha (Rol Admin)
    if ($accion === 'editar_cancha' || isset($data['id_cancha'])) {
        $idCancha = trim($data['id_cancha']);
        $precioHora = isset($data['precio_hora']) ? (float)$data['precio_hora'] : null;
        $estadoCancha = isset($data['estado']) ? trim($data['estado']) : null;

        if (!$idCancha || ($precioHora === null && !$estadoCancha)) {
            responderJSON(['ok' => false, 'mensaje' => 'Datos insuficientes para actualizar la cancha.'], 400);
        }

        try {
            if ($precioHora !== null && $estadoCancha !== null) {
                $stmt = $pdo->prepare("UPDATE canchas SET precio_hora = ?, estado = ? WHERE id_cancha = ?");
                $stmt->execute([$precioHora, $estadoCancha, $idCancha]);
            } elseif ($precioHora !== null) {
                $stmt = $pdo->prepare("UPDATE canchas SET precio_hora = ? WHERE id_cancha = ?");
                $stmt->execute([$precioHora, $idCancha]);
            } else {
                $stmt = $pdo->prepare("UPDATE canchas SET estado = ? WHERE id_cancha = ?");
                $stmt->execute([$estadoCancha, $idCancha]);
            }

            responderJSON([
                'ok' => true,
                'mensaje' => "Cancha {$idCancha} actualizada correctamente en MySQL."
            ]);
        } catch (PDOException $e) {
            responderJSON(['ok' => false, 'mensaje' => 'Error al actualizar cancha en MySQL.', 'error' => $e->getMessage()], 500);
        }
    }

    responderJSON(['ok' => false, 'mensaje' => 'Acción no reconocida en PUT/PATCH.'], 400);
}

// Método no soportado
responderJSON(['ok' => false, 'mensaje' => 'Método HTTP no soportado.'], 405);
