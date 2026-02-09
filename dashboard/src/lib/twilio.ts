import twilio from "twilio"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER!

export interface SendSmsParams {
  to: string
  body: string
}

export async function sendSms({ to, body }: SendSmsParams) {
  const message = await client.messages.create({
    body,
    from: FROM_NUMBER,
    to,
  })
  return {
    sid: message.sid,
    status: message.status,
    to: message.to,
  }
}

export function buildPaymentSms(
  callerName: string | null,
  checkoutUrl: string
): string {
  const name = callerName ? callerName.split(" ")[0] : "there"
  return (
    `Hey ${name}! Thanks for chatting with Riley at Lean On Us. ` +
    `Here's your secure checkout link to get started:\n\n` +
    `${checkoutUrl}\n\n` +
    `Questions? Reply to this text or call us back anytime.\n` +
    `— Lean On Us`
  )
}

export function buildFollowUpSms(callerName: string | null): string {
  const name = callerName ? callerName.split(" ")[0] : "there"
  return (
    `Hey ${name}, this is Riley from Lean On Us. ` +
    `Thanks for calling! Just wanted to follow up and see if you had any questions. ` +
    `You can reply here or call back anytime. Talk soon!`
  )
}
