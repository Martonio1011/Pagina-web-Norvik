/**
 * The GraphQL documents this app sends to Shopify.
 *
 * They live together in one file so the whole surface the app depends on is
 * readable at a glance — which matters when a pinned API version is eventually
 * bumped and every field has to be re-checked.
 */

export const PRODUCTS_QUERY = /* GraphQL */ `
  query NorvikProducts($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: UPDATED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        tags
        descriptionHtml
        totalInventory
        createdAt
        updatedAt
        featuredMedia {
          preview {
            image {
              url
            }
          }
        }
        collections(first: 20) {
          nodes {
            id
            title
            handle
          }
        }
        variants(first: 100) {
          nodes {
            id
            sku
            title
            price
            compareAtPrice
            inventoryQuantity
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
`;

export const COLLECTIONS_QUERY = /* GraphQL */ `
  query NorvikCollections($first: Int!, $after: String) {
    collections(first: $first, after: $after, sortKey: TITLE) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        handle
        productsCount {
          count
        }
      }
    }
  }
`;

/**
 * Sales history, used to tell a product that sells from one that merely sits
 * in the catalogue. `query` filters by date; anything older than 60 days needs
 * the read_all_orders scope, which most stores do not grant, so a failure here
 * is recorded and the run continues without sales data.
 */
export const ORDERS_QUERY = /* GraphQL */ `
  query NorvikOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        createdAt
        lineItems(first: 50) {
          nodes {
            id
            quantity
            sku
            product {
              id
            }
            originalTotalSet {
              shopMoney {
                amount
              }
            }
          }
        }
      }
    }
  }
`;

/** Confirms the token works and tells us which store it belongs to. */
export const SHOP_QUERY = /* GraphQL */ `
  query NorvikShop {
    shop {
      name
      myshopifyDomain
      currencyCode
      ianaTimezone
    }
  }
`;
