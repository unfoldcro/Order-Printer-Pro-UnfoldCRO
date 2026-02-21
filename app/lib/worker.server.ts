import { db } from "../db.server";
import { buildOrderData, renderTemplate } from "./renderer.server";
import { generatePdf } from "./pdf.server";
import { sendEmailWithPdf } from "./email.server";

const ORDER_QUERY = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      name
      createdAt
      email
      totalPriceSet { shopMoney { amount currencyCode } }
      subtotalPriceSet { shopMoney { amount } }
      totalTaxSet { shopMoney { amount } }
      totalShippingPriceSet { shopMoney { amount } }
      customer { firstName lastName email }
      shippingAddress { address1 address2 city province zip country }
      lineItems(first: 50) {
        edges {
          node { title quantity originalUnitPrice sku variantTitle }
        }
      }
    }
  }
`;

export async function processJob(jobId: string): Promise<void> {
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "PENDING") return;

  await db.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", attempts: { increment: 1 } },
  });

  try {
    const payload = JSON.parse(job.payloadJson);
    if (job.type === "SEND_DOCUMENT") {
      await processSendDocument(job.shop, payload);
    }
    await db.job.update({ where: { id: jobId }, data: { status: "SUCCESS" } });
  } catch (err: any) {
    await db.job.update({
      where: { id: jobId },
      data: { status: "FAILED", lastError: err.message },
    });
    await db.log.create({
      data: {
        shop: job.shop,
        action: "ERROR",
        orderId: JSON.parse(job.payloadJson).orderId ?? null,
        status: "failed",
        message: err.message,
      },
    });
  }
}

async function processSendDocument(
  shop: string,
  payload: { orderId: string; templateId: string; customerEmail: string }
): Promise<void> {
  const [template, settings, session] = await Promise.all([
    db.template.findUnique({ where: { id: payload.templateId } }),
    db.settings.findUnique({ where: { shop } }),
    db.session.findFirst({ where: { shop, isOnline: false } }),
  ]);

  if (!template) throw new Error("Template not found");
  if (!settings) throw new Error("Settings not found");
  if (!session) throw new Error("No session for shop");

  // Fetch order via Admin API
  const res = await fetch(
    `https://${shop}/admin/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": session.accessToken,
      },
      body: JSON.stringify({
        query: ORDER_QUERY,
        variables: { id: payload.orderId },
      }),
    }
  );
  const { data } = await res.json();
  const orderData = buildOrderData(data.order);
  const html = renderTemplate(template.html, template.css, orderData);
  const pdfBuffer = await generatePdf(html);

  await sendEmailWithPdf({
    to: payload.customerEmail,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    subject: settings.emailSubject.replace("{{order.name}}", orderData.name),
    html: `<p>Please find your document attached.</p>`,
    pdfBuffer,
    fileName: `${orderData.name.replace("#", "")}.pdf`,
  });

  await db.log.create({
    data: {
      shop,
      action: "EMAIL_SENT",
      orderId: payload.orderId,
      status: "success",
      message: `Email sent to ${payload.customerEmail}`,
    },
  });
}
