import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Checkbox,
  Button,
  InlineStack,
  Divider,
  ButtonGroup,
  Popover,
  ActionList,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

const ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      email
      displayFinancialStatus
      note
      totalPriceSet { shopMoney { amount currencyCode } }
      subtotalPriceSet { shopMoney { amount currencyCode } }
      totalTaxSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      totalDiscountsSet { shopMoney { amount } }
      customer { firstName lastName email displayName phone defaultAddress { address1 address2 city province zip country phone } }
      billingAddress { firstName lastName name company address1 address2 city province provinceCode zip country countryCodeV2 phone }
      shippingAddress { firstName lastName name company address1 address2 city province provinceCode zip country countryCodeV2 phone }
      lineItems(first: 50) {
        edges {
          node {
            title
            quantity
            originalUnitPriceSet { shopMoney { amount currencyCode } }
            totalDiscountSet { shopMoney { amount } }
            sku
            variantTitle
            image { url altText }
            taxLines { title rate priceSet { shopMoney { amount } } }
          }
        }
      }
      shippingLines(first: 10) {
        edges { node { title originalPriceSet { shopMoney { amount } } } }
      }
      taxLines { title rate priceSet { shopMoney { amount } } }
      discountApplications(first: 10) { edges { node { allocationMethod targetType value { ... on MoneyV2 { amount currencyCode } ... on PricingPercentageValue { percentage } } } } }
      paymentGatewayNames
    }
  }
`;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const orderId = `gid://shopify/Order/${params.orderId}`;

  const [orderRes, templates] = await Promise.all([
    admin.graphql(ORDER_QUERY, { variables: { id: orderId } }),
    db.template.findMany({
      where: { shop: session.shop },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const orderData = await orderRes.json();
  const order = orderData.data?.order ?? null;

  return json({ order, templates, orderId: params.orderId });
};

function formatMoney(amount: string | number, currency?: string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `₹${num.toLocaleString()}`;
  }
}

export default function OrderPrintPage() {
  const { order, templates, orderId } = useLoaderData<typeof loader>();
  const [selectedTemplates, setSelectedTemplates] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    if (templates.length > 0) initial[templates[0].id] = true;
    return initial;
  });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const toggleTemplate = useCallback(
    (id: string) => {
      setSelectedTemplates((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    []
  );

  const toggleActions = useCallback(
    () => setActionsOpen((o) => !o),
    []
  );

  const handlePreview = useCallback(async () => {
    const selected = Object.entries(selectedTemplates)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (selected.length === 0) return;
    setLoadingPreview(true);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/preview?type=INVOICE`
      );
      const data = await res.json();
      if (data.html) setPreviewHtml(data.html);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedTemplates, orderId]);

  if (!order) {
    return (
      <Page title="Order not found" backAction={{ url: "/app" }}>
        <Card>
          <Text as="p">Could not load order data.</Text>
        </Card>
      </Page>
    );
  }

  const currency =
    order.totalPriceSet?.shopMoney?.currencyCode ?? "INR";
  const lineItems = (order.lineItems?.edges ?? []).map(
    (e: any) => e.node
  );

  return (
    <Page
      title="Print"
      subtitle={`1 Order`}
      backAction={{ url: "/app" }}
      primaryAction={{ content: "Print", onAction: () => window.print() }}
      secondaryActions={[
        { content: "Export PDFs", url: `/api/orders/${orderId}/pdf` },
      ]}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Templates selector */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    Templates
                  </Text>
                </InlineStack>
                {templates.map((t) => (
                  <InlineStack key={t.id} align="space-between">
                    <Checkbox
                      label={t.name}
                      checked={!!selectedTemplates[t.id]}
                      onChange={() => toggleTemplate(t.id)}
                    />
                    <Button variant="plain" url={`/app/templates/${t.id}`}>
                      Edit
                    </Button>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>

            {/* Receipt / Invoice Preview */}
            {templates
              .filter((t) => selectedTemplates[t.id])
              .map((t) => (
                <Card key={t.id}>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text variant="headingMd" as="h2">
                        {t.name} - {order.name}
                      </Text>
                      <Popover
                        active={actionsOpen}
                        activator={
                          <Button
                            onClick={toggleActions}
                            disclosure
                          >
                            Actions
                          </Button>
                        }
                        onClose={toggleActions}
                      >
                        <ActionList
                          items={[
                            {
                              content: "Download PDF",
                              url: `/api/orders/${orderId}/pdf`,
                            },
                            {
                              content: "Print",
                              onAction: () => window.print(),
                            },
                          ]}
                        />
                      </Popover>
                    </InlineStack>
                    <Divider />
                    {/* Inline preview of the document */}
                    <div
                      style={{
                        border: "1px solid #e1e3e5",
                        borderRadius: "8px",
                        padding: "24px",
                        background: "#fff",
                        fontSize: "12px",
                      }}
                    >
                      {/* Header */}
                      <table style={{ width: "100%", marginBottom: "16px" }}>
                        <tbody>
                          <tr>
                            <td>
                              <Text as="p" variant="bodySm">
                                <strong>Tax Invoice</strong>
                              </Text>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Text as="p" variant="bodySm">
                                Original
                              </Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Order details */}
                      <table style={{ width: "100%", marginBottom: "16px" }}>
                        <tbody>
                          <tr>
                            <td>
                              <Text as="p" variant="bodySm">
                                Invoice No: {order.name}
                              </Text>
                              <Text as="p" variant="bodySm">
                                Order Id: {order.name}
                              </Text>
                              <Text as="p" variant="bodySm">
                                Invoice Date:{" "}
                                {new Date(
                                  order.createdAt
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </Text>
                              <Text as="p" variant="bodySm">
                                Payment:{" "}
                                {order.paymentGatewayNames?.join(", ") ??
                                  "—"}
                              </Text>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Text as="p" variant="bodySm">
                                <strong>Place of supply</strong>
                              </Text>
                              <Text as="p" variant="bodySm">
                                {order.shippingAddress?.city},{" "}
                                {order.shippingAddress?.province}
                              </Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Addresses */}
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          marginBottom: "16px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f6f6f7",
                              borderBottom: "1px solid #e1e3e5",
                            }}
                          >
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                fontWeight: 600,
                              }}
                            >
                              BILLED TO
                            </th>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                fontWeight: 600,
                              }}
                            >
                              SHIP TO
                            </th>
                            <th
                              style={{
                                padding: "8px",
                                textAlign: "left",
                                fontWeight: 600,
                              }}
                            >
                              SUPPLIER
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td
                              style={{
                                padding: "8px",
                                verticalAlign: "top",
                              }}
                            >
                              {order.billingAddress ? (
                                <>
                                  <Text as="p" variant="bodySm">
                                    {order.billingAddress.name}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    {order.billingAddress.address1}
                                  </Text>
                                  {order.billingAddress.address2 && (
                                    <Text as="p" variant="bodySm">
                                      {order.billingAddress.address2}
                                    </Text>
                                  )}
                                  <Text as="p" variant="bodySm">
                                    {order.billingAddress.city},{" "}
                                    {order.billingAddress.province},{" "}
                                    {order.billingAddress.country}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    Tel: {order.billingAddress.phone}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    email: {order.customer?.email ?? order.email}
                                  </Text>
                                </>
                              ) : (
                                <Text as="p" variant="bodySm">—</Text>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                verticalAlign: "top",
                              }}
                            >
                              {order.shippingAddress ? (
                                <>
                                  <Text as="p" variant="bodySm">
                                    {order.shippingAddress.name}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    {order.shippingAddress.address1}
                                  </Text>
                                  {order.shippingAddress.address2 && (
                                    <Text as="p" variant="bodySm">
                                      {order.shippingAddress.address2}
                                    </Text>
                                  )}
                                  <Text as="p" variant="bodySm">
                                    {order.shippingAddress.city},{" "}
                                    {order.shippingAddress.province},{" "}
                                    {order.shippingAddress.country}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    Tel: {order.shippingAddress.phone}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    email: {order.customer?.email ?? order.email}
                                  </Text>
                                </>
                              ) : (
                                <Text as="p" variant="bodySm">—</Text>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "8px",
                                verticalAlign: "top",
                              }}
                            >
                              <Text as="p" variant="bodySm">
                                —
                              </Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Line items */}
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          marginBottom: "16px",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              background: "#f6f6f7",
                              borderBottom: "1px solid #e1e3e5",
                            }}
                          >
                            <th style={{ padding: "8px", textAlign: "left" }}>
                              Item
                            </th>
                            <th style={{ padding: "8px", textAlign: "center" }}>
                              Qty
                            </th>
                            <th style={{ padding: "8px", textAlign: "right" }}>
                              Rate
                            </th>
                            <th style={{ padding: "8px", textAlign: "right" }}>
                              Taxable Val
                            </th>
                            <th style={{ padding: "8px", textAlign: "right" }}>
                              Tax
                            </th>
                            <th style={{ padding: "8px", textAlign: "right" }}>
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item: any, i: number) => {
                            const price = parseFloat(
                              item.originalUnitPriceSet?.shopMoney?.amount ?? "0"
                            );
                            const qty = item.quantity ?? 1;
                            const lineTotal = price * qty;
                            const taxTotal = (item.taxLines ?? []).reduce(
                              (sum: number, tl: any) =>
                                sum +
                                parseFloat(
                                  tl.priceSet?.shopMoney?.amount ?? "0"
                                ),
                              0
                            );
                            const taxableVal = lineTotal - taxTotal;
                            const taxInfo = (item.taxLines ?? [])
                              .map(
                                (tl: any) =>
                                  `${tl.title}(${(tl.rate * 100).toFixed(0)}%) ${formatMoney(tl.priceSet?.shopMoney?.amount ?? "0", currency)}`
                              )
                              .join(" + ");
                            return (
                              <tr
                                key={i}
                                style={{
                                  borderBottom: "1px solid #f1f1f1",
                                }}
                              >
                                <td style={{ padding: "8px" }}>
                                  <Text as="p" variant="bodySm">
                                    {item.title}
                                  </Text>
                                  {item.variantTitle && (
                                    <Text
                                      as="p"
                                      variant="bodySm"
                                      tone="subdued"
                                    >
                                      {item.variantTitle}
                                    </Text>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                  }}
                                >
                                  {qty}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatMoney(price, currency)}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatMoney(taxableVal, currency)}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "right",
                                  }}
                                >
                                  <Text as="p" variant="bodySm">
                                    {taxInfo || "—"}
                                  </Text>
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatMoney(lineTotal, currency)}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Totals row */}
                          <tr
                            style={{
                              borderTop: "2px solid #e1e3e5",
                              fontWeight: 600,
                            }}
                          >
                            <td style={{ padding: "8px" }}>
                              <strong>Total</strong>
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>
                              {lineItems.reduce(
                                (s: number, li: any) =>
                                  s + (li.quantity ?? 0),
                                0
                              )}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }}>
                              {formatMoney(
                                order.subtotalPriceSet?.shopMoney?.amount ?? "0",
                                currency
                              )}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }}>
                              —
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }}>
                              {formatMoney(
                                order.totalTaxSet?.shopMoney?.amount ?? "0",
                                currency
                              )}
                            </td>
                            <td style={{ padding: "8px", textAlign: "right" }}>
                              {formatMoney(
                                order.totalPriceSet?.shopMoney?.amount ?? "0",
                                currency
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Summary */}
                      <table style={{ width: "100%", marginBottom: "16px" }}>
                        <tbody>
                          <tr>
                            <td style={{ verticalAlign: "top" }}>
                              <Text as="p" variant="bodySm">
                                <strong>Status:</strong>{" "}
                                {order.displayFinancialStatus?.toLowerCase() ?? "—"}
                              </Text>
                              <Text as="p" variant="bodySm">
                                <strong>Payment Gateway:</strong>{" "}
                                {order.paymentGatewayNames?.join(", ") ?? "—"}
                              </Text>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Text as="p" variant="bodySm">
                                Total Amount before Tax:{" "}
                                {formatMoney(
                                  order.subtotalPriceSet?.shopMoney?.amount ?? "0",
                                  currency
                                )}
                              </Text>
                              <Text as="p" variant="bodySm">
                                Total Tax Amount:{" "}
                                {formatMoney(
                                  order.totalTaxSet?.shopMoney?.amount ?? "0",
                                  currency
                                )}
                              </Text>
                              <Text as="p" variant="bodySm">
                                <strong>
                                  Total Amount After Tax:{" "}
                                  {formatMoney(
                                    order.totalPriceSet?.shopMoney?.amount ?? "0",
                                    currency
                                  )}
                                </strong>
                              </Text>
                              <Text as="p" variant="bodySm">
                                Shipping Amount:{" "}
                                {formatMoney(
                                  order.totalShippingPriceSet?.shopMoney?.amount ?? "0",
                                  currency
                                )}
                              </Text>
                              <Text as="p" variant="bodySm">
                                Total Discounts:{" "}
                                {formatMoney(
                                  order.totalDiscountsSet?.shopMoney?.amount ?? "0",
                                  currency
                                )}
                              </Text>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <Divider />
                      <div style={{ textAlign: "center", marginTop: "16px" }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          This is computer generated Invoice and hence no
                          signature is required
                        </Text>
                      </div>
                    </div>
                  </BlockStack>
                </Card>
              ))}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
