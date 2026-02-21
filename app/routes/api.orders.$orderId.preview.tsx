import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { buildOrderData, renderTemplate } from "../lib/renderer.server";

const ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      name createdAt email
      totalPriceSet { shopMoney { amount currencyCode } }
      subtotalPriceSet { shopMoney { amount } }
      totalTaxSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      customer { firstName lastName email }
      shippingAddress { address1 address2 city province zip country }
      lineItems(first: 50) {
        edges { node { title quantity originalUnitPrice sku variantTitle } }
      }
    }
  }
`;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const type = (url.searchParams.get("type") || "INVOICE").toUpperCase() as "INVOICE" | "PACKING_SLIP";
  const orderId = `gid://shopify/Order/${params.orderId}`;

  const template = await db.template.findFirst({
    where: { shop: session.shop, type },
    orderBy: { updatedAt: "desc" },
  });

  if (!template) {
    return json({ error: "No template found for type " + type }, { status: 404 });
  }

  const response = await admin.graphql(ORDER_QUERY, { variables: { id: orderId } });
  const data = await response.json();
  const orderData = buildOrderData(data.data.order);
  const html = renderTemplate(template.html, template.css, orderData);

  return json({ html });
};
