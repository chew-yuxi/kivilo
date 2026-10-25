import { product } from '../../../content/product'
import { articleMetadata, ResourcePage } from '../../../components/resource-page'

export const metadata = articleMetadata(product, '/product')

export default function ProductPage() {
  return <ResourcePage article={product} path="/product" />
}
