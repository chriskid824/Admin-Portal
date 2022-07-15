import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ database: 'shopify', name: 'product_uploaded', synchronize: false })
export class ShopifyProductUploaded {
  @PrimaryGeneratedColumn({ name: 'product_id' })
  product_id: number;

  @Column({ name: 'model_no' })
  sku: string;

  @Column()
  title: string;

  @Column()
  vendor: string;

  @Column()
  product_type: string;

  @Column({ name: 'type' })
  option1_values: string;
}
