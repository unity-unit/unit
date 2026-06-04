const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db, init } = require('./db');

init();

const app = express();
const PORT = 4000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'vrs-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM Users WHERE username = ? AND password = ?', [username, password], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ user: req.session.user });
  });
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  db.run('INSERT INTO Users (username, password, role) VALUES (?, ?, ?)', [username, password, 'user'], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
      return res.status(500).json({ error: 'Database error' });
    }
    req.session.user = { id: this.lastID, username, role: 'user' };
    res.json({ user: req.session.user });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

app.get('/api/me', (req, res) => {
  if (req.session?.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/api/customers', requireAuth, (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : '%';
  db.all(`SELECT * FROM Customer WHERE full_name LIKE ? OR national_id LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ? ORDER BY id DESC`, [search, search, search, search, search], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/customers', requireAuth, (req, res) => {
  const { full_name, national_id, phone, email, address } = req.body;
  db.run(`INSERT INTO Customer (full_name, national_id, phone, email, address) VALUES (?, ?, ?, ?, ?)`, [full_name, national_id, phone, email, address], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/customers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { full_name, national_id, phone, email, address } = req.body;
  db.run(`UPDATE Customer SET full_name = ?, national_id = ?, phone = ?, email = ?, address = ? WHERE id = ?`, [full_name, national_id, phone, email, address, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/customers/:id', requireAuth, (req, res) => {
  db.run(`DELETE FROM Customer WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/vehicles', requireAuth, (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : '%';
  db.all(`SELECT * FROM Vehicle WHERE plate_number LIKE ? OR brand LIKE ? OR model LIKE ? OR vehicle_type LIKE ? OR status LIKE ? ORDER BY id DESC`, [search, search, search, search, search], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/vehicles', requireAuth, (req, res) => {
  const { plate_number, brand, model, year, vehicle_type, purchase_price, status, rental_date, return_date } = req.body;
  db.run(`INSERT INTO Vehicle (plate_number, brand, model, year, vehicle_type, purchase_price, status, rental_date, return_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [plate_number, brand, model, year, vehicle_type, purchase_price, status, rental_date, return_date], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/api/vehicles/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { plate_number, brand, model, year, vehicle_type, purchase_price, status, rental_date, return_date } = req.body;
  db.run(`UPDATE Vehicle SET plate_number = ?, brand = ?, model = ?, year = ?, vehicle_type = ?, purchase_price = ?, status = ?, rental_date = ?, return_date = ? WHERE id = ?`, [plate_number, brand, model, year, vehicle_type, purchase_price, status, rental_date, return_date, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.delete('/api/vehicles/:id', requireAuth, (req, res) => {
  db.run(`DELETE FROM Vehicle WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/reservations', requireAuth, (req, res) => {
  const search = req.query.search ? `%${req.query.search}%` : '%';
  db.all(`SELECT rr.*, c.full_name AS customer_name, c.national_id AS customer_national_id, v.plate_number AS vehicle_plate, v.brand AS vehicle_brand, v.model AS vehicle_model
    FROM Reservation_Rental rr
    LEFT JOIN Customer c ON rr.customer_id = c.id
    LEFT JOIN Vehicle v ON rr.vehicle_id = v.id
    WHERE c.full_name LIKE ? OR c.national_id LIKE ? OR v.plate_number LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR rr.reservation_status LIKE ? OR rr.rental_status LIKE ?
    ORDER BY rr.id DESC`, [search, search, search, search, search, search, search], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/api/reservations', requireAuth, (req, res) => {
  const { customer_id, vehicle_id, reservation_date, start_date, end_date, reservation_status, rental_fee, rental_status } = req.body;
  const user_id = req.session.user.id;
  db.run(`INSERT INTO Reservation_Rental (customer_id, vehicle_id, user_id, reservation_date, start_date, end_date, reservation_status, rental_fee, rental_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [customer_id, vehicle_id, user_id, reservation_date, start_date, end_date, reservation_status, rental_fee, rental_status], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`UPDATE Vehicle SET status = ?, rental_date = ?, return_date = ? WHERE id = ?`, [rental_status === 'Rented' ? 'Rented' : 'Available', start_date, end_date, vehicle_id]);
    res.json({ id: this.lastID });
  });
});

app.put('/api/reservations/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { customer_id, vehicle_id, reservation_date, start_date, end_date, reservation_status, rental_fee, rental_status } = req.body;
  db.run(`UPDATE Reservation_Rental SET customer_id = ?, vehicle_id = ?, reservation_date = ?, start_date = ?, end_date = ?, reservation_status = ?, rental_fee = ?, rental_status = ? WHERE id = ?`, [customer_id, vehicle_id, reservation_date, start_date, end_date, reservation_status, rental_fee, rental_status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.run(`UPDATE Vehicle SET status = ?, rental_date = ?, return_date = ? WHERE id = ?`, [rental_status === 'Rented' ? 'Rented' : 'Available', start_date, end_date, vehicle_id]);
    res.json({ changes: this.changes });
  });
});

app.delete('/api/reservations/:id', requireAuth, (req, res) => {
  db.run(`DELETE FROM Reservation_Rental WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/api/report', requireAuth, (req, res) => {
  db.all(`SELECT c.full_name AS customer_full_name, c.national_id AS customer_national_id, c.phone AS customer_phone,
    v.plate_number AS vehicle_plate_number, v.brand AS vehicle_brand, v.model AS vehicle_model, v.year AS vehicle_year, v.vehicle_type AS vehicle_type,
    rr.reservation_date, rr.start_date AS rental_start, rr.end_date AS rental_end, rr.reservation_status, v.rental_date, v.return_date, rr.rental_fee, rr.rental_status
    FROM Reservation_Rental rr
    LEFT JOIN Customer c ON rr.customer_id = c.id
    LEFT JOIN Vehicle v ON rr.vehicle_id = v.id
    ORDER BY rr.id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`VRS backend listening on http://localhost:${PORT}`);
});
