export type ProductDimensions = {
  width: number;
  height: number;
  depth: number;
};

export type ProductReview = {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
};

export type ProductMeta = {
  createdAt: string;
  updatedAt: string;
  barcode: string;
  qrCode: string;
};

export type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  /** Not every product has a brand (e.g. groceries). */
  brand?: string;
  sku: string;
  weight: number;
  dimensions: ProductDimensions;
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  reviews: ProductReview[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta: ProductMeta;
  images: string[];
  thumbnail: string;
};

export type ProductsResponse = {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
};

/**
 * The fields the list shows, cleaned up from the raw API data. Only `id` and `title` are
 * guaranteed; everything else may be missing and the UI must cope.
 */
export type ProductSummary = {
  id: number;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  price?: number;
  rating?: number;
  thumbnail?: string;
};

/** A cleaned-up page of products, ready for the UI. */
export type ProductsPage = {
  products: ProductSummary[];
  total: number;
  /** Where the next page starts. Counts dropped (invalid) items too. */
  nextSkip: number;
};

export type ProductsQuery = {
  limit?: number;
  skip?: number;
};
