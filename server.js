// BloodConnect - minimal Express server. db.json is the only "database".
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const app = express();
const DB = path.join(__dirname, 'db.json');
const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const sessions = {}; // token -> { type: 'user'|'bank', id }

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- JSON file helpers ----------
const load = () => JSON.parse(fs.readFileSync(DB, 'utf8'));
const save = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const nextId = (arr) => (arr.length ? Math.max(...arr.map((x) => x.id)) + 1 : 1);
const now = () => new Date().toISOString();

// ---------- Seed data on first run ----------
if (!fs.existsSync(DB)) {
  const h = (p) => bcrypt.hashSync(p, 8);
  const banks = [
    {
      id: 1,
      bankName: 'City Blood Bank',
      address: 'MI Road, Near Ajmeri Gate',
      city: 'Jaipur',
      contactNumber: '0141-2222222',
      licenseNo: 'RJ-BB-1001',
      email: 'city@bank.com',
      password: h('bank123')
    },
    {
      id: 2,
      bankName: 'Life Care Blood Centre',
      address: 'Tonk Road, Jawahar Circle',
      city: 'Jaipur',
      contactNumber: '0141-3333333',
      licenseNo: 'RJ-BB-1002',
      email: 'lifecare@bank.com',
      password: h('bank123')
    },
    {
      id: 3,
      bankName: 'Red Cross Blood Bank',
      address: 'Station Road',
      city: 'Jodhpur',
      contactNumber: '0291-4444444',
      licenseNo: 'RJ-BB-2001',
      email: 'redcross@bank.com',
      password: h('bank123')
    }
  ];
  const stock = [];
  banks.forEach((b) => GROUPS.forEach((g, i) => stock.push({ id: stock.length + 1, bankId: b.id, bloodGroup: g, unitsAvailable: (b.id * 3 + i * 2) % 9, lastUpdated: now() })));
  const users = [
    {
      id: 1,
      name: 'Demo User',
      email: 'user@demo.com',
      password: h('user123'),
      phone: '9999999999',
      bloodGroup: 'B+',
      city: 'Jaipur',
      role: 'Both'
    }
  ];
  save({ users, banks, stock, requests: [], donations: [] });
  console.log('Created db.json with demo data.');
}

// ---------- Auth ----------
const auth = (type) => (req, res, next) => {
  const s = sessions[req.headers['x-token']];
  if (!s || s.type !== type) return res.status(401).json({ error: 'Please log in first.' });
  req.session = s;
  next();
};
const bad = (res, msg) => res.status(400).json({ error: msg });
const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e || '');
const clean = (object) => {
  const sanitized = { ...object };
  delete sanitized.password;
  return sanitized;
};

app.post('/api/register', (req, res) => {
  const { name, email, password, phone, bloodGroup, city, donor } = req.body;
  if (!name || !city || !phone) return bad(res, 'Name, phone and city are required.');
  if (!emailOk(email)) return bad(res, 'Enter a valid email.');
  if (!password || password.length < 6) return bad(res, 'Password must be at least 6 characters.');
  if (!GROUPS.includes(bloodGroup)) return bad(res, 'Choose a valid blood group.');
  const d = load();
  if (d.users.some((u) => u.email === email) || d.banks.some((b) => b.email === email)) return bad(res, 'Email already registered.');
  const user = { id: nextId(d.users), name, email, password: bcrypt.hashSync(password, 8), phone, bloodGroup, city, role: donor ? 'Both' : 'Recipient' };
  d.users.push(user);
  save(d);
  res.json({ message: 'Registered successfully. You can log in now.' });
});

app.post('/api/bank/register', (req, res) => {
  const { bankName, address, city, contactNumber, licenseNo, email, password } = req.body;
  if (!bankName || !address || !city || !contactNumber || !licenseNo) return bad(res, 'All bank details are required.');
  if (!emailOk(email)) return bad(res, 'Enter a valid email.');
  if (!password || password.length < 6) return bad(res, 'Password must be at least 6 characters.');
  const d = load();
  if (d.users.some((u) => u.email === email) || d.banks.some((b) => b.email === email)) return bad(res, 'Email already registered.');
  if (d.banks.some((b) => b.licenseNo === licenseNo)) return bad(res, 'Licence number already registered.');
  const bank = { id: nextId(d.banks), bankName, address, city, contactNumber, licenseNo, email, password: bcrypt.hashSync(password, 8) };
  d.banks.push(bank);
  GROUPS.forEach((g) => d.stock.push({ id: nextId(d.stock), bankId: bank.id, bloodGroup: g, unitsAvailable: 0, lastUpdated: now() }));
  save(d);
  res.json({ message: 'Blood bank registered. You can log in now.' });
});

app.post('/api/login', (req, res) => {
  const { email, password, type } = req.body;
  const d = load();
  const list = type === 'bank' ? d.banks : d.users;
  const acc = list.find((a) => a.email === email);
  if (!acc || !bcrypt.compareSync(password || '', acc.password)) return bad(res, 'Wrong email or password.');
  const token = crypto.randomBytes(16).toString('hex');
  sessions[token] = { type: type === 'bank' ? 'bank' : 'user', id: acc.id };
  res.json({ token, type: sessions[token].type, name: acc.name || acc.bankName });
});

app.post('/api/logout', (req, res) => {
  delete sessions[req.headers['x-token']];
  res.json({ ok: true });
});

// ---------- Public search ----------
app.get('/api/cities', (req, res) => {
  const d = load();
  res.json([...new Set(d.banks.map((b) => b.city))].sort());
});

app.get('/api/stock', (req, res) => {
  const { group, city } = req.query;
  if (!GROUPS.includes(group)) return bad(res, 'Choose a valid blood group.');
  if (!city) return bad(res, 'Choose a city.');
  const d = load();
  const result = d.banks.filter((b) => b.city.toLowerCase() === city.toLowerCase()).map((b) => {
    const s = d.stock.find((s) => s.bankId === b.id && s.bloodGroup === group);
    return { id: b.id, bankName: b.bankName, address: b.address, city: b.city, contactNumber: b.contactNumber, units: s ? s.unitsAvailable : 0, lastUpdated: s ? s.lastUpdated : null };
  });
  res.json(result);
});

// ---------- User routes ----------
app.get('/api/me', auth('user'), (req, res) => {
  const u = load().users.find((u) => u.id === req.session.id);
  res.json(clean(u));
});

app.post('/api/donors', auth('user'), (req, res) => {
  const d = load();
  const u = d.users.find((u) => u.id === req.session.id);
  u.role = 'Both';
  save(d);
  res.json({ message: 'You are now registered as a donor. Thank you!' });
});

app.post('/api/requests', auth('user'), (req, res) => {
  const { bankId, bloodGroup } = req.body;
  const units = Number(req.body.units);
  if (!GROUPS.includes(bloodGroup)) return bad(res, 'Invalid blood group.');
  if (!Number.isInteger(units) || units < 1) return bad(res, 'Units must be a positive number.');
  const d = load();
  if (!d.banks.some((b) => b.id === Number(bankId))) return bad(res, 'Blood bank not found.');
  const r = { id: nextId(d.requests), userId: req.session.id, bankId: Number(bankId), bloodGroup, unitsRequired: units, status: 'Pending', requestDate: now() };
  d.requests.push(r);
  save(d);
  res.json({ message: 'Request sent. Track it from My Dashboard.', request: r });
});

app.get('/api/requests/mine', auth('user'), (req, res) => {
  const d = load();
  res.json(d.requests.filter((r) => r.userId === req.session.id).reverse().map((r) => {
    const b = d.banks.find((b) => b.id === r.bankId);
    return { ...r, bankName: b.bankName, contactNumber: b.contactNumber };
  }));
});

// ---------- Blood bank (admin) routes ----------
app.get('/api/bank/profile', auth('bank'), (req, res) => {
  res.json(clean(load().banks.find((b) => b.id === req.session.id)));
});

app.put('/api/bank/profile', auth('bank'), (req, res) => {
  const { address, contactNumber } = req.body;
  if (!address || !contactNumber) return bad(res, 'Address and contact number are required.');
  const d = load();
  const b = d.banks.find((b) => b.id === req.session.id);
  b.address = address;
  b.contactNumber = contactNumber;
  save(d);
  res.json({ message: 'Profile updated.' });
});

app.get('/api/bank/stock', auth('bank'), (req, res) => {
  const d = load();
  res.json(GROUPS.map((g) => d.stock.find((s) => s.bankId === req.session.id && s.bloodGroup === g) || { bloodGroup: g, unitsAvailable: 0 }));
});

app.put('/api/bank/stock', auth('bank'), (req, res) => {
  const { bloodGroup } = req.body;
  const units = Number(req.body.units);
  if (!GROUPS.includes(bloodGroup)) return bad(res, 'Invalid blood group.');
  if (!Number.isInteger(units) || units < 0) return bad(res, 'Units must be 0 or more.');
  const d = load();
  setStock(d, req.session.id, bloodGroup, () => units);
  save(d);
  res.json({ message: `${bloodGroup} stock set to ${units}.` });
});

function setStock(data, bankId, group, updateUnits) {
  let stockItem = data.stock.find((item) => item.bankId === bankId && item.bloodGroup === group);

  if (!stockItem) {
    stockItem = {
      id: nextId(data.stock),
      bankId,
      bloodGroup: group,
      unitsAvailable: 0
    };
    data.stock.push(stockItem);
  }

  stockItem.unitsAvailable = updateUnits(stockItem.unitsAvailable);
  stockItem.lastUpdated = now();
}

app.get('/api/requests/bank', auth('bank'), (req, res) => {
  const d = load();
  res.json(d.requests.filter((r) => r.bankId === req.session.id).reverse().map((r) => {
    const u = d.users.find((u) => u.id === r.userId) || {};
    return { ...r, userName: u.name, userPhone: u.phone, userEmail: u.email };
  }));
});

app.patch('/api/requests/:id', auth('bank'), (req, res) => {
  const { status } = req.body;
  const d = load();
  const r = d.requests.find((r) => r.id === Number(req.params.id) && r.bankId === req.session.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  if (status === 'Approved' && r.status === 'Pending') {
    const s = d.stock.find((s) => s.bankId === r.bankId && s.bloodGroup === r.bloodGroup);
    if (!s || s.unitsAvailable < r.unitsRequired) return bad(res, 'Not enough units in stock. Reject the request or update stock first.');
    setStock(d, r.bankId, r.bloodGroup, (u) => u - r.unitsRequired);
    r.status = 'Approved';
  } else if (status === 'Rejected' && r.status === 'Pending') {
    r.status = 'Rejected';
  } else if (status === 'Fulfilled' && r.status === 'Approved') {
    r.status = 'Fulfilled';
  } else {
    return bad(res, `Cannot change a ${r.status} request to ${status}.`);
  }
  save(d);
  res.json({ message: `Request ${r.status.toLowerCase()}.` });
});

app.get('/api/bank/donors', auth('bank'), (req, res) => {
  const d = load();
  const bank = d.banks.find((b) => b.id === req.session.id);
  res.json(d.users.filter((u) => u.role !== 'Recipient' && u.city.toLowerCase() === bank.city.toLowerCase()).map(clean));
});

app.get('/api/bank/donations', auth('bank'), (req, res) => {
  const d = load();
  res.json(d.donations.filter((x) => x.bankId === req.session.id).reverse().map((x) => {
    const u = d.users.find((u) => u.id === x.donorId) || {};
    return { ...x, donorName: u.name, bloodGroup: u.bloodGroup };
  }));
});

app.post('/api/bank/donations', auth('bank'), (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) return bad(res, 'Quantity must be a positive number.');
  const d = load();
  const donor = d.users.find((u) => u.id === Number(req.body.donorId) && u.role !== 'Recipient');
  if (!donor) return bad(res, 'Donor not found.');
  d.donations.push({ id: nextId(d.donations), donorId: donor.id, bankId: req.session.id, donationDate: now(), quantity });
  setStock(d, req.session.id, donor.bloodGroup, (u) => u + quantity);
  save(d);
  res.json({ message: `Donation logged. ${donor.bloodGroup} stock increased by ${quantity}.` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BloodConnect running at http://localhost:${PORT}`));
