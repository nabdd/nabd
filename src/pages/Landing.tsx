import { useEffect } from 'react'
import { Nav } from '@/components/landing/Nav'
import { Hero } from '@/components/landing/Hero'
import { Bento, BloodMatch, Donors, Faq, FinalCta, Footer, HowItWorks, Stats } from '@/components/landing/Sections'

export default function Landing() {
  useEffect(() => {
    document.title = 'Nabd | Reach the right blood donors in two minutes'
  }, [])
  return (
    <div className="bg-bg">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Bento />
        <Donors />
        <BloodMatch />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
