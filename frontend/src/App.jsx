import { useEffect, useState } from 'react';

const API = 'http://localhost:4000/api';

const defaultForm = { full_name: '', national_id: '', phone: '', email: '', address: '' };
const defaultVehicle = { plate_number: '', brand: '', model: '', year: '', vehicle_type: '', purchase_price: '', status: 'Available', rental_date: '', return_date: '' };
const defaultReservation = { customer_id: '', vehicle_id: '', reservation_date: '', start_date: '', end_date: '', reservation_status: 'Pending', rental_fee: '', rental_status: 'Reserved' };

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [report, setReport] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);
  const [vehicleForm, setVehicleForm] = useState(defaultVehicle);
  const [reservationForm, setReservationForm] = useState(defaultReservation);
  const [editing, setEditing] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', confirmPassword: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.error || 'Server error');
    }
    return res.json();
  };

  const loadUser = async () => {
    try {
      const data = await fetchJson(`${API}/me`);
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  const loadAll = async () => {
    if (!user) return;
    const [customerData, vehicleData, reservationData, reportData] = await Promise.all([
      fetchJson(`${API}/customers?search=${encodeURIComponent(search)}`),
      fetchJson(`${API}/vehicles?search=${encodeURIComponent(search)}`),
      fetchJson(`${API}/reservations?search=${encodeURIComponent(search)}`),
      fetchJson(`${API}/report`)
    ]);
    setCustomers(customerData);
    setVehicles(vehicleData);
    setReservations(reservationData);
    setReport(reportData);
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) loadAll();
  }, [user, search]);

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const data = await fetchJson(`${API}/login`, { method: 'POST', body: JSON.stringify(loginData) });
      setUser(data.user);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const payload = { username: registerData.username, password: registerData.password };
      const data = await fetchJson(`${API}/register`, { method: 'POST', body: JSON.stringify(payload) });
      setUser(data.user);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleRegister = () => {
    setError('');
    setLoginData({ username: '', password: '' });
    setRegisterData({ username: '', password: '', confirmPassword: '' });
    setIsRegistering((prev) => !prev);
  };

  const handleLogout = async () => {
    await fetchJson(`${API}/logout`, { method: 'POST' });
    setUser(null);
  };

  const saveCustomer = async () => {
    const payload = { ...form };
    if (editing) {
      await fetchJson(`${API}/customers/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson(`${API}/customers`, { method: 'POST', body: JSON.stringify(payload) });
    }
    setForm(defaultForm);
    setEditing(null);
    await loadAll();
  };

  const saveVehicle = async () => {
    const payload = { ...vehicleForm, year: Number(vehicleForm.year), purchase_price: Number(vehicleForm.purchase_price) };
    if (editingVehicle) {
      await fetchJson(`${API}/vehicles/${editingVehicle.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson(`${API}/vehicles`, { method: 'POST', body: JSON.stringify(payload) });
    }
    setVehicleForm(defaultVehicle);
    setEditingVehicle(null);
    await loadAll();
  };

  const saveReservation = async () => {
    const payload = { ...reservationForm, rental_fee: Number(reservationForm.rental_fee) };
    if (editingReservation) {
      await fetchJson(`${API}/reservations/${editingReservation.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson(`${API}/reservations`, { method: 'POST', body: JSON.stringify(payload) });
    }
    setReservationForm(defaultReservation);
    setEditingReservation(null);
    await loadAll();
  };

  const removeItem = async (type, id) => {
    if (!confirm('Delete this record?')) return;
    await fetchJson(`${API}/${type}/${id}`, { method: 'DELETE' });
    await loadAll();
  };

  const loadEdit = (item, type) => {
    if (type === 'customer') {
      setForm(item);
      setEditing(item);
    }
    if (type === 'vehicle') {
      setVehicleForm(item);
      setEditingVehicle(item);
    }
    if (type === 'reservation') {
      setReservationForm(item);
      setEditingReservation(item);
    }
  };

  if (!user) {
    return (
      <div className="page login-page">
        <div className="card">
          <h1>{isRegistering ? 'SwiftWheels VRS Register' : 'SwiftWheels VRS Login'}</h1>
          <form onSubmit={isRegistering ? handleRegister : handleLogin}>
            <label>Username</label>
            <input
              value={isRegistering ? registerData.username : loginData.username}
              onChange={(e) => isRegistering ? setRegisterData({ ...registerData, username: e.target.value }) : setLoginData({ ...loginData, username: e.target.value })}
            />
            <label>Password</label>
            <input
              type="password"
              value={isRegistering ? registerData.password : loginData.password}
              onChange={(e) => isRegistering ? setRegisterData({ ...registerData, password: e.target.value }) : setLoginData({ ...loginData, password: e.target.value })}
            />
            {isRegistering && (
              <>
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                />
              </>
            )}
            <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
            {error && <div className="error">{error}</div>}
          </form>
          <button className="secondary" onClick={toggleRegister}>
            {isRegistering ? 'Back to Login' : 'Create an account'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header>
        <div>
          <h1>SwiftWheels VRS</h1>
          <p>Logged in as {user.username}</p>
        </div>
        <div className="nav-menu">
          <button className={page === 'customers' ? 'active' : ''} onClick={() => setPage('customers')}>Customers</button>
          <button className={page === 'vehicles' ? 'active' : ''} onClick={() => setPage('vehicles')}>Vehicles</button>
          <button className={page === 'reservations' ? 'active' : ''} onClick={() => setPage('reservations')}>Reservations</button>
          <button className={page === 'report' ? 'active' : ''} onClick={() => setPage('report')}>Report</button>
          <button className="logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <section className="content">
        <div className="toolbar">
          <input placeholder="Search all records..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <span>{page.toUpperCase()}</span>
        </div>

        {page === 'customers' && (
          <div className="grid">
            <div className="card form-card">
              <h2>{editing ? 'Edit Customer' : 'New Customer'}</h2>
              <label>Full Name</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <label>National ID</label>
              <input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <label>Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <button onClick={saveCustomer}>{editing ? 'Update' : 'Create'}</button>
              {(editing || form.full_name !== '') && <button className="secondary" onClick={() => { setForm(defaultForm); setEditing(null); }}>Clear</button>}
            </div>
            <div className="card table-card">
              <h2>Customer Records</h2>
              <table>
                <thead>
                  <tr><th>Name</th><th>ID</th><th>Phone</th><th>Email</th><th>Address</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.full_name}</td>
                      <td>{customer.national_id}</td>
                      <td>{customer.phone}</td>
                      <td>{customer.email}</td>
                      <td>{customer.address}</td>
                      <td>
                        <button onClick={() => loadEdit(customer, 'customer')}>Edit</button>
                        <button className="danger" onClick={() => removeItem('customers', customer.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {page === 'vehicles' && (
          <div className="grid">
            <div className="card form-card">
              <h2>{editingVehicle ? 'Edit Vehicle' : 'New Vehicle'}</h2>
              <label>Plate Number</label>
              <input value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} />
              <label>Brand</label>
              <input value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} />
              <label>Model</label>
              <input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} />
              <label>Year</label>
              <input type="number" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} />
              <label>Type</label>
              <input value={vehicleForm.vehicle_type} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })} />
              <label>Purchase Price</label>
              <input type="number" value={vehicleForm.purchase_price} onChange={(e) => setVehicleForm({ ...vehicleForm, purchase_price: e.target.value })} />
              <label>Status</label>
              <select value={vehicleForm.status} onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })}>
                <option>Available</option>
                <option>Reserved</option>
                <option>Rented</option>
                <option>Maintenance</option>
              </select>
              <label>Rental Date</label>
              <input type="date" value={vehicleForm.rental_date || ''} onChange={(e) => setVehicleForm({ ...vehicleForm, rental_date: e.target.value })} />
              <label>Return Date</label>
              <input type="date" value={vehicleForm.return_date || ''} onChange={(e) => setVehicleForm({ ...vehicleForm, return_date: e.target.value })} />
              <button onClick={saveVehicle}>{editingVehicle ? 'Update' : 'Create'}</button>
              {(editingVehicle || vehicleForm.plate_number !== '') && <button className="secondary" onClick={() => { setVehicleForm(defaultVehicle); setEditingVehicle(null); }}>Clear</button>}
            </div>
            <div className="card table-card">
              <h2>Vehicle Records</h2>
              <table>
                <thead>
                  <tr><th>Plate</th><th>Brand</th><th>Model</th><th>Year</th><th>Type</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>{vehicle.plate_number}</td>
                      <td>{vehicle.brand}</td>
                      <td>{vehicle.model}</td>
                      <td>{vehicle.year}</td>
                      <td>{vehicle.vehicle_type}</td>
                      <td>{vehicle.status}</td>
                      <td>
                        <button onClick={() => loadEdit(vehicle, 'vehicle')}>Edit</button>
                        <button className="danger" onClick={() => removeItem('vehicles', vehicle.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {page === 'reservations' && (
          <div className="grid">
            <div className="card form-card">
              <h2>{editingReservation ? 'Edit Reservation' : 'New Reservation'}</h2>
              <label>Customer</label>
              <select value={reservationForm.customer_id} onChange={(e) => setReservationForm({ ...reservationForm, customer_id: e.target.value })}>
                <option value="">Select a customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.national_id})</option>)}
              </select>
              <label>Vehicle</label>
              <select value={reservationForm.vehicle_id} onChange={(e) => setReservationForm({ ...reservationForm, vehicle_id: e.target.value })}>
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number} - {v.brand} {v.model}</option>)}
              </select>
              <label>Reservation Date</label>
              <input type="date" value={reservationForm.reservation_date} onChange={(e) => setReservationForm({ ...reservationForm, reservation_date: e.target.value })} />
              <label>Start Date</label>
              <input type="date" value={reservationForm.start_date} onChange={(e) => setReservationForm({ ...reservationForm, start_date: e.target.value })} />
              <label>End Date</label>
              <input type="date" value={reservationForm.end_date} onChange={(e) => setReservationForm({ ...reservationForm, end_date: e.target.value })} />
              <label>Reservation Status</label>
              <select value={reservationForm.reservation_status} onChange={(e) => setReservationForm({ ...reservationForm, reservation_status: e.target.value })}>
                <option>Pending</option>
                <option>Confirmed</option>
                <option>Cancelled</option>
              </select>
              <label>Rental Fee</label>
              <input type="number" value={reservationForm.rental_fee} onChange={(e) => setReservationForm({ ...reservationForm, rental_fee: e.target.value })} />
              <label>Rental Status</label>
              <select value={reservationForm.rental_status} onChange={(e) => setReservationForm({ ...reservationForm, rental_status: e.target.value })}>
                <option>Reserved</option>
                <option>Rented</option>
                <option>Returned</option>
              </select>
              <button onClick={saveReservation}>{editingReservation ? 'Update' : 'Create'}</button>
              {(editingReservation || reservationForm.reservation_date !== '') && <button className="secondary" onClick={() => { setReservationForm(defaultReservation); setEditingReservation(null); }}>Clear</button>}
            </div>
            <div className="card table-card">
              <h2>Reservations</h2>
              <table>
                <thead>
                  <tr><th>Customer</th><th>Vehicle</th><th>Reserve</th><th>Start</th><th>End</th><th>Status</th><th>Fee</th><th>Rental</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {reservations.map((resv) => (
                    <tr key={resv.id}>
                      <td>{resv.customer_name}</td>
                      <td>{resv.vehicle_plate}</td>
                      <td>{resv.reservation_date}</td>
                      <td>{resv.start_date}</td>
                      <td>{resv.end_date}</td>
                      <td>{resv.reservation_status}</td>
                      <td>{resv.rental_fee}</td>
                      <td>{resv.rental_status}</td>
                      <td>
                        <button onClick={() => loadEdit(resv, 'reservation')}>Edit</button>
                        <button className="danger" onClick={() => removeItem('reservations', resv.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {page === 'report' && (
          <div className="card table-card report-card">
            <h2>Reservation & Rental Report</h2>
            <table>
              <thead>
                <tr>
                  <th>Customer</th><th>National ID</th><th>Phone</th><th>Plate</th><th>Brand</th><th>Model</th><th>Year</th><th>Type</th><th>Reservation</th><th>Start</th><th>End</th><th>Status</th><th>Rental Date</th><th>Return Date</th><th>Fee</th><th>Rental Status</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row, index) => (
                  <tr key={index}>
                    <td>{row.customer_full_name}</td>
                    <td>{row.customer_national_id}</td>
                    <td>{row.customer_phone}</td>
                    <td>{row.vehicle_plate_number}</td>
                    <td>{row.vehicle_brand}</td>
                    <td>{row.vehicle_model}</td>
                    <td>{row.vehicle_year}</td>
                    <td>{row.vehicle_type}</td>
                    <td>{row.reservation_date}</td>
                    <td>{row.rental_start}</td>
                    <td>{row.rental_end}</td>
                    <td>{row.reservation_status}</td>
                    <td>{row.rental_date}</td>
                    <td>{row.return_date}</td>
                    <td>{row.rental_fee}</td>
                    <td>{row.rental_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
