import nodemailer from 'nodemailer'
import { env, isDev, isProduction } from '#/lib/env'
import { logger } from '#/lib/logger'

export interface EmailPayload { to: string; subject: string; html: string; text: string }

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function layout(title: string, body: string, cta: { label: string; link: string }) {
  const link = escapeHtml(cta.link)
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#172b4d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #dfe1e6;border-radius:3px;padding:24px">
<tr><td><div style="font-weight:700;color:#0052cc;font-size:16px;margin-bottom:16px">Velocity</div>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
<p style="font-size:14px;line-height:1.5;margin:0 0 20px">${body}</p>
<a href="${link}" style="display:inline-block;background:#0052cc;color:#fff;text-decoration:none;padding:8px 16px;border-radius:3px;font-size:14px;font-weight:500">${escapeHtml(cta.label)}</a>
<p style="font-size:12px;color:#5e6c84;margin:20px 0 0">If the button does not work, paste this link into your browser:<br>${link}</p>
</td></tr></table></td></tr></table></body></html>`
}

export const templates = {
  welcome: (name: string): Omit<EmailPayload, 'to'> => ({
    subject: `Welcome to Velocity, ${name}!`,
    text: `Hi ${name},\n\nWelcome to Velocity. Your workspace is ready.\n\n${env.APP_URL}/app\n`,
    html: layout('Welcome to Velocity', `Hi <strong>${escapeHtml(name)}</strong>, your workspace is ready.`, { label: 'Open Velocity', link: `${env.APP_URL}/app` }),
  }),
  invite: (workspaceName: string, inviterName: string, link: string): Omit<EmailPayload, 'to'> => ({
    subject: `${inviterName} invited you to ${workspaceName} on Velocity`,
    text: `${inviterName} invited you to join "${workspaceName}" on Velocity.\n\nAccept the invitation: ${link}\n\nThe link expires; if you did not expect this, ignore this email.\n`,
    html: layout(`Join ${workspaceName}`, `<strong>${escapeHtml(inviterName)}</strong> invited you to join <strong>${escapeHtml(workspaceName)}</strong> on Velocity. If you did not expect this, ignore this email.`, { label: 'Accept invitation', link }),
  }),
  passwordReset: (link: string): Omit<EmailPayload, 'to'> => ({
    subject: 'Reset your Velocity password',
    text: `We received a request to reset your Velocity password.\n\nChoose a new password: ${link}\n\nThe link expires in 1 hour and works once. If you did not ask for this, ignore this email.\n`,
    html: layout('Reset your password', 'We received a request to reset your password. The link expires in 1 hour and works once. If you did not ask for this, ignore this email.', { label: 'Reset password', link }),
  }),
}

abstract class EmailAdapter {
  abstract send(payload: EmailPayload): Promise<void>
  sendWelcome(to: string, name: string) { return this.send({ to, ...templates.welcome(name) }) }
  sendInvite(to: string, workspaceName: string, inviterName: string, link: string) { return this.send({ to, ...templates.invite(workspaceName, inviterName, link) }) }
  sendPasswordReset(to: string, link: string) { return this.send({ to, ...templates.passwordReset(link) }) }
}

/** Dev: print the mail (links included) to the server log. Production: metadata only, never the body. */
class LogEmailAdapter extends EmailAdapter {
  async send(p: EmailPayload) {
    if (isDev) logger.info('email.dev', { to: p.to, subject: p.subject, text: p.text })
    else logger.warn('email.not_delivered', { to: p.to, subject: p.subject, reason: 'EMAIL_PROVIDER is not smtp' })
  }
}

class NoEmailAdapter extends EmailAdapter {
  async send(p: EmailPayload) { logger.warn('email.disabled', { subject: p.subject }) }
}

class SmtpEmailAdapter extends EmailAdapter {
  private transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  })
  async send(p: EmailPayload) {
    await this.transport.sendMail({ from: env.EMAIL_FROM, to: p.to, subject: p.subject, text: p.text, html: p.html })
    logger.info('email.sent', { subject: p.subject })
  }
}

function createAdapter(): EmailAdapter {
  if (env.EMAIL_PROVIDER === 'none') return new NoEmailAdapter()
  if (env.EMAIL_PROVIDER === 'smtp') {
    if (!env.SMTP_HOST || !env.EMAIL_FROM) {
      if (isProduction) throw new Error('EMAIL_PROVIDER=smtp requires SMTP_HOST and EMAIL_FROM')
      logger.warn('email.smtp_misconfigured_falling_back_to_log')
      return new LogEmailAdapter()
    }
    return new SmtpEmailAdapter()
  }
  return new LogEmailAdapter()
}

export const emailAdapter = createAdapter()
