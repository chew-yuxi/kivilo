import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingHeader } from '../components/landing-header'
import { LandingWalkthrough } from '../components/landing-walkthrough'
import { FREE_ACTIVE_PROPERTIES } from '../../src/lib/plan-limits'
import styles from './landing.module.css'
const title = 'Kivilo | Property handovers, check-in & check-out reports'
const description = `Take photos and mark damage with circles, freehand or arrows. Write inventories, collect signatures and compare check-in with check-out. ${FREE_ACTIVE_PROPERTIES} active properties free.`
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: 'https://kivilo.app' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', url: 'https://kivilo.app', siteName: 'Kivilo', locale: 'en_SG',
    title: 'Hand over the keys. Keep the whole story. | Kivilo', description,
    images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: 'Kivilo — Hand over the keys. Keep the whole story.' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image.png'] },
}
const faqs = [
  { question: 'What is Kivilo?', answer: 'Kivilo is a property handover and tenancy record app for agents, landlords and tenants. It brings room-by-room inventories, condition photos, walkthrough videos, signatures, repairs and check-out assessments into one property record. Built in Singapore, for the people on both sides of the keys.' },
  { question: 'Can I try it for free?', answer: `Yes. The free plan includes ${FREE_ACTIVE_PROPERTIES} active properties, with no credit card required. Sign in with your email and start your first check-in. If you manage more properties, get in touch through our support page.` },
  { question: 'Can I mark a photo as soon as I take it?', answer: 'Yes. Take a photo, then circle the damage, draw freehand around a detail or point to it with an arrow. Save it with the room or inventory item so everyone knows exactly what you mean. Marks stay separate from the original photo and you can edit them until you send the report for signature.' },
  { question: 'How do the landlord and tenant sign?', answer: 'Both parties can review and sign on the agent’s device at the handover, or sign in to their own account using an emailed code. Once both have signed, a PDF copy is delivered by email. Larger reports are available through a signed-in download link.' },
  { question: 'What happens if the property has poor signal?', answer: 'Photos and videos save to your device first and retry uploading when a connection is available. Keep the app and its saved data on your phone until uploads finish. Sending the report and collecting signatures need a connection.' },
  { question: 'What happens at check-out?', answer: 'Start from the signed check-in and any agreed updates. Review the original condition and linked photos alongside the new visit, record each change and explain your assessment of damage or fair wear and tear. Publish a dated deposit statement that the landlord and tenant can agree to or dispute. Kivilo records the assessment; it does not hold or move the deposit.' },
  { question: 'Who can see the property record?', answer: 'Working records are available to the responsible agent and the people explicitly given access. Landlords and tenants have their own view of their tenancy. You can also create a private report link and revoke it later. Property reports are not public search results.' },
]
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': 'https://kivilo.app/#organization', name: 'Kivilo', url: 'https://kivilo.app', logo: 'https://kivilo.app/icon-512.png', parentOrganization: { '@type': 'Organization', name: 'NotTooSweetLabs Pte. Ltd.' } },
    { '@type': 'WebSite', '@id': 'https://kivilo.app/#website', name: 'Kivilo', url: 'https://kivilo.app', inLanguage: 'en', publisher: { '@id': 'https://kivilo.app/#organization' } },
    { '@type': 'SoftwareApplication', name: 'Kivilo', url: 'https://kivilo.app', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description, featureList: ['Photo markup with circles, freehand and arrows', 'Room-by-room property inventories', 'Photo and video evidence', 'Landlord and tenant signatures', 'Tenancy repair history', 'Check-in and check-out comparison', 'PDF condition reports'], publisher: { '@id': 'https://kivilo.app/#organization' } },
  ],
}
// Public, static and session-free. All examples are illustrative, never tenancy data.
export default function LandingPage() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <a href="#main" className={styles.skipLink}>Skip to content</a>
      <LandingHeader>
        <nav className={styles.exploreNavigation} aria-label="Explore Kivilo">
          <a href="#how-it-works">How it works</a>
          <a href="#whole-tenancy">The whole tenancy</a>
        </nav>
        <Link className={styles.wordmark} href="/" aria-label="Kivilo home"><span className={styles.brandMark} aria-hidden="true" />kivilo</Link>
        <nav className={styles.navigation} aria-label="Main navigation">
          <a className={styles.desktopLink} href="#questions">FAQs</a>
          <Link href="https://my.kivilo.app/login">Log in</Link>
          <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.smallButton}>Start free</Link>
        </nav>
      </LandingHeader>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <h1 id="hero-title">Hand over the keys.<br />Keep the whole story.</h1>
            <p className={styles.heroDescription}>Take a photo. Mark what matters. Get everyone’s signatures.<br className={styles.desktopBreak} /> The little details, all in one shared record.</p>
            <div className={styles.heroActions}>
              <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.primaryButton}>Start your first handover</Link>
            </div>
            <p className={styles.freeNote}>{FREE_ACTIVE_PROPERTIES} active properties, free. No credit card needed.</p>
          </div>
          <div className={styles.heroArt} aria-hidden="true">
            <Image src="/art/tenancy-scenes.webp" alt="" width={2172} height={724}
              sizes="(max-width: 700px) 900px, 100vw" className={styles.heroPanorama} priority unoptimized />
          </div>
        </section>
        <div className={styles.promiseStrip}>
          <span>For the agent taking care of it.</span>
          <span>For the landlord handing it over.</span>
          <span>For the tenant making it home.</span>
        </div>
        <section id="how-it-works" className={styles.walkthrough} aria-labelledby="how-title">
          <div className={styles.sectionHeading}>
            <h2 id="how-title">All the detail.<br />Less of the admin.</h2>
            <p>Take the photo, mark what matters and write the inventory as you go.<br className={styles.desktopBreak} /> Review, sign and share from the same phone.</p>
          </div>
          <LandingWalkthrough />
          <div className={styles.benefits}>
            <article><h3>Quick on site.</h3><p>Take a photo and mark the detail immediately, while you’re right in front of it.</p></article>
            <article><h3>Thorough, room by room.</h3><p>Work through each room’s inventory, with notes and photos beside the right item.</p></article>
            <article><h3>Everything together.</h3><p>Capture, write and collect signatures in one flow. A signed copy goes to everyone.</p></article>
          </div>
        </section>
        <section id="whole-tenancy" className={styles.tenancy} aria-labelledby="tenancy-title">
          <div className={styles.tenancyIntro}>
            <h2 id="tenancy-title">How Kivilo works.</h2>
            <p>A good handover starts with a record everyone understands. The agent documents the home’s condition. The landlord and tenant review the photos and inventory, then sign the same report.</p>
            <p>That agreed starting point stays with the tenancy. Repairs, documents and agreed updates keep the story together. When it’s time to move out, everyone can return to what was recorded.</p>
          </div>
          <Image className={styles.sharedRecordArt} src="/art/shared-record.webp" alt="An agent, landlord and tenant reviewing a property record together, with the condition photo and keys beside it." width={1536} height={1024} sizes="(max-width: 800px) 100vw, 800px" unoptimized />
          <p className={styles.sharedRecordCaption}>One shared record. A clear starting point for everyone.</p>
          <a href="#check-out" className={styles.textButton}>See what happens at check-out</a>
        </section>
        <section id="check-out" className={styles.checkout} aria-labelledby="checkout-title">
          <div className={styles.comparison}>
            <div className={styles.comparisonHeader}><span className={styles.miniWordmark}><span className={styles.brandMark} aria-hidden="true" />kivilo</span><span>AN EXAMPLE AT CHECK-OUT</span></div>
            <p className={styles.comparisonRoom}>Kitchen <span>/ Cabinet door</span></p>
            <div className={styles.comparisonColumns}>
              <div><span className={styles.comparisonLabel}>AT CHECK-IN</span><p>Peeling veneer on the lower cabinet door.</p><span className={styles.photoLabel}>Marked in the agreed photo</span></div>
              <div><span className={styles.comparisonLabel}>AT CHECK-OUT</span><p>Same patch. Same place.<br />No further change.</p><span className={styles.photoLabel}>Compared with the original</span></div>
            </div>
            <div className={styles.assessment}><span className={styles.assessmentCheck} aria-hidden="true">✓</span><div><strong>Already there at move-in.</strong><p>A clear record makes the difference.</p></div><span className={styles.zeroCharge}>$0<span>proposed charge</span></span></div>
            <p className={styles.exampleNote}>Illustrative assessment. Every finding is recorded by a person.</p>
          </div>
          <div className={styles.checkoutCopy}>
            <h2 id="checkout-title">Less back-and-forth.<br />More there-it-is.</h2>
            <p>At check-out, the original condition and agreed photos are right beside you. Record what changed, explain damage or fair wear, and share a dated deposit statement.</p>
            <p className={styles.checkoutEmphasis}>A clearer conversation starts with a better record.</p>
          </div>
        </section>
        <section className={styles.people} aria-labelledby="people-title">
          <div className={styles.sectionHeading}><h2 id="people-title">Good for the person<br />on either side of the door.</h2></div>
          <div className={styles.peopleGrid}>
            <article><span className={styles.roleNumber}>01 / AGENTS</span><h3>Leave with it handled.</h3><p>Take the photo, mark the detail and write it up while you’re there. Get the report signed in the same workflow.</p></article>
            <article><span className={styles.roleNumber}>02 / LANDLORDS</span><h3>Know where things stand.</h3><p>Review the condition, see repairs and keep the paperwork with the property. Even when you’re not there.</p></article>
            <article><span className={styles.roleNumber}>03 / TENANTS</span><h3>Move in with a clear record.</h3><p>See what you’re signing, report issues and return to what was agreed when it’s time to move on.</p></article>
          </div>
        </section>
        <section id="questions" className={styles.faq} aria-labelledby="faq-title">
          <div><h2 id="faq-title">Good questions.</h2><p>Still have one? <Link href="https://my.kivilo.app/support">Let’s talk</Link></p></div>
          <div className={styles.faqList}>{faqs.map(({ question, answer }) => <details key={question} name="landing-faq"><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className={styles.finalCta} aria-labelledby="start-title">
          <div className={styles.happyScene}><Image src="/art/tenancy-scenes.webp" alt="An agent and a happy resident exchanging keys at their new home." width={2172} height={724} sizes="900px" unoptimized /></div>
          <h2 id="start-title">New keys.<br />A better beginning.</h2>
          <p>Start with one property. Keep the whole story.</p>
          <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.primaryButton}>Get started free</Link>
          <span className={styles.freeNote}>No credit card. Just your email.</span>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}><div><Link className={styles.wordmark} href="/" aria-label="Kivilo home"><span className={styles.brandMark} aria-hidden="true" />kivilo</Link><p>A little more clarity.<br />A lot more peace of mind.</p></div><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><Link href="https://my.kivilo.app/support">Support</Link><Link href="https://my.kivilo.app/verify">Verify a report</Link><Link href="https://my.kivilo.app/privacy">Privacy</Link><Link href="https://my.kivilo.app/delete-account">Delete account</Link></nav></div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Kivilo · NotTooSweetLabs Pte. Ltd.</span><span>Made in Singapore. For a better handover.</span></div>
      </footer>
    </div>
  )
}
