/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/filters/api-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Factory CRM API', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function signIn(email: string, password: string) {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const token = csrf.body.data.csrfToken as string;
    const login = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', token)
      .send({ email, password })
      .expect(201);
    return {
      agent,
      accessToken: login.body.data.accessToken as string,
      csrfToken: login.body.data.csrfToken as string,
      user: login.body.data.user,
    };
  }

  it('reports a healthy API', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({
        success: true,
        data: { status: 'ok', service: 'factory-crm' },
      });
  });

  it('signs in an administrator and hides the password hash', async () => {
    const session = await signIn('admin@example.com', 'ChangeMe123!');
    expect(session.user.role).toBe('ADMIN');
    expect(JSON.stringify(session.user)).not.toContain('passwordHash');
    const me = await session.agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(me.body.data.email).toBe('admin@example.com');
    expect(me.body.data.passwordHash).toBeUndefined();
  });

  it('refuses user management to staff', async () => {
    const session = await signIn('staff@example.com', 'ChangeMe123!');
    await session.agent
      .get('/api/users')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);
    await session.agent
      .get('/api/settings')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);
  });

  it('creates a client, rejects an invalid party, and stores tonnes as kilograms', async () => {
    const session = await signIn('admin@example.com', 'ChangeMe123!');
    const stamp = Date.now();
    const created = await session.agent
      .post('/api/clients')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('x-csrf-token', session.csrfToken)
      .send({
        name: `Verification Client ${stamp}`,
        clientType: 'BUSINESS',
        phone: `070${String(stamp).slice(-7)}`,
      })
      .expect(201);
    expect(created.body.data.clientCode).toMatch(/^CL-/);
    expect(created.body.data.passwordHash).toBeUndefined();

    const products = await session.agent
      .get('/api/products?pageSize=25')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    const productId = products.body.data[0].id as string;
    await session.agent
      .post('/api/transactions')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('x-csrf-token', session.csrfToken)
      .send({
        transactionType: 'CLIENT_PURCHASE',
        supplierId: created.body.data.id,
        productId,
        quantity: 1,
        unit: 'KG',
        transactionDate: '2026-09-28',
      })
      .expect(400);

    const purchase = await session.agent
      .post('/api/transactions')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('x-csrf-token', session.csrfToken)
      .send({
        transactionType: 'CLIENT_PURCHASE',
        clientId: created.body.data.id,
        productId,
        quantity: 2.5,
        unit: 'TONNE',
        transactionDate: '2026-09-28',
        referenceNumber: `E2E-${stamp}`,
      })
      .expect(201);
    expect(Number(purchase.body.data.quantityKg)).toBe(2500);
    expect(purchase.body.data.transactionCode).toMatch(/^TXN-/);
  });

  it('returns the same forgot-password message for unknown email', async () => {
    const agent = request.agent(app.getHttpServer());
    const csrf = await agent.get('/api/auth/csrf').expect(200);
    const response = await agent
      .post('/api/auth/forgot-password')
      .set('x-csrf-token', csrf.body.data.csrfToken)
      .send({ email: 'nobody@example.com' })
      .expect(201);
    expect(response.body.message).toContain('If an account exists');
  });
});
