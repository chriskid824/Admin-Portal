import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DuProductAttribute } from './DuProductAttribute.entity';
import { DuVariant } from './DuVariant.entity';

const colorTranslation = [
  { chinese: '黄绿色', english: 'Lime' },
  { chinese: '黑白色', english: 'Black-White' },
  { chinese: '黑红色', english: 'Black-Red' },
  { chinese: '黑绿色', english: 'Black-Green' },
  { chinese: '黑蓝色', english: 'Black-Blue' },
  { chinese: '紫红色', english: 'Violet' },
  { chinese: '卡其色', english: 'Khaki' },
  { chinese: '红色', english: 'Red' },
  { chinese: '蓝色', english: 'Blue' },
  { chinese: '绿色', english: 'Green' },
  { chinese: '黄色', english: 'Yellow' },
  { chinese: '紫色', english: 'Purple' },
  { chinese: '白色', english: 'White' },
  { chinese: '黑色', english: 'Black' },
  { chinese: '灰色', english: 'Gray' },
  { chinese: '棕色', english: 'Brown' },
  { chinese: '橙色', english: 'Orange' },
  { chinese: '粉色', english: 'Pink' },
  { chinese: '青色', english: 'Cyan' },
];

const genderTranslation = [
  { chinese: '男款', english: "Men's" },
  { chinese: '女款', english: "Women's" },
  { chinese: '男女同款', english: 'Unisex' },
];

const categoryTranslation = [
  { chinese: 'T恤', english: 'T-shirt', categoryId: 8 },
  { chinese: '卫衣', english: 'Hoodie', categoryId: 867 },
  { chinese: '夹克', english: 'Jacket', categoryId: 867 },
];

@Entity({ database: 'du', name: 'spus', synchronize: false })
export class DuProduct {
  @PrimaryGeneratedColumn({ name: 'spu_id' })
  id: number;

  @Column({ name: 'article_number' })
  modelNumber: string;

  @Column()
  title: string;

  @Column({ name: 'auth_price' })
  price: number;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'category_name' })
  categoryName: string;

  @Column({ name: 'brand_id' })
  brandId: number;

  @Column({ name: 'brand_name' })
  brandName: string;

  @OneToMany(() => DuProductAttribute, (attribute) => attribute.product)
  attributes: DuProductAttribute[];

  @OneToMany(() => DuVariant, (variant) => variant.product)
  variants: DuVariant[];

  get releaseDate(): string | null {
    if (!this.attributes) {
      return null;
    }

    for (const attribute of this.attributes) {
      if (attribute.key === '发售日期') {
        return attribute.value;
      }
    }
    return null;
  }

  get productType(): string | null {
    for (const category of categoryTranslation) {
      if (category.chinese === this.categoryName) {
        return category.english;
      }
    }
    return null;
  }

  // Category Id used in KC for the product type
  get productTypeCategoryId(): number | null {
    for (const category of categoryTranslation) {
      if (category.chinese === this.categoryName) {
        return category.categoryId;
      }
    }
    return null;
  }

  modelNumberIsValid(): boolean {
    // True if model number contains ascii characters only
    return /^[\x00-\x7F]*$/.test(this.modelNumber);
  }

  // Return a valid title by removing chinese characters and performing some
  // simple translations if needed.
  validTitle(): string | null {
    let validTitle = this.title.replace(/[^\x00-\x7F]/g, '');
    // Remove 'logo' keyword
    validTitle = validTitle.replace(/logo/gi, '');

    // Remove double spaces and trim
    validTitle = validTitle.replace(/\s+/g, ' ').trim();

    // Try to find some keywords and translate them if title is too short
    if (validTitle.length <= 25) {
      // Handle gender
      for (const g of genderTranslation) {
        if (this.title.includes(g.chinese)) {
          validTitle += ` ${g.english}`;
          break;
        }
      }

      // Handle item type
      for (const c of categoryTranslation) {
        if (this.categoryName === c.chinese) {
          validTitle += ` ${c.english}`;
          break;
        }
      }

      // Handle color
      for (const c of colorTranslation) {
        if (this.title.includes(c.chinese)) {
          validTitle += ` ${c.english}`;
          break;
        }
      }

      if (validTitle.length <= 15) {
        validTitle = null;
      }
    }

    return validTitle;
  }

  // Currently KicksCrew only support sizes as variants. So if a product from
  // Du has variants other than sizes we will consider it invalid and return
  // null.
  validVariants(): string[] | null {
    let invalid = false;
    const allProps = {};

    const sizes = this.variants
      .map((variant) => {
        const p = variant.combinedProperties();
        if (!p) {
          invalid = true;
          return null;
        }

        // for each property
        let size = null;
        for (const key in p) {
          const value = p[key];
          if (key === '尺码') {
            // if property is size
            size = value;
          } else {
            // Assign to allProps
            if (!allProps[key]) {
              allProps[key] = value;
            } else {
              if (allProps[key] !== value) {
                invalid = true;
              }
            }
          }
        }

        if (!size) {
          invalid = true;
        }
        return size;
      })
      .filter((size) => size);

    if (invalid) {
      console.log('Invalid sizes', sizes);
      return null;
    }
    return sizes;
  }

  // TODO: Transform to KicksCrew Product Entity when it's implemented which
  // will provide a cleaner interface. Product Service will also need to be
  // refactored to use product entities.
  validated(): any {
    if (!this.modelNumberIsValid()) {
      return null;
    }

    // Copy the product object
    const p = { ...this } as any;

    const validTitle = this.validTitle();
    if (!validTitle) {
      return null;
    }

    // Annotate color
    for (const c of colorTranslation) {
      if (p.title.includes(c.chinese)) {
        p.color = c.english;
        break;
      }
    }
    // Original p titile is used to annotate the product
    p.title = validTitle;

    return p;
  }
}
