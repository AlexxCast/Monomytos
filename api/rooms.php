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

$roomsFile = __DIR__ . '/rooms_data.json';

function getRooms($file) {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}

function saveRooms($file, $rooms) {
    file_put_contents($file, json_encode($rooms, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$rooms = getRooms($roomsFile);

// Clean expired rooms older than 1 hour
$now = time();
foreach ($rooms as $code => $r) {
    if (isset($r['updated_at']) && ($now - $r['updated_at']) > 3600) {
        unset($rooms[$code]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $type = isset($input['type']) ? $input['type'] : '';
    $roomCode = isset($input['room']) ? strtoupper($input['room']) : '';

    if ($type === 'CREATE_ROOM' || $type === 'JOIN_ROOM') {
        if (!isset($rooms[$roomCode])) {
            $rooms[$roomCode] = [
                'code' => $roomCode,
                'players' => [],
                'events' => [],
                'updated_at' => $now
            ];
        }
        $player = isset($input['player']) ? $input['player'] : [];
        $pid = isset($player['id']) ? $player['id'] : '';
        $existing = false;
        foreach ($rooms[$roomCode]['players'] as &$p) {
            if ($p['id'] === $pid) {
                $p = $player;
                $existing = true;
                break;
            }
        }
        if (!$existing && !empty($player)) {
            $rooms[$roomCode]['players'][] = $player;
        }
        $rooms[$roomCode]['updated_at'] = $now;
        saveRooms($roomsFile, $rooms);
        echo json_encode(['ok' => true, 'room' => $rooms[$roomCode]]);
        exit;
    }

    if ($type === 'ACTION' || $type === 'GAME_EVENT') {
        if (isset($rooms[$roomCode])) {
            $rooms[$roomCode]['events'][] = [
                'id' => uniqid(),
                'sender' => isset($input['sender']) ? $input['sender'] : '',
                'data' => $input['data'],
                'time' => $now
            ];
            // Keep last 30 events
            if (count($rooms[$roomCode]['events']) > 30) {
                $rooms[$roomCode]['events'] = array_slice($rooms[$roomCode]['events'], -30);
            }
            $rooms[$roomCode]['updated_at'] = $now;
            saveRooms($roomsFile, $rooms);
            echo json_encode(['ok' => true]);
            exit;
        }
    }
}

// GET Room state
$roomCode = isset($_GET['room']) ? strtoupper($_GET['room']) : '';
if (!empty($roomCode) && isset($rooms[$roomCode])) {
    echo json_encode(['ok' => true, 'room' => $rooms[$roomCode]]);
    exit;
}

echo json_encode(['ok' => true, 'rooms' => array_keys($rooms)]);
