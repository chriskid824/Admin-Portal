import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('productExtended')
export class ProductExtended {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @Column()
  userId: number;
}
