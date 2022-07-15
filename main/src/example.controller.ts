import { Controller, Get, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('example')
export class ExampleController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('example')
  async root() {
    return { message: 'Hello Example!' };
  }

  getHello(): string {
    return this.appService.getHello();
  }
}
