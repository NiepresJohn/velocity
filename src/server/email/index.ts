import { isDev } from '#/lib/env'
import { logger } from '#/lib/logger'

interface EmailPayload { to: string; subject: string; html: string; text?: string }

abstract class EmailAdapter {
  abstract send(payload: EmailPayload): Promise<void>
  async sendWelcome(to: string, name: string) { await this.send({ to, subject: `Welcome to Velocity, ${name}!`, html: `<h1>Welcome!</h1><p>Hi <strong>${this.escapeHtml(name)}</strong></p>` }) }
  async sendInvite(to: string, workspaceName: string, _inviterName: string, link: string) { await this.send({ to, subject: `Invited to join ${workspaceName}`, html: `<h1>You've been invited!</h1><a href="${link}">Accept Invitation</a>` }) }
  async sendPasswordReset(to: string, link: string) { await this.send({ to, subject: 'Reset your password', html: `<h1>Password Reset</h1><a href="${link}">Reset Password</a>` }) }
  protected escapeHtml(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
}

class LogEmailAdapter extends EmailAdapter {
  async send(payload: EmailPayload) {
    console.log(`[VELOCITY EMAIL] To: ${payload.to}, Subject: ${payload.subject}`)
    if (isDev) logger.info('email.sent.dev', { to: payload.to, subject: payload.subject })
  }
}

export const emailAdapter = new LogEmailAdapter()
