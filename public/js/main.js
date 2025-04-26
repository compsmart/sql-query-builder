/**
 * Main Application Script
 */
document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    let queryBuilder;
    let configData;
    let loadingModal;

    // Initialize components
    initApp();

    /**
     * Initialize the application
     */
    async function initApp() {
        loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));

        try {
            // Load configuration data from the API
            await loadConfigData();
            // Initialize the query builder
            initQueryBuilder();

            // Set up event listeners
            setupEventListeners();

            // Populate column selection
            populateColumnsSelect();
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
    }    /**
     * Initialize the query builder
     */
    function initQueryBuilder() {
        // Filter to only include enabled tables and columns
        const enabledTables = configData.tables.filter(table => table.is_enabled == 1);
        const enabledTableIds = enabledTables.map(table => table.id);        // Filter to only include columns from enabled tables that are filterable
        const enabledColumns = configData.columns.filter(column => {
            // Check if the column belongs to an enabled table
            const tableEnabled = enabledTableIds.includes(column.table_id);

            // For query builder, we only want columns that are filterable
            const columnFilterable = column.is_filterable == 1 ||
                column.is_filterable === true ||
                column.is_filterable === '1' ||
                column.is_filterable === 'true';

            return tableEnabled && columnFilterable;
        });

        // Filter relationships to only include those between enabled tables
        const enabledRelationships = configData.relationships.filter(rel =>
            enabledTableIds.includes(rel.source_table_id) &&
            enabledTableIds.includes(rel.target_table_id)
        );

        // Debug logging
        console.log('Enabled Tables Count:', enabledTables.length);
        console.log('Enabled Columns Count:', enabledColumns.length);
        console.log('First few enabled columns:', enabledColumns.slice(0, 3));

        queryBuilder = new QueryBuilder('#queryBuilder', {
            fields: enabledColumns,
            tables: enabledTables,
            relationships: enabledRelationships,
            options: configData.options,
            onChange: handleQueryChange
        });
    }/**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Add filter functionality for tables and columns
        document.getElementById('tableSearchFilter').addEventListener('input', applyFilters);
        document.getElementById('columnSearchFilter').addEventListener('input', applyFilters);

        // Add rule button
        document.getElementById('btnAddRule').addEventListener('click', () => {
            queryBuilder.addCondition();
        });

        // Add group button
        document.getElementById('btnAddGroup').addEventListener('click', () => {
            queryBuilder.addGroup();
        });

        // Clear button
        document.getElementById('btnClear').addEventListener('click', () => {
            queryBuilder.clear();
        });

        // Execute query button
        document.getElementById('btnExecute').addEventListener('click', executeQuery);

        // Export CSV button
        document.getElementById('btnExport').addEventListener('click', exportCSV);

        // Copy SQL button
        document.getElementById('btnCopySQL').addEventListener('click', () => {
            const sqlPreview = document.getElementById('sqlPreview');
            navigator.clipboard.writeText(sqlPreview.textContent)
                .then(() => {
                    // Show toast or alert for successful copy
                    alert('SQL copied to clipboard');
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        });

        // Select/deselect all columns buttons
        document.getElementById('btnSelectAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#columnsSelect input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            handleColumnSelectionChange();
        });

        document.getElementById('btnDeselectAll').addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('#columnsSelect input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            handleColumnSelectionChange();
        });
    }

    /**
     * Populate the columns selection area
     */
    function populateColumnsSelect() {
        const columnsSelect = document.getElementById('columnsSelect');
        columnsSelect.innerHTML = '';        // Group columns by table - filter for enabled tables and columns only
        const columnsByTable = {};

        // First, filter for enabled tables only
        const enabledTables = configData.tables.filter(table => table.is_enabled == 1); configData.columns.forEach(column => {
            const table = enabledTables.find(t => t.id == column.table_id);

            // Skip if column's table is not enabled
            if (!table) {
                return;
            }

            const tableName = table.display_name;

            if (!columnsByTable[tableName]) {
                columnsByTable[tableName] = [];
            }

            // Only include visible columns
            if (column.is_visible == 1 ||
                column.is_visible === true ||
                column.is_visible === '1' ||
                column.is_visible === 'true') {
                columnsByTable[tableName].push(column);
            }
        });

        // Create checkboxes for each column, grouped by table
        for (const [tableName, columns] of Object.entries(columnsByTable)) {
            const tableGroup = document.createElement('div');
            tableGroup.className = 'mb-3';

            const tableHeader = document.createElement('h6');
            tableHeader.textContent = tableName;
            tableGroup.appendChild(tableHeader);

            const columnList = document.createElement('div');
            columnList.className = 'row';

            columns.forEach(column => {
                const columnDiv = document.createElement('div');
                columnDiv.className = 'col-md-6 mb-1';

                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'form-check';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'form-check-input';
                checkbox.id = `col_${column.id}`;
                checkbox.value = column.id;
                checkbox.checked = true; // Default to selected

                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = `col_${column.id}`;
                label.textContent = column.display_name;

                checkbox.addEventListener('change', handleColumnSelectionChange);

                checkboxDiv.appendChild(checkbox);
                checkboxDiv.appendChild(label);
                columnDiv.appendChild(checkboxDiv);
                columnList.appendChild(columnDiv);
            });

            tableGroup.appendChild(columnList);
            columnsSelect.appendChild(tableGroup);
        }

        // Trigger initial column selection change
        handleColumnSelectionChange();
    }

    /**
     * Handle query change
     */
    function handleQueryChange(query) {
        updateSQLPreview();
    }

    /**
     * Handle column selection change
     */
    function handleColumnSelectionChange() {
        updateSQLPreview();
    }

    /**
     * Update the SQL preview
     */
    async function updateSQLPreview() {
        const query = queryBuilder.getQuery();

        // Get selected columns
        const selectedColumns = Array.from(
            document.querySelectorAll('#columnsSelect input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        // Create the complete query object
        const fullQuery = {
            select: selectedColumns,
            where: query
        };

        try {
            // Send to API to get SQL
            const response = await fetch(AppConfig.api.buildQuery, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: fullQuery })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            // Update SQL preview
            const sqlPreview = document.getElementById('sqlPreview');
            sqlPreview.textContent = result.sql || '-- No SQL generated';
        } catch (error) {
            console.error('Error updating SQL preview:', error);
            const sqlPreview = document.getElementById('sqlPreview');
            sqlPreview.textContent = '-- Error generating SQL';
        }
    }

    /**
     * Execute the current query
     */
    async function executeQuery() {
        const query = queryBuilder.getQuery();

        // Get selected columns
        const selectedColumns = Array.from(
            document.querySelectorAll('#columnsSelect input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        if (selectedColumns.length === 0) {
            alert('Please select at least one column to display in the results.');
            return;
        }

        // Create the complete query object
        const fullQuery = {
            select: selectedColumns,
            where: query
        };

        try {
            // Show loading modal
            loadingModal.show();

            // Send to API to execute
            const response = await fetch(AppConfig.api.executeQuery, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: fullQuery })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();

            // Hide loading modal
            loadingModal.hide();

            // Display results
            displayResults(result);
        } catch (error) {
            console.error('Error executing query:', error);

            // Hide loading modal
            loadingModal.hide();

            // Show error
            alert('Error executing query. Please check the console for details.');
        }
    }

    /**
     * Display query results
     */
    function displayResults(result) {
        const resultsContainer = document.getElementById('resultsContainer');

        // Clear previous results
        resultsContainer.innerHTML = '';

        // Check if we have data
        if (!result.data || result.data.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center p-5 text-muted">
                    <i class="bi bi-search" style="font-size: 2rem;"></i>
                    <p class="mt-2">No results found</p>
                </div>
            `;
            return;
        }

        // Create results header
        const resultHeader = document.createElement('div');
        resultHeader.className = 'mb-2';
        resultHeader.innerHTML = `<strong>${result.count}</strong> results found`;
        resultsContainer.appendChild(resultHeader);

        // Create table for results
        const table = document.createElement('table');
        table.className = 'table table-striped table-bordered table-hover';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        result.columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.name.replace(/_/g, ' ');
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        result.data.forEach(row => {
            const tr = document.createElement('tr');

            result.columns.forEach(column => {
                const td = document.createElement('td');
                const value = row[column.name];

                // Format value based on type
                td.textContent = formatCellValue(value);
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        resultsContainer.appendChild(table);
    }

    /**
     * Format a cell value based on its type
     */
    function formatCellValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        // Handle dates
        if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            const date = new Date(value);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }

        // Handle booleans
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }

        // Handle numbers
        if (typeof value === 'number') {
            // Check if it's likely a currency
            if (String(value).indexOf('.') !== -1) {
                return value.toFixed(2);
            }
            return value.toString();
        }

        // Default
        return value.toString();
    }

    /**
     * Export results as CSV
     */
    function exportCSV() {
        const resultsContainer = document.getElementById('resultsContainer');
        const table = resultsContainer.querySelector('table');

        if (!table) {
            alert('No results to export. Please execute a query first.');
            return;
        }

        // Collect header row
        const headers = [];
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach(cell => {
            headers.push('"' + cell.textContent.replace(/"/g, '""') + '"');
        });

        // Collect data rows
        const rows = [];
        const dataCells = table.querySelectorAll('tbody tr');
        dataCells.forEach(row => {
            const rowData = [];
            row.querySelectorAll('td').forEach(cell => {
                rowData.push('"' + cell.textContent.replace(/"/g, '""') + '"');
            });
            rows.push(rowData.join(','));
        });

        // Combine into CSV
        const csv = headers.join(',') + '\n' + rows.join('\n');

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'query_results_' + new Date().toISOString().slice(0, 10) + '.csv');
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }    /**
     * Filter columns based on search input - works for both table names and column names
     * Hides tables completely if neither their name nor any columns match
     */
    function filterColumns() {
        const filterValue = document.getElementById('columnSearchFilter').value.toLowerCase();

        // If no filter, show everything and exit early
        if (!filterValue) {
            document.querySelectorAll('#columnsSelect > div').forEach(section => {
                section.style.display = '';
            });
            document.querySelectorAll('#columnsSelect .form-check').forEach(item => {
                item.style.display = '';
            });
            return;
        }

        // Get all table sections and column items
        const tableSections = document.querySelectorAll('#columnsSelect > div');

        // Process each table section
        tableSections.forEach(tableSection => {
            const tableHeader = tableSection.querySelector('h6');
            const tableName = tableHeader ? tableHeader.textContent.toLowerCase() : '';
            const columnItems = tableSection.querySelectorAll('.form-check');

            // Check if table name matches
            const tableNameMatches = tableName && tableName.includes(filterValue);

            // If table name matches, show all columns in this table
            if (tableNameMatches) {
                tableSection.style.display = '';
                columnItems.forEach(item => {
                    item.style.display = '';
                });
                return; // Skip to next table
            }

            // Otherwise, check if any columns match
            let hasMatchingColumn = false;

            // Check each column in this table
            columnItems.forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();

                if (label.includes(filterValue)) {
                    item.style.display = '';
                    hasMatchingColumn = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show/hide the entire table section based on whether any columns matched
            tableSection.style.display = hasMatchingColumn ? '' : 'none';
        });
        // Second pass - handle table headers and show all columns for matching tables
        tableHeaders.forEach(header => {
            const tableName = header.textContent.toLowerCase();
            const tableColumnsDiv = header.nextElementSibling;

            // If table name matches OR if table has matching columns
            if (tableName.includes(filterValue)) {
                header.style.display = '';

                // If table name matches, show all its columns
                if (tableColumnsDiv) {
                    tableColumnsDiv.style.display = '';
                    const tableColumns = tableColumnsDiv.querySelectorAll('.form-check');
                    tableColumns.forEach(col => {
                        col.style.display = '';
                    });
                }
            } else if (tablesWithMatches[header.textContent]) {
                // Table has matching columns - show header
                header.style.display = '';
                if (tableColumnsDiv) {
                    tableColumnsDiv.style.display = '';
                }
            } else {
                // No matches in table name or columns - hide table header
                header.style.display = 'none';
                if (tableColumnsDiv) {
                    tableColumnsDiv.style.display = 'none';
                }
            }
        });

        // If filter is empty, make sure everything is visible
        if (!filterValue) {
            tableHeaders.forEach(header => {
                header.style.display = '';
                const tableColumnsDiv = header.nextElementSibling;
                if (tableColumnsDiv) {
                    tableColumnsDiv.style.display = '';
                    const tableColumns = tableColumnsDiv.querySelectorAll('.form-check');
                    tableColumns.forEach(col => {
                        col.style.display = '';
                    });
                }
            });
        }
    }
    /**
     * Apply both table and column filters separately but working together
     */
    function applyFilters() {
        const tableFilterValue = document.getElementById('tableSearchFilter').value.toLowerCase();
        const columnFilterValue = document.getElementById('columnSearchFilter').value.toLowerCase();

        // Get all table sections
        const tableSections = document.querySelectorAll('#columnsSelect > div');

        // Process each table section
        tableSections.forEach(tableSection => {
            const tableHeader = tableSection.querySelector('h6');
            const tableName = tableHeader ? tableHeader.textContent.toLowerCase() : '';
            const columnItems = tableSection.querySelectorAll('.form-check');

            // Check if table name matches the table filter
            const tableNameMatches = !tableFilterValue || tableName.includes(tableFilterValue);

            // If table doesn't match the table filter, hide entire section
            if (!tableNameMatches) {
                tableSection.style.display = 'none';
                return;
            }

            // Check columns against the column filter
            let hasMatchingColumn = false;

            columnItems.forEach(item => {
                const label = item.querySelector('label').textContent.toLowerCase();

                if (!columnFilterValue || label.includes(columnFilterValue)) {
                    item.style.display = '';
                    hasMatchingColumn = true;
                } else {
                    item.style.display = 'none';
                }
            });

            // Show table section if table name matches filter OR it has matching columns
            tableSection.style.display = hasMatchingColumn ? '' : 'none';
        });
    }
});
