<?php
// Database configuration
$config = [
    'local' => [
        'host' => 'localhost',
        'dbname' => 'QueryEngineDev',
        'username' => 'engagement',
        'password' => 'Intelligent666!',
        'charset' => 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    ],
    'remote' => [
        'host' => 'localhost',  // Replace with actual remote server address
        'dbname' => 'NeonEngagementDev01', // Replace with actual customer database name
        'username' => 'engagement',  // Replace with remote database username
        'password' => 'Intelligent666!', // Replace with remote database password
        'charset' => 'utf8mb4',
        'options' => [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ],
    ]
];

/**
 * Get database connection
 * @param string $type Connection type: 'local' or 'remote'
 * @return PDO Database connection
 */
function getDbConnection($type = 'local')
{
    global $config;
    static $connections = [];

    if (!isset($connections[$type])) {
        $dbConfig = $config[$type];
        $dsn = "sqlsrv:Server={$dbConfig['host']};Database={$dbConfig['dbname']}";
        try {
            $connections[$type] = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $dbConfig['options']);
        } catch (PDOException $e) {
            // Instead of dying with an error message, return null and let the caller handle it
            $connections[$type] = null;
            error_log("Connection to {$type} database failed: " . $e->getMessage());
            // Don't terminate execution, just return null
        }
    }

    return $connections[$type];
}
