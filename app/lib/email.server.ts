import sgMail from "@sendgrid/mail";

export async function sendEmailWithPdf({
  to,
  fromName,
  fromEmail,
  subject,
  html,
  pdfBuffer,
  fileName,
}: {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  fileName: string;
}): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY not configured");
  sgMail.setApiKey(apiKey);
  await sgMail.send({
    to,
    from: { name: fromName, email: fromEmail },
    subject,
    html,
    attachments: [
      {
        content: pdfBuffer.toString("base64"),
        filename: fileName,
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  });
}
