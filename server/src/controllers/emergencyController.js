const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Emergency = require('../models/Emergency');
const User = require('../models/User');

// Helper to emit socket events safely
const emitEmergencyEvent = (io, event, emergency, targetUserIds = []) => {
  if (!io) return;
  // Broadcast to admin/responder room
  io.to('dashboard').emit(event, {
    emergency: formatEmergency(emergency),
  });
  // Also notify the citizen
  if (emergency.citizen) {
    io.to(`user:${emergency.citizen.toString()}`).emit(event, {
      emergency: formatEmergency(emergency),
    });
  }
  // Notify assigned responder if any
  if (emergency.assignedResponder) {
    io.to(`user:${emergency.assignedResponder.toString()}`).emit(event, {
      emergency: formatEmergency(emergency),
    });
  }
};

const formatEmergency = (e) => {
  const obj = e.toObject ? e.toObject() : e;
  return {
    id: obj._id,
    citizen: obj.citizen,
    type: obj.type,
    description: obj.description,
    location: obj.location,
    status: obj.status,
    assignedResponder: obj.assignedResponder,
    statusHistory: obj.statusHistory,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

// @desc    Create emergency (SOS)
// @route   POST /api/emergencies
// @access  Private (citizen)
const createEmergency = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
        errors: errors.array(),
      });
    }

    // Only citizens create emergencies via this endpoint
    if (req.user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Only citizens can create emergency reports',
        code: 'FORBIDDEN',
      });
    }

    const { type, description, latitude, longitude, manualLocation, clientRequestId } = req.body;

    // Idempotency: if clientRequestId provided and already exists for this user, return existing
    if (clientRequestId) {
      const existing = await Emergency.findOne({
        citizen: req.user._id,
        clientRequestId: clientRequestId.trim().slice(0, 64),
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Emergency already recorded',
          data: { emergency: formatEmergency(existing) },
        });
      }
    }

    const location = {};
    if (latitude != null && longitude != null) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        location.latitude = lat;
        location.longitude = lng;
      }
    }
    if (manualLocation && typeof manualLocation === 'string') {
      location.manualDescription = manualLocation.trim().slice(0, 500);
    }

    const emergency = await Emergency.create({
      citizen: req.user._id, // Always from JWT
      type,
      description: description ? String(description).trim().slice(0, 1000) : '',
      location: Object.keys(location).length ? location : undefined,
      status: 'pending',
      clientRequestId: clientRequestId
        ? String(clientRequestId).trim().slice(0, 64)
        : undefined,
      statusHistory: [
        {
          status: 'pending',
          changedBy: req.user._id,
          changedAt: new Date(),
          note: 'Emergency created by citizen',
        },
      ],
    });

    // Populate for response
    await emergency.populate('citizen', 'name email phone emergencyContactName emergencyContactPhone');

    // Emit only after successful DB write
    const io = req.app.get('io');
    emitEmergencyEvent(io, 'emergency:created', emergency);

    res.status(201).json({
      success: true,
      message: 'Emergency reported successfully',
      data: { emergency: formatEmergency(emergency) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my emergencies (citizen)
// @route   GET /api/emergencies/my
// @access  Private (citizen)
const getMyEmergencies = async (req, res, next) => {
  try {
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 100);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter = { citizen: req.user._id };
    if (req.query.status) {
      const statuses = Emergency.EMERGENCY_STATUSES;
      if (statuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }

    const [emergencies, total] = await Promise.all([
      Emergency.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedResponder', 'name email phone')
        .lean(),
      Emergency.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        emergencies: emergencies.map((e) => formatEmergency(e)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single emergency
// @route   GET /api/emergencies/:id
// @access  Private
const getEmergencyById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency ID',
        code: 'INVALID_ID',
      });
    }

    const emergency = await Emergency.findById(req.params.id)
      .populate('citizen', 'name email phone emergencyContactName emergencyContactPhone')
      .populate('assignedResponder', 'name email phone');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found',
        code: 'NOT_FOUND',
      });
    }

    // Authorization: citizen only own; responder only assigned or admin
    const user = req.user;
    if (user.role === 'citizen') {
      if (emergency.citizen._id.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this emergency',
          code: 'FORBIDDEN',
        });
      }
    } else if (user.role === 'responder') {
      if (
        !emergency.assignedResponder ||
        emergency.assignedResponder._id.toString() !== user._id.toString()
      ) {
        // Responders can view pending/acknowledged for assignment? For strictness, only assigned.
        // Allow viewing unassigned for dashboard assignment flow if needed; here we restrict.
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this emergency',
          code: 'FORBIDDEN',
        });
      }
    }
    // admin can view all

    res.json({
      success: true,
      data: { emergency: formatEmergency(emergency) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all emergencies (admin/responder)
// @route   GET /api/emergencies
// @access  Private (admin, responder)
const getAllEmergencies = async (req, res, next) => {
  try {
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), 100);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && Emergency.EMERGENCY_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.type && Emergency.EMERGENCY_TYPES.includes(req.query.type)) {
      filter.type = req.query.type;
    }

    // Responders see only their assigned + unassigned pending for potential claim
    if (req.user.role === 'responder') {
      filter.$or = [
        { assignedResponder: req.user._id },
        { status: { $in: ['pending', 'acknowledged'] }, assignedResponder: null },
      ];
    }

    const [emergencies, total] = await Promise.all([
      Emergency.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('citizen', 'name email phone emergencyContactName emergencyContactPhone')
        .populate('assignedResponder', 'name email phone')
        .lean(),
      Emergency.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        emergencies: emergencies.map((e) => formatEmergency(e)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update emergency status
// @route   PATCH /api/emergencies/:id/status
// @access  Private (admin, responder)
const updateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency ID',
        code: 'INVALID_ID',
      });
    }

    const { status, note } = req.body;
    const emergency = await Emergency.findById(req.params.id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found',
        code: 'NOT_FOUND',
      });
    }

    // Authorization
    if (req.user.role === 'responder') {
      if (
        !emergency.assignedResponder ||
        emergency.assignedResponder.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this emergency',
          code: 'FORBIDDEN',
        });
      }
    }

    if (!emergency.canTransitionTo(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${emergency.status}' to '${status}'`,
        code: 'INVALID_TRANSITION',
      });
    }

    emergency.status = status;
    emergency.statusHistory.push({
      status,
      changedBy: req.user._id,
      changedAt: new Date(),
      note: note ? String(note).trim().slice(0, 500) : undefined,
    });

    await emergency.save();
    await emergency.populate([
      { path: 'citizen', select: 'name email phone emergencyContactName emergencyContactPhone' },
      { path: 'assignedResponder', select: 'name email phone' },
    ]);

    const io = req.app.get('io');
    const eventMap = {
      acknowledged: 'emergency:acknowledged',
      assigned: 'emergency:assigned',
      responding: 'emergency:statusUpdated',
      resolved: 'emergency:resolved',
      cancelled: 'emergency:cancelled',
    };
    emitEmergencyEvent(io, eventMap[status] || 'emergency:statusUpdated', emergency);

    res.json({
      success: true,
      message: 'Status updated',
      data: { emergency: formatEmergency(emergency) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign responder
// @route   PATCH /api/emergencies/:id/assign
// @access  Private (admin)
const assignResponder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map((e) => e.msg).join('. '),
        code: 'VALIDATION_ERROR',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency ID',
        code: 'INVALID_ID',
      });
    }

    const { responderId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(responderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid responder ID',
        code: 'INVALID_ID',
      });
    }

    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found',
        code: 'NOT_FOUND',
      });
    }

    const responder = await User.findOne({
      _id: responderId,
      role: 'responder',
      isActive: true,
    });
    if (!responder) {
      return res.status(400).json({
        success: false,
        message: 'Responder not found or inactive',
        code: 'INVALID_RESPONDER',
      });
    }

    if (['resolved', 'cancelled'].includes(emergency.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign to a resolved or cancelled emergency',
        code: 'INVALID_STATE',
      });
    }

    emergency.assignedResponder = responder._id;
    if (emergency.status === 'pending' || emergency.status === 'acknowledged') {
      emergency.status = 'assigned';
      emergency.statusHistory.push({
        status: 'assigned',
        changedBy: req.user._id,
        changedAt: new Date(),
        note: `Assigned to ${responder.name}`,
      });
    } else {
      emergency.statusHistory.push({
        status: emergency.status,
        changedBy: req.user._id,
        changedAt: new Date(),
        note: `Reassigned to ${responder.name}`,
      });
    }

    await emergency.save();
    await emergency.populate([
      { path: 'citizen', select: 'name email phone emergencyContactName emergencyContactPhone' },
      { path: 'assignedResponder', select: 'name email phone' },
    ]);

    const io = req.app.get('io');
    emitEmergencyEvent(io, 'emergency:assigned', emergency);

    res.json({
      success: true,
      message: 'Responder assigned',
      data: { emergency: formatEmergency(emergency) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel emergency (citizen own, or admin)
// @route   PATCH /api/emergencies/:id/cancel
// @access  Private
const cancelEmergency = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid emergency ID',
        code: 'INVALID_ID',
      });
    }

    const emergency = await Emergency.findById(req.params.id);
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found',
        code: 'NOT_FOUND',
      });
    }

    // Citizen can cancel own only if still pending/acknowledged
    if (req.user.role === 'citizen') {
      if (emergency.citizen.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized',
          code: 'FORBIDDEN',
        });
      }
      if (!['pending', 'acknowledged'].includes(emergency.status)) {
        return res.status(400).json({
          success: false,
          message: 'Can only cancel pending or acknowledged emergencies',
          code: 'INVALID_STATE',
        });
      }
    } else if (req.user.role === 'responder') {
      // Responder can cancel only if assigned
      if (
        !emergency.assignedResponder ||
        emergency.assignedResponder.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized',
          code: 'FORBIDDEN',
        });
      }
    }
    // admin can always cancel (if not already terminal)

    if (['resolved', 'cancelled'].includes(emergency.status)) {
      return res.status(400).json({
        success: false,
        message: 'Emergency is already resolved or cancelled',
        code: 'INVALID_STATE',
      });
    }

    emergency.status = 'cancelled';
    emergency.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user._id,
      changedAt: new Date(),
      note: req.body.note ? String(req.body.note).trim().slice(0, 500) : 'Cancelled',
    });

    await emergency.save();
    await emergency.populate([
      { path: 'citizen', select: 'name email phone emergencyContactName emergencyContactPhone' },
      { path: 'assignedResponder', select: 'name email phone' },
    ]);

    const io = req.app.get('io');
    emitEmergencyEvent(io, 'emergency:cancelled', emergency);

    res.json({
      success: true,
      message: 'Emergency cancelled',
      data: { emergency: formatEmergency(emergency) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEmergency,
  getMyEmergencies,
  getEmergencyById,
  getAllEmergencies,
  updateStatus,
  assignResponder,
  cancelEmergency,
};
