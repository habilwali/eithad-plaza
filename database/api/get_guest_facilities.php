<?php
/**
 * GET /api/get_guest_facilities.php?mac=AA:BB:... (optional; TV sends MAC for guest/room scoping)
 *
 * Returns JSON:
 * { "success": true, "facilities": [ { "id","label","name","desc","phone","img","hours": [["Monday","6AM – 11PM"],...] } ] }
 *
 * Deploy: place under web root with other TV APIs. Point PDO at your DB and table `cms_facilities` (see schema in repo).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = [
    'host' => getenv('CMS_DB_HOST') ?: '127.0.0.1',
    'port' => (int) (getenv('CMS_DB_PORT') ?: '3306'),
    'name' => getenv('CMS_DB_NAME') ?: 'hotel_cms',
    'user' => getenv('CMS_DB_USER') ?: 'root',
    'pass' => getenv('CMS_DB_PASS') !== false ? getenv('CMS_DB_PASS') : '',
];

$mac = isset($_GET['mac']) ? trim((string) $_GET['mac']) : null;

try {
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['name']
    );
    $pdo = new PDO($dsn, $config['user'], $config['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    // Optional: use $mac to join guest/room tables when you add them.
    // For now: all active facilities ordered by sort_order.
    $sql = <<<'SQL'
SELECT `id`, `label`, `name`, `description`, `phone`, `image_url`, `hours`
FROM `cms_facilities`
WHERE `is_active` = 1
ORDER BY `sort_order` ASC, `id` ASC
LIMIT 20
SQL;

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    $facilities = [];
    foreach ($rows as $r) {
        $hoursRaw = $r['hours'];
        if (is_string($hoursRaw)) {
            $hours = json_decode($hoursRaw, true);
        } else {
            $hours = $hoursRaw;
        }
        if (!is_array($hours)) {
            $hours = [];
        }

        $facilities[] = [
            'id' => (string) $r['id'],
            'label' => (string) $r['label'],
            'name' => (string) $r['name'],
            'desc' => (string) $r['description'],
            'phone' => (string) $r['phone'],
            'img' => (string) $r['image_url'],
            'hours' => $hours,
        ];
    }

    echo json_encode(
        [
            'success' => true,
            'mac' => $mac,
            'facilities' => $facilities,
        ],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(
        [
            'success' => false,
            'error' => 'Facilities unavailable',
            'detail' => $e->getMessage(),
        ],
        JSON_UNESCAPED_UNICODE
    );
}
