import { BaseModel } from "./BaseModel";

export class ProductImage extends BaseModel {
  get sourcePath(): string {
    return 'https://hk.kickscrewseller.com/products/' + 
      this.relativePath;
  }

  get relativePath(): string {
    return this.data['file_name'];
  }

  get fileName(): string {
    return this.relativePath.split('/').pop();
  }

  get updateDate(): number {
    return this.data['udt'];
  }

  get productModelNo(): string {
    return this.data['model_no'];
  }

  get sequence(): number {
    return this.data['sequence'];
  }

  get isOnShopify(): boolean {
    return this.sequence < 99;
  }
}
export enum Destination {
  Nexus,
  Backend,
}
