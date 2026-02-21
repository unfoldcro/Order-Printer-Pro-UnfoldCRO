import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page, Layout, Card, Text, Button, EmptyState,
  IndexTable, InlineStack, BlockStack, Banner, Tooltip, Icon,
  useBreakpoints,
} from "@shopify/polaris";
import { EditIcon, SettingsIcon, DeleteIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const templates = await db.template.findMany({
    where: { shop: session.shop },
    orderBy: { updatedAt: "desc" },
  });
  return json({ templates });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");
  if (intent === "create") {
    const template = await db.template.create({
      data: {
        shop: session.shop,
        type: "INVOICE",
        name: "New Template",
        html: "<h1>{{order.name}}</h1><p>Date: {{order.createdAt}}</p>",
        css: "body { font-family: sans-serif; }",
        preselectedOrders: false,
        preselectedDraftOrders: false,
        preselectedPosOrders: false,
      },
    });
    return redirect(`/app/templates/${template.id}`);
  }
  if (intent === "delete") {
    const id = form.get("id") as string;
    await db.template.deleteMany({ where: { id, shop: session.shop } });
    return json({ ok: true });
  }
  return json({ ok: false });
};

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(diffDays / 365);
  return years === 1 ? "last year" : `${years} years ago`;
}

function preselectedLabel(t: any): string {
  const parts: string[] = [];
  if (t.preselectedOrders) parts.push("Orders");
  if (t.preselectedDraftOrders) parts.push("Draft Orders");
  if (t.preselectedPosOrders) parts.push("POS Orders");
  return parts.length > 0 ? parts.join(", ") : "Select defaults";
}

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const { smUp } = useBreakpoints();

  const handleCreate = () => {
    const form = new FormData();
    form.append("intent", "create");
    submit(form, { method: "post" });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", id);
    submit(form, { method: "post" });
  };

  const resourceName = { singular: "template", plural: "templates" };

  const rowMarkup = templates.map((t: any, index: number) => (
    <IndexTable.Row
      id={t.id}
      key={t.id}
      position={index}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">{t.name}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{preselectedLabel(t)}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span" tone="subdued">{formatTimeAgo(t.updatedAt)}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{t.pdfDownloads ?? 0}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200" align="end">
          <Tooltip content="Edit template">
            <Button
              icon={EditIcon}
              variant="plain"
              onClick={() => navigate(`/app/templates/${t.id}`)}
              accessibilityLabel="Edit template"
            />
          </Tooltip>
          <Tooltip content="Template settings">
            <Button
              icon={SettingsIcon}
              variant="plain"
              onClick={() => navigate(`/app/templates/${t.id}`)}
              accessibilityLabel="Template settings"
            />
          </Tooltip>
          <Tooltip content="Delete template">
            <Button
              icon={DeleteIcon}
              variant="plain"
              tone="critical"
              onClick={() => handleDelete(t.id)}
              accessibilityLabel="Delete template"
            />
          </Tooltip>
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Manage Templates"
      primaryAction={{
        content: "Create Template",
        onAction: handleCreate,
      }}
      secondaryActions={[
        { content: "Customize Branding", onAction: () => {} },
        { content: "Help & Support", onAction: () => {} },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            <p>
              Templates are used to generate documents for your customer orders.
              Each template can be used for printing, exporting and Automated PDF delivery.
            </p>
          </Banner>
        </Layout.Section>
        <Layout.Section>
          <Card padding="0">
            {templates.length === 0 ? (
              <EmptyState
                heading="No templates yet"
                action={{ content: "Create Template", onAction: handleCreate }}
                image=""
              >
                <p>Create your first invoice or packing slip template.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={resourceName}
                itemCount={templates.length}
                headings={[
                  { title: "Name" },
                  { title: "Pre-selected Templates" },
                  { title: "Last Modified" },
                  { title: "PDF Downloads" },
                  { title: "Actions", alignment: "end" },
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
