"use client";

import Link from "next/link";
import { useId, useRef, useState, type PointerEvent, type SVGProps } from "react";
import styles from "./landing-walkthrough.module.css";

type Tool = "Circle" | "Freehand" | "Arrow";
type Point = { x: number; y: number };
type Mark = { tool: Tool; points: Point[] };
const sampleMarks: Record<Tool, Point[]> = {
  Circle: [{ x: 490, y: 680 }, { x: 680, y: 880 }],
  Freehand: [{ x: 510, y: 722 }, { x: 540, y: 698 }, { x: 582, y: 692 }, { x: 635, y: 710 }, { x: 664, y: 758 }, { x: 662, y: 817 }, { x: 648, y: 858 }, { x: 582, y: 869 }, { x: 526, y: 850 }, { x: 509, y: 795 }, { x: 510, y: 722 }],
  Arrow: [{ x: 360, y: 555 }, { x: 545, y: 735 }],
};
const itemNotes = "Veneer peeling on the lower cabinet door. Door and hinges working.";

// Each stage uses the same original photo and the same annotation geometry.
function MarkedPhoto({ mark, original = false, interaction }: {
  mark: Mark;
  original?: boolean;
  interaction?: SVGProps<SVGSVGElement>;
}) {
  const id = useId();
  const first = mark.points[0];
  const last = mark.points[mark.points.length - 1];
  const rx = Math.max(Math.abs(last.x - first.x) / 2, 1);
  const ry = Math.max(Math.abs(last.y - first.y) / 2, 1);
  const cx = (first.x + last.x) / 2;
  const cy = (first.y + last.y) / 2;
  const path = mark.tool === "Circle"
    ? ["M", cx - rx, cy, "a", rx, ry, "0 1 0", rx * 2, "0 a", rx, ry, "0 1 0", -rx * 2, 0].join(" ")
    : mark.points.map((point, index) => [index ? "L" : "M", point.x, point.y].join(" ")).join(" ");

  return (
    <svg className={styles.photo} viewBox="300 500 580 500" role="img"
      aria-label={original ? "Original example photo of peeling cabinet veneer." : "Example cabinet photo with the peeling veneer marked."}
      {...interaction}>
      <image href="/demo/kitchen-detail.webp" x="0" y="0" width="1000" height="1000" />
      <defs><marker id={id + "-arrow"} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ec4899" stroke="white" strokeWidth=".7" /></marker></defs>
      {!original && <g fill="none" strokeLinecap="round" strokeLinejoin="round" data-demo-mark={mark.tool}>
        <path d={path} stroke="white" strokeWidth="13" />
        <path d={path} stroke="#ec4899" strokeWidth="7" markerEnd={mark.tool === "Arrow" ? "url(#" + id + "-arrow)" : undefined} />
      </g>}
    </svg>
  );
}

export function LandingWalkthrough() {
  const [mark, setMark] = useState<Mark>({ tool: "Circle", points: sampleMarks.Circle });
  const [original, setOriginal] = useState(false);
  const [touchDrawing, setTouchDrawing] = useState(false);
  const drawing = useRef<{ pointer: number; mark: Mark } | null>(null);
  const id = useId();

  function pointAt(event: PointerEvent<SVGSVGElement>): Point {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(300, Math.min(880, 300 + (event.clientX - box.left) / box.width * 580)),
      y: Math.max(500, Math.min(1000, 500 + (event.clientY - box.top) / box.height * 500)),
    };
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
    <div className={styles.walkthrough}>
      <ol className={styles.journey} role="list" aria-label="From a photo to a signed check-in">
        <li className={styles.stage}>
          <div className={styles.caption}><h3>Spot it. Mark it.</h3><p>Circle, sketch or point to the detail while you’re right there.</p></div>
          <div className={styles.photoCard}>
            <div className={styles.appBar}><strong>Kitchen</strong><span>Example photo</span></div>
            <MarkedPhoto mark={mark} original={original} interaction={{
              className: styles.photo + " " + styles.drawingSurface,
              style: { touchAction: touchDrawing ? "none" : "auto" },
              onPointerDown: (event) => {
                if (!event.isPrimary || event.button !== 0 || (event.pointerType === "touch" && !touchDrawing)) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                const start = pointAt(event);
                const next = { tool: mark.tool, points: [start, start] };
                drawing.current = { pointer: event.pointerId, mark: next };
                setOriginal(false); setMark(next);
              },
              onPointerMove: draw,
              onPointerUp: (event) => { if (drawing.current?.pointer !== event.pointerId) return; draw(event); drawing.current = null; setTouchDrawing(false); },
              onPointerCancel: (event) => { if (drawing.current?.pointer !== event.pointerId) return; drawing.current = null; setTouchDrawing(false); },
              onLostPointerCapture: (event) => { if (drawing.current?.pointer !== event.pointerId) return; drawing.current = null; setTouchDrawing(false); },
            }} />
            <div className={styles.photoControls}>
              <div className={styles.markTools} role="group" aria-label="Try a photo annotation tool" aria-describedby={id + "-hint"}>
                {(["Circle", "Freehand", "Arrow"] as const).map((tool) => (
                  <button key={tool} type="button" aria-pressed={!original && mark.tool === tool}
                    onClick={() => { setMark({ tool, points: sampleMarks[tool] }); setOriginal(false); setTouchDrawing(true); }}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {tool === "Circle" ? <circle cx="12" cy="12" r="8" /> : <path d={tool === "Arrow" ? "M5 19 19 5M7 5h12v12" : "M4 17c2-14 6-14 5-3s5 8 5-1 5-8 6-3"} />}
                    </svg>{tool}
                  </button>
                ))}
              </div>
              <div className={styles.photoActions}>
                <p id={id + "-hint"}>Try a tool, then draw.</p>
                <button type="button" aria-pressed={original} onClick={() => { setOriginal(!original); setTouchDrawing(false); }}>{original ? "Show marks" : "See original"}</button>
              </div>
            </div>
          </div>
        </li>
        <li className={styles.stage}>
          <div className={styles.caption}><h3>Keep the detail.</h3><p>Your notes and photos, beside the right item in each room.</p></div>
          <div className={styles.inventoryCard}>
            <div className={styles.appBar}><strong>Kitchen inventory</strong><span>3 items</span></div>
            <div className={styles.inventoryRow}><span>Walls &amp; ceiling</span><span className={styles.good}>Good</span></div>
            <div className={styles.inventoryRow}><span>Floor</span><span className={styles.good}>Good</span></div>
            <div className={styles.selectedItem}>
              <div className={styles.itemHeading}><strong>Lower cabinet</strong><span className={styles.condition}>Fair</span></div>
              <p>{itemNotes}</p>
              <figure className={styles.attachedPhoto}><MarkedPhoto mark={mark} /><figcaption>Attached media<br /><strong>1 marked photo</strong></figcaption></figure>
            </div>
          </div>
        </li>
        <li className={styles.stage}>
          <div className={styles.caption}><h3>Everyone agrees.</h3><p>Both parties sign the same record. Everyone gets a copy.</p></div>
          <div className={styles.reportCard}>
            <div className={styles.reportHeading}><span className={styles.wordmark}><span className={styles.brandMark} aria-hidden="true" />kivilo</span><span>Example report</span></div>
            <h4>Check-in report</h4>
            <div className={styles.reportEvidence}><MarkedPhoto mark={mark} /><div><strong>Kitchen</strong><span>Lower cabinet · Fair</span></div></div>
            <p className={styles.reportNotes}>{itemNotes}</p>
            <div className={styles.signatures}>
              <div><span>Landlord</span><strong><span aria-hidden="true">✓ </span>Signed</strong></div>
              <div><span>Tenant</span><strong><span aria-hidden="true">✓ </span>Signed</strong></div>
            </div>
            <p className={styles.agreed}>Agreed and signed</p>
          </div>
        </li>
      </ol>
      <div className={styles.finish}>
        <p>Illustrative photos, inventory and signatures.</p>
        <Link href="https://my.kivilo.app/inspections" prefetch={false}>Start your first handover</Link>
      </div>
      <span className={styles.srOnly} role="status">{original ? "Viewing the original photo. Inventory and report keep the marks." : mark.tool + " annotation shown in the photo, inventory and example report."}</span>
    </div>
  );
}
