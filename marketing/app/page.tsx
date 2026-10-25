import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingHeader } from '../components/landing-header'
import { LandingWalkthrough } from '../components/landing-walkthrough'
import { AppDownloads } from '../components/app-downloads'
import { FREE_ACTIVE_PROPERTIES } from '../../src/lib/plan-limits'
import styles from './landing.module.css'
const title = 'Kivilo | Property handovers, check-in & check-out reports'
const description = `Digital tools for property agents, from check-in to check-out. Keep photos, inventories, signatures and repairs together. ${FREE_ACTIVE_PROPERTIES} active properties free.`
const socialTitle = 'Give every tenancy an upgrade. | Kivilo'
const socialImage = '/opengraph-image.png?v=20261024-upgrade'
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: 'https://kivilo.app' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website', url: 'https://kivilo.app', siteName: 'Kivilo', locale: 'en_SG',
    title: socialTitle, description,
    images: [{ url: socialImage, width: 1200, height: 630, alt: 'Kivilo — Give every tenancy an upgrade.' }],
  },
  twitter: { card: 'summary_large_image', title: socialTitle, description, images: [socialImage] },
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
const homeHistory = [
  { date: '2025-03', month: 'Mar 2025', title: 'Check-in signed', detail: 'Landlord and tenant agree the inventory.' },
  { date: '2025-07', month: 'Jul 2025', title: 'Aircon repaired', detail: '$120, paid by the tenant under the minor-repair clause.' },
  { date: '2025-11', month: 'Nov 2025', title: 'Dishwasher replaced', detail: 'Both parties acknowledge the update.' },
  { date: '2026-02', month: 'Feb 2026', title: 'Washing machine, 4th repair this year', detail: 'The landlord is alerted.', alert: true },
  { date: '2026-03', month: 'Mar 2026', title: 'Check-out signed', detail: 'The deposit statement is agreed.' },
  { date: '2026-04', month: 'Apr 2026', title: 'New tenancy begins', detail: 'The record carries on with the home.' },
]
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': 'https://kivilo.app/#organization', name: 'Kivilo', url: 'https://kivilo.app', logo: 'https://kivilo.app/icon-512.png', parentOrganization: { '@type': 'Organization', name: 'NotTooSweetLabs Pte. Ltd.' } },
    { '@type': 'WebSite', '@id': 'https://kivilo.app/#website', name: 'Kivilo', url: 'https://kivilo.app', inLanguage: 'en', publisher: { '@id': 'https://kivilo.app/#organization' } },
    { '@type': 'SoftwareApplication', name: 'Kivilo', url: 'https://kivilo.app', applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android', description, featureList: ['Photo markup with circles, freehand and arrows', 'Room-by-room property inventories', 'Photo and video evidence', 'Landlord and tenant signatures', 'Tenancy repair history', 'Check-in and check-out comparison', 'PDF condition reports'], publisher: { '@id': 'https://kivilo.app/#organization' } },
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
          <Link href="/compare">Compare</Link>
          <Link href="/guides">Guides</Link>
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
            <h1 id="hero-title">Give every tenancy<br />an upgrade.</h1>
            <p className={styles.heroDescription}>Better service. Less admin. From move-in to move-out.</p>
            <div className={styles.heroActions}>
              <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.primaryButton}>Start your first handover</Link>
            </div>
            <p className={styles.freeNote}>{FREE_ACTIVE_PROPERTIES} properties free. No credit card.</p>
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
            <p>Less time putting a report together.<br className={styles.desktopBreak} /> More attention to the home in front of you.</p>
          </div>
          <LandingWalkthrough />
        </section>
        <section id="whole-tenancy" className={styles.tenancy} aria-labelledby="tenancy-title">
          <div className={styles.tenancyLayout}>
            <div className={styles.tenancyIntro}>
              <h2 id="tenancy-title">Every home<br />remembers.</h2>
              <p>Repairs, replacements and reports stay with the property, from one tenancy to the next.</p>
              <a href="#check-out" className={styles.textButton}>And when it’s time to move out?</a>
              <Image src="/art/repair-record.webp" alt="A technician services the aircon while the tenant photographs the repair." width={1500} height={1000}
                sizes="(max-width: 700px) 90vw, 520px" className={styles.repairArt} unoptimized />
            </div>
            <div className={styles.homeRecord}>
              <div className={styles.homeHeading}>
                <h3>Unit #08-14</h3>
                <span className={styles.tenancyCount}>2 tenancies</span>
              </div>
              <ol className={styles.homeTimeline} aria-label="One property’s history across two tenancies">
                {homeHistory.map(({ date, month, title, detail, alert }) => (
                  <li key={date} className={alert ? styles.timelineAlert : undefined}>
                    <span className={styles.timelineDot} aria-hidden="true" />
                    <div><time dateTime={date}>{month}</time><h4>{title}</h4><p>{detail}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
        <section id="check-out" className={styles.checkout} aria-labelledby="checkout-title">
          <div className={styles.comparison}>
            <div className={styles.comparisonHeader}><span className={styles.miniWordmark}><span className={styles.brandMark} aria-hidden="true" />kivilo</span><span>CHECK-OUT ASSESSMENT</span></div>
            <p className={styles.comparisonRoom}>Living room <span>/ Sideboard</span></p>
            <div className={styles.comparisonColumns}>
              <div><span className={styles.comparisonLabel}>AT CHECK-IN</span><p>Scuff on the lower-right sideboard door.</p><span className={styles.photoLabel}>Marked in the agreed photo</span></div>
              <div><span className={styles.comparisonLabel}>AT CHECK-OUT</span><p>Same scuff. Same place.<br />No further change.</p><span className={styles.photoLabel}>Compared with the original</span></div>
            </div>
            <div className={styles.assessment}><span className={styles.assessmentCheck} aria-hidden="true">✓</span><div><strong>Already there at move-in.</strong><p>A clear record makes the difference.</p></div><span className={styles.zeroCharge}>$0<span>proposed charge</span></span></div>
          </div>
          <div className={styles.checkoutCopy}>
            <h2 id="checkout-title">Less back-and-forth.<br />More there-it-is.</h2>
            <p>At check-out, the original condition and agreed photos are right beside you. Record what changed, explain damage or fair wear, and share a dated deposit statement.</p>
            <p className={styles.checkoutEmphasis}>A clearer conversation starts with a better record.</p>
          </div>
        </section>
        <section className={styles.people} aria-label="Better for everyone in the tenancy">
          <div className={styles.peopleGrid}>
            <article><h3>Agents</h3><p>Less chasing.<br />More taken care of.</p></article>
            <article><h3>Landlords</h3><p>Stay informed.<br />Even from a distance.</p></article>
            <article><h3>Tenants</h3><p>Know what’s agreed.<br />And what happens next.</p></article>
          </div>
        </section>
        <section id="questions" className={styles.faq} aria-labelledby="faq-title">
          <div><h2 id="faq-title">Good questions.</h2><p>Still have one? <Link href="https://my.kivilo.app/support">Let’s talk</Link></p></div>
          <div className={styles.faqList}>{faqs.map(({ question, answer }) => <details key={question} name="landing-faq"><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className={styles.resources} aria-labelledby="resources-title">
          <div><h2 id="resources-title">Make your next handover clearer.</h2><p>Practical guides and app comparisons for Singapore rental agents.</p></div>
          <nav aria-label="Inspection guides and comparisons">
            <Link href="/compare/kivilo-vs-report-and-run">Kivilo vs Report and Run <span aria-hidden="true">→</span></Link>
            <Link href="/compare">Compare inspection apps <span aria-hidden="true">→</span></Link>
            <Link href="/guides/rental-handover-checklist-singapore">Singapore rental handover checklist <span aria-hidden="true">→</span></Link>
            <Link href="/guides/rental-inspection-app-singapore">How to choose an inspection app <span aria-hidden="true">→</span></Link>
          </nav>
        </section>
        <section id="get-started" className={styles.finalCta} aria-labelledby="start-title">
          <div className={styles.happyScene}><Image src="/art/tenancy-scenes.webp" alt="An agent and a happy resident exchanging keys at their new home." width={2172} height={724} sizes="900px" unoptimized /></div>
          <h2 id="start-title">New keys.<br />A better beginning.</h2>
          <p>Your next handover starts here.</p>
          <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.primaryButton}>Start free in your browser</Link>
          <span className={styles.freeNote}>No credit card. Just your email.</span>
          <AppDownloads />
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerTop}><div><Link className={styles.wordmark} href="/" aria-label="Kivilo home"><span className={styles.brandMark} aria-hidden="true" />kivilo</Link><p>A little more clarity.<br />A lot more peace of mind.</p></div><nav aria-label="Footer navigation"><Link href="/compare">Compare</Link><Link href="/guides">Guides</Link><Link href="/product">Product facts</Link><a href="#get-started">Get the app</a><Link href="https://my.kivilo.app/support">Support</Link><Link href="https://my.kivilo.app/verify">Verify a report</Link><Link href="https://my.kivilo.app/privacy">Privacy</Link><Link href="https://my.kivilo.app/delete-account">Delete account</Link></nav></div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Kivilo · NotTooSweetLabs Pte. Ltd.</span><span>Made in Singapore. For a better handover.</span></div>
      </footer>
    </div>
  )
}
