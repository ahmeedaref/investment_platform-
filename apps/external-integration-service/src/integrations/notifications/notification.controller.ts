import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Controller('integrations/notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) { }

  @Post('send')
  send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(dto);
  }
}
