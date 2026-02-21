import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  const order = payload as any;

  const settings = await db.settings.findUnique({ where: { shop } });

  if (settings?.autoSendEnabled && settings.trigger === "ORDER_PAID") {
    const customerEmail = order.email ?? order.customer?.email;
    if (customerEmail) {
      const template = await db.template.findFirst({
        where: { shop, type: "INVOICE" },
        orderBy: { updatedAt: "desc" },
      });
      if (template) {
        await db.job.create({
          data: {
            shop,
            type: "SEND_DOCUMENT",
            payloadJson: JSON.stringify({
              orderId: `gid://shopify/Order/${order.id}`,
              templateId: template.id,
              customerEmail,
            }),
            status: "PENDING",
          },
        });
      }
    }
  }

  return new Response(null, { status: 200 });
};
