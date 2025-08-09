const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const ExcelJS = require('exceljs');

const app = express();
app.use(cors());
app.use(express.json());

// Database configuration
const baseConfig = {
  host: 'localhost',
  user: 'root',
  password: '' // XAMPP default
};

async function initializeDatabase() {
  let connection;
  
  try {
    // Step 1: Connect without specifying database
    connection = await mysql.createConnection(baseConfig);
    
    // Step 2: Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS fos_inventory');
    console.log('Database "fos_inventory" is ready!');
    
    // Step 3: Connect to the specific database
    const dbConfig = {
      ...baseConfig,
      database: 'fos_inventory'
    };
    connection = await mysql.createConnection(dbConfig);
    
    // Step 4: Create parent table if it doesn't exist
    // await connection.query(`
    //   CREATE TABLE IF NOT EXISTS all_items (
    //     id INT AUTO_INCREMENT PRIMARY KEY,
    //     name VARCHAR(255) NOT NULL,
    //     quantity INT DEFAULT 0,
    //     code VARCHAR(50) DEFAULT 'IT--XXX'
    //   )
    // `);
    // console.log('Table "all_items" is ready!');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        quantity INT DEFAULT 0
      )
    `);
    console.log('Table "categories" is ready!');
  
    return connection;
    
  } catch (err) {
    console.error('Database initialization error:', err);
    if (connection) await connection.end();
    throw err;
  }
}

// Helper function to create child table if not exists
async function ensureChildTableExists(db, tableName) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parent_id INT NOT NULL,
      code VARCHAR(255) NOT NULL,
      model VARCHAR(255),
      cost DECIMAL(10, 2) DEFAULT 0.00,
      issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      assigned_to VARCHAR(255),
      is_broken BOOLEAN DEFAULT 0,
      additional_detail VARCHAR(255),
      FOREIGN KEY (parent_id) REFERENCES all_items(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
}

// Initialize database and start server
initializeDatabase()
  .then(async (db) => {
    console.log('Database initialization complete');
    
    // ====================== CATEGORIES ENDPOINTS ======================
    
    // 1. Get all categories
    app.get('/api/categories', async (req, res) => {
      try {
        const [rows] = await db.query('SELECT * FROM categories');
        res.json(rows);
      } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
      }
    });

    // get a specific category
    app.get('/api/categories/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
        res.json(rows[0] || {});
      } catch (err) {
        console.error('Error fetching category:', err);
        res.status(500).json({ error: 'Failed to fetch category' });
      }
    });


    // Make a new category
    app.post('/api/categories', async (req, res) => {
      const input = req.body;
      if (!input.name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      try {
        await db.beginTransaction();
        const allowedFields = ['name', 'quantity'];
        const fields = Object.entries(input)
          .filter(([key]) => allowedFields.includes(key));

        const columns = fields.map(([key]) => `\`${key}\``).join(', ');
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map(([_, value]) => value);

        const insertQuery = `
          INSERT INTO categories (${columns})
          VALUES (${placeholders})
        `;
        const [result] = await db.query(insertQuery, values);
        // Prepare new table name
        const tableName = input.name.toLowerCase().replace(/\s+/g, '_');
        // Validate table name (to avoid SQL injection)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
          throw new Error('Invalid category name for table creation');
        }
        // Create the new table
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS \`${tableName}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_category_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            quantity INT DEFAULT 0,
            code VARCHAR(50) DEFAULT 'YY--XXX',
            FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
          )
        `;
        await db.query(createTableQuery);
        await db.commit();

        res.status(201).json({
          id: result.insertId,
          ...input,
          table_created: tableName
        });

      } catch (err) {
        await db.rollback();
        console.error('Error creating category and table:', err);
        res.status(500).json({
          error: 'Failed to create category and table',
          details: err.message
        });
      }
    });


    // Update a category
    app.put('/api/categories/:id', async (req, res) => {
      const { id } = req.params;
      const input = req.body;
      if (Object.keys(input).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      try {
        const allowedFields = ['name', 'quantity'];
        const fields = Object.entries(input)
          .filter(([key]) => allowedFields.includes(key));

        if (fields.length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const setClause = fields.map(([key]) => `\`${key}\` = ?`).join(', ');
        const values = fields.map(([_, value]) => value);
        values.push(id);

        const query = `
          UPDATE categories
          SET ${setClause}
          WHERE id = ?
        `;
        await db.query(query, values);
        res.json({ success: true });
      } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Failed to update category' });
      }
    });

    // // Delete a category and its associated items table
    // app.delete('/api/categories/:id', async (req, res) => {
    //   const { id } = req.params;

    //   try {
    //     await db.query('START TRANSACTION');

    //     // 1. Get category name
    //     const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [id]);
    //     if (categoryRows.length === 0) {
    //       await db.query('ROLLBACK');
    //       return res.status(404).json({ error: 'Category not found' });
    //     }

    //     const categoryName = categoryRows[0].name;
    //     const tableName = categoryName.toLowerCase().replace(/\s+/g, '_');

    //     // 2. Delete rows from the associated child table (if exists)
    //     const [tables] = await db.query('SHOW TABLES LIKE ?', [tableName]);
    //     if (tables.length > 0) {
    //       await db.query(`DELETE FROM \`${tableName}\``); // 💥 delete rows first
    //       // await db.query(`DROP TABLE \`${tableName}\``);   // 🔥 now safe to drop
    //     }

    //     // 3. Delete the category itself
    //     await db.query('DELETE FROM categories WHERE id = ?', [id]);

    //     await db.query('COMMIT');
    //     res.json({ success: true });

    //   } catch (err) {
    //     await db.query('ROLLBACK');
    //     console.error('Error deleting category:', err);
    //     res.status(500).json({
    //       error: 'Failed to delete category',
    //       details: err.message
    //     });
    //   }
    // });
    app.delete('/api/categories/:id', async (req, res) => {
      const { id } = req.params;

      try {
        await db.query('START TRANSACTION');

        // 1. Get category name
        const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [id]);
        if (categoryRows.length === 0) {
          await db.query('ROLLBACK');
          return res.status(404).json({ error: 'Category not found' });
        }

        const categoryName = categoryRows[0].name;
        const categoryTableName = categoryName.toLowerCase().replace(/\s+/g, '_');

        // 2. Check if second-level table exists
        const [secondLevelTables] = await db.query('SHOW TABLES LIKE ?', [categoryTableName]);
        if (secondLevelTables.length > 0) {
          // 3. Get all items from second-level table to find third-level tables
          const [secondLevelItems] = await db.query(`SELECT name FROM \`${categoryTableName}\``);
          
          // 4. Delete all third-level tables first
          for (const item of secondLevelItems) {
            const thirdLevelTableName = item.name.toLowerCase().replace(/\s+/g, '_');
            
            // Check if third-level table exists
            const [thirdLevelTables] = await db.query('SHOW TABLES LIKE ?', [thirdLevelTableName]);
            if (thirdLevelTables.length > 0) {
              await db.query(`DROP TABLE \`${thirdLevelTableName}\``);
              console.log(`Dropped third-level table: ${thirdLevelTableName}`);
            }
          }

          // 5. Now delete all rows from second-level table and drop it
          await db.query(`DELETE FROM \`${categoryTableName}\``);
          await db.query(`DROP TABLE \`${categoryTableName}\``);
          console.log(`Dropped second-level table: ${categoryTableName}`);
        }

        // 6. Finally delete the category record
        await db.query('DELETE FROM categories WHERE id = ?', [id]);

        await db.query('COMMIT');
        res.json({ success: true });

      } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error deleting category:', err);
        res.status(500).json({
          error: 'Failed to delete category',
          details: err.message
        });
      }
    });


    // ====================== ITEMS In Category ENDPOINTS ======================
    // get the items in a category
    app.get('/api/categories/:id/items', async (req, res) => {
      const categoryId = req.params.id;
      try {
        // Step 1: Fetch the category name from the database
        const [rows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryName = rows[0].name;
        const tableName = categoryName.toLowerCase().replace(/\s+/g, '_');

        // Step 2: Validate table name
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
          return res.status(400).json({ error: 'Invalid table name derived from category' });
        }
        // Step 3: Query the dynamic table
        const [items] = await db.query(`SELECT * FROM \`${tableName}\``);
        res.json(items);
      } catch (err) {
        console.error('Error fetching category items:', err);
        res.status(500).json({ error: 'Failed to fetch items from category table', details: err.message });
      }
    });

    // Create a new item in a category
    app.post('/api/categories/:id/items', async (req, res) => {
      const input = req.body;
      const categoryId = req.params.id;

      if (!input.name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      try {
        const allowedFields = ['name', 'quantity', 'code'];
        const fields = Object.entries(input)
          .filter(([key]) => allowedFields.includes(key));
        fields.push(['parent_category_id', categoryId]); // Always include category ID

        const columns = fields.map(([key]) => `\`${key}\``).join(', ');
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map(([_, value]) => value);

        const [rows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryName = rows[0].name;
        const tableName = categoryName.toLowerCase().replace(/\s+/g, '_');

        const query = `
          INSERT INTO \`${tableName}\` (${columns})
          VALUES (${placeholders})
        `;

        const [result] = await db.query(query, values);

        res.status(201).json({
          id: result.insertId,
          ...input
        });

      } catch (err) {
        console.error('Error creating item:', err);
        res.status(500).json({
          error: 'Failed to create item',
          details: err.message
        });
      }
    });

    // // Update an item in a category
    // app.put('/api/categories/:id/items/:item_id', async (req, res) => {
    //   const { id, item_id } = req.params;
    //   const input = req.body;

    //   if (Object.keys(input).length === 0) {
    //     return res.status(400).json({ error: 'No fields to update' });
    //   }

    //   try {
    //     const allowedFields = ['name', 'quantity', 'code'];
    //     const fields = Object.entries(input)
    //       .filter(([key]) => allowedFields.includes(key));

    //     if (fields.length === 0) {
    //       return res.status(400).json({ error: 'No valid fields to update' });
    //     }

    //     const setClause = fields.map(([key]) => `\`${key}\` = ?`).join(', ');
    //     const values = fields.map(([_, value]) => value);
    //     values.push(item_id, id); // First item_id, then parent_category_id

    //     const [rows] = await db.query('SELECT name FROM categories WHERE id = ?', [id]);
    //     if (rows.length === 0) {
    //       return res.status(404).json({ error: 'Category not found' });
    //     }
    //     const categoryName = rows[0].name;
    //     const tableName = categoryName.toLowerCase().replace(/\s+/g, '_');

    //     const query = `
    //       UPDATE \`${tableName}\`
    //       SET ${setClause}
    //       WHERE id = ? AND parent_category_id = ?
    //     `;

    //     const [result] = await db.query(query, values);

    //     if (result.affectedRows === 0) {
    //       return res.status(404).json({ error: 'Item not found or no changes made' });
    //     }

    //     res.json({ success: true });

    //   } catch (err) {
    //     console.error('Error updating item:', err);
    //     res.status(500).json({ error: 'Failed to update item' });
    //   }
    // });
    app.put('/api/categories/:id/items/:item_id', async (req, res) => {
      const { id, item_id } = req.params;
      const input = req.body;

      if (Object.keys(input).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      try {
        await db.beginTransaction(); // Start transaction

        const allowedFields = ['name', 'quantity', 'code'];
        const fields = Object.entries(input)
          .filter(([key]) => allowedFields.includes(key));

        if (fields.length === 0) {
          await db.rollback();
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Get current item data before update
        const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [id]);
        if (categoryRows.length === 0) {
          await db.rollback();
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryName = categoryRows[0].name;
        const tableName = categoryName.toLowerCase().replace(/\s+/g, '_');

        // Get current item name (if exists) for potential table rename
        let oldTableName = null;
        if (input.name) {
          const [itemRows] = await db.query(`SELECT name FROM \`${tableName}\` WHERE id = ?`, [item_id]);
          if (itemRows.length > 0) {
            oldTableName = itemRows[0].name.toLowerCase().replace(/\s+/g, '_');
          }
        }

        // Prepare and execute the update
        const setClause = fields.map(([key]) => `\`${key}\` = ?`).join(', ');
        const values = fields.map(([_, value]) => value);
        values.push(item_id, id);

        const query = `
          UPDATE \`${tableName}\`
          SET ${setClause}
          WHERE id = ? AND parent_category_id = ?
        `;

        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
          await db.rollback();
          return res.status(404).json({ error: 'Item not found or no changes made' });
        }

        // Handle table rename if name was changed and old table exists
        if (input.name && oldTableName) {
          const newTableName = input.name.toLowerCase().replace(/\s+/g, '_');
          
          // Check if old table exists
          const [tables] = await db.query('SHOW TABLES LIKE ?', [oldTableName]);
          if (tables.length > 0 && oldTableName !== newTableName) {
            // Check if new table name already exists
            const [existingTables] = await db.query('SHOW TABLES LIKE ?', [newTableName]);
            if (existingTables.length === 0) {
              await db.query(`RENAME TABLE \`${oldTableName}\` TO \`${newTableName}\``);
            } else {
              // Handle case where new table name already exists (merge or skip)
              // For now, we'll skip the rename to avoid conflicts
              console.warn(`Table ${newTableName} already exists, skipping rename`);
            }
          }
        }

        await db.commit(); // Commit transaction
        res.json({ success: true });

      } catch (err) {
        await db.rollback();
        console.error('Error updating item:', err);
        res.status(500).json({ error: 'Failed to update item', details: err.message });
      }
    });

    // Delete an item in a category
    app.delete('/api/categories/:id/items/:item_id', async (req, res) => {
      const { id, item_id } = req.params;
      try {
        await db.beginTransaction();

        // Step 1: Get category name
        const [categoryRows] = await db.query('SELECT name, quantity FROM categories WHERE id = ?', [id]);
        if (categoryRows.length === 0) {
          await db.rollback();
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryName = categoryRows[0].name;
        const tableName = categoryName.toLowerCase().replace(/\s+/g, '_');
        
        // Validate table name to avoid SQL injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
          await db.rollback();
          throw new Error('Invalid table name derived from category');
        }

        // Step 2: Get item's name and quantity from the dynamic table
        const [itemRows] = await db.query(`SELECT name, quantity FROM \`${tableName}\` WHERE id = ?`, [item_id]);
        if (itemRows.length === 0) {
          await db.rollback();
          return res.status(404).json({ error: 'Item not found in the category table' });
        }
        
        const itemName = itemRows[0].name;
        const itemQuantity = itemRows[0].quantity || 0;
        const thirdLevelTableName = itemName.toLowerCase().replace(/\s+/g, '_');

        // Step 3: Check if third-level table exists and drop it
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(thirdLevelTableName)) {
          const [tables] = await db.query('SHOW TABLES LIKE ?', [thirdLevelTableName]);
          if (tables.length > 0) {
            await db.query(`DROP TABLE \`${thirdLevelTableName}\``);
            console.log(`Dropped third-level table: ${thirdLevelTableName}`);
          }
        }

        // Step 4: Deduct the item's quantity from categories table
        await db.query(`UPDATE categories SET quantity = GREATEST(quantity - ?, 0) WHERE id = ?`, [itemQuantity, id]);
        
        // Step 5: Delete the item from the second-level table
        await db.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [item_id]);

        await db.commit();
        res.json({ success: true });

      } catch (err) {
        await db.rollback();
        console.error('Error deleting item in a category:', err);
        res.status(500).json({ 
          error: 'Failed to delete item in a category', 
          details: err.message 
        });
      }
    });


    // ====================== CHILD ITEMS ENDPOINTS ======================
    
    // Get all child items for a given parent item
    app.get('/api/categories/:id/items/:item_id/children', async (req, res) => {
      const { id: categoryId, item_id: parentItemId } = req.params;

      try {
        // Step 1: Get category table
        const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (categoryRows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryTable = categoryRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Step 2: Get parent item name to determine child table
        const [parentRows] = await db.query(`SELECT name FROM \`${categoryTable}\` WHERE id = ?`, [parentItemId]);
        if (parentRows.length === 0) {
          return res.status(404).json({ error: 'Parent item not found in category table' });
        }
        const childTable = parentRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Validate table names
        if (![categoryTable, childTable].every(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))) {
          throw new Error('Invalid table name');
        }

        // Step 3: Fetch children
        const createChildTableQuery = `
          CREATE TABLE IF NOT EXISTS \`${childTable}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_id INT NOT NULL,
            code VARCHAR(255) NOT NULL,
            model VARCHAR(255),
            cost DECIMAL(10, 2) DEFAULT 0.00,
            issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            assigned_to VARCHAR(255),
            is_broken BOOLEAN DEFAULT 0,
            additional_detail VARCHAR(255),
            FOREIGN KEY (parent_id) REFERENCES \`${categoryTable}\`(id)
              ON DELETE CASCADE ON UPDATE CASCADE
          )
        `;
        await db.query(createChildTableQuery);
        const [children] = await db.query(`SELECT * FROM \`${childTable}\` WHERE parent_id = ?`, [parentItemId]);

        res.json({ parent_id: parentItemId, child_table: childTable, items: children });

      } catch (err) {
        console.error('Error fetching child items:', err);
        res.status(500).json({ error: 'Failed to fetch child items', details: err.message });
      }
    });


    // Create a new child item
    app.post('/api/categories/:id/items/:item_id/children', async (req, res) => {
      const { id: categoryId, item_id: parentItemId } = req.params;
      const input = req.body;
      try {
        await db.beginTransaction();

        // Step 1: Get category name (e.g., "IT Equipments") → it_equipments
        const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (categoryRows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryTable = categoryRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Step 2: Get parent item name (e.g., "PC") from it_equipments
        const [parentRows] = await db.query(`SELECT name FROM \`${categoryTable}\` WHERE id = ?`, [parentItemId]);
        if (parentRows.length === 0) {
          return res.status(404).json({ error: 'Parent item not found in category table' });
        }
        const childTable = parentRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Validate table name (very important)
        if (![categoryTable, childTable].every(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))) {
          throw new Error('Invalid table name');
        }

        // Step 3: Create child table if not exists
        const createChildTableQuery = `
          CREATE TABLE IF NOT EXISTS \`${childTable}\` (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_id INT NOT NULL,
            code VARCHAR(255) NOT NULL,
            model VARCHAR(255),
            cost DECIMAL(10, 2) DEFAULT 0.00,
            issue_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
            assigned_to VARCHAR(255),
            is_broken BOOLEAN DEFAULT 0,
            additional_detail VARCHAR(255),
            FOREIGN KEY (parent_id) REFERENCES \`${categoryTable}\`(id)
              ON DELETE CASCADE ON UPDATE CASCADE
          )
        `;
        await db.query(createChildTableQuery);

        // Step 4: Insert the child item
        const allowedFields = ['code', 'model', 'cost', 'assigned_to', 'is_broken', 'additional_detail'];
        const fields = Object.entries(input)
          .filter(([key]) => allowedFields.includes(key));

        // Always include the parent reference
        fields.unshift(['parent_id', parentItemId]);

        const columns = fields.map(([key]) => `\`${key}\``).join(', ');
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map(([_, value]) => value);

        const insertQuery = `
          INSERT INTO \`${childTable}\` (${columns})
          VALUES (${placeholders})
        `;

        const [insertResult] = await db.query(insertQuery, values);
        // Step 5: Increment quantity in parent table and categories table
        await db.query(`UPDATE \`${categoryTable}\` SET quantity = quantity + 1 WHERE id = ?`, [parentItemId]);
        await db.query(`UPDATE categories SET quantity = quantity + 1 WHERE id = ?`, [categoryId]);

        await db.commit();

        res.status(201).json({
          id: insertResult.insertId,
          child_table: childTable,
          parent_table: categoryTable,
          ...input
        });

      } catch (err) {
        await db.rollback();
        console.error('Error creating child item:', err);
        res.status(500).json({
          error: 'Failed to create child item',
          details: err.message
        });
      }
    });

    // Update a child item
    app.put('/api/categories/:id/items/:item_id/children/:child_id', async (req, res) => {
      const { id: categoryId, item_id: parentItemId, child_id } = req.params;
      const input = req.body;

      try {
        // Step 1: Get category table
        const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (categoryRows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryTable = categoryRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Step 2: Get parent item name → child table
        const [parentRows] = await db.query(`SELECT name FROM \`${categoryTable}\` WHERE id = ?`, [parentItemId]);
        if (parentRows.length === 0) {
          return res.status(404).json({ error: 'Parent item not found in category table' });
        }
        const childTable = parentRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Validate table names
        if (![categoryTable, childTable].every(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))) {
          throw new Error('Invalid table name');
        }

        // Step 3: Prepare update
        const allowedFields = ['code', 'model', 'cost', 'assigned_to', 'is_broken', 'additional_detail'];
        const fields = Object.entries(input)
          .filter(([key]) => allowedFields.includes(key));

        if (fields.length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        const setClause = fields.map(([key]) => `\`${key}\` = ?`).join(', ');
        const values = fields.map(([_, value]) => value);

        const updateQuery = `
          UPDATE \`${childTable}\`
          SET ${setClause}
          WHERE id = ? AND parent_id = ?
        `;

        const [result] = await db.query(updateQuery, [...values, child_id, parentItemId]);

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Child item not found or not updated' });
        }

        res.json({ success: true, updated_fields: fields.map(([key]) => key) });

      } catch (err) {
        console.error('Error updating child item:', err);
        res.status(500).json({ error: 'Failed to update child item', details: err.message });
      }
    });

    // Delete a child item
    app.delete('/api/categories/:id/items/:item_id/children/:child_id', async (req, res) => {
      const { id: categoryId, item_id: parentItemId, child_id } = req.params;
      try {
        await db.beginTransaction();
        // Step 1: Get category table name
        const [categoryRows] = await db.query('SELECT name FROM categories WHERE id = ?', [categoryId]);
        if (categoryRows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }
        const categoryTable = categoryRows[0].name.toLowerCase().replace(/\s+/g, '_');

        // Step 2: Get parent item name → child table
        const [parentRows] = await db.query(`SELECT name FROM \`${categoryTable}\` WHERE id = ?`, [parentItemId]);
        if (parentRows.length === 0) {
          return res.status(404).json({ error: 'Parent item not found in category table' });
        }
        const childTable = parentRows[0].name.toLowerCase().replace(/\s+/g, '_');
        // Validate table names
        if (![categoryTable, childTable].every(name => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))) {
          throw new Error('Invalid table name');
        }

        // Step 3: Delete the child item
        const [result] = await db.query(
          `DELETE FROM \`${childTable}\` WHERE id = ? AND parent_id = ?`,
          [child_id, parentItemId]
        );
        if (result.affectedRows === 0) {
          await db.rollback();
          return res.status(404).json({ error: 'Child item not found or already deleted' });
        }
        // Step 4: Decrement quantity in parent table and categories table
        await db.query(`UPDATE \`${categoryTable}\` SET quantity = GREATEST(quantity - 1, 0) WHERE id = ?`, [parentItemId]);
        await db.query(`UPDATE categories SET quantity = GREATEST(quantity - 1, 0) WHERE id = ?`, [categoryId]);

        await db.commit();
        res.json({ success: true, deleted_child_id: child_id });
        
      } catch (err) {
        await db.rollback();
        console.error('Error deleting child item:', err);
        res.status(500).json({
          error: 'Failed to delete child item',
          details: err.message
        });
      }
    });

    // ====================== EXPORT DATABASE ENDPOINT ======================
    app.get('/api/export/database', async (req, res) => {
      try {
        const workbook = new ExcelJS.Workbook();

        // 1. Export categories table
        const [categories] = await db.query('SELECT * FROM categories');
        const categoriesWorksheet = workbook.addWorksheet('Categories');

        // Add headers for categories
        categoriesWorksheet.columns = [
          { header: 'ID', key: 'id', width: 10 },
          { header: 'Name', key: 'name', width: 20 },
          { header: 'Quantity', key: 'quantity', width: 15 }
        ];

        // Add data for categories
        categories.forEach(category => {
          categoriesWorksheet.addRow({
            id: category.id,
            name: category.name,
            quantity: category.quantity
          });
        });

        // Style categories headers
        categoriesWorksheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 2. Export each category's items table
        for (const category of categories) {
          const categoryTableName = category.name.toLowerCase().replace(/\s+/g, '_');

          try {
            // Check if table exists
            const [tableExists] = await db.query(`
              SELECT COUNT(*) as count 
              FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = '${categoryTableName}'
            `);

            if (tableExists[0].count > 0) {
              const [categoryItems] = await db.query(`SELECT * FROM \`${categoryTableName}\``);

              if (categoryItems.length > 0) {
                // Create worksheet for this category
                const worksheet = workbook.addWorksheet(category.name);

                // Add headers
                worksheet.columns = [
                  { header: 'ID', key: 'id', width: 10 },
                  { header: 'Parent Category ID', key: 'parent_category_id', width: 20 },
                  { header: 'Name', key: 'name', width: 20 },
                  { header: 'Code', key: 'code', width: 15 },
                  { header: 'Quantity', key: 'quantity', width: 15 }
                ];

                // Add data
                categoryItems.forEach(item => {
                  worksheet.addRow({
                    id: item.id,
                    parent_category_id: item.parent_category_id,
                    name: item.name,
                    code: item.code,
                    quantity: item.quantity
                  });
                });

                // Style headers
                worksheet.getRow(1).eachCell((cell) => {
                  cell.font = { bold: true };
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
                  cell.alignment = { vertical: 'middle', horizontal: 'center' };
                });

                // 3. Export each item's child table
                for (const item of categoryItems) {
                  const itemTableName = item.name.toLowerCase().replace(/\s+/g, '_');

                  try {
                    const [childTableExists] = await db.query(`
                      SELECT COUNT(*) as count 
                      FROM information_schema.tables 
                      WHERE table_schema = DATABASE() 
                      AND table_name = '${itemTableName}'
                    `);

                    if (childTableExists[0].count > 0) {
                      const [childItems] = await db.query(`SELECT * FROM \`${itemTableName}\``);

                      if (childItems.length > 0) {
                        const childWorksheet = workbook.addWorksheet(`${category.name} - ${item.name}`);

                        // Add headers
                        childWorksheet.columns = [
                          { header: 'ID', key: 'id', width: 10 },
                          { header: 'Parent ID', key: 'parent_id', width: 15 },
                          { header: 'Code', key: 'code', width: 15 },
                          { header: 'Model', key: 'model', width: 20 },
                          { header: 'Cost', key: 'cost', width: 15 },
                          { header: 'Is Broken', key: 'is_broken', width: 15 },
                          { header: 'Issue Date', key: 'issue_date', width: 20 },
                          { header: 'Additional Detail', key: 'additional_detail', width: 30 }
                        ];

                        // Add data
                        childItems.forEach(child => {
                          childWorksheet.addRow({
                            id: child.id,
                            parent_id: child.parent_id,
                            code: child.code,
                            model: child.model,
                            cost: child.cost,
                            is_broken: child.is_broken ? 'Yes' : 'No',
                            issue_date: child.issue_date ? new Date(child.issue_date).toLocaleDateString() : '',
                            additional_detail: child.additional_detail
                          });
                        });

                        // Style headers
                        childWorksheet.getRow(1).eachCell((cell) => {
                          cell.font = { bold: true };
                          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
                          cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        });
                      }
                    }
                  } catch (err) {
                    console.error(`Error exporting child table ${itemTableName}:`, err);
                  }
                }
              }
            }
          } catch (err) {
            console.error(`Error exporting category table ${categoryTableName}:`, err);
          }
        }

        // Finalize and send Excel file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=database_export.xlsx');

        await workbook.xlsx.write(res);
        res.end();

      } catch (err) {
        console.error('Error exporting database:', err);
        res.status(500).json({ error: 'Failed to export database' });
      }
    });


    const PORT = 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });