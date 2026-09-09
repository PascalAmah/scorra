// ─────────────────────────────────────────────────────────────
// Shared email layout — echoes the Scorra brand (dark header bar
// with logo, white body card, beige page background).
//
// Templates import `layout()` plus the small building blocks and
// compose their own body HTML from them.
// ─────────────────────────────────────────────────────────────

export interface EmailLayoutOptions {
  preheader: string;
  eyebrow: string;
  title: string;
  bodyHtml: string;
  footerNote: string;
}

export const LOGO_HTML = `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="vertical-align:middle;padding-right:9px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="12" r="8.5" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="11" cy="12" r="2.6" fill="#FFFFFF"/>
      <path d="M11 3.5V6.5M11 17.5V20.5M2.5 12H5.5M16.5 12H19.5" stroke="#FFFFFF" stroke-width="1.6"/>
      <path d="M18.5 4L23 2L21 6.5L19.4 5L18.5 4Z" fill="#FFFFFF"/>
    </svg>
  </td>
  <td style="vertical-align:middle;">
    <span style="font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:19px;color:#FFFFFF;letter-spacing:0.01em;">SCORRA</span>
  </td>
</tr></table>`;

export const FOOTER_HTML = (footerNote: string) => `<tr>
  <td style="background-color:#F5F5F1;padding:28px 40px;border-radius:0 0 12px 12px;">
    <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:12px;color:#8C8C8C;line-height:1.6;margin:0 0 6px;">
      ${footerNote}
    </p>
    <p style="font-family:'IBM Plex Mono',Courier,monospace;font-size:11px;color:#B4B4B0;margin:14px 0 0;">
      &copy; ${new Date().getFullYear()} Scorra. Quality is measurable.
    </p>
  </td>
</tr>`;

export const CTA_BUTTON_HTML = (url: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
  <td style="border-radius:4px;background-color:#0A0A0A;">
    <a href="${url}" style="display:inline-block;font-family:'IBM Plex Sans',Arial,sans-serif;font-weight:600;font-size:14px;color:#FFFFFF;padding:13px 26px;text-decoration:none;border-radius:4px;">
      ${label}
    </a>
  </td>
</tr></table>`;

export function layout(options: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<!--[if mso]>
<style>
  body, table, td { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F5F5F1;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${options.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F1;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background-color:#0A0A0A;border-radius:12px 12px 0 0;padding:28px 40px;">${LOGO_HTML}</td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF;border:1px solid #D8D8D4;border-top:none;padding:44px 40px 40px;">
              <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5C5C5C;">&#9679;&nbsp; ${options.eyebrow}</span>
              <h1 style="font-family:'Sora',Arial,sans-serif;font-weight:600;font-size:28px;line-height:1.2;color:#0A0A0A;letter-spacing:-0.01em;margin:16px 0 14px;">${options.title}</h1>
              ${options.bodyHtml}
            </td>
          </tr>
          ${FOOTER_HTML(options.footerNote)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Escape user-supplied values before interpolating them into HTML. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Paragraph used across template bodies. */
export const PARAGRAPH_HTML = (content: string, marginBottom = 28) =>
  `<p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:15px;line-height:1.65;color:#333333;margin:0 0 ${marginBottom}px;">${content}</p>`;
