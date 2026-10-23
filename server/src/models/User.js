const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      maxlength: [255, 'Email cannot exceed 255 characters'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password cannot exceed 128 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['citizen', 'responder', 'admin'],
        message: 'Role must be citizen, responder, or admin',
      },
      default: 'citizen',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
      validate: {
        validator: function (v) {
          return !v || /^[+]?[\d\s\-()]{7,20}$/.test(v);
        },
        message: 'Please provide a valid phone number',
      },
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters'],
      default: '',
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      maxlength: [20, 'Emergency contact phone cannot exceed 20 characters'],
      default: '',
      validate: {
        validator: function (v) {
          return !v || /^[+]?[\d\s\-()]{7,20}$/.test(v);
        },
        message: 'Please provide a valid emergency contact phone number',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
