<?php

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

/**
 * Query Builder Controller
 * Handles building and executing SQL queries from JSON structures
 */
class QueryBuilderController
{
    private $db;
    private $remoteDb;

    public function __construct()
    {
        $this->db = getDbConnection('local'); // Local connection for configuration
        $this->remoteDb = getDbConnection('remote'); // Remote connection for customer data
    }

    /**
     * Build a SQL query from a JSON structure
     */
    public function buildQuery()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !isset($data['query'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid query structure']);
            return;
        }

        try {
            $sql = $this->generateSQL($data['query']);
            echo json_encode(['sql' => $sql]);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Execute a query and return results
     */
    public function executeQuery()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request']);
            return;
        }

        // If SQL is provided directly, use it
        if (isset($data['sql'])) {
            $sql = $data['sql'];
        }
        // Otherwise, generate SQL from the query structure
        else if (isset($data['query'])) {
            try {
                $sql = $this->generateSQL($data['query']);
            } catch (Exception $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
                return;
            }
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Either SQL or query structure must be provided']);
            return;
        }        // Execute the query against the remote database
        try {
            $stmt = $this->remoteDb->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll();

            // Get column information
            $columnCount = $stmt->columnCount();
            $columns = [];

            for ($i = 0; $i < $columnCount; $i++) {
                $meta = $stmt->getColumnMeta($i);
                $columns[] = [
                    'name' => $meta['name'],
                    'type' => $meta['native_type']
                ];
            }

            echo json_encode([
                'columns' => $columns,
                'data' => $results,
                'sql' => $sql,
                'count' => count($results)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'error' => $e->getMessage(),
                'sql' => $sql
            ]);
        }
    }

    /**
     * Generate SQL from a query structure
     */
    private function generateSQL($query)
    {
        // Get configuration
        $configController = new ConfigController();
        $tables = $configController->getTablesData();
        $columns = $configController->getColumnsData();
        $relationships = $configController->getRelationshipsData();

        // Find main table
        $mainTable = null;
        foreach ($tables as $table) {
            if ($table['is_main_table'] == 1) {
                $mainTable = $table;
                break;
            }
        }

        if (!$mainTable) {
            throw new Exception('No main table defined in configuration');
        }

        // Start building the query
        $sql = "SELECT ";

        // Add selected columns
        if (isset($query['select']) && !empty($query['select'])) {
            $selectColumns = [];
            foreach ($query['select'] as $columnId) {
                // Find the column in configuration
                $column = $this->findColumnById($columnId, $columns);
                if (!$column) {
                    throw new Exception("Column with ID {$columnId} not found");
                }

                // Find the table
                $table = $this->findTableById($column['table_id'], $tables);
                if (!$table) {
                    throw new Exception("Table for column {$column['name']} not found");
                }

                $selectColumns[] = "{$table['name']}.{$column['name']} AS {$table['name']}_{$column['name']}";
            }
            $sql .= implode(", ", $selectColumns);
        } else {
            // Default to selecting all columns from main table
            $sql .= "{$mainTable['name']}.*";
        }

        // Add FROM clause with main table
        $sql .= " FROM {$mainTable['name']}";

        // Add JOINs for related tables used in the query
        $usedTables = $this->findTablesUsedInQuery($query, $columns, $tables);
        $joinClauses = [];

        foreach ($usedTables as $tableId) {
            if ($tableId == $mainTable['id']) {
                continue; // Skip main table
            }

            // Find the relationship for this table
            $relationship = null;
            foreach ($relationships as $rel) {
                if (($rel['source_table_id'] == $mainTable['id'] && $rel['target_table_id'] == $tableId) ||
                    ($rel['target_table_id'] == $mainTable['id'] && $rel['source_table_id'] == $tableId)
                ) {
                    $relationship = $rel;
                    break;
                }
            }

            if (!$relationship) {
                throw new Exception("No relationship found between main table and table ID {$tableId}");
            }

            // Find the table
            $joinTable = $this->findTableById($tableId, $tables);
            if (!$joinTable) {
                throw new Exception("Table with ID {$tableId} not found");
            }

            // Add join clause
            if ($relationship['source_table_id'] == $mainTable['id']) {
                $joinClauses[] = "LEFT JOIN {$joinTable['name']} ON {$mainTable['name']}.{$relationship['join_column']} = {$joinTable['name']}.{$relationship['foreign_column']}";
            } else {
                $joinClauses[] = "LEFT JOIN {$joinTable['name']} ON {$joinTable['name']}.{$relationship['join_column']} = {$mainTable['name']}.{$relationship['foreign_column']}";
            }
        }

        // Add join clauses to SQL
        if (!empty($joinClauses)) {
            $sql .= " " . implode(" ", $joinClauses);
        }

        // Add WHERE clause
        if (isset($query['where']) && !empty($query['where'])) {
            $whereClause = $this->buildWhereClause($query['where'], $columns, $tables);
            if ($whereClause) {
                $sql .= " WHERE " . $whereClause;
            }
        }

        // Add GROUP BY clause if aggregations are used
        if (isset($query['groupBy']) && !empty($query['groupBy'])) {
            $groupByClauses = [];
            foreach ($query['groupBy'] as $columnId) {
                $column = $this->findColumnById($columnId, $columns);
                if (!$column) {
                    throw new Exception("Column with ID {$columnId} not found for GROUP BY");
                }

                $table = $this->findTableById($column['table_id'], $tables);
                if (!$table) {
                    throw new Exception("Table for column {$column['name']} not found");
                }

                $groupByClauses[] = "{$table['name']}.{$column['name']}";
            }

            if (!empty($groupByClauses)) {
                $sql .= " GROUP BY " . implode(", ", $groupByClauses);
            }
        }

        // Add HAVING clause if needed for aggregation filters
        if (isset($query['having']) && !empty($query['having'])) {
            $havingClause = $this->buildWhereClause($query['having'], $columns, $tables, true);
            if ($havingClause) {
                $sql .= " HAVING " . $havingClause;
            }
        }

        // Add ORDER BY clause
        if (isset($query['orderBy']) && !empty($query['orderBy'])) {
            $orderClauses = [];
            foreach ($query['orderBy'] as $orderItem) {
                $column = $this->findColumnById($orderItem['column'], $columns);
                if (!$column) {
                    throw new Exception("Column with ID {$orderItem['column']} not found for ORDER BY");
                }

                $table = $this->findTableById($column['table_id'], $tables);
                if (!$table) {
                    throw new Exception("Table for column {$column['name']} not found");
                }

                $direction = isset($orderItem['direction']) && strtoupper($orderItem['direction']) === 'DESC' ? 'DESC' : 'ASC';
                $orderClauses[] = "{$table['name']}.{$column['name']} {$direction}";
            }

            if (!empty($orderClauses)) {
                $sql .= " ORDER BY " . implode(", ", $orderClauses);
            }
        }

        // Add LIMIT and OFFSET
        if (isset($query['limit']) && is_numeric($query['limit'])) {
            $sql .= " OFFSET " . (isset($query['offset']) && is_numeric($query['offset']) ? $query['offset'] : 0);
            $sql .= " ROWS FETCH NEXT {$query['limit']} ROWS ONLY";
        }

        return $sql;
    }

    /**
     * Build a WHERE clause from a query condition structure
     */
    private function buildWhereClause($condition, $columns, $tables, $isHaving = false)
    {
        if (!isset($condition['type'])) {
            throw new Exception('Invalid condition structure - missing type');
        }

        // Handle group conditions (AND/OR)
        if ($condition['type'] === 'group') {
            if (!isset($condition['operator']) || !isset($condition['conditions']) || !is_array($condition['conditions'])) {
                throw new Exception('Invalid group condition structure');
            }

            $operator = strtoupper($condition['operator']);
            if ($operator !== 'AND' && $operator !== 'OR') {
                throw new Exception('Invalid group operator - must be AND or OR');
            }

            $conditions = [];
            foreach ($condition['conditions'] as $subCondition) {
                $clausePart = $this->buildWhereClause($subCondition, $columns, $tables, $isHaving);
                if ($clausePart) {
                    $conditions[] = $clausePart;
                }
            }

            if (empty($conditions)) {
                return '';
            }

            return '(' . implode(" {$operator} ", $conditions) . ')';
        }

        // Handle simple conditions
        if ($condition['type'] === 'condition') {
            if (!isset($condition['column']) || !isset($condition['operator'])) {
                throw new Exception('Invalid simple condition structure');
            }

            $column = $this->findColumnById($condition['column'], $columns);
            if (!$column) {
                throw new Exception("Column with ID {$condition['column']} not found");
            }

            $table = $this->findTableById($column['table_id'], $tables);
            if (!$table) {
                throw new Exception("Table for column {$column['name']} not found");
            }

            $columnName = "{$table['name']}.{$column['name']}";

            // Handle different operators
            $operator = strtoupper($condition['operator']);

            // Handle special case for NULL values
            if ($operator === 'IS NULL' || $operator === 'IS NOT NULL') {
                return "{$columnName} {$operator}";
            }

            // All other operators require a value
            if (!isset($condition['value'])) {
                throw new Exception("Value required for operator {$operator}");
            }

            $value = $condition['value'];

            // Handle different operators
            switch ($operator) {
                case '=':
                case '!=':
                case '>':
                case '>=':
                case '<':
                case '<=':
                    return "{$columnName} {$operator} " . $this->escapeValue($value, $column['data_type']);

                case 'LIKE':
                    return "{$columnName} LIKE " . $this->escapeValue("%{$value}%", 'varchar');

                case 'NOT LIKE':
                    return "{$columnName} NOT LIKE " . $this->escapeValue("%{$value}%", 'varchar');

                case 'IN':
                    if (!is_array($value) || empty($value)) {
                        throw new Exception('IN operator requires a non-empty array value');
                    }
                    $escapedValues = array_map(function ($val) use ($column) {
                        return $this->escapeValue($val, $column['data_type']);
                    }, $value);
                    return "{$columnName} IN (" . implode(', ', $escapedValues) . ")";

                case 'NOT IN':
                    if (!is_array($value) || empty($value)) {
                        throw new Exception('NOT IN operator requires a non-empty array value');
                    }
                    $escapedValues = array_map(function ($val) use ($column) {
                        return $this->escapeValue($val, $column['data_type']);
                    }, $value);
                    return "{$columnName} NOT IN (" . implode(', ', $escapedValues) . ")";

                case 'BETWEEN':
                    if (!is_array($value) || count($value) !== 2) {
                        throw new Exception('BETWEEN operator requires an array with exactly 2 values');
                    }
                    return "{$columnName} BETWEEN " .
                        $this->escapeValue($value[0], $column['data_type']) .
                        " AND " .
                        $this->escapeValue($value[1], $column['data_type']);

                default:
                    throw new Exception("Unsupported operator: {$operator}");
            }
        }

        // Handle aggregation functions for HAVING clauses
        if ($condition['type'] === 'aggregation' && $isHaving) {
            if (!isset($condition['function']) || !isset($condition['column']) || !isset($condition['operator'])) {
                throw new Exception('Invalid aggregation condition structure');
            }

            $column = $this->findColumnById($condition['column'], $columns);
            if (!$column) {
                throw new Exception("Column with ID {$condition['column']} not found");
            }

            $table = $this->findTableById($column['table_id'], $tables);
            if (!$table) {
                throw new Exception("Table for column {$column['name']} not found");
            }

            $function = strtoupper($condition['function']);
            $validFunctions = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

            if (!in_array($function, $validFunctions)) {
                throw new Exception("Unsupported aggregation function: {$function}");
            }

            $columnName = "{$function}({$table['name']}.{$column['name']})";

            // Handle different operators
            $operator = strtoupper($condition['operator']);
            $value = $condition['value'];

            // Similar switch as above for operators
            switch ($operator) {
                case '=':
                case '!=':
                case '>':
                case '>=':
                case '<':
                case '<=':
                    return "{$columnName} {$operator} " . $this->escapeValue($value, 'numeric');

                    // Add other operators as needed

                default:
                    throw new Exception("Unsupported operator for aggregation: {$operator}");
            }
        }

        throw new Exception('Unsupported condition type: ' . $condition['type']);
    }

    /**
     * Find tables used in a query structure
     */
    private function findTablesUsedInQuery($query, $columns, $tables)
    {
        $usedTables = [];

        // Check selected columns
        if (isset($query['select']) && is_array($query['select'])) {
            foreach ($query['select'] as $columnId) {
                $column = $this->findColumnById($columnId, $columns);
                if ($column) {
                    $usedTables[] = $column['table_id'];
                }
            }
        }

        // Check where conditions
        if (isset($query['where'])) {
            $this->findTablesInCondition($query['where'], $columns, $usedTables);
        }

        // Check having conditions
        if (isset($query['having'])) {
            $this->findTablesInCondition($query['having'], $columns, $usedTables);
        }

        // Check order by
        if (isset($query['orderBy']) && is_array($query['orderBy'])) {
            foreach ($query['orderBy'] as $orderItem) {
                if (isset($orderItem['column'])) {
                    $column = $this->findColumnById($orderItem['column'], $columns);
                    if ($column) {
                        $usedTables[] = $column['table_id'];
                    }
                }
            }
        }

        // Check group by
        if (isset($query['groupBy']) && is_array($query['groupBy'])) {
            foreach ($query['groupBy'] as $columnId) {
                $column = $this->findColumnById($columnId, $columns);
                if ($column) {
                    $usedTables[] = $column['table_id'];
                }
            }
        }

        return array_unique($usedTables);
    }

    /**
     * Find tables used in a condition structure
     */
    private function findTablesInCondition($condition, $columns, &$usedTables)
    {
        if (!isset($condition['type'])) {
            return;
        }

        if ($condition['type'] === 'group' && isset($condition['conditions']) && is_array($condition['conditions'])) {
            foreach ($condition['conditions'] as $subCondition) {
                $this->findTablesInCondition($subCondition, $columns, $usedTables);
            }
        } else if (($condition['type'] === 'condition' || $condition['type'] === 'aggregation') && isset($condition['column'])) {
            $column = $this->findColumnById($condition['column'], $columns);
            if ($column) {
                $usedTables[] = $column['table_id'];
            }
        }
    }

    /**
     * Find a column by ID in the columns array
     */
    private function findColumnById($id, $columns)
    {
        foreach ($columns as $column) {
            if ($column['id'] == $id) {
                return $column;
            }
        }
        return null;
    }

    /**
     * Find a table by ID in the tables array
     */
    private function findTableById($id, $tables)
    {
        foreach ($tables as $table) {
            if ($table['id'] == $id) {
                return $table;
            }
        }
        return null;
    }

    /**
     * Escape a value for SQL based on its data type
     */
    private function escapeValue($value, $dataType)
    {
        if ($value === null) {
            return 'NULL';
        }

        switch (strtolower($dataType)) {
            case 'int':
            case 'smallint':
            case 'tinyint':
            case 'bigint':
                return (int)$value;

            case 'decimal':
            case 'numeric':
            case 'float':
            case 'real':
            case 'money':
                return (float)$value;

            case 'bit':
                return $value ? '1' : '0';

            case 'datetime':
            case 'date':
            case 'smalldatetime':
                // Format date for SQL Server
                if (is_numeric($value)) {
                    $value = date('Y-m-d H:i:s', $value);
                }
                return "'" . str_replace("'", "''", $value) . "'";

            case 'char':
            case 'varchar':
            case 'nvarchar':
            case 'text':
            case 'ntext':
            default:
                return "'" . str_replace("'", "''", $value) . "'";
        }
    }
}
