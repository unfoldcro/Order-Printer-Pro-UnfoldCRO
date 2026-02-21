import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Page, Layout, Card, Text, Button, BlockStack, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: { request: Request }) => {
  const { session } = await authenticate.admin(request);
  const [templateCount, logCount] = await Promise.all([
    db.template.count({ where: { shop: session.shop } }),
    db.log.count({ where: { shop: session.shop } }),
  ]);
  return json({ templateCount, logCount });
};

export default function Index() {
  const { templateCount, logCount } = useLoaderData<typeof loader>();
  return (
    <Page title="Order Docs Printer">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Welcome to Order Docs Printer</Text>
                <Text as="p" tone="subdued">
                  Generate invoices and packing slips, auto-email documents, and track all activity.
                </Text>
                <InlineStack gap="300">
                  <Button url="/app/templates">Manage Templates ({String(templateCount)})</Button>
                  <Button url="/app/settings">Settings</Button>
                  <Button url="/app/logs">View Logs ({String(logCount)})</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
