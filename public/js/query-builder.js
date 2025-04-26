/**
 * Query Builder Implementation
 */
class QueryBuilder {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            fields: [],
            tables: [],
            relationships: [],
            onChange: null,
            ...options
        };

        this.query = {
            type: 'group',
            operator: 'AND',
            conditions: []
        };

        this.init();
    }

    /**
     * Initialize the query builder
     */
    init() {
        this.render();
        this.setupEventListeners();
    }

    /**
     * Render the query builder UI
     */
    render() {
        const template = document.getElementById('query-builder-template').innerHTML;
        this.container.innerHTML = template;

        // Set the root group
        this.rootGroup = this.container.querySelector('.query-builder-group');

        // Hide the remove button for the root group
        const rootRemoveBtn = this.rootGroup.querySelector('.btn-remove-group');
        rootRemoveBtn.style.display = 'none';
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Global event delegation for the query builder
        this.container.addEventListener('click', (e) => {
            const target = e.target;

            // Check if the clicked element is a remove group button
            if (target.classList.contains('btn-remove-group') ||
                target.closest('.btn-remove-group')) {
                const group = target.closest('.query-builder-group');
                if (group !== this.rootGroup) {
                    this.removeGroup(group);
                }
            }

            // Check if the clicked element is a remove condition button
            if (target.classList.contains('btn-remove-condition') ||
                target.closest('.btn-remove-condition')) {
                const condition = target.closest('.query-condition');
                this.removeCondition(condition);
            }
        });

        // Listen for changes in operator
        this.container.addEventListener('change', (e) => {
            if (e.target.classList.contains('operator-select') ||
                e.target.classList.contains('field-select')) {
                this.updateQueryFromUI();
            }
        });
    }

    /**
     * Add a new group
     */
    addGroup(parentGroup = null) {
        const template = document.getElementById('query-builder-template').innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;
        const newGroup = tempDiv.firstElementChild;

        // If no parent group is specified, add to the root group
        const targetGroup = parentGroup || this.rootGroup;
        const conditionsContainer = targetGroup.querySelector('.conditions-container');
        conditionsContainer.appendChild(newGroup);

        this.updateQueryFromUI();
        return newGroup;
    }

    /**
     * Remove a group
     */
    removeGroup(group) {
        if (group && group !== this.rootGroup) {
            group.parentElement.removeChild(group);
            this.updateQueryFromUI();
        }
    }

    /**
     * Add a new condition
     */
    addCondition(group = null) {
        const targetGroup = group || this.rootGroup;
        const template = document.getElementById('query-condition-template').innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;
        const newCondition = tempDiv.firstElementChild;

        // Add to the target group's conditions container
        const conditionsContainer = targetGroup.querySelector('.conditions-container');
        conditionsContainer.appendChild(newCondition);

        // Set up field select options
        const fieldSelect = newCondition.querySelector('.field-select');
        this.populateFieldSelect(fieldSelect);

        // Set up initial operator options based on the first field
        const operatorSelect = newCondition.querySelector('.operator-select');
        if (this.options.fields.length > 0) {
            const firstField = this.options.fields[0];
            this.populateOperatorSelect(operatorSelect, firstField.data_type);
        }

        // Set up field change event to update operators
        fieldSelect.addEventListener('change', () => {
            const selectedField = this.options.fields.find(field => field.id == fieldSelect.value);
            if (selectedField) {
                this.populateOperatorSelect(operatorSelect, selectedField.data_type);
                this.updateValueInput(newCondition, selectedField);
            }
            this.updateQueryFromUI();
        });

        // Set up operator change event
        operatorSelect.addEventListener('change', () => {
            const selectedField = this.options.fields.find(field => field.id == fieldSelect.value);
            if (selectedField) {
                this.updateValueInput(newCondition, selectedField, operatorSelect.value);
            }
            this.updateQueryFromUI();
        });

        // Initialize the value input for the first field
        if (this.options.fields.length > 0) {
            this.updateValueInput(newCondition, this.options.fields[0]);
        }

        this.updateQueryFromUI();
        return newCondition;
    }

    /**
     * Remove a condition
     */
    removeCondition(condition) {
        if (condition) {
            condition.parentElement.removeChild(condition);
            this.updateQueryFromUI();
        }
    }

    /**
     * Populate field select with options
     */
    populateFieldSelect(select) {
        select.innerHTML = '';

        // Group fields by table
        const fieldsByTable = {};
        this.options.fields.forEach(field => {
            const table = this.options.tables.find(t => t.id == field.table_id);
            const tableName = table ? table.display_name : 'Unknown';

            if (!fieldsByTable[tableName]) {
                fieldsByTable[tableName] = [];
            }

            fieldsByTable[tableName].push(field);
        });

        // Add options with optgroups
        for (const [tableName, fields] of Object.entries(fieldsByTable)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = tableName;

            fields.forEach(field => {
                if (field.is_filterable) {
                    const option = document.createElement('option');
                    option.value = field.id;
                    option.textContent = field.display_name;
                    optgroup.appendChild(option);
                }
            });

            if (optgroup.children.length > 0) {
                select.appendChild(optgroup);
            }
        }
    }

    /**
     * Populate operator select with options based on data type
     */
    populateOperatorSelect(select, dataType) {
        select.innerHTML = '';

        // Common operators for all types
        const operators = [
            { value: '=', label: 'Equals' },
            { value: '!=', label: 'Not Equals' },
            { value: 'IS NULL', label: 'Is Empty' },
            { value: 'IS NOT NULL', label: 'Is Not Empty' }
        ];

        // Add type-specific operators
        switch (dataType.toLowerCase()) {
            case 'int':
            case 'smallint':
            case 'bigint':
            case 'decimal':
            case 'numeric':
            case 'float':
            case 'real':
            case 'money':
                operators.push(
                    { value: '>', label: 'Greater Than' },
                    { value: '>=', label: 'Greater Than or Equal' },
                    { value: '<', label: 'Less Than' },
                    { value: '<=', label: 'Less Than or Equal' },
                    { value: 'BETWEEN', label: 'Between' }
                );
                break;

            case 'datetime':
            case 'date':
            case 'smalldatetime':
                operators.push(
                    { value: '>', label: 'After' },
                    { value: '>=', label: 'On or After' },
                    { value: '<', label: 'Before' },
                    { value: '<=', label: 'On or Before' },
                    { value: 'BETWEEN', label: 'Between' }
                );
                break;

            case 'char':
            case 'varchar':
            case 'nvarchar':
            case 'text':
            case 'ntext':
                operators.push(
                    { value: 'LIKE', label: 'Contains' },
                    { value: 'NOT LIKE', label: 'Does Not Contain' },
                    { value: 'IN', label: 'In List' }
                );
                break;

            case 'bit':
                // For boolean, we just need equals and not equals
                break;
        }

        // Add options to select
        operators.forEach(op => {
            const option = document.createElement('option');
            option.value = op.value;
            option.textContent = op.label;
            select.appendChild(option);
        });
    }

    /**
     * Update value input based on field type and operator
     */
    updateValueInput(condition, field, operator = null) {
        const valueContainer = condition.querySelector('.value-container');
        const operatorSelect = condition.querySelector('.operator-select');
        operator = operator || operatorSelect.value;

        // Clear the value container
        valueContainer.innerHTML = '';

        // If operator doesn't need a value (IS NULL, IS NOT NULL)
        if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
            return;
        }

        // Create input based on field type and input type
        let input;

        // Handle BETWEEN operator (needs two inputs)
        if (operator === 'BETWEEN') {
            const rangeContainer = document.createElement('div');
            rangeContainer.className = 'd-flex align-items-center';

            const fromInput = this.createInputForField(field);
            fromInput.classList.add('from-value', 'me-1');
            fromInput.style.width = '100%';

            const toInput = this.createInputForField(field);
            toInput.classList.add('to-value');
            toInput.style.width = '100%';

            const andLabel = document.createElement('span');
            andLabel.textContent = 'and';
            andLabel.className = 'mx-2';

            rangeContainer.appendChild(fromInput);
            rangeContainer.appendChild(andLabel);
            rangeContainer.appendChild(toInput);

            valueContainer.appendChild(rangeContainer);

            // Add change event listeners
            [fromInput, toInput].forEach(input => {
                input.addEventListener('change', () => this.updateQueryFromUI());
                input.addEventListener('keyup', () => this.updateQueryFromUI());
            });

            return;
        }

        // Handle IN operator (needs multiselect or textarea)
        if (operator === 'IN' || operator === 'NOT IN') {
            if (field.input_type === 'select' || field.input_type === 'multiselect') {
                // Create a multiselect for predefined options
                input = document.createElement('select');
                input.className = 'form-select form-select-sm value-input';
                input.multiple = true;
                input.size = 4;  // Show 4 options at once

                // Add options from field configuration
                const options = this.getOptionsForField(field.id);
                options.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.display_value;
                    input.appendChild(opt);
                });
            } else {
                // Create a textarea for manual entry
                input = document.createElement('textarea');
                input.className = 'form-control form-control-sm value-input';
                input.placeholder = 'Enter values, one per line';
                input.rows = 3;
            }
        } else {
            // Create standard input based on field type
            input = this.createInputForField(field);
        }

        // Add the input to the container
        valueContainer.appendChild(input);

        // Add change event listener
        input.addEventListener('change', () => this.updateQueryFromUI());
        input.addEventListener('keyup', () => this.updateQueryFromUI());
    }

    /**
     * Create an input element based on field type
     */
    createInputForField(field) {
        let input;

        switch (field.input_type) {
            case 'select':
                input = document.createElement('select');
                input.className = 'form-select form-select-sm value-input';

                // Add options from field configuration
                const options = this.getOptionsForField(field.id);
                options.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.display_value;
                    input.appendChild(opt);
                });
                break;

            case 'multiselect':
                input = document.createElement('select');
                input.className = 'form-select form-select-sm value-input';
                input.multiple = true;

                // Add options from field configuration
                const msOptions = this.getOptionsForField(field.id);
                msOptions.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option.value;
                    opt.textContent = option.display_value;
                    input.appendChild(opt);
                });
                break;

            case 'checkbox':
                input = document.createElement('div');
                input.className = 'form-check form-switch';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'form-check-input value-input';
                checkbox.id = 'checkbox_' + Math.random().toString(36).substring(2, 9);

                const label = document.createElement('label');
                label.className = 'form-check-label';
                label.htmlFor = checkbox.id;
                label.textContent = 'Yes';

                input.appendChild(checkbox);
                input.appendChild(label);

                // Set the actual input for later reference
                input.valueInput = checkbox;
                break;

            case 'date':
                input = document.createElement('input');
                input.type = 'date';
                input.className = 'form-control form-control-sm value-input';
                break;

            case 'number':
                input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control form-control-sm value-input';

                if (field.data_type === 'decimal' || field.data_type === 'float') {
                    input.step = '0.01';
                } else {
                    input.step = '1';
                }
                break;

            case 'text':
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control form-control-sm value-input';
                break;
        }

        return input;
    }

    /**
     * Get options for a field by ID
     */
    getOptionsForField(fieldId) {
        const options = [];

        // Find all options for this field in the application config
        if (this.options.options) {
            this.options.options.forEach(option => {
                if (option.column_id == fieldId) {
                    options.push(option);
                }
            });
        }

        return options;
    }

    /**
     * Update the query object based on the UI
     */
    updateQueryFromUI() {
        this.query = this.extractQueryFromGroup(this.rootGroup);

        if (typeof this.options.onChange === 'function') {
            this.options.onChange(this.query);
        }

        return this.query;
    }

    /**
     * Extract query data from a group element
     */
    extractQueryFromGroup(groupElement) {
        const operatorSelect = groupElement.querySelector('.operator-select');
        const operator = operatorSelect.value;

        const conditions = [];

        // Get all direct child conditions and groups
        const conditionsContainer = groupElement.querySelector('.conditions-container');

        // Process condition elements
        Array.from(conditionsContainer.children).forEach(child => {
            if (child.classList.contains('query-condition')) {
                const condition = this.extractCondition(child);
                if (condition) {
                    conditions.push(condition);
                }
            } else if (child.classList.contains('query-builder-group')) {
                const subgroup = this.extractQueryFromGroup(child);
                if (subgroup && subgroup.conditions.length > 0) {
                    conditions.push(subgroup);
                }
            }
        });

        return {
            type: 'group',
            operator: operator,
            conditions: conditions
        };
    }

    /**
     * Extract condition data from a condition element
     */
    extractCondition(conditionElement) {
        const fieldSelect = conditionElement.querySelector('.field-select');
        const operatorSelect = conditionElement.querySelector('.operator-select');
        const valueContainer = conditionElement.querySelector('.value-container');

        if (!fieldSelect || !fieldSelect.value) {
            return null;
        }

        const fieldId = fieldSelect.value;
        const operator = operatorSelect.value;

        let value = null;

        // Skip value for IS NULL and IS NOT NULL operators
        if (operator !== 'IS NULL' && operator !== 'IS NOT NULL') {
            // Handle different input types
            if (operator === 'BETWEEN') {
                const fromInput = valueContainer.querySelector('.from-value');
                const toInput = valueContainer.querySelector('.to-value');

                // For checkboxes, we need to check the parent element
                const fromValue = fromInput.classList.contains('form-check-input') ?
                    fromInput.checked : fromInput.value;
                const toValue = toInput.classList.contains('form-check-input') ?
                    toInput.checked : toInput.value;

                value = [fromValue, toValue];
            } else if (operator === 'IN' || operator === 'NOT IN') {
                const valueInput = valueContainer.querySelector('.value-input');

                if (valueInput.tagName === 'SELECT') {
                    // Get selected options
                    value = Array.from(valueInput.selectedOptions).map(opt => opt.value);
                } else {
                    // Parse textarea (one line = one value)
                    value = valueInput.value.split('\n')
                        .map(line => line.trim())
                        .filter(line => line !== '');
                }
            } else {
                const valueInput = valueContainer.querySelector('.value-input');

                if (!valueInput) {
                    return null;
                }

                if (valueInput.type === 'checkbox') {
                    value = valueInput.checked;
                } else if (valueInput.type === 'number') {
                    value = valueInput.value === '' ? null : Number(valueInput.value);
                } else if (valueInput.tagName === 'SELECT' && valueInput.multiple) {
                    value = Array.from(valueInput.selectedOptions).map(opt => opt.value);
                } else {
                    value = valueInput.value;
                }
            }
        }

        return {
            type: 'condition',
            column: fieldId,
            operator: operator,
            value: value
        };
    }

    /**
     * Set the query data and update UI
     */
    setQuery(query) {
        this.query = query;
        this.renderQuery(query);
    }

    /**
     * Render a query object into the UI
     */
    renderQuery(query) {
        // Clear existing conditions
        const conditionsContainer = this.rootGroup.querySelector('.conditions-container');
        conditionsContainer.innerHTML = '';

        // Set the root group operator
        const operatorSelect = this.rootGroup.querySelector('.operator-select');
        operatorSelect.value = query.operator;

        // Render all conditions
        if (query.conditions && query.conditions.length > 0) {
            query.conditions.forEach(condition => {
                if (condition.type === 'group') {
                    const newGroup = this.addGroup();
                    this.renderGroupCondition(newGroup, condition);
                } else {
                    this.renderSimpleCondition(this.rootGroup, condition);
                }
            });
        }
    }

    /**
     * Render a group condition
     */
    renderGroupCondition(groupElement, condition) {
        // Set the group operator
        const operatorSelect = groupElement.querySelector('.operator-select');
        operatorSelect.value = condition.operator;

        // Render all child conditions
        const conditionsContainer = groupElement.querySelector('.conditions-container');
        conditionsContainer.innerHTML = '';

        condition.conditions.forEach(childCondition => {
            if (childCondition.type === 'group') {
                const newGroup = this.addGroup(groupElement);
                this.renderGroupCondition(newGroup, childCondition);
            } else {
                this.renderSimpleCondition(groupElement, childCondition);
            }
        });
    }

    /**
     * Render a simple condition
     */
    renderSimpleCondition(groupElement, condition) {
        const newCondition = this.addCondition(groupElement);
        const fieldSelect = newCondition.querySelector('.field-select');
        const operatorSelect = newCondition.querySelector('.operator-select');

        // Set the field
        fieldSelect.value = condition.column;

        // Find the field info
        const field = this.options.fields.find(f => f.id == condition.column);
        if (!field) {
            return;
        }

        // Update operators for this field type
        this.populateOperatorSelect(operatorSelect, field.data_type);

        // Set the operator
        operatorSelect.value = condition.operator;

        // Update the value input for this field and operator
        this.updateValueInput(newCondition, field, condition.operator);

        // Set the value
        if (condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL') {
            const valueContainer = newCondition.querySelector('.value-container');

            if (condition.operator === 'BETWEEN') {
                const fromInput = valueContainer.querySelector('.from-value');
                const toInput = valueContainer.querySelector('.to-value');

                if (Array.isArray(condition.value) && condition.value.length >= 2) {
                    if (fromInput.type === 'checkbox') {
                        fromInput.checked = Boolean(condition.value[0]);
                    } else {
                        fromInput.value = condition.value[0];
                    }

                    if (toInput.type === 'checkbox') {
                        toInput.checked = Boolean(condition.value[1]);
                    } else {
                        toInput.value = condition.value[1];
                    }
                }
            } else if (condition.operator === 'IN' || condition.operator === 'NOT IN') {
                const valueInput = valueContainer.querySelector('.value-input');

                if (valueInput.tagName === 'SELECT') {
                    // Set selected options
                    if (Array.isArray(condition.value)) {
                        Array.from(valueInput.options).forEach(opt => {
                            opt.selected = condition.value.includes(opt.value);
                        });
                    }
                } else if (valueInput.tagName === 'TEXTAREA') {
                    // Set textarea value
                    valueInput.value = Array.isArray(condition.value) ? condition.value.join('\n') : '';
                }
            } else {
                const valueInput = valueContainer.querySelector('.value-input');

                if (valueInput) {
                    if (valueInput.type === 'checkbox') {
                        valueInput.checked = Boolean(condition.value);
                    } else if (valueInput.tagName === 'SELECT' && valueInput.multiple) {
                        if (Array.isArray(condition.value)) {
                            Array.from(valueInput.options).forEach(opt => {
                                opt.selected = condition.value.includes(opt.value);
                            });
                        }
                    } else {
                        valueInput.value = condition.value !== null ? condition.value : '';
                    }
                }
            }
        }
    }

    /**
     * Get the current query object
     */
    getQuery() {
        return this.query;
    }

    /**
     * Clear the query builder
     */
    clear() {
        // Reset the query object
        this.query = {
            type: 'group',
            operator: 'AND',
            conditions: []
        };

        // Clear the UI
        const conditionsContainer = this.rootGroup.querySelector('.conditions-container');
        conditionsContainer.innerHTML = '';

        // Notify of change
        if (typeof this.options.onChange === 'function') {
            this.options.onChange(this.query);
        }
    }
}
