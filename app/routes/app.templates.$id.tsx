import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, Form } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Select,
  Button, InlineStack, BlockStack, Text, Divider, Toast, Frame
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { renderTemplate, buildOrderData } from "../lib/renderer.server";

const SAMPLE_ORDER = {
  name: "#1001",
  createdAt: new Date().toISOString(),
  email: "customer@example.com",
  totalPriceSet: { shopMoney: { amount: "99.00", currencyCode: "USD" } },
  subtotalPriceSet: { shopMoney: { amount: "89.00" } },
  totalTaxSet: { shopMoney: { amount: "8.00" } },
  totalShippingPriceSet: { shopMoney: { amount: "2.00" } },
  customer: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
  shippingAddress: {
    address1: "123 Main St",
    address2: "",
    city: "New York",
    province: "NY",
    zip: "10001",
    country: "US",
  },
  lineItems: {
    edges: [
      { node: { title: "Sample Product", quantity: 2, originalUnitPrice: "44.50", sku: "SKU-001", variantTitle: "Default" } },
    ],
  },
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const template = await db.template.findFirst({
    where: { id: params.id, shop: session.shop },
  });
  if (!template) throw new Response("Not found", { status: 404 });
  return json({ template });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "save") {
    await db.template.updateMany({
      where: { id: params.id, shop: session.shop },
      data: {
        name: form.get("name") as string,
        type: form.get("type") as "INVOICE" | "PACKING_SLIP",
        html: form.get("html") as string,
        css: form.get("css") as string,
      },
    });
    return json({ ok: true, saved: true });
  }

  if (intent === "preview") {
    const html = form.get("html") as string;
    const css = form.get("css") as string;
    const orderData = buildOrderData(SAMPLE_ORDER);
    const rendered = renderTemplate(html, css, orderData);
    return json({ ok: true, preview: rendered });
  }

  if (intent === "delete") {
    await db.template.deleteMany({ where: { id: params.id, shop: session.shop } });
    return redirect("/app/templates");
  }

  return json({ ok: false });
};

export default function TemplateEditor() {
  const { template } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [name, setName] = useState(template.name);
  const [type, setType] = useState(template.type);
  const [html, setHtml] = useState(template.html);
  const [css, setCss] = useState(template.css);
  const [preview, setPreview] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);

  const isSaving = navigation.state === "submitting";

  const handleSave = () => {
    const form = new FormData();
    form.append("intent", "save");
    form.append("name", name);
    form.append("type", type);
    form.append("html", html);
    form.append("css", css);
    submit(form, { method: "post" });
    setToastActive(true);
  };

  const handlePreview = async () => {
    const form = new FormData();
    form.append("intent", "preview");
    form.append("html", html);
    form.append("css", css);
    const res = await fetch(window.location.href, { method: "POST", body: form });
    const data = await res.json();
    if (data.preview) setPreview(data.preview);
  };

  const toggleToast = useCallback(() => setToastActive(false), []);

  return (
    <Frame>
      <Page
        title={template.name}
        backAction={{ url: "/app/templates" }}
        primaryAction={{ content: "Save", onAction: handleSave, loading: isSaving }}
        secondaryActions={[
          { content: "Preview", onAction: handlePreview },
          {
            content: "Delete", destructive: true,
            onAction: () => {
              const form = new FormData();
              form.append("intent", "delete");
              submit(form, { method: "post" });
            },
          },
        ]}
      >
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <FormLayout>
                  <TextField label="Template Name" value={name} onChange={setName} autoComplete="off" />
                  <Select
                    label="Type"
                    options={[
                      { label: "Invoice", value: "INVOICE" },
                      { label: "Packing Slip", value: "PACKING_SLIP" },
                    ]}
                    value={type}
                    onChange={(v) => setType(v as any)}
                  />
                  <TextField
                    label="HTML"
                    value={html}
                    onChange={setHtml}
                    multiline={15}
                    autoComplete="off"
                    monospaced
                    helpText="Use {{order.name}}, {{order.createdAt}}, {{customer.email}}, {{#each order.lineItems}}"
                  />
                  <TextField
                    label="CSS"
                    value={css}
                    onChange={setCss}
                    multiline={8}
                    autoComplete="off"
                    monospaced
                  />
                </FormLayout>
              </Card>
              {preview && (
                <Card>
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">Preview</Text>
                    <Divider />
                    <div
                      style={{ border: "1px solid #ddd", borderRadius: 4, overflow: "hidden" }}
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>
        {toastActive && (
          <Toast content="Template saved" onDismiss={toggleToast} />
        )}
      </Page>
    </Frame>
  );
}
