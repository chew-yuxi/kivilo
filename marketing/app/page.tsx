import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingWalkthrough } from '../components/landing-walkthrough'
import { FREE_ACTIVE_PROPERTIES } from '../../src/lib/plan-limits'
import styles from './landing.module.css'

const title = 'Kivilo | Property handovers, check-in & check-out reports'
const description = `Capture photos, write room inventories, collect signatures and compare check-out with check-in. Kivilo keeps the whole tenancy together. ${FREE_ACTIVE_PROPERTIES} active properties free.`

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
    { '@type': 'SoftwareApplication', name: 'Kivilo', url: 'https://kivilo.app', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description, featureList: ['Room-by-room property inventories', 'Photo and video evidence', 'Landlord and tenant signatures', 'Tenancy repair history', 'Check-in and check-out comparison', 'PDF condition reports'], publisher: { '@id': 'https://kivilo.app/#organization' } },
  ],
}

// Public, static and session-free. All examples are illustrative, never tenancy data.
export default function LandingPage() {
  return (
    <div className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <a href="#main" className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Kivilo home"><span className={styles.brandMark} aria-hidden="true" />kivilo</Link>
        <nav className={styles.navigation} aria-label="Main navigation">
          <a className={styles.desktopLink} href="#how-it-works">How it works</a>
          <a className={styles.desktopLink} href="#whole-tenancy">The whole tenancy</a>
          <a className={styles.desktopLink} href="#questions">FAQs</a>
          <Link href="https://my.kivilo.app/login">Log in</Link>
          <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.smallButton}>Start free</Link>
        </nav>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <p className={styles.eyebrow}><span /> PROPERTY HANDOVERS, PROPERLY RECORDED</p>
          <h1 id="hero-title">Hand over the keys.<br /><span>Keep the whole story.</span></h1>
          <p className={styles.heroDescription}>The photos. The little scuff. The signatures.<br className={styles.desktopBreak} /> One shared record, from the first walkthrough to the final check-out.</p>
          <div className={styles.heroActions}>
            <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.primaryButton}>Start your first handover</Link>
            <a href="#how-it-works" className={styles.textButton}>See how it works</a>
          </div>
          <p className={styles.freeNote}>{FREE_ACTIVE_PROPERTIES} active properties, free. No credit card needed.</p>
          <div className={styles.heroScene}>
            <div className={`${styles.sceneNote} ${styles.sceneNoteLeft}`} aria-hidden="true"><span className={styles.noteIcon}>✓</span><div><strong>Every little detail.</strong><span>Right where you left it.</span></div></div>
            <Image className={styles.heroArt} src="/illustrations/handover-768-ea8147d471c4.webp" alt="An inspector with a pink bag and a resident exchanging keys at an apartment doorway." width={768} height={384} sizes="(max-width: 700px) 100vw, 768px" priority unoptimized />
            <div className={`${styles.sceneNote} ${styles.sceneNoteRight}`} aria-hidden="true"><span className={styles.noteIcon}>✎</span><div><strong>Everyone on the same page.</strong><span>Quite literally.</span></div></div>
            <span className={styles.sceneCaption}>A fresh start. A proper record.</span>
          </div>
        </section>
        <div className={styles.promiseStrip}>
          <p>Made for real homes.<br /><strong>And the people behind them.</strong></p>
          <span><b aria-hidden="true">✓</b> Agents, landlords & tenants</span>
          <span><b aria-hidden="true">✓</b> Photos saved to your phone first</span>
          <span><b aria-hidden="true">◎</b> Your records stay private</span>
        </div>
        <section id="how-it-works" className={styles.walkthrough} aria-labelledby="how-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>LESS PAPERWORK. MORE PEACE OF MIND.</p>
            <h2 id="how-title">From walkthrough<br />to signed report.</h2>
            <p>Do the handover while you’re at the handover.<br />Kivilo keeps the details together as you go.</p>
          </div>
          <LandingWalkthrough />
        </section>
        <section id="whole-tenancy" className={styles.tenancy} aria-labelledby="tenancy-title">
          <div className={styles.tenancyIntro}>
            <p className={styles.eyebrow}>THE KEYS ARE JUST THE BEGINNING</p>
            <h2 id="tenancy-title">A home has a history.<br /><span>Now it has a home.</span></h2>
            <p>A leaky tap. A replaced fridge. The agreement everyone needs to find. Keep the next chapter connected to the first.</p>
            <a href="#check-out" className={styles.textButton}>And when it’s time to move out?</a>
          </div>
          <ol className={styles.timeline}>
            <li><span className={styles.timelineDot}>01</span><div><span className={styles.timelineLabel}>MOVE IN</span><h3>Start on the same page.</h3><p>A signed condition report, with the photos and inventory everyone agreed to.</p></div></li>
            <li><span className={styles.timelineDot}>02</span><div><span className={styles.timelineLabel}>LIVE IN</span><h3>Keep the little things connected.</h3><p>Log repairs, keep tenancy documents together and agree on updates to the original report.</p></div></li>
            <li><span className={styles.timelineDot}>03</span><div><span className={styles.timelineLabel}>MOVE OUT</span><h3>Come back to the facts.</h3><p>Compare the home with its agreed check-in record. Give every change its context.</p></div></li>
          </ol>
        </section>
        <section id="check-out" className={styles.checkout} aria-labelledby="checkout-title">
          <div className={styles.comparison}>
            <div className={styles.comparisonHeader}><span className={styles.miniWordmark}><span className={styles.brandMark} aria-hidden="true" />kivilo</span><span>AN EXAMPLE AT CHECK-OUT</span></div>
            <p className={styles.comparisonRoom}>Kitchen <span>/ Cabinet door</span></p>
            <div className={styles.comparisonColumns}>
              <div><span className={styles.comparisonLabel}>AT CHECK-IN</span><p>Small chip beside the lower handle.</p><span className={styles.photoLabel}>Recorded in the signed report</span></div>
              <div><span className={styles.comparisonLabel}>AT CHECK-OUT</span><p>Same chip. Same place.<br />No further change.</p><span className={styles.photoLabel}>Compared with the original</span></div>
            </div>
            <div className={styles.assessment}><span className={styles.assessmentCheck} aria-hidden="true">✓</span><div><strong>Already there at move-in.</strong><p>A clear record makes the difference.</p></div><span className={styles.zeroCharge}>$0<span>proposed charge</span></span></div>
            <p className={styles.exampleNote}>Illustrative assessment. Every finding is recorded by a person.</p>
          </div>
          <div className={styles.checkoutCopy}>
            <p className={styles.eyebrow}>“WAS THAT ALREADY THERE?”</p>
            <h2 id="checkout-title">Less back-and-forth.<br />More there-it-is.</h2>
            <p>At check-out, the original condition and agreed photos are right beside you. Record what changed, explain damage or fair wear, and share a dated deposit statement.</p>
            <p className={styles.checkoutEmphasis}>A clearer conversation starts with a better record.</p>
          </div>
        </section>
        <section className={styles.people} aria-labelledby="people-title">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>ONE RECORD. EVERYONE INCLUDED.</p><h2 id="people-title">Good for the person<br />on either side of the door.</h2></div>
          <div className={styles.peopleGrid}>
            <article><span className={styles.roleNumber}>01 / AGENTS</span><h3>Leave with it handled.</h3><p>Capture, write and get the report signed in one workflow. Keep your team and your properties organised.</p></article>
            <article><span className={styles.roleNumber}>02 / LANDLORDS</span><h3>Know where things stand.</h3><p>Review the condition, see repairs and keep the paperwork with the property. Even when you’re not there.</p></article>
            <article><span className={styles.roleNumber}>03 / TENANTS</span><h3>Move in with a clear record.</h3><p>See what you’re signing, report issues and return to what was agreed when it’s time to move on.</p></article>
          </div>
        </section>
        <section id="questions" className={styles.faq} aria-labelledby="faq-title">
          <div><p className={styles.eyebrow}>A FEW THINGS YOU MIGHT BE WONDERING</p><h2 id="faq-title">Good questions.</h2><p>Still have one? <Link href="https://my.kivilo.app/support">Let’s talk</Link></p></div>
          <div className={styles.faqList}>{faqs.map(({ question, answer }) => <details key={question} name="landing-faq"><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
        </section>
        <section className={styles.finalCta} aria-labelledby="start-title">
          <Image src="/illustrations/sign-768-8d977bcfeef9.webp" alt="" width={768} height={512} sizes="270px" className={styles.signArt} unoptimized />
          <p className={styles.eyebrow}>YOUR NEXT HANDOVER, SORTED.</p>
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
