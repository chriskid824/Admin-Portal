import { User } from 'src/users/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  AfterLoad,
  AfterInsert
} from 'typeorm';

export enum TargetType {
  CUSTOMER = 'CUSTOMER',
  ORDER = 'ORDER'
}

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  targetType: TargetType;

  @Column('bigint')
  targetId: string;

  @Column()
  authorId: number;

  @Column('text')
  body: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(type => User, user => user.comments, { eager: true })
  author: User;

  prettifiedCreateDate: string;

  @AfterInsert()
  @AfterLoad()
  getPrettifiedCreateDate() {
    const d = new Date(this.createdAt);
    this.prettifiedCreateDate = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
}
