const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'favourites.db');
console.log('Database will be created at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
    
    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT UNIQUE NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('❌ Error creating table:', err.message);
      } else {
        console.log('✅ Favorites table ready');
      }
    });
  }
});

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Weather App Backend is running!',
    endpoints: [
      'GET /api/health',
      'GET /api/favorites',
      'POST /api/favorites',
      'DELETE /api/favorites/:id'
    ]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  console.log('📊 Health check requested');
  res.json({ 
    success: true, 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// Get all favorites
app.get('/api/favorites', (req, res) => {
  console.log('📋 Get all favorites requested');
  
  const sql = 'SELECT * FROM favorites ORDER BY added_at DESC';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch favorites' 
      });
    } else {
      console.log(`✅ Found ${rows.length} favorites`);
      res.json({ 
        success: true, 
        favorites: rows,
        count: rows.length 
      });
    }
  });
});

// Add a city to favorites
app.post('/api/favorites', (req, res) => {
  console.log('➕ Add favorite requested:', req.body);
  
  const { city } = req.body;
  
  // Validation
  if (!city || typeof city !== 'string' || city.trim() === '') {
    console.log('❌ Invalid city name provided');
    return res.status(400).json({ 
      success: false, 
      error: 'City name is required and must be a valid string' 
    });
  }

  const cityName = city.trim();
  const sql = 'INSERT INTO favorites (city) VALUES (?)';
  
  db.run(sql, [cityName], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        console.log('⚠️  City already exists:', cityName);
        res.status(409).json({ 
          success: false, 
          error: 'City is already in favorites',
          message: `${cityName} is already in your favorites!` 
        });
      } else {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to add city to favorites' 
        });
      }
    } else {
      console.log(`✅ Added ${cityName} with ID: ${this.lastID}`);
      res.status(201).json({ 
        success: true, 
        message: `${cityName} added to favorites!`,
        id: this.lastID,
        city: cityName
      });
    }
  });
});

// Remove favorite by ID
app.delete('/api/favorites/:id', (req, res) => {
  const { id } = req.params;
  console.log('🗑️  Delete favorite requested for ID:', id);
  
  if (!id || isNaN(id)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Valid favorite ID is required' 
    });
  }

  const sql = 'DELETE FROM favorites WHERE id = ?';
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('❌ Database error:', err.message);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to remove favorite' 
      });
    } else if (this.changes === 0) {
      console.log('⚠️  Favorite not found with ID:', id);
      res.status(404).json({ 
        success: false, 
        error: 'Favorite not found' 
      });
    } else {
      console.log(`✅ Removed favorite with ID: ${id}`);
      res.json({ 
        success: true, 
        message: 'Favorite removed successfully' 
      });
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌤️  Weather App Server running on http://localhost:${PORT}`);
  console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Available Endpoints:`);
  console.log(`   GET    http://localhost:${PORT}/api/health`);
  console.log(`   GET    http://localhost:${PORT}/api/favorites`);
  console.log(`   POST   http://localhost:${PORT}/api/favorites`);
  console.log(`   DELETE http://localhost:${PORT}/api/favorites/:id`);
  console.log(`\n💡 Ready for Postman testing!\n`);
});