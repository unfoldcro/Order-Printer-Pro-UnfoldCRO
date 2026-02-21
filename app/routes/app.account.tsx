import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import {
  Page, Layout, Card, BlockStack, Text, InlineStack,
  Badge, Button, Link, IndexTable, useBreakpoints,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

const SHOP_QUERY = `
  query GetShop {
    shop {
      name
      email
      myshopifyDomain
      plan { displayName }
      billingAddress { address1 city province country zip phone }
      currencyCode
      primaryDomain { url }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(SHOP_QUERY);
  const data = await response.json();
  const shop = data.data?.shop ?? {};

  const templateCount = await db.template.count({
    where: { shop: session.shop },
  });

  const now = new Date();
  const installedDate = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return json({ shop, shopDomain: session.shop, templateCount, installedDate });
};

export default function AccountPage() {
  const { shop, shopDomain, templateCount, installedDate } = useLoaderData<typeof loader>();
  const { smUp } = useBreakpoints();
  const revalidator = useRevalidator();

  return (
    <Page title="Account">
      <Layout>
        {/* Subscription */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingLg" as="h2">Subscription</Text>
                <Badge tone="success">Subscribed</Badge>
              </InlineStack>
              <Text as="p">
                Your store is on the current plan.
              </Text>
              <Text as="p" tone="subdued">
                Note: Order Printer Pro selects your plan based on your store's order volume
                over the past 30 days. After your free trial ends, the app continues to track
                your monthly orders. If you receive fewer orders in a month, you'll remain on
                your current plan. If you exceed the limit, you'll be upgraded to the next paid
                plan, so you only pay more when your store's activity increases.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Store details */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text variant="headingLg" as="h2">Store details</Text>
                <InlineStack gap="200">
                  <Button onClick={() => revalidator.revalidate()}>Refresh store details</Button>
                  <Button>Customize branding</Button>
                </InlineStack>
              </InlineStack>
              <BlockStack gap="200">
                <InlineStack gap="200">
                  <Text as="span" fontWeight="bold">Store name:</Text>
                  <Text as="span">{shop.name ?? "—"}</Text>
                </InlineStack>
                <InlineStack gap="200">
                  <Text as="span" fontWeight="bold">Custom domain for PDF links:</Text>
                  <Text as="span">{shop.primaryDomain?.url ?? shopDomain}</Text>
                </InlineStack>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Templates */}
        <Layout.Section>
          <Card>
            <InlineStack align="space-between">
              <BlockStack gap="200">
                <Text variant="headingLg" as="h2">Templates</Text>
                <Text as="p">
                  <Text as="span" fontWeight="bold">Templates:</Text>{" "}
                  {templateCount} template(s) setup.
                </Text>
                <Text as="p">
                  Create or edit a template on the{" "}
                  <Link url="/app/templates">Manage Templates page</Link>.
                </Text>
              </BlockStack>
              <Badge tone="info">{String(templateCount)}</Badge>
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* Account history */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingLg" as="h2">Account history</Text>
              <IndexTable
                resourceName={{ singular: "event", plural: "events" }}
                itemCount={2}
                headings={[
                  { title: "Date" },
                  { title: "Action" },
                  { title: "Details" },
                ]}
                selectable={false}
                condensed={!smUp}
              >
                <IndexTable.Row id="1" position={0}>
                  <IndexTable.Cell>
                    <Text as="span">{installedDate}</Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge tone="success">Subscription approved</Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span">Subscription started.</Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
                <IndexTable.Row id="2" position={1}>
                  <IndexTable.Cell>
                    <Text as="span">{installedDate}</Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge>Installed</Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span">App installed by shop owner.</Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              </IndexTable>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Uninstall */}
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingLg" as="h2">Uninstall and cancel subscription</Text>
              <Text as="p">
                You can uninstall Order Printer Pro from the{" "}
                <Link url={`https://${shopDomain}/admin/settings/apps`} external>
                  Apps section of your Shopify admin
                </Link>
                . Your trial and/or subscription will be automatically cancelled when you uninstall.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
