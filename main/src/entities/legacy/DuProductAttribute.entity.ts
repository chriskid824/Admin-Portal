import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DuProduct } from './DuProduct.entity';

@Entity({ database: 'du', name: 'spu_att', synchronize: false })
export class DuProductAttribute {
  @PrimaryGeneratedColumn({ name: 'spu_att_id' })
  id: number;

  @Column({ name: 'k' })
  key: string;

  @Column({ name: 'v' })
  value: string;

  @ManyToOne(() => DuProduct, (product) => product.attributes)
  @JoinColumn({ name: 'spu_id' })
  product: DuProduct;

  toString() {
    return `${this.key}: ${this.value}`;
  }
}
