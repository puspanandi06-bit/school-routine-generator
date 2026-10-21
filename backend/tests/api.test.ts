import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Smart School Routine Generator API Integration Tests', () => {
  let authToken = '';
  let generatedTimetableId = '';

  it('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@school.edu', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login succeeds with valid credentials and returns token & cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@school.edu', password: 'Admin@123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('admin@school.edu');
    expect(res.headers['set-cookie']).toBeDefined();

    authToken = res.body.token;
  });

  it('GET /api/auth/me returns authenticated administrator profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('System Administrator');
    expect(res.body.user.school.name).toBeDefined();
  });

  it('GET /api/dashboard/stats returns real school dashboard analytics', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.totalClasses).toBeGreaterThanOrEqual(4);
    expect(res.body.stats.totalTeachers).toBeGreaterThanOrEqual(8);
    expect(res.body.stats.totalSubjects).toBeGreaterThanOrEqual(7);
  });

  it('GET /api/classes supports filtering by NORMAL and PROVISIONAL classType', async () => {
    const normalRes = await request(app)
      .get('/api/classes?classType=NORMAL')
      .set('Authorization', `Bearer ${authToken}`);

    expect(normalRes.status).toBe(200);
    expect(normalRes.body.classes.every((c: any) => c.classType === 'NORMAL')).toBe(true);

    const provRes = await request(app)
      .get('/api/classes?classType=PROVISIONAL')
      .set('Authorization', `Bearer ${authToken}`);

    expect(provRes.status).toBe(200);
    expect(provRes.body.classes.every((c: any) => c.classType === 'PROVISIONAL')).toBe(true);
  });

  it('GET /api/teachers and GET /api/subjects return populated records', async () => {
    const tRes = await request(app)
      .get('/api/teachers')
      .set('Authorization', `Bearer ${authToken}`);
    expect(tRes.status).toBe(200);
    expect(tRes.body.teachers.length).toBeGreaterThan(0);

    const sRes = await request(app)
      .get('/api/subjects')
      .set('Authorization', `Bearer ${authToken}`);
    expect(sRes.status).toBe(200);
    expect(sRes.body.subjects.length).toBeGreaterThan(0);
  });

  it('executes preflight validation and generates a conflict-free timetable via API', async () => {
    // 1. Fetch Normal classes and Schedule Config
    const classRes = await request(app)
      .get('/api/classes?classType=NORMAL')
      .set('Authorization', `Bearer ${authToken}`);

    const configRes = await request(app)
      .get('/api/schedules?scheduleType=NORMAL')
      .set('Authorization', `Bearer ${authToken}`);

    expect(classRes.body.classes.length).toBeGreaterThan(0);
    expect(configRes.body.configs.length).toBeGreaterThan(0);

    const selectedClassIds = classRes.body.classes.slice(0, 2).map((c: any) => c.id);
    const scheduleConfigId = configRes.body.configs[0].id;

    // 2. Preflight validation
    const preflightRes = await request(app)
      .post('/api/timetables/preflight')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        classIds: selectedClassIds,
        scheduleConfigId,
        timetableType: 'NORMAL'
      });

    expect(preflightRes.status).toBe(200);
    expect(preflightRes.body.validation.canProceed).toBe(true);

    // 3. Generate Timetable
    const genRes = await request(app)
      .post('/api/timetables/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Spring 2026 Test Routine',
        classIds: selectedClassIds,
        scheduleConfigId,
        timetableType: 'NORMAL',
        academicYear: '2025-2026',
        randomSeed: 54321
      });

    expect(genRes.status).toBe(201);
    expect(genRes.body.success).toBe(true);
    expect(genRes.body.timetableId).toBeDefined();
    generatedTimetableId = genRes.body.timetableId;

    // 4. Fetch the generated routine
    const getRoutineRes = await request(app)
      .get(`/api/timetables/${generatedTimetableId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getRoutineRes.status).toBe(200);
    expect(getRoutineRes.body.timetable.entries.length).toBeGreaterThan(0);

    // 5. Run conflict validation on the saved routine
    const valRes = await request(app)
      .post(`/api/timetables/${generatedTimetableId}/validate`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(valRes.status).toBe(200);
    expect(valRes.body.hasConflicts).toBe(false);
    expect(valRes.body.isValid).toBe(true);

    // 6. Test CSV Export
    const csvRes = await request(app)
      .get(`/api/export/${generatedTimetableId}/csv`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('"Day","Period","Time","Class","Subject"');
  });
});
