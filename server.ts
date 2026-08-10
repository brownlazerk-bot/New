import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// File-based persistent storage location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hotel_server_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default initial database state if file doesn't exist
const DEFAULT_SUPER_ADMIN = {
  id: 'super-admin-internal-01',
  fullName: 'System Owner',
  email: 'yuskar@gmail.com',
  phone: '+250 780 000 000',
  role: 'Super Admin',
  status: 'Active',
  passwordHash: 'Pksquare@1',
  createdAt: new Date().toISOString(),
  isSuperAdmin: true
};

function readServerDb(): Record<string, any> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading server database:', err);
  }
  return {
    prodInit: true,
    menuItems: [],
    tables: [],
    waiters: [],
    orders: [],
    kitchenTickets: [],
    stockLogs: [],
    shifts: [],
    currentShift: null,
    guestRooms: [],
    users: [],
    auditLogs: [],
    expenses: [],
    cashMovements: [],
    dailyClosings: [],
    purchaseOrders: [],
    ingredients: [],
    recipes: [],
    stockMovements: [],
    wasteRecords: []
  };
}

function writeServerDb(data: Record<string, any>): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server database:', err);
  }
}

// In-memory cache initialized from disk
let dbState = readServerDb();

// Save state back to disk on write
function persistState() {
  writeServerDb(dbState);
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), totalOrders: dbState.orders?.length || 0 });
});

// Fetch full synchronized database state across devices
app.get('/api/sync/all', (_req, res) => {
  res.json({
    success: true,
    data: dbState,
    serverTime: new Date().toISOString()
  });
});

// Save full or partial state from any client device (HP, Dell, Phone, etc.)
app.post('/api/sync/all', (req, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      dbState = {
        ...dbState,
        ...payload,
        lastUpdated: new Date().toISOString()
      };
      persistState();
    }
    res.json({ success: true, serverTime: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save specific key/entity
app.post('/api/sync/key', (req, res) => {
  try {
    const { key, value } = req.body;
    if (key) {
      dbState[key] = value;
      dbState.lastUpdated = new Date().toISOString();
      persistState();
    }
    res.json({ success: true, key, serverTime: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Direct REST Database Endpoints for entities (ingredients, recipes, menuItems, categories, inventoryItems, stockMovements, users, businesses)
app.get('/api/db/:entity', (req, res) => {
  const { entity } = req.params;
  const { businessId } = req.query;
  const list = dbState[entity] || [];
  if (businessId && Array.isArray(list)) {
    const filtered = list.filter((item: any) => !item.businessId || item.businessId === businessId);
    return res.json({ success: true, data: filtered });
  }
  res.json({ success: true, data: list });
});

app.post('/api/db/:entity', (req, res) => {
  const { entity } = req.params;
  const newItem = req.body;
  if (!newItem) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }
  if (!dbState[entity] || !Array.isArray(dbState[entity])) {
    dbState[entity] = [];
  }
  const index = dbState[entity].findIndex((item: any) => item.id === newItem.id);
  if (index > -1) {
    dbState[entity][index] = { ...dbState[entity][index], ...newItem, updatedAt: new Date().toISOString() };
  } else {
    dbState[entity].unshift({ ...newItem, createdAt: newItem.createdAt || new Date().toISOString() });
  }
  dbState.lastUpdated = new Date().toISOString();
  persistState();
  res.json({ success: true, data: newItem, serverTime: new Date().toISOString() });
});

app.put('/api/db/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const updatedItem = req.body;
  if (!dbState[entity] || !Array.isArray(dbState[entity])) {
    return res.status(444).json({ success: false, error: 'Entity array not found' });
  }
  const index = dbState[entity].findIndex((item: any) => item.id === id);
  if (index > -1) {
    dbState[entity][index] = { ...dbState[entity][index], ...updatedItem, updatedAt: new Date().toISOString() };
    dbState.lastUpdated = new Date().toISOString();
    persistState();
    return res.json({ success: true, data: dbState[entity][index] });
  }
  res.status(404).json({ success: false, error: 'Item not found' });
});

app.delete('/api/db/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  if (dbState[entity] && Array.isArray(dbState[entity])) {
    dbState[entity] = dbState[entity].filter((item: any) => item.id !== id);
    dbState.lastUpdated = new Date().toISOString();
    persistState();
  }
  res.json({ success: true, deletedId: id });
});

// Server Auth Verification endpoint for Super Admin & Staff
app.post('/api/auth/verify', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  // 1. Check Super Admin
  if (email.toLowerCase() === DEFAULT_SUPER_ADMIN.email.toLowerCase() && password === DEFAULT_SUPER_ADMIN.passwordHash) {
    return res.json({ success: true, user: DEFAULT_SUPER_ADMIN });
  }

  // 2. Check registered staff users
  const users = dbState.users || [];
  const foundUser = users.find((u: any) => 
    u.email.toLowerCase() === email.toLowerCase() && 
    (u.passwordHash === password || u.pinCode === password) &&
    u.status === 'Active'
  );

  if (foundUser) {
    return res.json({ success: true, user: foundUser });
  }

  return res.status(401).json({ success: false, error: 'Invalid email or password' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Hotel Central Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
