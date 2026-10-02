/**
 * Root Nest module — feature modules + global guards.
 * Guard order: Throttler → Csrf → JwtAuth → Permissions. Imported by main.ts.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { CommonModule } from './common/common.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { LocationsModule } from './locations/locations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { SearchModule } from './search/search.module';
import { SettingsModule } from './settings/settings.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.token',
          "res.headers['set-cookie']",
        ],
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    CommonModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    LocationsModule,
    ClientsModule,
    SuppliersModule,
    ProductsModule,
    TransactionsModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards run in registration order (unless a route is @Public).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
