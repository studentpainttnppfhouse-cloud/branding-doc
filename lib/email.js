const nodemailer = require('nodemailer')
const fs         = require('fs')
const path       = require('path')

function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

async function sendProofEmail({ order, mediaList }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      'SMTP credentials are not configured. ' +
      'Please set SMTP_USER and SMTP_PASS environment variables on your server.'
    )
  }
  const transporter = createTransport()

  const attachments = mediaList.map(media => {
    const filePath = path.join(__dirname, '..', '.data', 'media', media.filename)
    if (!fs.existsSync(filePath)) return null
    return { filename: media.filename, path: filePath, contentType: media.mimeType }
  }).filter(Boolean)

  const itemsHtml = order.lineItems
    ? `<ul style="margin:8px 0;padding-left:20px">${order.lineItems.split(',').map(i => `<li>${i.trim()}</li>`).join('')}</ul>`
    : ''

  const videoCount = attachments.filter(a => a.contentType?.startsWith('video')).length
  const imageCount = attachments.filter(a => a.contentType?.startsWith('image')).length

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:#0369a1;padding:28px 32px">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">📦 Delivery Proof</h1>
          <p style="margin:4px 0 0;color:#bae6fd;font-size:14px">Pre-dispatch evidence for your order</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hi ${order.customerName || 'Valued Customer'},</p>
          <p style="margin:0 0 16px;color:#475569;line-height:1.6">
            We've prepared your order and captured proof photos/videos before dispatch.
            Please review the attached media to confirm your items are in perfect condition.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
            <table width="100%" cellpadding="6">
              <tr><td style="color:#64748b;font-size:13px;width:120px">Order</td>
                  <td style="font-weight:600;color:#0f172a">${order.orderNumber}</td></tr>
              ${order.total ? `<tr><td style="color:#64748b;font-size:13px">Total</td><td style="font-weight:600;color:#0f172a">${order.total}</td></tr>` : ''}
              ${order.lineItems ? `<tr><td style="color:#64748b;font-size:13px;vertical-align:top">Items</td><td style="color:#0f172a;font-size:14px">${itemsHtml}</td></tr>` : ''}
            </table>
          </div>
          <p style="font-size:14px;color:#475569;margin:0 0 8px">
            <strong>${attachments.length} file${attachments.length !== 1 ? 's' : ''}</strong> attached:
          </p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px">
            ${videoCount ? `<li>🎬 ${videoCount} video recording${videoCount !== 1 ? 's' : ''}</li>` : ''}
            ${imageCount ? `<li>📸 ${imageCount} photo${imageCount !== 1 ? 's' : ''}</li>` : ''}
          </ul>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            If you have any concerns about your order, please reply to this email before we dispatch.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            This email was sent as part of our delivery proof process.<br>
            Please do not share these files publicly.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const info = await transporter.sendMail({
    from:    process.env.SMTP_FROM || process.env.SMTP_USER,
    to:      order.customerEmail,
    subject: `Delivery Proof for Order ${order.orderNumber}`,
    html,
    attachments,
  })

  return { messageId: info.messageId, accepted: info.accepted }
}

module.exports = { sendProofEmail }
