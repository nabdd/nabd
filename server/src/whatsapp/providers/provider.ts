export interface Button {
  /** Payload echoed back by WhatsApp when tapped, e.g. "yes:42". */
  id: string
  /** Shown on the button. WhatsApp allows at most 20 characters. */
  label: string
}

export interface TemplateMessage {
  /** E.164, e.g. +96170123456 */
  to: string
  template: string
  /** Body variables {{1}}, {{2}}, ... in order. */
  params: string[]
  buttons?: Button[]
}

export interface WhatsappProvider {
  readonly name: string
  /** Business-initiated message: must use a template approved by Meta. */
  sendTemplate(msg: TemplateMessage): Promise<{ id: string }>
  /** Free-form text, allowed inside the 24 hour window after the donor replied. */
  sendText(to: string, body: string): Promise<{ id: string }>
  sendButtons(to: string, body: string, buttons: Button[]): Promise<{ id: string }>
}
