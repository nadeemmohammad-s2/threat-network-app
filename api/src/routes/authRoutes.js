const express = require('express');
const router = express.Router();
const passport = require('../auth');

const FRONTEND_URL = process.env.FRONTEND_URL ||
  'https://threat-network-app-807423602117.us-west4.run.app';

// Redirect to Google login
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}?error=unauthorized` }),
  (req, res) => {
    res.redirect(FRONTEND_URL);
  }
);

// Get current logged-in user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

module.exports = router;
