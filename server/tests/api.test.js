const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test_super_secret_jwt_key_at_least_32_characters_long_12345';
process.env.NODE_ENV = 'test';
process.env.BCRYPT_SALT_ROUNDS = '4'; // Fast hashing for tests

const app = require('../src/app');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('1. Health & Server Status Endpoint', () => {
  it('GET /health returns 200 with healthy database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET / returns root API ping', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBe('1.0.0');
  });
});

describe('2. Authentication Flow & Emergency Contacts', () => {
  const testUser = {
    name: 'Jane Citizen',
    email: 'jane@example.com',
    password: 'Password123!',
    phone: '+91 98765 43210',
  };

  let token = '';

  it('POST /api/auth/register creates user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.role).toBe('citizen');
    token = res.body.data.token;
  });

  it('POST /api/auth/login logs in user and returns profile', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/auth/me returns current user profile with auth header', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user).toHaveProperty('emergencyContactName');
    expect(res.body.data.user).toHaveProperty('emergencyContactPhone');
  });

  it('PATCH /api/users/me updates profile and emergency contact details', async () => {
    const updatePayload = {
      name: 'Jane Doe Citizen',
      phone: '+91 98765 11111',
      emergencyContactName: 'John Doe Spouse',
      emergencyContactPhone: '+91 98765 22222',
    };

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe(updatePayload.name);
    expect(res.body.data.user.phone).toBe(updatePayload.phone);
    expect(res.body.data.user.emergencyContactName).toBe(updatePayload.emergencyContactName);
    expect(res.body.data.user.emergencyContactPhone).toBe(updatePayload.emergencyContactPhone);
  });

  it('GET /api/users/me returns updated emergency contact information', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.emergencyContactName).toBe('John Doe Spouse');
    expect(res.body.data.user.emergencyContactPhone).toBe('+91 98765 22222');
  });
});

describe('3. SOS Emergency Reporting Flow', () => {
  let citizenToken = '';
  let emergencyId = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Emergency Tester',
        email: 'sos_test@example.com',
        password: 'Password999!',
      });
    citizenToken = res.body.data.token;
  });

  it('POST /api/emergencies reports a valid SOS incident', async () => {
    const res = await request(app)
      .post('/api/emergencies')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        type: 'medical',
        description: 'Severe injury requiring immediate assistance',
        latitude: 19.0760,
        longitude: 72.8777,
        manualLocation: 'Near Central Park Gate 3',
        clientRequestId: `req-${Date.now()}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emergency.type).toBe('medical');
    expect(res.body.data.emergency.status).toBe('pending');
    expect(res.body.data.emergency.location.latitude).toBeCloseTo(19.0760, 3);
    expect(res.body.data.emergency.location.longitude).toBeCloseTo(72.8777, 3);
    emergencyId = res.body.data.emergency.id;
  });

  it('GET /api/emergencies/my lists citizen emergencies', async () => {
    const res = await request(app)
      .get('/api/emergencies/my')
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.emergencies)).toBe(true);
    expect(res.body.data.emergencies.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/emergencies/:id retrieves incident details', async () => {
    const res = await request(app)
      .get(`/api/emergencies/${emergencyId}`)
      .set('Authorization', `Bearer ${citizenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.emergency.id).toBe(emergencyId);
    expect(res.body.data.emergency.status).toBe('pending');
  });

  it('PATCH /api/emergencies/:id/cancel cancels own pending emergency', async () => {
    const res = await request(app)
      .patch(`/api/emergencies/${emergencyId}/cancel`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ note: 'False alarm resolved safely' });

    expect(res.status).toBe(200);
    expect(res.body.data.emergency.status).toBe('cancelled');
  });
});
