import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  Link,
  useBreakpoints,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const DRAFT_ORDERS_QUERY = `
  query GetDraftOrders($first: Int!) {
    draftOrders(first: $first, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          updatedAt
          status
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName }
          note2
        }
      }
    }
  }
`;

interface DraftOrderNode {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customer: { displayName: string } | null;
  note2: string | null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(DRAFT_ORDERS_QUERY, {
    variables: { first: 50 },
  });
  const data = await response.json();
  const draftOrders: DraftOrderNode[] = (
    data.data?.draftOrders?.edges ?? []
  ).map((e: any) => e.node);
  return json({ draftOrders });
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const time = d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${month} ${day}, ${time}`;
}

function formatMoney(amount: string, currency: string): string {
  const num = parseFloat(amount);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

function statusBadge(status: string) {
  const s = status.toUpperCase();
  if (s === "COMPLETED") return <Badge tone="success">Completed</Badge>;
  if (s === "OPEN") return <Badge tone="info">Open</Badge>;
  if (s === "INVOICE_SENT") return <Badge tone="attention">Invoice sent</Badge>;
  return <Badge>{status}</Badge>;
}

function extractId(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

export default function DraftOrdersPage() {
  const { draftOrders } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { smUp } = useBreakpoints();

  const resourceName = { singular: "draft order", plural: "draft orders" };

  const rowMarkup = draftOrders.map((order, index) => {
    const id = extractId(order.id);
    return (
      <IndexTable.Row
        id={id}
        key={id}
        position={index}
        onClick={() => navigate(`/app/orders/${id}?type=draft`)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            <Link url={`/app/orders/${id}?type=draft`} removeUnderline monochrome>
              {order.name}
            </Link>
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" tone="subdued">
            {formatDate(order.updatedAt)}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {order.customer?.displayName ?? "—"}
        </IndexTable.Cell>
        <IndexTable.Cell>{statusBadge(order.status)}</IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end">
            {formatMoney(
              order.totalPriceSet.shopMoney.amount,
              order.totalPriceSet.shopMoney.currencyCode
            )}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page title="Draft Orders" fullWidth>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {draftOrders.length === 0 ? (
              <EmptyState heading="No draft orders" image="">
                <p>Draft orders from your Shopify store will appear here.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={resourceName}
                itemCount={draftOrders.length}
                headings={[
                  { title: "Draft Order" },
                  { title: "Date" },
                  { title: "Customer" },
                  { title: "Status" },
                  { title: "Total", alignment: "end" },
                ]}
                selectable={false}
                condensed={!smUp}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
