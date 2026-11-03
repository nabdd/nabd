import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { Phone, WhatsAppChat } from '@/components/WhatsAppChat'
import { Logo } from '@/components/ui'

export default function WhatsAppDemo() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center gap-8 bg-bg px-5 py-8">
      <div className="flex w-full max-w-5xl items-center justify-between">
        <Logo />
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> Back home
        </Link>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">What a donor sees</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-2">The full WhatsApp conversation, from the first message to the reception code.</p>
      </div>
      <Phone statusBg="#075e54" className="max-w-[360px]">
        <WhatsAppChat />
      </Phone>
    </div>
  )
}
