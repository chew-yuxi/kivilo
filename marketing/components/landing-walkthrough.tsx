"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import styles from "./landing-walkthrough.module.css";

const steps = [
  {
    label: "Capture",
    title: "Take a photo. Make your point.",
    description: "Spot peeling veneer on a cabinet? Take the photo and mark it straight away. Circle the damage, draw around it, or point with an arrow. Everyone can see exactly what you mean.",
    image: "/illustrations/capture-768-7282a81449e3.webp",
    status: "Photo and marks kept together",
  },
  {
    label: "Write",
    title: "Your words. Their condition.",
    description: "Write what you see and link the marked photo to the cabinet. The peeling veneer is in the inventory from day one, with the evidence right beside it.",
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

type Tool = "Circle" | "Freehand" | "Arrow";
type Point = { x: number; y: number };
type Mark = { tool: Tool; points: Point[] };
const sampleMarks: Record<Tool, Point[]> = {
  Circle: [{ x: 490, y: 680 }, { x: 680, y: 880 }],
  Freehand: [{ x: 510, y: 722 }, { x: 540, y: 698 }, { x: 582, y: 692 }, { x: 635, y: 710 }, { x: 664, y: 758 }, { x: 662, y: 817 }, { x: 648, y: 858 }, { x: 582, y: 869 }, { x: 526, y: 850 }, { x: 509, y: 795 }, { x: 510, y: 722 }],
  Arrow: [{ x: 360, y: 555 }, { x: 545, y: 735 }],
};

function PhotoDemo() {
  const [mark, setMark] = useState<Mark>({ tool: "Circle", points: sampleMarks.Circle });
  const [original, setOriginal] = useState(false);
  const drawing = useRef<{ pointer: number; mark: Mark } | null>(null);
  const id = useId();
  const first = mark.points[0];
  const last = mark.points[mark.points.length - 1];
  const rx = Math.max(Math.abs(last.x - first.x) / 2, 1);
  const ry = Math.max(Math.abs(last.y - first.y) / 2, 1);
  const cx = (first.x + last.x) / 2;
  const cy = (first.y + last.y) / 2;
  const path = mark.tool === "Circle"
    ? `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`
    : mark.points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  function pointAt(event: PointerEvent<SVGSVGElement>): Point {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1000, (event.clientX - box.left) / box.width * 1000)), y: Math.max(0, Math.min(1000, (event.clientY - box.top) / box.height * 1000)) };
  }

  function draw(event: PointerEvent<SVGSVGElement>) {
    const stroke = drawing.current;
    if (!stroke || stroke.pointer !== event.pointerId) return;
    const point = pointAt(event);
    const next = { tool: stroke.mark.tool, points: stroke.mark.tool === "Freehand" ? [...stroke.mark.points, point] : [stroke.mark.points[0], point] };
    drawing.current = { pointer: event.pointerId, mark: next };
    setMark(next);
  }

  return (
    <div className={styles.photoDemo}>
      <div className={styles.markTools} role="group" aria-label="Try a photo annotation tool" aria-describedby={`${id}-hint`}>
        {(["Circle", "Freehand", "Arrow"] as const).map((tool) => (
          <button key={tool} type="button" aria-pressed={!original && mark.tool === tool}
            onClick={() => { setMark({ tool, points: sampleMarks[tool] }); setOriginal(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {tool === "Circle" ? <circle cx="12" cy="12" r="8" /> : <path d={tool === "Arrow" ? "M5 19 19 5M7 5h12v12" : "M4 17c2-14 6-14 5-3s5 8 5-1 5-8 6-3"} />}
            </svg>{tool}
          </button>
        ))}
      </div>
      <div className={styles.photoSurface}>
        <Image src="/demo/kitchen-detail.webp" alt="Synthetic example kitchen photo showing peeling veneer on the lower cabinet door." width={768} height={768} sizes="(max-width: 700px) 90vw, 430px" unoptimized draggable={false} />
        <svg className={styles.markLayer} viewBox="0 0 1000 1000" aria-hidden="true"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            const start = pointAt(event);
            const next = { tool: mark.tool, points: [start, start] };
            drawing.current = { pointer: event.pointerId, mark: next };
            setOriginal(false); setMark(next);
          }}
          onPointerMove={draw}
          onPointerUp={(event) => { draw(event); drawing.current = null; }}
          onPointerCancel={() => { drawing.current = null; }}
          onLostPointerCapture={() => { drawing.current = null; }}>
          <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ec4899" stroke="white" strokeWidth=".7" /></marker></defs>
          {!original && <g fill="none" strokeLinecap="round" strokeLinejoin="round" data-demo-mark={mark.tool}>
            <path d={path} stroke="white" strokeWidth="13" />
            <path d={path} stroke="#ec4899" strokeWidth="7" markerEnd={mark.tool === "Arrow" ? `url(#${id}-arrow)` : undefined} />
          </g>}
        </svg>
      </div>
      <div className={styles.photoActions}>
        <p id={`${id}-hint`}>Choose a tool. Drag on the photo to try it.</p>
        <button type="button" aria-pressed={original} onClick={() => setOriginal(!original)}>{original ? "Show marks" : "See original"}</button>
      </div>
      <span className={styles.srOnly} role="status">{original ? "Original example photo, without marks." : `${mark.tool} annotation shown over the example photo. The original is unchanged.`}</span>
    </div>
  );
}

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
              sizes="(max-width: 700px) 80vw, 400px" className={`${styles.illustration} ${index === 0 ? styles.captureIllustration : ""}`} unoptimized />
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <Link href="https://my.kivilo.app/inspections" prefetch={false} className={styles.startLink}>Start your first check-in</Link>
          </div>
          <div className={styles.report}>
            <div className={styles.reportHeader}>
              <span className={styles.wordmark}><span className={styles.brandMark} aria-hidden="true" />kivilo</span>
              <span className={styles.example}>{index === 0 ? "Try it · example photo" : "Example report"}</span>
            </div>
            {index !== 0 && <><div className={styles.reportTitle}>
              <div><p>CHECK-IN REPORT</p><h4>The kitchen</h4></div>
              <span className={styles.stepCount}>{index + 1} / 3</span>
            </div>
            <div className={styles.progress} aria-hidden="true">
              {steps.map((item, position) => <span key={item.label} data-complete={position <= index} />)}
            </div></>}
            {index === 0 && <PhotoDemo />}
            {index === 1 && (
              <div className={styles.reportBody}>
                <div className={styles.inventoryHeading}><strong>Lower kitchen cabinet</strong><span>Fair condition</span></div>
                <div className={styles.inventoryLine}><span>INSPECTOR’S NOTES</span><p>Veneer peeling on the lower cabinet door. Damage marked in the photo. Door and hinges working.</p></div>
                <div className={styles.linkedPhoto}><div><strong>Cabinet detail</strong><span>1 marked photo linked to this item</span></div><span className={styles.photoNumber}>01</span></div>
                <p className={styles.annotation}>The detail, the description, and the photo. Together.</p>
              </div>
            )}
            {index === 2 && (
              <div className={styles.reportBody}>
                <div className={styles.agreedItem}><strong>Lower kitchen cabinet</strong><p>Veneer peeling on the lower cabinet door.</p><span>Fair condition · 1 marked photo</span></div>
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
