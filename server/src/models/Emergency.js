const mongoose = require('mongoose');

const EMERGENCY_TYPES = [
  'medical',
  'road_accident',
  'fire',
  'crime',
  'other',
];

const EMERGENCY_STATUSES = [
  'pending',
  'acknowledged',
  'assigned',
  'responding',
  'resolved',
  'cancelled',
];

// Allowed status transitions (from -> to[])
const STATUS_TRANSITIONS = {
  pending: ['acknowledged', 'assigned', 'cancelled'],
  acknowledged: ['assigned', 'responding', 'cancelled'],
  assigned: ['responding', 'cancelled'],
  responding: ['resolved', 'cancelled'],
  resolved: [],
  cancelled: [],
};

const emergencySchema = new mongoose.Schema(
  {
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Emergency type is required'],
      enum: {
        values: EMERGENCY_TYPES,
        message: `Type must be one of: ${EMERGENCY_TYPES.join(', ')}`,
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    location: {
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
      manualDescription: {
        type: String,
        trim: true,
        maxlength: [500, 'Manual location description cannot exceed 500 characters'],
      },
    },
    status: {
      type: String,
      enum: {
        values: EMERGENCY_STATUSES,
        message: `Status must be one of: ${EMERGENCY_STATUSES.join(', ')}`,
      },
      default: 'pending',
      index: true,
    },
    assignedResponder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: EMERGENCY_STATUSES,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          maxlength: 500,
        },
      },
    ],
    // For basic idempotency on client retries
    clientRequestId: {
      type: String,
      maxlength: 64,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common queries
emergencySchema.index({ citizen: 1, createdAt: -1 });
emergencySchema.index({ status: 1, createdAt: -1 });
emergencySchema.index({ assignedResponder: 1, status: 1 });

// Validate coordinates are both present or both absent (or manual description)
emergencySchema.pre('validate', function (next) {
  const hasLat = this.location?.latitude != null;
  const hasLng = this.location?.longitude != null;
  if (hasLat !== hasLng) {
    return next(new Error('Both latitude and longitude must be provided together'));
  }
  if (!hasLat && !this.location?.manualDescription) {
    // Allow no location at all; frontend can still submit
  }
  next();
});

// Helper to check valid transition
emergencySchema.methods.canTransitionTo = function (newStatus) {
  const allowed = STATUS_TRANSITIONS[this.status] || [];
  return allowed.includes(newStatus);
};

emergencySchema.statics.EMERGENCY_TYPES = EMERGENCY_TYPES;
emergencySchema.statics.EMERGENCY_STATUSES = EMERGENCY_STATUSES;
emergencySchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;

module.exports = mongoose.model('Emergency', emergencySchema);
