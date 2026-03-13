require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const session   = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const passport  = require('./auth');
const { pool }  = require('./db/pool');
const { isAuthenticated } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', pruneSessionInterval: 900 }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { secure: true, httpOnly: true, maxAge: 28800000, sameSite: 'none' },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(req.method + ' ' + req.originalUrl + ' ' + res.statusCode + ' ' + (Date.now()-start) + 'ms');
  });
  next();
});

app.use('/auth', require('./routes/authRoutes'));

app.use('/api/threat-networks', isAuthenticated, require('./routes/threatNetworks'));
app.use('/api/entities',        isAuthenticated, require('./routes/entities'));
app.use('/api/ref',             isAuthenticated, require('./routes/refTables'));
app.use('/api/junctions',       isAuthenticated, require('./routes/junctions'));
app.use('/api/htf',             isAuthenticated, require('./routes/htfTables'));
app.use('/api/provenance',      isAuthenticated, require('./routes/provenance'));
app.use('/api/audit',           isAuthenticated, require('./routes/audit'));

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    res.json({ status: 'ok', database: result.rows[0].db, time: result.rows[0].time });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  const pgErrors = {
    '23505': { status: 409, message: 'Duplicate record' },
    '23503': { status: 400, message: 'Referenced record not found' },
    '23502': { status: 400, message: 'Required field missing' },
    'P0001': { status: 400, message: err.message },
  };
  if (err.code && pgErrors[err.code]) {
    const e = pgErrors[err.code];
    return res.status(e.status).json({ error: e.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('Threat Network API running on port ' + PORT);
});

module.exports = app;
