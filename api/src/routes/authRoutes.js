const express  = require('express');
const router   = express.Router();
const passport = require('../auth');

const FRONTEND_URL = process.env.FRONTEND_URL ||
  'https://threat-network-app-807423602117.us-west4.run.app';

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: FRONTEND_URL + '?error=unauthorized' }),
  (req, res) => {
    req.session.lastActive = Date.now();
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(FRONTEND_URL + '?error=session_error');
      }
      // Pass session ID to frontend via URL so it can be stored and sent as header
      const sid = req.sessionID;
      res.redirect(FRONTEND_URL + '?sid=' + encodeURIComponent(sid));
    });
  }
);

router.get('/me', (req, res) => {
  // Support both cookie-based and header-based session
  if (req.isAuthenticated()) {
    return res.json({
      user: {
        id:     req.user.id,
        name:   req.user.name,
        email:  req.user.email,
        photo:  req.user.photo,
        groups: req.user.groups || [],
      }
    });
  }
  res.status(401).json({ user: null });
});

router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

module.exports = router;
