import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DuProduct } from './DuProduct.entity';

@Entity({ database: 'du', name: 'skus', synchronize: false })
export class DuVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  properties: string;

  @Column()
  properties2: string;

  @ManyToOne(() => DuProduct, (product) => product.variants)
  @JoinColumn({ name: 'spu_id' })
  product: DuProduct;

  // Decode properties and combine them in to a single object
  combinedProperties(): any {
    console.debug({
      properties: this.properties,
      properties2: this.properties2,
    });
    let properties = {};
    let properties2 = {};
    try {
      properties = this.properties ? JSON.parse(this.properties) : {};
      properties2 = this.properties2 ? JSON.parse(this.properties2) : {};
    } catch (e) {
      return null;
    }

    // combine properties and properties2
    const p = { ...properties, ...properties2 };
    return p;
  }
}
