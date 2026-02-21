import {
  Page,
  Layout,
  Card,
  Text,
  EmptyState,
  BlockStack,
} from "@shopify/polaris";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const logs = await db.log.findMany({
    where: {
      shop: session.shop,
      action: { in: ["PDF_GENERATED", "EMAIL_SENT"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ logs });
};

export default function ExportHistoryPage() {
  const { logs } = useLoaderData<typeof loader>();

  return (
    <Page title="Export History">
      <Layout>
        <Layout.Section>
          <Card>
            {logs.length === 0 ? (
              <EmptyState heading="No exports yet" image="">
                <p>
                  Your PDF exports and email delivery history will appear here.
                </p>
              </EmptyState>
            ) : (
              <BlockStack gap="300">
                {logs.map((log) => (
                  <Card key={log.id}>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        {log.action === "PDF_GENERATED"
                          ? "PDF Export"
                          : "Email Sent"}{" "}
                        — {log.orderId ?? "N/A"}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {new Date(log.createdAt).toLocaleString()} —{" "}
                        {log.message}
                      </Text>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
