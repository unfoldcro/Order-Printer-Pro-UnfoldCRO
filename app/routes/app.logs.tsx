import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page, Layout, Card, DataTable, Badge, Text, EmptyState, BlockStack
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const action = url.searchParams.get("action") || "";

  const logs = await db.log.findMany({
    where: {
      shop: session.shop,
      ...(status ? { status } : {}),
      ...(action ? { action: action as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return json({ logs });
};

export default function LogsPage() {
  const { logs } = useLoaderData<typeof loader>();

  const rows = logs.map((l) => [
    new Date(l.createdAt).toLocaleString(),
    <Badge tone={l.action === "ERROR" ? "critical" : l.action === "EMAIL_SENT" ? "success" : "info"}>
      {l.action}
    </Badge>,
    l.orderId ?? "-",
    <Badge tone={l.status === "success" ? "success" : "critical"}>{l.status}</Badge>,
    l.message,
  ]);

  return (
    <Page title="Logs">
      <Layout>
        <Layout.Section>
          <Card>
            {logs.length === 0 ? (
              <EmptyState heading="No logs yet" image="">
                <p>Logs will appear here after PDFs are generated or emails are sent.</p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={["Date", "Action", "Order ID", "Status", "Message"]}
                rows={rows}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
