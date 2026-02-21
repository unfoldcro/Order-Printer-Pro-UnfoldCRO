import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page, Layout, Card, ResourceList, ResourceItem, Text,
  Button, EmptyState, Badge, InlineStack, BlockStack
} from "@shopify/polaris";
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

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page
      title="Templates"
      primaryAction={{ content: "New Template", onAction: () => {
        const form = new FormData();
        form.append("intent", "create");
        fetch("/app/templates", { method: "POST", body: form }).then(r => {
          if (r.redirected) navigate(new URL(r.url).pathname);
        });
      }}}
    >
      <Layout>
        <Layout.Section>
          <Card>
            {templates.length === 0 ? (
              <EmptyState
                heading="No templates yet"
                action={{ content: "Create template", url: "#" }}
                image=""
              >
                <p>Create your first invoice or packing slip template.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: "template", plural: "templates" }}
                items={templates}
                renderItem={(t) => (
                  <ResourceItem id={t.id} url={`/app/templates/${t.id}`}>
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text variant="bodyMd" fontWeight="bold" as="span">{t.name}</Text>
                        <Text variant="bodySm" tone="subdued" as="span">
                          Updated {new Date(t.updatedAt).toLocaleDateString()}
                        </Text>
                      </BlockStack>
                      <Badge tone={t.type === "INVOICE" ? "info" : "success"}>{t.type}</Badge>
                    </InlineStack>
                  </ResourceItem>
                )}
              />
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
