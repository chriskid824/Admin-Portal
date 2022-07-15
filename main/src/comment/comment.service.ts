import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, TargetType } from './comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment) private repository: Repository<Comment>,
  ) {}

  async findAll(): Promise<Comment[]> {
    return this.repository.find();
  }

  async findOne(id: number): Promise<Comment> {
    return this.repository.findOne(id);
  }

  private async findByTargetId(id: string, type: TargetType): Promise<Comment[]> {
    return this.repository.find({
      targetId: id,
      targetType: type
    });
  }

  async findByCustomerId(id: string): Promise<Comment[]> {
    return this.findByTargetId(id, TargetType.CUSTOMER);
  }

  async findByOrderId(id: string): Promise<Comment[]> {
    return this.findByTargetId(id, TargetType.ORDER);
  }

  private async create(
    authorId: number = 0, 
    body: string, 
    id: string, 
    type: TargetType
  ): Promise<Comment> {
    const comment = this.repository.create({
      authorId,
      body,
      targetId: id,
      targetType: type
    });
    return this.repository.save(comment);
  }

  async createForCustomer(authorId: number, body: string, id: string): Promise<Comment> {
    return this.create(authorId, body, id, TargetType.CUSTOMER);
  }

  async createForOrder(authorId: number, body: string, id: string): Promise<Comment> {
    return this.create(authorId, body, id, TargetType.ORDER);
  }

  async delete(userId: number, id: number): Promise<boolean> {
    try {
      const comment: Comment = await this.findOne(id);
      if (!comment) return true;
      if (comment.authorId !== userId) return false;
      await this.repository.softDelete(id);
      return true;
    }
    catch (err) {
      console.log(err);
      return false;
    }
  }
}
