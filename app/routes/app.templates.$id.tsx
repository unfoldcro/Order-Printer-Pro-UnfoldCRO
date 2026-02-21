import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Checkbox,
  Button, InlineStack, BlockStack, Text, Divider, Toast,
  Frame, Tabs, Banner, Box,
} from "@shopify/polaris";
import { useState, useCallback, useMemo } from "react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { renderTemplate, buildOrderData } from "../lib/renderer.server";
import { liquidVariableSections } from "../lib/liquidVariables";

const SAMPLE_ORDER = {
  name: "#1001",
  createdAt: "2026-01-01T00:00:00.000Z",
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
  return json({ template, liquidVariableSections });
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
        preselectedOrders: form.get("preselectedOrders") === "true",
        preselectedDraftOrders: form.get("preselectedDraftOrders") === "true",
        preselectedPosOrders: form.get("preselectedPosOrders") === "true",
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
  const { template, liquidVariableSections: sections } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [name, setName] = useState(template.name);
  const [type, setType] = useState(template.type);
  const [html, setHtml] = useState(template.html);
  const [css, setCss] = useState(template.css);
  const [preselectedOrders, setPreselectedOrders] = useState(template.preselectedOrders);
  const [preselectedDraftOrders, setPreselectedDraftOrders] = useState(template.preselectedDraftOrders);
  const [preselectedPosOrders, setPreselectedPosOrders] = useState(template.preselectedPosOrders);
  const [preview, setPreview] = useState<string | null>(null);
  const [toastActive, setToastActive] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [variableSearch, setVariableSearch] = useState("");

  const isSaving = navigation.state === "submitting";

  const handleSave = () => {
    const form = new FormData();
    form.append("intent", "save");
    form.append("name", name);
    form.append("type", type);
    form.append("html", html);
    form.append("css", css);
    form.append("preselectedOrders", String(preselectedOrders));
    form.append("preselectedDraftOrders", String(preselectedDraftOrders));
    form.append("preselectedPosOrders", String(preselectedPosOrders));
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
    if (data.preview) {
      setPreview(data.preview);
      setSelectedTab(1);
    }
  };

  const handleTabChange = useCallback((index: number) => {
    setSelectedTab(index);
  }, []);

  const toggleToast = useCallback(() => setToastActive(false), []);

  const tabs = [
    { id: "code", content: "Code", accessibilityLabel: "Code editor" },
    { id: "preview", content: "Preview", accessibilityLabel: "Template preview" },
    { id: "variables", content: "Liquid variables list", accessibilityLabel: "Liquid variables list" },
  ];

  const filteredSections = useMemo(() => {
    if (!variableSearch.trim()) return sections;
    const q = variableSearch.toLowerCase();
    return sections
      .map((section: any) => ({
        ...section,
        variables: section.variables.filter(
          (v: any) =>
            v.label.toLowerCase().includes(q) ||
            v.code.toLowerCase().includes(q)
        ),
      }))
      .filter((section: any) => section.variables.length > 0);
  }, [sections, variableSearch]);

  return (
    <Frame>
      <Page
        title="Edit Template"
        backAction={{ url: "/app/templates" }}
        secondaryActions={[
          { content: "Delete", destructive: true, onAction: () => {
            if (!confirm("Delete this template?")) return;
            const form = new FormData();
            form.append("intent", "delete");
            submit(form, { method: "post" });
          }},
          { content: "Help & Support", onAction: () => {} },
          { content: "Template setup", onAction: () => {} },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Banner tone="info">
              <p>
                Customize your template using HTML, CSS and Liquid tags.
                You can also use our Order Printer Templates app to create custom designs without coding.
              </p>
            </Banner>
          </Layout.Section>

          {/* General Settings */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">General Settings</Text>
              <Text as="p" tone="subdued">
                Update the template's display name and configure where it should be used by default.
              </Text>
            </BlockStack>
          </Layout.Section>
          <Layout.Section>
            <Card>
              <FormLayout>
                <TextField
                  label="Template Name"
                  value={name}
                  onChange={setName}
                  autoComplete="off"
                />
                <BlockStack gap="200">
                  <Text as="span" fontWeight="semibold">Pre-selected</Text>
                  <InlineStack gap="400">
                    <Checkbox
                      label="Orders"
                      checked={preselectedOrders}
                      onChange={setPreselectedOrders}
                    />
                    <Checkbox
                      label="Draft Orders"
                      checked={preselectedDraftOrders}
                      onChange={setPreselectedDraftOrders}
                    />
                    <Checkbox
                      label="POS Orders"
                      checked={preselectedPosOrders}
                      onChange={setPreselectedPosOrders}
                    />
                  </InlineStack>
                </BlockStack>
              </FormLayout>
            </Card>
          </Layout.Section>

          {/* Edit Template Content */}
          <Layout.Section variant="oneThird">
            <BlockStack gap="200">
              <Text variant="headingMd" as="h2">Edit Template Content</Text>
              <Text as="p" tone="subdued">
                Edit the template content using the editor.
              </Text>
            </BlockStack>
          </Layout.Section>
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                <Box padding="400">
                  {selectedTab === 0 && (
                    <BlockStack gap="400">
                      <TextField
                        label="HTML"
                        value={html}
                        onChange={setHtml}
                        multiline={20}
                        autoComplete="off"
                        monospaced
                        labelHidden
                      />
                      <TextField
                        label="CSS"
                        value={css}
                        onChange={setCss}
                        multiline={8}
                        autoComplete="off"
                        monospaced
                      />
                      <InlineStack align="end">
                        <Button variant="primary" onClick={handleSave} loading={isSaving}>
                          Save template
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="200">
                      {preview ? (
                        <div
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 4,
                            overflow: "auto",
                            maxHeight: 700,
                            background: "#fff",
                          }}
                          dangerouslySetInnerHTML={{ __html: preview }}
                        />
                      ) : (
                        <Text as="p" tone="subdued">Loading preview...</Text>
                      )}
                    </BlockStack>
                  )}

                  {selectedTab === 2 && (
                    <BlockStack gap="400">
                      <TextField
                        label="Search variables"
                        value={variableSearch}
                        onChange={setVariableSearch}
                        autoComplete="off"
                        placeholder="Search..."
                        clearButton
                        onClearButtonClick={() => setVariableSearch("")}
                        labelHidden
                      />
                      {filteredSections.map((section: any, sIdx: number) => (
                        <BlockStack gap="300" key={sIdx}>
                          <Text variant="headingMd" as="h3">{section.title}</Text>
                          {section.description && (
                            <Text as="p" tone="subdued">{section.description}</Text>
                          )}
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <tbody>
                                {section.variables.map((v: any, vIdx: number) => (
                                  <tr
                                    key={vIdx}
                                    style={{
                                      borderBottom: "1px solid #e1e3e5",
                                    }}
                                  >
                                    <td style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                                      {v.label}
                                    </td>
                                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                                      <code style={{
                                        background: "#f6f6f7",
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        fontSize: 13,
                                        wordBreak: "break-all",
                                      }}>
                                        {v.code}
                                      </code>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {sIdx < filteredSections.length - 1 && <Divider />}
                        </BlockStack>
                      ))}
                    </BlockStack>
                  )}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
        {toastActive && (
          <Toast content="Template saved" onDismiss={toggleToast} />
        )}
      </Page>
    </Frame>
  );
}
