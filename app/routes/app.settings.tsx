import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page, Layout, Card, FormLayout, TextField, Select, Checkbox,
  Button, BlockStack, Text, Toast, Frame
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
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  await db.settings.upsert({
    where: { shop: session.shop },
    update: {
      autoSendEnabled: form.get("autoSendEnabled") === "true",
      trigger: form.get("trigger") as "ORDER_CREATED" | "ORDER_PAID",
      emailSubject: form.get("emailSubject") as string,
      fromName: form.get("fromName") as string,
      fromEmail: form.get("fromEmail") as string,
    },
    create: {
      shop: session.shop,
      autoSendEnabled: form.get("autoSendEnabled") === "true",
      trigger: form.get("trigger") as "ORDER_CREATED" | "ORDER_PAID",
      emailSubject: form.get("emailSubject") as string,
      fromName: form.get("fromName") as string,
      fromEmail: form.get("fromEmail") as string,
    },
  });
  return json({ ok: true });
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [autoSend, setAutoSend] = useState(settings.autoSendEnabled);
  const [trigger, setTrigger] = useState(settings.trigger);
  const [subject, setSubject] = useState(settings.emailSubject);
  const [fromName, setFromName] = useState(settings.fromName);
  const [fromEmail, setFromEmail] = useState(settings.fromEmail);
  const [toastActive, setToastActive] = useState(false);

  const handleSave = () => {
    const form = new FormData();
    form.append("autoSendEnabled", String(autoSend));
    form.append("trigger", trigger);
    form.append("emailSubject", subject);
    form.append("fromName", fromName);
    form.append("fromEmail", fromEmail);
    submit(form, { method: "post" });
    setToastActive(true);
  };

  return (
    <Frame>
      <Page
        title="Email Settings"
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading: navigation.state === "submitting",
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <FormLayout>
                <Checkbox
                  label="Enable auto-send"
                  checked={autoSend}
                  onChange={setAutoSend}
                  helpText="Automatically email documents when an order event occurs."
                />
                <Select
                  label="Trigger event"
                  options={[
                    { label: "Order Created", value: "ORDER_CREATED" },
                    { label: "Order Paid", value: "ORDER_PAID" },
                  ]}
                  value={trigger}
                  onChange={(v) => setTrigger(v as any)}
                  disabled={!autoSend}
                />
                <TextField
                  label="Email Subject"
                  value={subject}
                  onChange={setSubject}
                  autoComplete="off"
                  helpText="Supports {{order.name}} token."
                  disabled={!autoSend}
                />
                <TextField
                  label="From Name"
                  value={fromName}
                  onChange={setFromName}
                  autoComplete="off"
                  disabled={!autoSend}
                />
                <TextField
                  label="From Email"
                  value={fromEmail}
                  onChange={setFromEmail}
                  autoComplete="email"
                  type="email"
                  disabled={!autoSend}
                />
              </FormLayout>
            </Card>
          </Layout.Section>
        </Layout>
        {toastActive && (
          <Toast content="Settings saved" onDismiss={() => setToastActive(false)} />
        )}
      </Page>
    </Frame>
  );
}
