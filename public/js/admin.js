/**
 * Admin Configuration Page
 */
document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    let configData;

    // Initialize components
    initApp();

    /**
     * Initialize the application
     */
    async function initApp() {
        try {
            // Load configuration data from the API
            await loadConfigData();

            // Set up tab navigation
            setupTabNavigation();

            // Set up event listeners
            setupEventListeners();

            // Populate tables
            populateTables();
            populateTableSelects();
        } catch (error) {
            console.error('Error initializing application:', error);
            alert('Error loading application configuration. Please check the console for details.');
        }
    }

    /**
     * Load configuration data from the API
     */
    async function loadConfigData() {
        try {
            const response = await fetch(AppConfig.api.config);

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            configData = await response.json();
            console.log('Configuration loaded:', configData);

            return configData;
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }

    /**
     * Set up tab navigation
     */
    function setupTabNavigation() {
        const tabs = document.querySelectorAll('.list-group-item');
        const sections = document.querySelectorAll('.config-section');

        tabs.forEach(tab => {
            tab.addEventListener('click', function (e) {
                e.preventDefault();

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                // Show corresponding section
                const targetId = this.getAttribute('href').substring(1);
                sections.forEach(section => {
                    section.style.display = section.id === targetId ? 'block' : 'none';
                });
            });
        });
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Add table button
        document.getElementById('btnAddTable').addEventListener('click', showAddTableModal);

        // Table filter
        document.getElementById('tableFilter').addEventListener('input', filterTables);

        // Column filter
        document.getElementById('columnFilter').addEventListener('input', filterColumns);

        // Save table button
        document.getElementById('btnSaveTable').addEventListener('click', saveTable);

        // Column table select
        document.getElementById('columnTableSelect').addEventListener('change', function () {
            const tableId = this.value;
            document.getElementById('btnAddColumn').disabled = !tableId;
            if (tableId) {
                loadColumnsForTable(tableId);
                document.getElementById('selected-table-name').textContent =
                    this.options[this.selectedIndex].text;
            } else {
                document.getElementById('columns-table').querySelector('tbody').innerHTML = '';
                document.getElementById('selected-table-name').textContent =
                    'Select a table to manage its columns';
            }
        });

        // Add column button
        document.getElementById('btnAddColumn').addEventListener('click', showAddColumnModal);

        // Add relationship button
        document.getElementById('btnAddRelationship').addEventListener('click', showAddRelationshipModal);

        // Save column button
        document.getElementById('btnSaveColumn').addEventListener('click', saveColumn);

        // Save relationship button
        document.getElementById('btnSaveRelationship').addEventListener('click', saveRelationship);

        // Input type change for column options
        document.getElementById('inputType').addEventListener('change', function () {
            const optionsSection = document.getElementById('optionsSection');
            if (this.value === 'select' || this.value === 'multiselect') {
                optionsSection.style.display = 'block';
                if (!document.querySelector('#optionsContainer .option-row')) {
                    addOptionRow();
                }
            } else {
                optionsSection.style.display = 'none';
            }
        });

        // Add option button
        document.getElementById('btnAddOption').addEventListener('click', addOptionRow);

        // Source table change for relationships
        document.getElementById('sourceTable').addEventListener('change', function () {
            populateColumnSelect('joinColumn', this.value);
        });

        // Target table change for relationships
        document.getElementById('targetTable').addEventListener('change', function () {
            populateColumnSelect('foreignColumn', this.value);
        });

        // Discover schema button
        document.getElementById('btnDiscoverSchema').addEventListener('click', discoverSchema);

        // Save all config button
        document.getElementById('btnSaveConfig').addEventListener('click', saveAllConfig);

        // Reset config button
        document.getElementById('btnResetConfig').addEventListener('click', resetConfig);
    }

    /**
     * Populate tables table
     */
    function populateTables() {
        const tableBody = document.getElementById('tables-table').querySelector('tbody');
        tableBody.innerHTML = '';

        configData.tables.forEach(table => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${table.name}</td>
                <td>${table.display_name}</td>
                <td>${table.object_type}</td> <!-- Display the object type (table or view) -->
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" ${table.is_main_table == 1 ? 'checked' : ''} 
                               onchange="updateTableMainStatus(${table.id}, this.checked)" ${table.is_main_table == 1 ? 'disabled' : ''}>
                    </div>
                </td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" ${table.is_enabled == 1 ? 'checked' : ''} 
                               onchange="updateTableEnabledStatus(${table.id}, this.checked)">
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editTable(${table.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTable(${table.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * Populate relationship table
     */
    function populateRelationships() {
        const tableBody = document.getElementById('relationships-table').querySelector('tbody');
        tableBody.innerHTML = '';

        configData.relationships.forEach(rel => {
            const sourceTable = configData.tables.find(t => t.id == rel.source_table_id);
            const targetTable = configData.tables.find(t => t.id == rel.target_table_id);

            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${sourceTable ? sourceTable.display_name : 'Unknown'}</td>
                <td>${targetTable ? targetTable.display_name : 'Unknown'}</td>
                <td>${rel.relationship_type}</td>
                <td>${rel.join_column}</td>
                <td>${rel.foreign_column}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editRelationship(${rel.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRelationship(${rel.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * Populate table selects
     */
    function populateTableSelects() {
        const columnTableSelect = document.getElementById('columnTableSelect');
        const sourceTableSelect = document.getElementById('sourceTable');
        const targetTableSelect = document.getElementById('targetTable');

        // Clear existing options
        columnTableSelect.innerHTML = '<option value="">-- Select Table --</option>';
        sourceTableSelect.innerHTML = '<option value="">-- Select Table --</option>';
        targetTableSelect.innerHTML = '<option value="">-- Select Table --</option>';

        // Add table options
        configData.tables.forEach(table => {
            const option = document.createElement('option');
            option.value = table.id;
            option.textContent = table.display_name;

            columnTableSelect.appendChild(option.cloneNode(true));
            sourceTableSelect.appendChild(option.cloneNode(true));
            targetTableSelect.appendChild(option.cloneNode(true));
        });

        // Also populate relationships
        populateRelationships();
    }

    /**
     * Load columns for a specific table
     */
    function loadColumnsForTable(tableId) {
        const tableBody = document.getElementById('columns-table').querySelector('tbody');
        tableBody.innerHTML = '';

        const columns = configData.columns.filter(column => column.table_id == tableId);

        columns.forEach(column => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${column.name}</td>
                <td>${column.display_name}</td>
                <td>${column.data_type}</td>
                <td>${column.input_type}</td>
                <td>${column.group_name || 'None'}</td>
                <td>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" ${column.is_filterable ? 'checked' : ''} 
                               onchange="updateColumnFilterable(${column.id}, this.checked)">
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editColumn(${column.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteColumn(${column.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    /**
     * Show modal for adding a table
     */
    function showAddTableModal() {
        // Reset the form
        document.getElementById('tableForm').reset();
        document.getElementById('tableId').value = '';
        document.getElementById('tableModalTitle').textContent = 'Add Table';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('tableModal'));
        modal.show();
    }

    /**
     * Show modal for editing a table
     */
    window.editTable = function (tableId) {
        const table = configData.tables.find(t => t.id == tableId);
        if (!table) return;        // Fill the form
        document.getElementById('tableId').value = table.id;
        document.getElementById('tableName').value = table.name;
        document.getElementById('schemaName').value = table.schema_name || 'dbo';
        document.getElementById('tableDisplayName').value = table.display_name;
        document.getElementById('isMainTable').checked = table.is_main_table == 1;
        document.getElementById('isEnabled').checked = table.is_enabled == 1;
        document.getElementById('description').value = table.description || '';

        // Update modal title
        document.getElementById('tableModalTitle').textContent = 'Edit Table';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('tableModal'));
        modal.show();
    };

    /**
     * Save table
     */    async function saveTable() {
        const tableId = document.getElementById('tableId').value;
        const isEdit = tableId !== '';

        const tableData = {
            name: document.getElementById('tableName').value,
            schema_name: document.getElementById('schemaName').value || 'dbo',
            display_name: document.getElementById('tableDisplayName').value,
            is_main_table: document.getElementById('isMainTable').checked ? 1 : 0,
            is_enabled: document.getElementById('isEnabled').checked ? 1 : 0,
            description: document.getElementById('description').value
        };

        if (isEdit) {
            tableData.id = tableId;
        }

        try {
            const url = AppConfig.api.tables;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tableData)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('tableModal'));
            modal.hide();

            // Reload configuration and update tables
            await loadConfigData();
            populateTables();
            populateTableSelects();

            alert(isEdit ? 'Table updated successfully' : 'Table added successfully');
        } catch (error) {
            console.error('Error saving table:', error);
            alert('Error saving table. Please check the console for details.');
        }
    }

    /**
     * Delete a table
     */
    window.deleteTable = async function (tableId) {
        if (!confirm('Are you sure you want to delete this table? This will also delete all associated columns and relationships.')) {
            return;
        }

        try {
            const response = await fetch(`${AppConfig.api.tables}?id=${tableId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration and update tables
            await loadConfigData();
            populateTables();
            populateTableSelects();

            alert('Table deleted successfully');
        } catch (error) {
            console.error('Error deleting table:', error);
            alert('Error deleting table. Please check the console for details.');
        }
    };

    /**
     * Update table main status
     */
    window.updateTableMainStatus = async function (tableId, isMain) {
        try {
            // Find the table in config
            const table = configData.tables.find(t => t.id == tableId);
            if (!table) return;

            // If setting as main table, first unset any existing main table
            if (isMain) {
                const currentMainTable = configData.tables.find(t => t.is_main_table == 1);
                if (currentMainTable && currentMainTable.id != tableId) {
                    await fetch(AppConfig.api.tables, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id: currentMainTable.id,
                            name: currentMainTable.name,
                            display_name: currentMainTable.display_name,
                            is_main_table: 0,
                            is_enabled: currentMainTable.is_enabled,
                            description: currentMainTable.description
                        })
                    });
                }
            }

            // Update the table
            const response = await fetch(AppConfig.api.tables, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: tableId,
                    name: table.name,
                    display_name: table.display_name,
                    is_main_table: isMain ? 1 : 0,
                    is_enabled: table.is_enabled,
                    description: table.description
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration and update tables
            await loadConfigData();
            populateTables();
            populateTableSelects();
        } catch (error) {
            console.error('Error updating table main status:', error);
            alert('Error updating table. Please check the console for details.');
        }
    };

    /**
     * Update table enabled status
     */
    window.updateTableEnabledStatus = async function (tableId, isEnabled) {
        try {
            // Find the table in config
            const table = configData.tables.find(t => t.id == tableId);
            if (!table) return;

            // Update the table
            const response = await fetch(AppConfig.api.tables, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: tableId,
                    name: table.name,
                    display_name: table.display_name,
                    is_main_table: table.is_main_table,
                    is_enabled: isEnabled ? 1 : 0,
                    description: table.description
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration and update tables
            await loadConfigData();
            populateTables();
        } catch (error) {
            console.error('Error updating table enabled status:', error);
            alert('Error updating table. Please check the console for details.');
        }
    };

    /**
     * Show modal for adding a column
     */
    function showAddColumnModal() {
        // Reset the form
        document.getElementById('columnForm').reset();
        document.getElementById('columnId').value = '';
        document.getElementById('columnTableId').value = document.getElementById('columnTableSelect').value;
        document.getElementById('optionsContainer').innerHTML = '';
        document.getElementById('optionsSection').style.display = 'none';
        document.getElementById('columnModalTitle').textContent = 'Add Column';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('columnModal'));
        modal.show();
    }

    /**
     * Show modal for editing a column
     */
    window.editColumn = function (columnId) {
        const column = configData.columns.find(c => c.id == columnId);
        if (!column) return;

        // Fill the form
        document.getElementById('columnId').value = column.id;
        document.getElementById('columnTableId').value = column.table_id;
        document.getElementById('columnName').value = column.name;
        document.getElementById('columnDisplayName').value = column.display_name;
        document.getElementById('dataType').value = column.data_type;
        document.getElementById('inputType').value = column.input_type;
        document.getElementById('groupName').value = column.group_name || '';
        document.getElementById('isFilterable').checked = column.is_filterable == 1;
        document.getElementById('isSortable').checked = column.is_sortable == 1;
        document.getElementById('isVisible').checked = column.is_visible == 1;

        // Clear options container
        document.getElementById('optionsContainer').innerHTML = '';

        // Show or hide options section
        const optionsSection = document.getElementById('optionsSection');
        if (column.input_type === 'select' || column.input_type === 'multiselect') {
            optionsSection.style.display = 'block';

            // Get options for this column
            const options = configData.options.filter(opt => opt.column_id == column.id);

            if (options.length > 0) {
                options.forEach(option => {
                    addOptionRow(option.value, option.display_value);
                });
            } else {
                addOptionRow();
            }
        } else {
            optionsSection.style.display = 'none';
        }

        // Update modal title
        document.getElementById('columnModalTitle').textContent = 'Edit Column';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('columnModal'));
        modal.show();
    };

    /**
     * Add option row to column form
     */
    function addOptionRow(value = '', displayValue = '') {
        const container = document.getElementById('optionsContainer');

        const row = document.createElement('div');
        row.className = 'row option-row mb-2';

        row.innerHTML = `
            <div class="col-5">
                <input type="text" class="form-control form-control-sm option-value" placeholder="Value" value="${value}">
            </div>
            <div class="col-5">
                <input type="text" class="form-control form-control-sm option-display" placeholder="Display Text" value="${displayValue || value}">
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-sm btn-danger btn-remove-option">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        // Add event listener for remove button
        row.querySelector('.btn-remove-option').addEventListener('click', function () {
            container.removeChild(row);
        });

        container.appendChild(row);
    }

    /**
     * Save column
     */
    async function saveColumn() {
        const columnId = document.getElementById('columnId').value;
        const isEdit = columnId !== '';

        const columnData = {
            table_id: document.getElementById('columnTableId').value,
            name: document.getElementById('columnName').value,
            display_name: document.getElementById('columnDisplayName').value,
            data_type: document.getElementById('dataType').value,
            input_type: document.getElementById('inputType').value,
            is_filterable: document.getElementById('isFilterable').checked ? 1 : 0,
            is_sortable: document.getElementById('isSortable').checked ? 1 : 0,
            is_visible: document.getElementById('isVisible').checked ? 1 : 0,
            group_name: document.getElementById('groupName').value
        };

        // Add options if input type is select or multiselect
        if (columnData.input_type === 'select' || columnData.input_type === 'multiselect') {
            const optionRows = document.querySelectorAll('.option-row');
            const options = [];

            optionRows.forEach(row => {
                const valueInput = row.querySelector('.option-value');
                const displayInput = row.querySelector('.option-display');

                if (valueInput.value.trim()) {
                    options.push({
                        value: valueInput.value,
                        display_value: displayInput.value || valueInput.value
                    });
                }
            });

            columnData.options = options;
        }

        if (isEdit) {
            columnData.id = columnId;
        }

        try {
            const url = AppConfig.api.columns;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(columnData)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('columnModal'));
            modal.hide();

            // Reload configuration
            await loadConfigData();

            // Refresh columns table
            loadColumnsForTable(columnData.table_id);

            alert(isEdit ? 'Column updated successfully' : 'Column added successfully');
        } catch (error) {
            console.error('Error saving column:', error);
            alert('Error saving column. Please check the console for details.');
        }
    }

    /**
     * Delete a column
     */
    window.deleteColumn = async function (columnId) {
        if (!confirm('Are you sure you want to delete this column?')) {
            return;
        }

        try {
            const column = configData.columns.find(c => c.id == columnId);
            const tableId = column ? column.table_id : null;

            const response = await fetch(`${AppConfig.api.columns}?id=${columnId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration
            await loadConfigData();

            // Refresh columns table if we know the table ID
            if (tableId) {
                loadColumnsForTable(tableId);
            }

            alert('Column deleted successfully');
        } catch (error) {
            console.error('Error deleting column:', error);
            alert('Error deleting column. Please check the console for details.');
        }
    };

    /**
     * Update column filterable status
     */
    window.updateColumnFilterable = async function (columnId, isFilterable) {
        try {
            // Find the column in config
            const column = configData.columns.find(c => c.id == columnId);
            if (!column) return;

            // Update the column
            const response = await fetch(AppConfig.api.columns, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: columnId,
                    table_id: column.table_id,
                    name: column.name,
                    display_name: column.display_name,
                    data_type: column.data_type,
                    input_type: column.input_type,
                    is_filterable: isFilterable ? 1 : 0,
                    is_sortable: column.is_sortable,
                    is_visible: column.is_visible,
                    group_name: column.group_name
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration
            await loadConfigData();
        } catch (error) {
            console.error('Error updating column filterable status:', error);
            alert('Error updating column. Please check the console for details.');
        }
    };

    /**
     * Show modal for adding a relationship
     */
    function showAddRelationshipModal() {
        // Reset the form
        document.getElementById('relationshipForm').reset();
        document.getElementById('relationshipId').value = '';
        document.getElementById('joinColumn').innerHTML = '<option value="">-- Select Column --</option>';
        document.getElementById('foreignColumn').innerHTML = '<option value="">-- Select Column --</option>';
        document.getElementById('relationshipModalTitle').textContent = 'Add Relationship';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('relationshipModal'));
        modal.show();
    }

    /**
     * Show modal for editing a relationship
     */
    window.editRelationship = function (relationshipId) {
        const relationship = configData.relationships.find(r => r.id == relationshipId);
        if (!relationship) return;

        // Fill the form
        document.getElementById('relationshipId').value = relationship.id;
        document.getElementById('sourceTable').value = relationship.source_table_id;
        document.getElementById('targetTable').value = relationship.target_table_id;
        document.getElementById('relationshipType').value = relationship.relationship_type;

        // Populate column selects
        populateColumnSelect('joinColumn', relationship.source_table_id, relationship.join_column);
        populateColumnSelect('foreignColumn', relationship.target_table_id, relationship.foreign_column);

        // Update modal title
        document.getElementById('relationshipModalTitle').textContent = 'Edit Relationship';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('relationshipModal'));
        modal.show();
    };

    /**
     * Populate column select for a specific table
     */
    function populateColumnSelect(selectId, tableId, selectedValue = null) {
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">-- Select Column --</option>';

        if (!tableId) {
            return;
        }

        const columns = configData.columns.filter(c => c.table_id == tableId);

        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.name;
            option.textContent = column.display_name;

            if (selectedValue && column.name === selectedValue) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    }

    /**
     * Save relationship
     */
    async function saveRelationship() {
        const relationshipId = document.getElementById('relationshipId').value;
        const isEdit = relationshipId !== '';

        const relationshipData = {
            source_table_id: document.getElementById('sourceTable').value,
            target_table_id: document.getElementById('targetTable').value,
            relationship_type: document.getElementById('relationshipType').value,
            join_column: document.getElementById('joinColumn').value,
            foreign_column: document.getElementById('foreignColumn').value
        };

        if (isEdit) {
            relationshipData.id = relationshipId;
        }

        try {
            const url = AppConfig.api.relationships;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(relationshipData)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('relationshipModal'));
            modal.hide();

            // Reload configuration
            await loadConfigData();

            // Refresh relationships table
            populateRelationships();

            alert(isEdit ? 'Relationship updated successfully' : 'Relationship added successfully');
        } catch (error) {
            console.error('Error saving relationship:', error);
            alert('Error saving relationship. Please check the console for details.');
        }
    }

    /**
     * Delete a relationship
     */
    window.deleteRelationship = async function (relationshipId) {
        if (!confirm('Are you sure you want to delete this relationship?')) {
            return;
        }

        try {
            const response = await fetch(`${AppConfig.api.relationships}?id=${relationshipId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration
            await loadConfigData();

            // Refresh relationships table
            populateRelationships();

            alert('Relationship deleted successfully');
        } catch (error) {
            console.error('Error deleting relationship:', error);
            alert('Error deleting relationship. Please check the console for details.');
        }
    };

    /**
     * Discover database schema
     */
    async function discoverSchema() {
        if (!confirm('This will scan the database structure and add missing tables and columns to the configuration. Continue?')) {
            return;
        }

        try {
            const discoveryResults = document.getElementById('discovery-results');
            discoveryResults.innerHTML = '<div class="alert alert-info">Schema discovery in progress...</div>';
            discoveryResults.style.display = 'block';

            const response = await fetch(AppConfig.api.discoverSchema, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Reload configuration
            await loadConfigData();

            // Update all tables
            populateTables();
            populateTableSelects();

            // Update discovery results
            discoveryResults.innerHTML = '<div class="alert alert-success">Schema discovery completed successfully!</div>';

            setTimeout(() => {
                discoveryResults.style.display = 'none';
            }, 5000);
        } catch (error) {
            console.error('Error discovering schema:', error);

            // Update discovery results
            const discoveryResults = document.getElementById('discovery-results');
            discoveryResults.innerHTML = `<div class="alert alert-danger">Error discovering schema: ${error.message}</div>`;
        }
    }

    /**
     * Save all configuration changes
     */
    function saveAllConfig() {
        alert('All changes have been saved');
    }

    /**
     * Reset configuration
     */
    async function resetConfig() {
        if (!confirm('This will reset all unsaved changes. Are you sure?')) {
            return;
        }

        try {
            // Reload configuration
            await loadConfigData();

            // Update all UI elements
            populateTables();
            populateTableSelects();

            // Reset column table selection
            document.getElementById('columnTableSelect').value = '';
            document.getElementById('columns-table').querySelector('tbody').innerHTML = '';
            document.getElementById('selected-table-name').textContent = 'Select a table to manage its columns';
            document.getElementById('btnAddColumn').disabled = true;

            alert('Configuration reset successfully');
        } catch (error) {
            console.error('Error resetting configuration:', error);
            alert('Error resetting configuration. Please check the console for details.');
        }
    }

    /**
     * Filter tables based on search input
     */
    function filterTables() {
        const filterValue = document.getElementById('tableFilter').value.toLowerCase();
        const tableRows = document.querySelectorAll('#tables-table tbody tr');

        tableRows.forEach(row => {
            const name = row.cells[0].innerText.toLowerCase();
            const displayName = row.cells[1].innerText.toLowerCase();
            const type = row.cells[2]?.innerText.toLowerCase();

            // Show row if any of these fields contain the filter text
            if (name.includes(filterValue) ||
                displayName.includes(filterValue) ||
                (type && type.includes(filterValue))) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * Filter columns based on search input
     */
    function filterColumns() {
        const filterValue = document.getElementById('columnFilter').value.toLowerCase();
        const columnRows = document.querySelectorAll('#columns-table tbody tr');

        columnRows.forEach(row => {
            const name = row.cells[0].innerText.toLowerCase();
            const displayName = row.cells[1].innerText.toLowerCase();
            const dataType = row.cells[2].innerText.toLowerCase();
            const inputType = row.cells[3].innerText.toLowerCase();
            const group = row.cells[4].innerText.toLowerCase();

            // Show row if any of these fields contain the filter text
            if (name.includes(filterValue) ||
                displayName.includes(filterValue) ||
                dataType.includes(filterValue) ||
                inputType.includes(filterValue) ||
                group.includes(filterValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
});
