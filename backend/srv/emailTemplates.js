// HTML wrapper for candidate emails — reuses the exact design tokens from
// the app's own src/styles/ta.css and index.css (colors + Inter/Sora fonts)
// so the email reads as the same product, not a separately invented brand.
// Table layout + inline styles throughout since email clients strip <style>
// tags and most external stylesheets; the Google Fonts <link> is included
// for the clients that do honor it (Apple Mail, some webmail), with the
// same fallback stack the app itself uses everywhere else.
const TA_TEXT = '#161a23';
const TA_TEXT_SOFT = '#6b7280';
const TA_TEXT_MUTE = '#99a0ac';
const TA_LINE = '#ecedf1';
const TA_BG = '#f7f8fa';
const TA_SURFACE = '#ffffff';
const FONT_BODY = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_DISPLAY = "'Sora','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

// Same logo file the app itself uses (src/assets/ccentrik-logo.png), inlined
// as a data URI — email clients can't reach a localhost/relative image URL,
// so this is the only way the logo actually renders in an inbox.
const fs = require('node:fs');
const path = require('node:path');
const LOGO_DATA_URI = (() => {
  try {
    const buf = fs.readFileSync(path.join(__dirname, '../../src/assets/ccentrik-logo.png'));
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
})();

// `details` is an optional ordered list of {label, value} rows rendered as
// a summary block (application id, position, candidate, date) so the email
// carries real context instead of just the one notification line.
function candidateEmailHtml({ firstName, heading, message, details = [] }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const paragraphs = String(message)
    .split('\n')
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 16px;font-family:${FONT_BODY};font-size:15px;line-height:1.7;color:${TA_TEXT_SOFT};">${line}</p>`)
    .join('');

  const detailRows = details
    .filter((d) => d && d.value)
    .map(
      (d, i, arr) => `
                    <tr>
                      <td style="padding:12px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${TA_LINE};` : ''}font-family:${FONT_BODY};font-size:12px;font-weight:600;letter-spacing:.04em;color:${TA_TEXT_MUTE};text-transform:uppercase;width:150px;">${d.label}</td>
                      <td style="padding:12px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${TA_LINE};` : ''}font-family:${FONT_BODY};font-size:14px;font-weight:500;color:${TA_TEXT};text-align:right;">${d.value}</td>
                    </tr>`
    )
    .join('');

  const detailsBlock = detailRows
    ? `
            <tr>
              <td style="padding:0 40px 36px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TA_BG};border:1px solid ${TA_LINE};border-radius:12px;padding:6px 20px;">
                  ${detailRows}
                </table>
              </td>
            </tr>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background:${TA_BG};font-family:${FONT_BODY};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TA_BG};">
      <tr>
        <td align="center" style="padding:48px 16px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${TA_SURFACE};border:1px solid ${TA_LINE};border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,28,51,0.04),0 8px 22px -12px rgba(20,28,51,0.10);">

            <!-- brand band -->
            <tr>
              <td style="background:linear-gradient(120deg,#3b6ef5,#2a53c8);padding:28px 40px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    ${LOGO_DATA_URI ? `<td style="background:#fff;border-radius:10px;padding:8px 12px;"><img src="${LOGO_DATA_URI}" alt="Ccentrik" height="20" style="display:block;height:20px;width:auto;" /></td>` : ''}
                    <td style="padding-left:14px;font-family:${FONT_DISPLAY};font-size:13px;font-weight:700;letter-spacing:.08em;color:#ffffff;text-transform:uppercase;">Talent Acquisition Portal</td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- heading -->
            <tr>
              <td style="padding:40px 40px 8px;">
                <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:13px;color:${TA_TEXT_MUTE};">${greeting}</p>
                <h1 style="margin:0 0 20px;font-family:${FONT_DISPLAY};font-size:28px;font-weight:700;color:${TA_TEXT};letter-spacing:-0.015em;line-height:1.3;">${heading}</h1>
                ${paragraphs}
              </td>
            </tr>

            ${detailsBlock}

            <!-- footer -->
            <tr>
              <td style="padding:0 40px;">
                <div style="border-top:1px solid ${TA_LINE};"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 32px;">
                <p style="margin:0 0 4px;font-family:${FONT_BODY};font-size:13px;font-weight:600;color:${TA_TEXT};">TA Portal — Talent Acquisition</p>
                <p style="margin:0;font-family:${FONT_BODY};font-size:12px;color:${TA_TEXT_MUTE};">This is an automated message. Please do not reply to this email — reach out to your recruiter for any questions.</p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-family:${FONT_BODY};font-size:11px;color:${TA_TEXT_MUTE};">&copy; ${new Date().getFullYear()} Ccentrik. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = { candidateEmailHtml };
