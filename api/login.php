<?php
// ============================================================================
// ENDPOINT DE AUTENTICACIÓN / LOGIN (PHP PDO + BCRYPT)
// DeporZone Wally Park
// ============================================================================

require_once __DIR__ . '/conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responderJSON([
        'ok' => false,
        'mensaje' => 'Método no permitido. Se requiere petición POST.'
    ], 405);
}

// Lectura de parámetros JSON o FormData
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);
if (!$data && !empty($_POST)) {
    $data = $_POST;
}

$correo = isset($data['correo']) ? trim($data['correo']) : '';
$password = isset($data['password']) ? trim($data['password']) : '';

if (empty($correo) || empty($password)) {
    responderJSON([
        'ok' => false,
        'mensaje' => 'Debes ingresar correo electrónico y contraseña.'
    ], 400);
}

try {
    $stmt = $pdo->prepare("SELECT id_usuario, nombre_completo, correo, password_hash, rol FROM usuarios WHERE correo = ? LIMIT 1");
    $stmt->execute([$correo]);
    $usuario = $stmt->fetch();

    if ($usuario && password_verify($password, $usuario['password_hash'])) {
        responderJSON([
            'ok' => true,
            'mensaje' => 'Sesión iniciada correctamente en MySQL.',
            'usuario' => [
                'id' => (int)$usuario['id_usuario'],
                'nombre' => $usuario['nombre_completo'],
                'correo' => $usuario['correo'],
                'rol' => $usuario['rol']
            ]
        ], 200);
    } else {
        responderJSON([
            'ok' => false,
            'mensaje' => 'Credenciales inválidas. Verifica tu correo y contraseña.'
        ], 401);
    }
} catch (PDOException $e) {
    responderJSON([
        'ok' => false,
        'mensaje' => 'Error al consultar usuarios en base de datos.',
        'error' => $e->getMessage()
    ], 500);
}
