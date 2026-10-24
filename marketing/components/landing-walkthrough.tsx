"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import styles from "./landing-walkthrough.module.css";

const steps = [
  {
    label: "Capture",
    title: "Catch the little things.",
    description: "Film the walkthrough. Photograph the scuff, the serial number, the meter. Photos and video stay on your device until they upload, even when the signal lets you down.",
    image: "/illustrations/capture-768-7282a81449e3.webp",
    status: "Evidence captured",
  },
  {
    label: "Write",
    title: "Your words. Their condition.",
    description: "Write what you see and link the close-up to the cabinet. That small chip is in the inventory from day one, with the evidence right beside it.",
    image: "/illustrations/inventory-768-4a57537a634d.webp",
    status: "Inventory reviewed",
  },
  {
    label: "Agree",
    title: "Everyone on the same page.",
    description: "The landlord and tenant review and sign the same report. Everyone receives a copy, ready to return to when it’s time to check out.",
    image: "/illustrations/sign-768-8d977bcfeef9.webp",
    status: "Signed by both parties",
  },
];

export function LandingWalkthrough() {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % steps.length
      : event.key === "ArrowLeft" ? (index + steps.length - 1) % steps.length
        : event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className={styles.walkthrough}>
      <div className={styles.tabs} role="tablist" aria-label="Explore the check-in process">
        {steps.map((step, index) => (
          <button key={step.label} type="button" role="tab" id={`${id}-tab-${index}`}
            aria-selected={active === index} aria-controls={`${id}-panel-${index}`}
            tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)}
            onKeyDown={(event) => navigate(event, index)}
            ref={(node) => { tabs.current[index] = node; }}>
            <span>{index + 1}.</span> {step.label}
          </button>
        ))}
      </div>
      {steps.map((step, index) => (
        <div key={step.label} role="tabpanel" id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`} hidden={active !== index}
          tabIndex={0} className={styles.panel}>
          <div className={styles.story}>
            <Image src={step.image} alt="" width={768} height={512}
              sizes="(max-width: 700px) 80vw, 400px" className={styles.illustration} unoptimized />
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.startLink}>Start your first check-in</Link>
          </div>
          <div className={styles.report}>
            <div className={styles.reportHeader}>
              <span className={styles.wordmark}><span className={styles.brandMark} aria-hidden="true" />kivilo</span>
              <span className={styles.example}>Example report</span>
            </div>
            <div className={styles.reportTitle}>
              <div><p>CHECK-IN REPORT</p><h4>The kitchen</h4></div>
              <span className={styles.stepCount}>{index + 1} / 3</span>
            </div>
            <div className={styles.progress} aria-hidden="true">
              {steps.map((item, position) => <span key={item.label} data-complete={position <= index} />)}
            </div>
            {index === 0 && (
              <div className={styles.reportBody}>
                <div className={styles.cabinetDetail}>
                  <svg viewBox="0 0 340 160" fill="none" aria-hidden="true">
                    <path d="M57 37h226v102H57zM57 49h226M170 49v90M69 139v11m202-11v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M147 67v16m46-16v16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="m144 89 6 5-4 5" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="147" cy="94" r="18" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3 3" />
                    <path d="m165 94 34 17h38" stroke="#ec4899" strokeWidth="1.5" />
                    <text x="201" y="104" fill="#be185d" fontSize="11" fontFamily="inherit">Small chip</text>
                  </svg>
                  <span>Illustrated detail</span>
                </div>
                <div className={styles.evidenceRow}><div><strong>Cabinet detail</strong><span>Photo · Kitchen</span></div><span className={styles.saved}>✓ Uploaded</span></div>
                <div className={styles.evidenceRow}><div><strong>Room walkthrough</strong><span>Video · 00:42</span></div><span className={styles.saved}>✓ Uploaded</span></div>
              </div>
            )}
            {index === 1 && (
              <div className={styles.reportBody}>
                <div className={styles.inventoryHeading}><strong>Lower kitchen cabinet</strong><span>Fair condition</span></div>
                <div className={styles.inventoryLine}><span>INSPECTOR’S NOTES</span><p>Small chip beside the lower handle. Doors and hinges working. Interior clean and dry.</p></div>
                <div className={styles.linkedPhoto}><div><strong>Cabinet detail</strong><span>1 photo linked to this item</span></div><span className={styles.photoNumber}>03</span></div>
                <p className={styles.annotation}>The detail, the description, and the photo. Together.</p>
              </div>
            )}
            {index === 2 && (
              <div className={styles.reportBody}>
                <div className={styles.agreedItem}><strong>Lower kitchen cabinet</strong><p>Small chip beside the lower handle.</p><span>Fair condition · 1 linked photo</span></div>
                <div className={styles.signatures}>
                  <div><span>LANDLORD</span><p>J. Tan</p><small>✓ Signed</small></div>
                  <div><span>TENANT</span><p>B. Lee</p><small>✓ Signed</small></div>
                </div>
                <p className={styles.annotation}>A signed copy for everyone. A clear starting point.</p>
              </div>
            )}
            <div className={styles.reportFooter}><span aria-hidden="true">✓</span> {step.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
