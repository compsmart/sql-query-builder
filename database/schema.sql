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
    updated_at DATETIME DEFAULT GETDATE()
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

-- Sample data tables (for testing purposes)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customers]') AND type in (N'U'))
BEGIN
CREATE TABLE customers (
    id INT PRIMARY KEY IDENTITY(1,1),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    signup_date DATETIME DEFAULT GETDATE(),
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[offers]') AND type in (N'U'))
BEGIN
CREATE TABLE offers (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    offer_type VARCHAR(50) NOT NULL,
    offer_value DECIMAL(10,2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_redeemed BIT DEFAULT 0,
    redemption_date DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[loyalty_transactions]') AND type in (N'U'))
BEGIN
CREATE TABLE loyalty_transactions (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    points INT NOT NULL,
    transaction_date DATETIME DEFAULT GETDATE(),
    description VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[visits]') AND type in (N'U'))
BEGIN
CREATE TABLE visits (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    visit_date DATETIME DEFAULT GETDATE(),
    location VARCHAR(100),
    duration_minutes INT,
    purpose VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[gaming_transactions]') AND type in (N'U'))
BEGIN
CREATE TABLE gaming_transactions (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    game_id INT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- win, loss, deposit, withdrawal
    transaction_date DATETIME DEFAULT GETDATE(),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
END

-- Populate the config tables with initial data

-- Add the customer table to config_tables
INSERT INTO config_tables (name, display_name, is_main_table, is_enabled, description)
VALUES ('customers', 'Customers', 1, 1, 'Main customers table');

-- Add related tables to config_tables
INSERT INTO config_tables (name, display_name, is_main_table, is_enabled, description)
VALUES 
('offers', 'Offers', 0, 1, 'Customer offers and promotions'),
('loyalty_transactions', 'Loyalty Transactions', 0, 1, 'Customer loyalty points transactions'),
('visits', 'Visits', 0, 1, 'Customer visits log'),
('gaming_transactions', 'Gaming Transactions', 0, 1, 'Customer gaming activity');

-- Add relationships
INSERT INTO config_relationships (source_table_id, target_table_id, relationship_type, join_column, foreign_column)
VALUES 
(1, 2, 'one-to-many', 'id', 'customer_id'),
(1, 3, 'one-to-many', 'id', 'customer_id'),
(1, 4, 'one-to-many', 'id', 'customer_id'),
(1, 5, 'one-to-many', 'id', 'customer_id');

-- Add columns for customers table
INSERT INTO config_columns (table_id, name, display_name, data_type, input_type, is_filterable, is_sortable, is_visible, sort_order, group_name)
VALUES
(1, 'id', 'ID', 'int', 'number', 1, 1, 1, 1, 'Basic Info'),
(1, 'first_name', 'First Name', 'varchar', 'text', 1, 1, 1, 2, 'Basic Info'),
(1, 'last_name', 'Last Name', 'varchar', 'text', 1, 1, 1, 3, 'Basic Info'),
(1, 'email', 'Email', 'varchar', 'text', 1, 1, 1, 4, 'Contact'),
(1, 'phone', 'Phone Number', 'varchar', 'text', 1, 1, 1, 5, 'Contact'),
(1, 'address', 'Address', 'varchar', 'text', 1, 1, 1, 6, 'Address'),
(1, 'city', 'City', 'varchar', 'text', 1, 1, 1, 7, 'Address'),
(1, 'country', 'Country', 'varchar', 'select', 1, 1, 1, 8, 'Address'),
(1, 'postal_code', 'Postal Code', 'varchar', 'text', 1, 1, 1, 9, 'Address'),
(1, 'signup_date', 'Signup Date', 'datetime', 'date', 1, 1, 1, 10, 'Account'),
(1, 'status', 'Status', 'varchar', 'select', 1, 1, 1, 11, 'Account');

-- Add country options
INSERT INTO config_column_options (column_id, value, display_value, sort_order)
VALUES
(8, 'USA', 'United States', 1),
(8, 'UK', 'United Kingdom', 2),
(8, 'CA', 'Canada', 3),
(8, 'AU', 'Australia', 4),
(8, 'DE', 'Germany', 5);

-- Add status options
INSERT INTO config_column_options (column_id, value, display_value, sort_order)
VALUES
(11, 'active', 'Active', 1),
(11, 'inactive', 'Inactive', 2),
(11, 'suspended', 'Suspended', 3);

-- Add columns for offers table
INSERT INTO config_columns (table_id, name, display_name, data_type, input_type, is_filterable, is_sortable, is_visible, sort_order, group_name)
VALUES
(2, 'id', 'Offer ID', 'int', 'number', 1, 1, 1, 1, 'Offer Info'),
(2, 'offer_type', 'Offer Type', 'varchar', 'select', 1, 1, 1, 2, 'Offer Info'),
(2, 'offer_value', 'Value', 'decimal', 'number', 1, 1, 1, 3, 'Offer Info'),
(2, 'start_date', 'Start Date', 'datetime', 'date', 1, 1, 1, 4, 'Offer Period'),
(2, 'end_date', 'End Date', 'datetime', 'date', 1, 1, 1, 5, 'Offer Period'),
(2, 'is_redeemed', 'Redeemed', 'bit', 'checkbox', 1, 1, 1, 6, 'Offer Status'),
(2, 'redemption_date', 'Redemption Date', 'datetime', 'date', 1, 1, 1, 7, 'Offer Status');

-- Add offer type options
INSERT INTO config_column_options (column_id, value, display_value, sort_order)
VALUES
(13, 'discount', 'Discount', 1),
(13, 'freebie', 'Free Item', 2),
(13, 'credit', 'Account Credit', 3),
(13, 'bonus', 'Bonus Points', 4);

-- Add columns for other tables similarly (simplified)
-- Visits table columns
INSERT INTO config_columns (table_id, name, display_name, data_type, input_type, is_filterable, is_sortable, is_visible, sort_order, group_name)
VALUES
(4, 'visit_date', 'Visit Date', 'datetime', 'date', 1, 1, 1, 1, 'Visit Details'),
(4, 'location', 'Location', 'varchar', 'select', 1, 1, 1, 2, 'Visit Details'),
(4, 'duration_minutes', 'Duration (min)', 'int', 'number', 1, 1, 1, 3, 'Visit Details');

-- Add location options
INSERT INTO config_column_options (column_id, value, display_value, sort_order)
VALUES
(21, 'london', 'London', 1),
(21, 'manchester', 'Manchester', 2),
(21, 'birmingham', 'Birmingham', 3),
(21, 'glasgow', 'Glasgow', 4);
