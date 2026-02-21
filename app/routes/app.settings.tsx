import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, Select, Button,
  BlockStack, Text, InlineStack, Toast, Frame, Box,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  let settings = await db.settings.findUnique({ where: { shop: session.shop } });
  if (!settings) {
    settings = await db.settings.create({
      data: {
        shop: session.shop,
        autoSendEnabled: false,
        trigger: "ORDER_PAID",
        emailSubject: "Your invoice for {{order.name}}",
        fromName: "",
        fromEmail: "",
      },
    });
  }
  const templates = await db.template.findMany({
    where: { shop: session.shop },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return json({ settings, templates });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  await db.settings.upsert({
    where: { shop: session.shop },
    update: {
      autoSendEnabled: true,
      trigger: form.get("trigger") as "ORDER_CREATED" | "ORDER_PAID",
      emailSubject: form.get("emailSubject") as string || "Your invoice for {{order.name}}",
      fromName: form.get("fromName") as string || "",
      fromEmail: form.get("fromEmail") as string || "",
    },
    create: {
      shop: session.shop,
      autoSendEnabled: true,
      trigger: form.get("trigger") as "ORDER_CREATED" | "ORDER_PAID",
      emailSubject: form.get("emailSubject") as string || "Your invoice for {{order.name}}",
      fromName: form.get("fromName") as string || "",
      fromEmail: form.get("fromEmail") as string || "",
    },
  });
  return json({ ok: true });
};

export default function AutomatedPDFsPage() {
  const { settings, templates } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [selectedTemplate, setSelectedTemplate] = useState(
    templates.length > 0 ? templates[0].id : ""
  );
  const [toastActive, setToastActive] = useState(false);

  const templateOptions = templates.map((t: any) => ({
    label: t.name,
    value: t.id,
  }));

  const handleSetup = () => {
    const form = new FormData();
    form.append("trigger", "ORDER_PAID");
    form.append("templateId", selectedTemplate);
    form.append("emailSubject", "Your invoice");
    form.append("fromName", "");
    form.append("fromEmail", "");
    submit(form, { method: "post" });
    setToastActive(true);
  };

  return (
    <Frame>
      <Page
        title="Automated PDFs"
        secondaryActions={[
          { content: "Help & Support", onAction: () => {} },
        ]}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <InlineStack gap="800" align="space-between" blockAlign="start">
                <BlockStack gap="400">
                  <Text variant="headingLg" as="h2">Automated PDF delivery</Text>
                  <Text as="p">
                    Deliver documents to customers automatically, by adding PDF download links
                    to your Shopify emails and website.
                  </Text>
                  <Text as="p">
                    We recommend adding an invoice/receipt link to your Shipping confirmation emails.
                  </Text>
                  <BlockStack gap="300">
                    {templateOptions.length > 0 ? (
                      <Select
                        label="Template to use"
                        options={templateOptions}
                        value={selectedTemplate}
                        onChange={setSelectedTemplate}
                      />
                    ) : (
                      <Text as="p" tone="subdued">
                        No templates found. Create a template first.
                      </Text>
                    )}
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleSetup}
                      loading={navigation.state === "submitting"}
                      disabled={!selectedTemplate}
                    >
                      Setup PDF link
                    </Button>
                  </BlockStack>
                </BlockStack>
                <div style={{ minWidth: 200, textAlign: "center" }}>
                  <svg width="180" height="180" viewBox="0 0 200 200" fill="none">
                    <circle cx="120" cy="100" r="80" fill="#E8EAFF" />
                    <rect x="40" y="50" width="100" height="120" rx="8" fill="#fff" stroke="#ccc" strokeWidth="2" />
                    <rect x="55" y="70" width="70" height="8" rx="2" fill="#e2e2e2" />
                    <rect x="55" y="86" width="50" height="6" rx="2" fill="#e2e2e2" />
                    <rect x="55" y="100" width="60" height="6" rx="2" fill="#e2e2e2" />
                    <rect x="55" y="114" width="40" height="6" rx="2" fill="#e2e2e2" />
                    <rect x="100" y="30" width="70" height="90" rx="8" fill="#3B5BDB" />
                    <text x="115" y="70" fill="#fff" fontSize="14" fontWeight="bold">PDF</text>
                    <text x="115" y="90" fill="#C5D0FF" fontSize="10">file</text>
                  </svg>
                </div>
              </InlineStack>
            </Card>
          </Layout.Section>
        </Layout>
        {toastActive && (
          <Toast content="PDF link setup saved" onDismiss={() => setToastActive(false)} />
        )}
      </Page>
    </Frame>
  );
}
