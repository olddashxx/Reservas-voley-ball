<?php
// ============================================================================
// CONEXIÓN PDO A BASE DE DATOS MYSQL (XAMPP)
// DeporZone Wally Park — API REST Ligera
// ============================================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Responder inmediatamente a peticiones preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = 'localhost';
$db   = 'deporzone_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

function responderJSON($data, $codigoEstado = 200) {
    http_response_code($codigoEstado);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

try {
    $dsn = "mysql:host={$host};dbname={$db};charset={$charset}";
    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $user, $pass, $opciones);
} catch (PDOException $e) {
    responderJSON([
        'ok' => false,
        'mensaje' => 'Error de conexión con la base de datos MySQL (XAMPP). Verifica que el servicio MySQL esté iniciado.',
        'error' => $e->getMessage()
    ], 500);
}
