-- Schema for Query Builder application

-- Configuration Tables
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[config_tables]') AND type in (N'U'))
BEGIN
CREATE TABLE config_tables (
    id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    schema_name VARCHAR(100) DEFAULT 'dbo',
    display_name VARCHAR(100) NOT NULL,
    is_main_table BIT DEFAULT 0,
    is_enabled BIT DEFAULT 1,
    description VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    object_type VARCHAR(10) DEFAULT 'table' -- new column to indicate table or view
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[config_columns]') AND type in (N'U'))
BEGIN
CREATE TABLE config_columns (
    id INT PRIMARY KEY IDENTITY(1,1),
    table_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    input_type VARCHAR(50) NOT NULL, -- text, number, date, select, multiselect, etc.
    is_filterable BIT DEFAULT 1,
    is_sortable BIT DEFAULT 1,
    is_visible BIT DEFAULT 1,
    sort_order INT DEFAULT 0,
    group_name VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (table_id) REFERENCES config_tables(id) ON DELETE CASCADE
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[config_column_options]') AND type in (N'U'))
BEGIN
CREATE TABLE config_column_options (
    id INT PRIMARY KEY IDENTITY(1,1),
    column_id INT NOT NULL,
    value VARCHAR(255) NOT NULL,
    display_value VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (column_id) REFERENCES config_columns(id) ON DELETE CASCADE
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[config_relationships]') AND type in (N'U'))
BEGIN
CREATE TABLE config_relationships (
    id INT PRIMARY KEY IDENTITY(1,1),
    source_table_id INT NOT NULL,
    target_table_id INT NOT NULL,
    relationship_type VARCHAR(20) DEFAULT 'one-to-many', -- one-to-one, one-to-many, many-to-many
    join_column VARCHAR(100) NOT NULL,
    foreign_column VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (source_table_id) REFERENCES config_tables(id) ON DELETE NO ACTION,
    FOREIGN KEY (target_table_id) REFERENCES config_tables(id) ON DELETE NO ACTION
);
END