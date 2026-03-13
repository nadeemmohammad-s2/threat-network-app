const { pool } = require('../db/pool');

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

const isAuthenticated = async (req, res, next) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ error: 'Unauthorized', code: 'NOT_LOGGED_IN' });
  const lastActive = req.session.lastActive || 0;
  const now = Date.now();
  if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
    req.logout(() => req.session.destroy(() =>
      res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' })
    ));
    return;
  }
  req.session.lastActive = now;
  await pool.query('UPDATE users SET last_active = NOW() WHERE id = $1', [req.user.id]);
  next();
};

const requireGroup = (...groups) => (req, res, next) => {
  if (!req.isAuthenticated())
    return res.status(401).json({ error: 'Unauthorized' });
  const userGroups = req.user.groups || [];
  if (!groups.some(g => userGroups.includes(g)))
    return res.status(403).json({ error: 'Forbidden', required: groups, yours: userGroups });
  next();
};

const requireAdmin = requireGroup('admins');

module.exports = { isAuthenticated, requireGroup, requireAdmin };
