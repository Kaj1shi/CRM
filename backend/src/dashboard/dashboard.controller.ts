import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { DashboardService } from './dashboard.service';
@Controller('dashboard')
@Permissions(PERMISSIONS.DASHBOARD_VIEW)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('summary') summary() {
    return this.dashboard.summary();
  }
  @Get('recent-transactions') recent() {
    return this.dashboard.recent();
  }
  @Get('purchase-trends') trends() {
    return this.dashboard.trends();
  }
  @Get('alerts') alerts() {
    return this.dashboard.alerts();
  }
}
