const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value || '';

  // Restrict to @section2.com domain
  if (!email.endsWith('@section2.com')) {
    return done(null, false, { message: 'Unauthorized domain' });
  }

  return done(null, {
    id:    profile.id,
    name:  profile.displayName,
    email: email,
    photo: profile.photos?.[0]?.value,
  });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
