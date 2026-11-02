<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo json_encode([
    'status' => 'online',
    'version' => '1.0.1',
    'name' => 'Monomythos Server (Altervista Cloud)',
    'type' => 'altervista_https',
    'timestamp' => time()
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
