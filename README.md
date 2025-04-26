# SQL Query Builder

A powerful, user-friendly web interface for building and executing SQL queries without writing SQL code. This application allows users to visually construct complex database queries using an intuitive interface, select display columns, and export results - all without requiring SQL knowledge.

![screenshot](https://github.com/compsmart/sql-query-builder/sql1.jpg)


## Table of Contents

- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Admin Panel](#admin-panel)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## Features

- **Visual Query Builder**: Create complex SQL queries using a simple drag-and-drop interface
- **Flexible Column Selection**: Choose which columns to include in query results
- **Table & Column Filtering**: Quickly find tables and columns with the search filters
- **Query Preview**: See the generated SQL code in real-time
- **Export Results**: Download query results as CSV files
- **Admin Configuration**: Control which tables and columns are available to users
- **Modern UI**: Clean, responsive interface built with Bootstrap

## System Requirements

- PHP 7.4 or higher
- MySQL 5.7+ / MariaDB 10.2+ database
- Web server (Apache, Nginx, etc.)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/compsmart/queryengine.git
cd queryengine
```

### 2. Set up the Database

Create a new database for the application, then import the schema:

```bash
execute database/schema.sql
```

### 3. Configure Database Connection

Edit the `config/database.php` file to match your database settings:

```php
<?php
return [
    'host' => 'localhost',
    'database' => 'your_database_name',
    'username' => 'your_username',
    'password' => 'your_password',
    'charset' => 'utf8mb4',
];
```

### 4. Configure Web Server

#### For Apache:

Make sure the document root points to the `public` folder, with URL rewriting enabled:

```apache
<VirtualHost *:80>
    ServerName queryengine.local
    DocumentRoot "/path/to/queryengine/public"
    
    <Directory "/path/to/queryengine/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

#### For Nginx:

```nginx
server {
    listen 80;
    server_name queryengine.local;
    root /path/to/queryengine/public;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
```

### 5. Set File Permissions

Make sure the web server can read/write to necessary directories:

```bash
chmod -R 755 .
chmod -R 775 api/logs  # If logging is enabled
```

## Configuration

### Database Tables and Columns

The application needs to be configured to recognize which tables and columns should be available in the query builder.

![screenshot](https://github.com/compsmart/sql-query-builder/sql2.jpg)

1. Access the admin panel at `http://yourdomain.com/admin.html`
2. Add tables from your database that should be queryable
3. Configure columns with proper display names
4. Set up relationships between tables to enable joins

### Table Configuration Options:

- **is_enabled**: Controls whether the table appears in the query builder
- **display_name**: User-friendly name shown in the interface
- **description**: Optional description of the table's purpose

### Column Configuration Options:

- **is_visible**: If true, column can be selected for display in results
- **is_filterable**: If true, column can be used for query conditions
- **display_name**: User-friendly name shown in the interface
- **data_type**: The column's data type (helps determine available operators)

### Relationship Configuration:

Relationships define how tables can be joined:

```json
{
  "source_table_id": 1,
  "target_table_id": 2,
  "source_column": "user_id",
  "target_column": "id",
  "relationship_type": "one-to-many"
}
```

![screenshot](https://github.com/compsmart/sql-query-builder/sql2.jpg)

## Usage Guide

### Building a Query

1. **Select Query Conditions**:
   - Click "Add Rule" to create a condition
   - Select a column, operator, and value
   - Use "Add Group" to create nested condition groups
   - Toggle between AND/OR operators as needed

2. **Select Display Columns**:
   - Use the "Columns to Display" panel to choose which columns will appear in results
   - Filter tables and columns using the search boxes to find specific items
   - Use "Select All" or "Deselect All" buttons as needed

3. **Execute the Query**:
   - Preview the generated SQL in the "SQL Preview" panel
   - Click "Execute Query" to run the query and see results
   - The results will appear in a table format with proper formatting

4. **Export Results**:
   - Click "Export CSV" to download the query results as a CSV file
   - The file will be named with the current date

### Filtering Options

The interface provides two separate filters:

- **Table Filter**: Shows only tables matching the entered text
- **Column Filter**: Shows only columns matching the entered text

These can be used separately or together to quickly locate the tables and columns you need.

## Admin Panel

The admin panel (`admin.html`) allows you to configure which database elements are accessible through the query builder:

1. **Manage Tables**:
   - Enable or disable tables
   - Set display names and descriptions

2. **Manage Columns**:
   - Configure visibility and filterability
   - Set display names and descriptions
   - Define data types and validation rules

3. **Manage Relationships**:
   - Define joins between tables
   - Set relationship types (one-to-many, etc.)

4. **Global Settings**:
   - Maximum query execution time
   - Result row limits
   - Access controls

## API Documentation

The application provides several API endpoints that power the interface:

### GET `/api/config`

Returns all configuration data including tables, columns, relationships, and options.

### POST `/api/query`

Builds a SQL query based on provided parameters:

```json
{
  "query": {
    "select": [1, 2, 3],  // Column IDs to include
    "where": {
      "condition": "AND",
      "rules": [
        {
          "field": 5,    // Column ID
          "operator": "equal",
          "value": "test"
        }
      ]
    }
  }
}
```

### POST `/api/execute`

Executes a query and returns results. Uses the same format as `/api/query`.

## Troubleshooting

### Query Builder Not Showing Tables or Columns

- Check that tables are marked as `is_enabled = 1` in the configuration
- For columns in the query builder, verify they have `is_filterable = 1`
- For columns in the display selection, verify they have `is_visible = 1`
- Check browser console for any JavaScript errors

### API Errors

- Verify database connection settings
- Check PHP error logs for detailed error messages
- Ensure proper permissions for database user

### Empty Result Set

- Verify your query conditions are not too restrictive
- Check that the selected columns exist in the tables
- Examine the SQL Preview to see the actual query being executed

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
