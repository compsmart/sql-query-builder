<?php

/**
 * Configuration Controller
 * Handles API endpoints related to configuration management
 */
class ConfigController
{
    private $db;
    private $remoteDb;

    public function __construct()
    {
        $this->db = getDbConnection('local');
        $this->remoteDb = getDbConnection('remote');
    }
    /**
     * Get complete configuration for the query builder
     */
    public function getConfig()
    {
        // Check if database connections are available
        if ($this->db === null) {
            http_response_code(500);
            echo json_encode(['error' => 'Local database connection failed']);
            return;
        }

        if ($this->remoteDb === null) {
            http_response_code(500);
            echo json_encode(['error' => 'Remote database connection failed']);
            return;
        }

        $response = [
            'tables' => $this->getTablesData(),
            'columns' => $this->getColumnsData(),
            'relationships' => $this->getRelationshipsData(),
            'options' => $this->getColumnOptionsData(),
        ];

        echo json_encode($response);
    }

    /**
     * Get all configured tables
     */
    public function getTables()
    {
        echo json_encode($this->getTablesData());
    }

    /**
     * Get all configured columns
     */
    public function getColumns()
    {
        $tableId = isset($_GET['table_id']) ? (int)$_GET['table_id'] : null;
        echo json_encode($this->getColumnsData($tableId));
    }

    /**
     * Get all configured relationships
     */
    public function getRelationships()
    {
        $tableId = isset($_GET['table_id']) ? (int)$_GET['table_id'] : null;
        echo json_encode($this->getRelationshipsData($tableId));
    }

    /**
     * Get column options
     */
    public function getColumnOptions()
    {
        $columnId = isset($_GET['column_id']) ? (int)$_GET['column_id'] : null;
        echo json_encode($this->getColumnOptionsData($columnId));
    }

    /**
     * Save a new table configuration
     */    public function saveTable()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['name']) || !isset($data['display_name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $sql = "INSERT INTO config_tables (name, schema_name, display_name, is_main_table, is_enabled, description)
                VALUES (:name, :schema_name, :display_name, :is_main_table, :is_enabled, :description)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':name' => $data['name'],
            ':schema_name' => isset($data['schema_name']) ? $data['schema_name'] : 'dbo',
            ':display_name' => $data['display_name'],
            ':is_main_table' => isset($data['is_main_table']) ? $data['is_main_table'] : 0,
            ':is_enabled' => isset($data['is_enabled']) ? $data['is_enabled'] : 0,
            ':description' => isset($data['description']) ? $data['description'] : null
        ]);

        $id = $this->db->lastInsertId();
        echo json_encode(['id' => $id, 'message' => 'Table added successfully']);
    }

    /**
     * Update a table configuration
     */    public function updateTable()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing table ID']);
            return;
        }

        $sql = "UPDATE config_tables SET 
                name = :name,
                schema_name = :schema_name,
                display_name = :display_name,
                is_main_table = :is_main_table,
                is_enabled = :is_enabled,
                description = :description,
                updated_at = GETDATE()
                WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $data['id'],
            ':name' => $data['name'],
            ':schema_name' => isset($data['schema_name']) ? $data['schema_name'] : 'dbo',
            ':display_name' => $data['display_name'],
            ':is_main_table' => isset($data['is_main_table']) ? $data['is_main_table'] : 0,
            ':is_enabled' => isset($data['is_enabled']) ? $data['is_enabled'] : 0,
            ':description' => isset($data['description']) ? $data['description'] : null
        ]);

        echo json_encode(['message' => 'Table updated successfully']);
    }

    /**
     * Delete a table configuration
     */
    public function deleteTable()
    {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing table ID']);
            return;
        }

        $sql = "DELETE FROM config_tables WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);

        echo json_encode(['message' => 'Table deleted successfully']);
    }

    /**
     * Save a new column configuration
     */
    public function saveColumn()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['table_id']) || !isset($data['name']) || !isset($data['display_name'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $sql = "INSERT INTO config_columns (
                table_id, name, display_name, data_type, input_type, 
                is_filterable, is_sortable, is_visible, sort_order, group_name
                ) VALUES (
                :table_id, :name, :display_name, :data_type, :input_type,
                :is_filterable, :is_sortable, :is_visible, :sort_order, :group_name
                )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':table_id' => $data['table_id'],
            ':name' => $data['name'],
            ':display_name' => $data['display_name'],
            ':data_type' => isset($data['data_type']) ? $data['data_type'] : 'varchar',
            ':input_type' => isset($data['input_type']) ? $data['input_type'] : 'text',
            ':is_filterable' => isset($data['is_filterable']) ? $data['is_filterable'] : 1,
            ':is_sortable' => isset($data['is_sortable']) ? $data['is_sortable'] : 1,
            ':is_visible' => isset($data['is_visible']) ? $data['is_visible'] : 1,
            ':sort_order' => isset($data['sort_order']) ? $data['sort_order'] : 0,
            ':group_name' => isset($data['group_name']) ? $data['group_name'] : null
        ]);

        $id = $this->db->lastInsertId();

        // Add options if provided
        if (isset($data['options']) && is_array($data['options'])) {
            foreach ($data['options'] as $index => $option) {
                $sqlOption = "INSERT INTO config_column_options (
                    column_id, value, display_value, sort_order
                    ) VALUES (
                    :column_id, :value, :display_value, :sort_order
                    )";

                $stmtOption = $this->db->prepare($sqlOption);
                $stmtOption->execute([
                    ':column_id' => $id,
                    ':value' => $option['value'],
                    ':display_value' => isset($option['display_value']) ? $option['display_value'] : $option['value'],
                    ':sort_order' => $index
                ]);
            }
        }

        echo json_encode(['id' => $id, 'message' => 'Column added successfully']);
    }

    /**
     * Update a column configuration
     */
    public function updateColumn()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing column ID']);
            return;
        }

        $sql = "UPDATE config_columns SET 
                table_id = :table_id,
                name = :name,
                display_name = :display_name,
                data_type = :data_type,
                input_type = :input_type,
                is_filterable = :is_filterable,
                is_sortable = :is_sortable,
                is_visible = :is_visible,
                sort_order = :sort_order,
                group_name = :group_name,
                updated_at = GETDATE()
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $data['id'],
            ':table_id' => $data['table_id'],
            ':name' => $data['name'],
            ':display_name' => $data['display_name'],
            ':data_type' => isset($data['data_type']) ? $data['data_type'] : 'varchar',
            ':input_type' => isset($data['input_type']) ? $data['input_type'] : 'text',
            ':is_filterable' => isset($data['is_filterable']) ? $data['is_filterable'] : 1,
            ':is_sortable' => isset($data['is_sortable']) ? $data['is_sortable'] : 1,
            ':is_visible' => isset($data['is_visible']) ? $data['is_visible'] : 1,
            ':sort_order' => isset($data['sort_order']) ? $data['sort_order'] : 0,
            ':group_name' => isset($data['group_name']) ? $data['group_name'] : null
        ]);

        // Update options if provided
        if (isset($data['options']) && is_array($data['options'])) {
            // Remove existing options
            $sqlDelete = "DELETE FROM config_column_options WHERE column_id = :column_id";
            $stmtDelete = $this->db->prepare($sqlDelete);
            $stmtDelete->execute([':column_id' => $data['id']]);

            // Add new options
            foreach ($data['options'] as $index => $option) {
                $sqlOption = "INSERT INTO config_column_options (
                    column_id, value, display_value, sort_order
                    ) VALUES (
                    :column_id, :value, :display_value, :sort_order
                    )";

                $stmtOption = $this->db->prepare($sqlOption);
                $stmtOption->execute([
                    ':column_id' => $data['id'],
                    ':value' => $option['value'],
                    ':display_value' => isset($option['display_value']) ? $option['display_value'] : $option['value'],
                    ':sort_order' => $index
                ]);
            }
        }

        echo json_encode(['message' => 'Column updated successfully']);
    }

    /**
     * Delete a column configuration
     */
    public function deleteColumn()
    {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing column ID']);
            return;
        }

        $sql = "DELETE FROM config_columns WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);

        echo json_encode(['message' => 'Column deleted successfully']);
    }

    /**
     * Save a new relationship configuration
     */
    public function saveRelationship()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (
            !isset($data['source_table_id']) || !isset($data['target_table_id']) ||
            !isset($data['join_column']) || !isset($data['foreign_column'])
        ) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields']);
            return;
        }

        $sql = "INSERT INTO config_relationships (
                source_table_id, target_table_id, relationship_type, 
                join_column, foreign_column
                ) VALUES (
                :source_table_id, :target_table_id, :relationship_type,
                :join_column, :foreign_column
                )";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':source_table_id' => $data['source_table_id'],
            ':target_table_id' => $data['target_table_id'],
            ':relationship_type' => isset($data['relationship_type']) ? $data['relationship_type'] : 'one-to-many',
            ':join_column' => $data['join_column'],
            ':foreign_column' => $data['foreign_column']
        ]);

        $id = $this->db->lastInsertId();
        echo json_encode(['id' => $id, 'message' => 'Relationship added successfully']);
    }

    /**
     * Update a relationship configuration
     */
    public function updateRelationship()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing relationship ID']);
            return;
        }

        $sql = "UPDATE config_relationships SET 
                source_table_id = :source_table_id,
                target_table_id = :target_table_id,
                relationship_type = :relationship_type,
                join_column = :join_column,
                foreign_column = :foreign_column,
                updated_at = GETDATE()
                WHERE id = :id";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':id' => $data['id'],
            ':source_table_id' => $data['source_table_id'],
            ':target_table_id' => $data['target_table_id'],
            ':relationship_type' => isset($data['relationship_type']) ? $data['relationship_type'] : 'one-to-many',
            ':join_column' => $data['join_column'],
            ':foreign_column' => $data['foreign_column']
        ]);

        echo json_encode(['message' => 'Relationship updated successfully']);
    }

    /**
     * Delete a relationship configuration
     */
    public function deleteRelationship()
    {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing relationship ID']);
            return;
        }

        $sql = "DELETE FROM config_relationships WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':id' => $id]);

        echo json_encode(['message' => 'Relationship deleted successfully']);
    }

    /**
     * Discover database schema and auto-populate config tables
     */    public function discoverSchema()
    {
        // Track statistics for the discovery process
        $stats = [
            'tables_discovered' => 0,
            'tables_added' => 0,
            'columns_added' => 0,
            'new_columns_added' => 0,
            'relationships_discovered' => 0
        ];

        // Get all tables in the database
        $tables = $this->getDbTables();
        $stats['tables_discovered'] = count($tables);

        foreach ($tables as $table) {
            // Skip tables that start with config_ or are system views
            if (strpos($table['name'], 'config_') === 0 || strpos($table['schema_name'], 'sys') === 0) {
                continue;
            }

            // Check if table or view already exists in config
            $stmt = $this->db->prepare("SELECT id FROM config_tables WHERE name = :name AND schema_name = :schema_name");
            $stmt->execute([
                ':name' => $table['name'],
                ':schema_name' => $table['schema_name']
            ]);
            $existingTable = $stmt->fetch();

            if (!$existingTable) {
                // Add table or view to config
                $stmt = $this->db->prepare(
                    "INSERT INTO config_tables (name, schema_name, display_name, is_main_table, is_enabled, description, object_type)
                     VALUES (:name, :schema_name, :display_name, :is_main_table, :is_enabled, :description, :object_type)"
                );

                $displayName = ucwords(str_replace('_', ' ', $table['name']));
                $isMainTable = ($table['object_type'] === 'table' && stripos($table['name'], 'customer') !== false) ? 1 : 0;

                $stmt->execute([
                    ':name' => $table['name'],
                    ':schema_name' => $table['schema_name'],
                    ':display_name' => $displayName,
                    ':is_main_table' => $isMainTable,
                    ':is_enabled' => 0,
                    ':description' => "Auto-discovered {$table['object_type']} {$table['schema_name']}.{$table['name']}",
                    ':object_type' => $table['object_type']
                ]);

                $tableId = $this->db->lastInsertId();

                // Get columns for this table or view
                $columns = $this->getDbTableColumns($table['name'], $table['schema_name']);

                foreach ($columns as $index => $column) {
                    // Add column to config
                    $inputType = $this->mapDataTypeToInputType($column['data_type']);

                    $stmt = $this->db->prepare(
                        "INSERT INTO config_columns (
                        table_id, name, display_name, data_type, input_type,
                        is_filterable, is_sortable, is_visible, sort_order, group_name
                        ) VALUES (
                        :table_id, :name, :display_name, :data_type, :input_type,
                        :is_filterable, :is_sortable, :is_visible, :sort_order, :group_name
                        )"
                    );

                    $displayName = ucwords(str_replace('_', ' ', $column['name']));

                    $stmt->execute([
                        ':table_id' => $tableId,
                        ':name' => $column['name'],
                        ':display_name' => $displayName,
                        ':data_type' => $column['data_type'],
                        ':input_type' => $inputType,
                        ':is_filterable' => 1,
                        ':is_sortable' => 1,
                        ':is_visible' => 1,
                        ':sort_order' => $index,
                        ':group_name' => 'Auto-discovered'
                    ]);
                }
            } else {
                // Table exists - check for new columns
                $tableId = $existingTable['id'];

                // Get current columns from the config database
                $configColumns = [];
                $stmt = $this->db->prepare("SELECT name FROM config_columns WHERE table_id = :table_id");
                $stmt->execute([':table_id' => $tableId]);
                while ($row = $stmt->fetch()) {
                    $configColumns[] = strtolower($row['name']);
                }

                // Get columns from the remote database
                $remoteColumns = $this->getDbTableColumns($table['name'], $table['schema_name']);
                $lastSortOrder = $this->getLastSortOrderForTable($tableId);

                // Add any new columns that don't exist in the config
                foreach ($remoteColumns as $column) {
                    echo "Checking column: {$column['name']}\n";
                    if (!in_array(strtolower($column['name']), $configColumns)) {
                        // New column found - add it to the config
                        $inputType = $this->mapDataTypeToInputType($column['data_type']);
                        $displayName = ucwords(str_replace('_', ' ', $column['name']));
                        $lastSortOrder++;

                        $stmt = $this->db->prepare(
                            "INSERT INTO config_columns (
                            table_id, name, display_name, data_type, input_type,
                            is_filterable, is_sortable, is_visible, sort_order, group_name
                            ) VALUES (
                            :table_id, :name, :display_name, :data_type, :input_type,
                            :is_filterable, :is_sortable, :is_visible, :sort_order, :group_name
                            )"
                        );

                        $stmt->execute([
                            ':table_id' => $tableId,
                            ':name' => $column['name'],
                            ':display_name' => $displayName,
                            ':data_type' => $column['data_type'],
                            ':input_type' => $inputType,
                            ':is_filterable' => 1,
                            ':is_sortable' => 1,
                            ':is_visible' => 1,
                            ':sort_order' => $lastSortOrder,
                            ':group_name' => 'New column'
                        ]);

                        $stats['new_columns_added']++;
                    }
                }
            }
        }

        // Discover relationships
        $this->discoverRelationships();

        echo json_encode(['message' => 'Schema discovery completed']);
    }

    /**
     * Discover relationships between tables
     */
    public function discoverRelationships()
    {
        // This is a simplified approach - in a real implementation, 
        // you would need to query the database system tables for foreign keys

        // For this example, we'll assume the naming convention is that a foreign key
        // column is named like original_table_id (e.g., customer_id in offers table)

        $tables = $this->getTablesData();
        $mainTableId = null;

        // Find the main customers table
        foreach ($tables as $table) {
            if ($table['name'] === 'customers') {
                $mainTableId = $table['id'];
                break;
            }
        }

        if (!$mainTableId) {
            return;
        }

        // For each table, look for columns that might reference the customers table
        foreach ($tables as $table) {
            if ($table['id'] === $mainTableId) {
                continue;
            }

            $columns = $this->getColumnsData($table['id']);

            foreach ($columns as $column) {
                if ($column['name'] === 'customer_id') {
                    // Check if relationship already exists
                    $stmt = $this->db->prepare(
                        "SELECT id FROM config_relationships 
                         WHERE source_table_id = :source_table_id
                         AND target_table_id = :target_table_id"
                    );

                    $stmt->execute([
                        ':source_table_id' => $mainTableId,
                        ':target_table_id' => $table['id']
                    ]);

                    $existingRelationship = $stmt->fetch();

                    if (!$existingRelationship) {
                        // Add relationship
                        $stmt = $this->db->prepare(
                            "INSERT INTO config_relationships (
                            source_table_id, target_table_id, relationship_type,
                            join_column, foreign_column
                            ) VALUES (
                            :source_table_id, :target_table_id, :relationship_type,
                            :join_column, :foreign_column
                            )"
                        );

                        $stmt->execute([
                            ':source_table_id' => $mainTableId,
                            ':target_table_id' => $table['id'],
                            ':relationship_type' => 'one-to-many',
                            ':join_column' => 'id',
                            ':foreign_column' => 'customer_id'
                        ]);
                    }

                    break;
                }
            }
        }
    }
    /**
     * Get database tables and views from the remote database
     */
    public function getDbTables()
    {
        // Use remote database connection to get tables and views with schema information
        $sql = "SELECT 
            o.name AS name,
            SCHEMA_NAME(o.schema_id) AS schema_name,
            CASE WHEN o.type = 'U' THEN 'table' ELSE 'view' END AS object_type
        FROM sys.objects o
        WHERE o.type IN ('U', 'V') -- 'U' for tables, 'V' for views
        ORDER BY schema_name, name";

        $stmt = $this->remoteDb->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Get columns for a specific table from the remote database
     */
    public function getDbTableColumns($tableName)
    {
        // Use remote database connection to get table column information
        $stmt = $this->remoteDb->prepare(
            "SELECT c.name, t.name AS data_type
             FROM syscolumns c
             JOIN systypes t ON c.xtype = t.xtype
             JOIN sysobjects o ON c.id = o.id
             WHERE o.name = :table_name"
        );

        $stmt->execute([':table_name' => $tableName]);
        return $stmt->fetchAll();
    }

    /**
     * Map SQL data type to input type
     */
    public function mapDataTypeToInputType($dataType)
    {
        switch (strtolower($dataType)) {
            case 'int':
            case 'smallint':
            case 'tinyint':
            case 'bigint':
                return 'number';

            case 'decimal':
            case 'numeric':
            case 'float':
            case 'real':
            case 'money':
                return 'number';

            case 'datetime':
            case 'date':
            case 'smalldatetime':
                return 'date';

            case 'bit':
                return 'checkbox';

            case 'char':
            case 'varchar':
            case 'nvarchar':
            case 'text':
            case 'ntext':
            default:
                return 'text';
        }
    }

    /**
     * Get tables data
     */
    public function getTablesData()
    {
        $sql = "SELECT * FROM config_tables ORDER BY is_main_table DESC, name ASC";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }

    /**
     * Get columns data
     */
    public function getColumnsData($tableId = null)
    {
        $sql = "SELECT * FROM config_columns";
        $params = [];

        if ($tableId !== null) {
            $sql .= " WHERE table_id = :table_id";
            $params[':table_id'] = $tableId;
        }

        $sql .= " ORDER BY table_id ASC, sort_order ASC, name ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get relationships data
     */
    public function getRelationshipsData($tableId = null)
    {
        $sql = "SELECT r.*, 
                st.name as source_table_name, 
                tt.name as target_table_name
                FROM config_relationships r
                JOIN config_tables st ON r.source_table_id = st.id
                JOIN config_tables tt ON r.target_table_id = tt.id";
        $params = [];

        if ($tableId !== null) {
            $sql .= " WHERE r.source_table_id = :table_id OR r.target_table_id = :table_id";
            $params[':table_id'] = $tableId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get column options data
     */
    public function getColumnOptionsData($columnId = null)
    {
        $sql = "SELECT * FROM config_column_options";
        $params = [];

        if ($columnId !== null) {
            $sql .= " WHERE column_id = :column_id";
            $params[':column_id'] = $columnId;
        }

        $sql .= " ORDER BY column_id ASC, sort_order ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Get the highest sort order value for a specific table
     * 
     * @param int $tableId The ID of the table
     * @return int The highest sort order value
     */
    private function getLastSortOrderForTable($tableId)
    {
        $stmt = $this->db->prepare("SELECT MAX(sort_order) as max_sort FROM config_columns WHERE table_id = :table_id");
        $stmt->execute([':table_id' => $tableId]);
        $result = $stmt->fetch();
        return $result && isset($result['max_sort']) ? (int)$result['max_sort'] : 0;
    }
}
