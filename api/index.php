<?php
// API Router for Query Builder
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/database.php';
require_once 'controllers/ConfigController.php';
require_once 'controllers/QueryBuilderController.php';

// Simple router
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = explode('/', $uri);

// Find the endpoint in the URI path
$endpoint = null;
foreach ($uri as $segment) {
    if (in_array($segment, ['config', 'query', 'execute', 'tables', 'columns', 'relationships'])) {
        $endpoint = $segment;
        break;
    }
}

// Route based on the endpoint
if ($endpoint === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
    exit;
}

try {
    switch ($endpoint) {
        case 'config':
            $controller = new ConfigController();
            $controller->getConfig();
            break;

        case 'tables':
            $controller = new ConfigController();
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $controller->getTables();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $controller->saveTable();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $controller->updateTable();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $controller->deleteTable();
            }
            break;

        case 'columns':
            $controller = new ConfigController();
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $controller->getColumns();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $controller->saveColumn();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $controller->updateColumn();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $controller->deleteColumn();
            }
            break;

        case 'relationships':
            $controller = new ConfigController();
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $controller->getRelationships();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $controller->saveRelationship();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $controller->updateRelationship();
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $controller->deleteRelationship();
            }
            break;

        case 'query':
            $controller = new QueryBuilderController();
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $controller->buildQuery();
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
            }
            break;

        case 'execute':
            $controller = new QueryBuilderController();
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $controller->executeQuery();
            } else {
                http_response_code(405);
                echo json_encode(['error' => 'Method not allowed']);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
