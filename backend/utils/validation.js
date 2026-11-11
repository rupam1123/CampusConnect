const normalizeEmail = (email) => typeof email === 'string' ? email.trim().toLowerCase() : '';
const isAllowedEmail = (email) => /^[^\s@]+@(gmail\.com|iitk\.ac\.in)$/.test(normalizeEmail(email));
const validPassword = (password) => typeof password === 'string' && password.length >= 8 && password.length <= 128;
module.exports = { normalizeEmail, isAllowedEmail, validPassword };
