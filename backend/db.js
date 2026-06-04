const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'vrs.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to VRS SQLite database');
  }
});

const init = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT,
      national_id TEXT UNIQUE,
      phone TEXT,
      email TEXT,
      address TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Vehicle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT UNIQUE,
      brand TEXT,
      model TEXT,
      year INTEGER,
      vehicle_type TEXT,
      purchase_price REAL,
      status TEXT,
      rental_date TEXT,
      return_date TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Reservation_Rental (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      vehicle_id INTEGER,
      user_id INTEGER,
      reservation_date TEXT,
      start_date TEXT,
      end_date TEXT,
      reservation_status TEXT,
      rental_fee REAL,
      rental_status TEXT,
      FOREIGN KEY(customer_id) REFERENCES Customer(id),
      FOREIGN KEY(vehicle_id) REFERENCES Vehicle(id),
      FOREIGN KEY(user_id) REFERENCES Users(id)
    )`);

    db.get(`SELECT COUNT(*) AS count FROM Users`, (err, row) => {
      if (!err && row.count === 0) {
        db.run(`INSERT INTO Users (username, password, role) VALUES (?, ?, ?)`, ['admin', 'admin123', 'admin']);
      }
    });
  });
};

module.exports = { db, init };
