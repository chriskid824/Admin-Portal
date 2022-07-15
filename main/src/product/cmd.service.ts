import { Console, Command } from 'nestjs-console';
import { ProductService } from './product.service';
import { DuProductService } from './duProduct.service';

@Console({
  command: 'product',
  description: 'Product command',
})
export class ProductCmdService {
  constructor(
    private productService: ProductService,
    private duProductService: DuProductService,
  ) {}

  @Command({
    command: 'find <modelNumber>',
    description: 'Find product with model number',
  })
  async findByModelNumber(modelNumber: string) {
    const product = await this.productService.getByModelNo(modelNumber);
    if (product) {
      console.log(product);
    } else {
      console.log('Product not found');
    }
  }

  @Command({
    command: 'importFromDu',
  })
  async importFromDu() {
    await this.duProductService.importToCatalog();
  }
}
