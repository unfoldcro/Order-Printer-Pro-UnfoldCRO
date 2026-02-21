import Handlebars from "handlebars";

export interface OrderData {
  name: string;
  createdAt: string;
  totalPrice: string;
  currency: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  shippingAddress: {
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
  } | null;
  lineItems: Array<{
    title: string;
    quantity: number;
    price: string;
    sku: string;
    variantTitle: string;
  }>;
  subtotalPrice: string;
  totalTax: string;
  totalShipping: string;
}

// Safe renderer - only whitelisted order fields exposed
export function renderTemplate(
  html: string,
  css: string,
  order: OrderData
): string {
  const template = Handlebars.compile(html, { noEscape: false, strict: false });
  const rendered = template({ order });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${rendered}</body></html>`;
}

export function buildOrderData(rawOrder: any): OrderData {
  const lineItems = (rawOrder.lineItems?.edges ?? []).map((e: any) => ({
    title: e.node.title ?? "",
    quantity: e.node.quantity ?? 0,
    price: e.node.originalUnitPrice ?? "0.00",
    sku: e.node.sku ?? "",
    variantTitle: e.node.variantTitle ?? "",
  }));

  const shipping = rawOrder.shippingAddress;

  return {
    name: rawOrder.name ?? "",
    createdAt: rawOrder.createdAt
      ? new Date(rawOrder.createdAt).toLocaleDateString()
      : "",
    totalPrice: rawOrder.totalPriceSet?.shopMoney?.amount ?? "0.00",
    currency: rawOrder.totalPriceSet?.shopMoney?.currencyCode ?? "",
    customer: {
      firstName: rawOrder.customer?.firstName ?? "",
      lastName: rawOrder.customer?.lastName ?? "",
      email: rawOrder.customer?.email ?? rawOrder.email ?? "",
    },
    shippingAddress: shipping
      ? {
          address1: shipping.address1 ?? "",
          address2: shipping.address2 ?? "",
          city: shipping.city ?? "",
          province: shipping.province ?? "",
          zip: shipping.zip ?? "",
          country: shipping.country ?? "",
        }
      : null,
    lineItems,
    subtotalPrice: rawOrder.subtotalPriceSet?.shopMoney?.amount ?? "0.00",
    totalTax: rawOrder.totalTaxSet?.shopMoney?.amount ?? "0.00",
    totalShipping:
      rawOrder.totalShippingPriceSet?.shopMoney?.amount ?? "0.00",
  };
}
