import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

import type { ProductDetails, ProductReviewSummary } from '../types';
import { ProductImage } from './ProductImage';

type ProductDetailsViewProps = {
  product: ProductDetails;
};

/** Every section is optional: anything missing from the product is simply left out. */
export function ProductDetailsView({ product }: ProductDetailsViewProps) {
  const { title, brand, category, description, tags, reviews } = product;
  const subtitle = [brand, category].filter(Boolean).join(' · ');
  const specs = getSpecs(product);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Gallery product={product} />

      <View style={styles.body}>
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle !== '' && (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          )}
        </View>

        <PriceAndStock product={product} />

        {description && <ThemedText type="small">{description}</ThemedText>}

        {tags.length > 0 && (
          <View style={styles.tags}>
            {tags.map((tag, index) => (
              <ThemedView key={`${tag}-${index}`} type="backgroundElement" style={styles.tag}>
                <ThemedText type="small">{tag}</ThemedText>
              </ThemedView>
            ))}
          </View>
        )}

        {specs.length > 0 && (
          <Section title="Details">
            {specs.map(([label, value]) => (
              <View key={label} style={styles.specRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.specLabel}>
                  {label}
                </ThemedText>
                <ThemedText type="small" style={styles.specValue}>
                  {value}
                </ThemedText>
              </View>
            ))}
          </Section>
        )}

        {reviews.length > 0 && (
          <Section title={`Reviews (${reviews.length})`}>
            {reviews.map((review, index) => (
              <Review key={index} review={review} />
            ))}
          </Section>
        )}
      </View>
    </ScrollView>
  );
}

function Gallery({ product }: { product: ProductDetails }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width, MaxContentWidth);
  // Full-size images first; the thumbnail (or a placeholder) when there are none.
  const images = product.images.length > 0 ? product.images : [product.thumbnail];

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
      {images.map((uri, index) => (
        <ProductImage
          key={`${uri}-${index}`}
          uri={uri}
          title={product.title}
          style={{ width: size, height: size }}
        />
      ))}
    </ScrollView>
  );
}

function PriceAndStock({ product }: { product: ProductDetails }) {
  const { price, discountPercentage, rating, reviews, availabilityStatus, stock } = product;
  const originalPrice =
    price !== undefined && discountPercentage !== undefined
      ? price / (1 - discountPercentage / 100)
      : undefined;
  const stockText = [availabilityStatus, stock !== undefined && `${stock} left`]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.section}>
      <View style={styles.inline}>
        {price !== undefined ? (
          <ThemedText type="default">${price.toFixed(2)}</ThemedText>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Price unavailable
          </ThemedText>
        )}
        {originalPrice !== undefined && (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.strikethrough}>
              ${originalPrice.toFixed(2)}
            </ThemedText>
            <ThemedText type="smallBold">-{Math.round(discountPercentage ?? 0)}%</ThemedText>
          </>
        )}
      </View>
      {rating !== undefined && (
        <ThemedText type="small" themeColor="textSecondary">
          ★ {rating.toFixed(1)}
          {reviews.length > 0 && ` · ${reviews.length} reviews`}
        </ThemedText>
      )}
      {stockText !== '' && (
        <ThemedText type="small" themeColor="textSecondary">
          {stockText}
        </ThemedText>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

function Review({ review }: { review: ProductReviewSummary }) {
  const date = review.date ? new Date(review.date) : undefined;
  const header = [
    review.reviewerName ?? 'Anonymous',
    review.rating !== undefined && `★ ${review.rating}`,
    date && !Number.isNaN(date.getTime()) && date.toLocaleDateString(),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ThemedView type="backgroundElement" style={styles.review}>
      <ThemedText type="smallBold">{header}</ThemedText>
      {review.comment && <ThemedText type="small">{review.comment}</ThemedText>}
    </ThemedView>
  );
}

/** Label/value rows for whichever specs the product has. */
function getSpecs(product: ProductDetails): [string, string][] {
  const { sku, weight, dimensions, minimumOrderQuantity } = product;
  const specs: [string, string | undefined][] = [
    ['SKU', sku],
    ['Weight', weight !== undefined ? String(weight) : undefined],
    [
      'Dimensions',
      dimensions && `${dimensions.width} × ${dimensions.height} × ${dimensions.depth}`,
    ],
    ['Warranty', product.warrantyInformation],
    ['Shipping', product.shippingInformation],
    ['Returns', product.returnPolicy],
    [
      'Minimum order',
      minimumOrderQuantity !== undefined ? String(minimumOrderQuantity) : undefined,
    ],
  ];
  return specs.filter((spec): spec is [string, string] => spec[1] !== undefined);
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingBottom: Spacing.six,
  },
  body: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  specRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  specLabel: {
    width: 110,
  },
  specValue: {
    flex: 1,
  },
  review: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
