const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * ─────────────────────────────────────────────────────
 * Fields:
 *   name          → Display name
 *   email         → Unique, used for login
 *   password      → Hashed with bcrypt (NEVER stored plain text)
 *   role          → 'admin' | 'member' | 'viewer' — used by RBAC middleware
 *   refreshToken  → The current valid refresh token for this user.
 *                    Stored here so we can validate it on /refresh
 *                    and invalidate it on /logout.
 *
 * Why store refreshToken in the DB?
 *   If someone steals a refresh token, the real user can log in again,
 *   which overwrites the old token. The attacker's stolen token is now
 *   useless — this is called "refresh token rotation".
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name must be at most 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // IMPORTANT: Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    refreshToken: {
      type: String,
      select: false, // Don't leak this in API responses
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

/**
 * Pre-save Hook — Hash password before saving
 * ─────────────────────────────────────────────────────
 * Only hashes if the password field was modified.
 * This way, updating a user's name won't re-hash the password.
 *
 * bcrypt.genSalt(12) → 12 rounds of salting. Higher = more secure but slower.
 * 12 is the sweet spot for most apps.
 */
userSchema.pre('save', async function () {
  // Only hash if password was modified (or is new)
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Instance Method — Compare passwords
 * ─────────────────────────────────────────────────────
 * Used during login to check if the entered password matches the hash.
 *
 * Why an instance method?
 *   So we can do:  const isMatch = await user.comparePassword('abc123');
 *   Clean, readable, and keeps bcrypt logic inside the model.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Transform output — Remove sensitive fields from JSON
 * ─────────────────────────────────────────────────────
 * Even though we have `select: false` on password, this is a safety net.
 * When a user document is serialized to JSON (in API responses),
 * password, refreshToken, and __v are stripped out.
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
