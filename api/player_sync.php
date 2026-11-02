<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Cache-Control: no-cache, no-store, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dataFile = __DIR__ . '/player_profiles.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    if ($data) {
        $pid = isset($data['playerId']) ? $data['playerId'] : 'p_0';
        $profiles = [];
        if (file_exists($dataFile)) {
            $profiles = json_decode(file_get_contents($dataFile), true) ?: [];
        }
        $profiles[$pid] = $data;
        file_put_contents($dataFile, json_encode($profiles, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(['ok' => true, 'saved' => true]);
        exit;
    }
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Dati JSON non validi']);
    exit;
}

// GET
$pid = isset($_GET['playerId']) ? $_GET['playerId'] : 'p_0';
$profile = [];
if (file_exists($dataFile)) {
    $profiles = json_decode(file_get_contents($dataFile), true) ?: [];
    if (isset($profiles[$pid])) {
        $profile = $profiles[$pid];
    }
}
echo json_encode(['ok' => true, 'profile' => $profile], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
