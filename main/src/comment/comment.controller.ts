import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { User } from 'src/users/user.decorator';
import { Comment } from './comment.entity';
import { CommentService } from './comment.service';

@Controller('comment')
export class CommentController {
  constructor(
    private readonly commentService: CommentService
  ) {}

  @Get('api/customer')
  async customerComments(@Query('id') id: string) {
    const comments: Comment[] = await this.commentService.findByCustomerId(id);
    return { comments };
  }

  @Get('api/order')
  async orderComments(@Query('id') id: string) {
    const comments: Comment[] = await this.commentService.findByOrderId(id);
    return { comments };
  }

  @Post('api/delete')
  async delete(@User('id') userId: number, @Body('id') id: number) {
    const success: boolean = await this.commentService.delete(userId, id);
    return { success };
  }

  @Get('test')
  async all() {
    return await this.commentService.findAll();
  }
}
