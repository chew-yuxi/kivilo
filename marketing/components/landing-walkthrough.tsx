"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type PointerEvent, type SVGProps } from "react";
import styles from "./landing-walkthrough.module.css";

type Tool = "Circle" | "Freehand" | "Arrow";
type Point = { x: number; y: number };
type Mark = { tool: Tool; points: Point[] };
const sampleMarks: Record<Tool, Point[]> = {
  Circle: [{ x: 1220, y: 590 }, { x: 1336, y: 735 }],
  Freehand: [{ x: 1243, y: 605 }, { x: 1280, y: 592 }, { x: 1310, y: 610 }, { x: 1332, y: 660 }, { x: 1322, y: 721 }, { x: 1280, y: 732 }, { x: 1240, y: 695 }, { x: 1223, y: 655 }, { x: 1243, y: 605 }],
  Arrow: [{ x: 1155, y: 480 }, { x: 1270, y: 660 }],
};
const itemNotes = "Scuff on the lower-right door. Both doors open and close smoothly.";

// The illustration and both evidence details share one annotation in photo coordinates.
function MarkedPhoto({ mark, original = false, detail = false, interaction }: {
  mark: Mark;
  original?: boolean;
  detail?: boolean;
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
  // Keep the cabinet crop until a visitor marks elsewhere in the illustration.
  // The attached evidence must always include their entire mark.
  const left = Math.max(0, Math.min(980, ...mark.points.map(point => point.x - 50)));
  const top = Math.max(0, Math.min(400, ...mark.points.map(point => point.y - 50)));
  const right = Math.min(1500, Math.max(1450, ...mark.points.map(point => point.x + 50)));
  const bottom = Math.min(1000, Math.max(800, ...mark.points.map(point => point.y + 50)));
  const detailViewBox = `${left} ${top} ${right - left} ${bottom - top}`;

  return (
    <svg className={styles.photo + (detail ? " " + styles.detailPhoto : "")} viewBox={detail ? detailViewBox : "0 0 1500 1000"} role="img"
      aria-label={original ? "Original illustration of an inspector photographing a scuffed cabinet." : "Illustrated property detail with a " + mark.tool.toLowerCase() + " annotation."}
      {...interaction}>
      <image href="/art/workflow-capture.webp" x="0" y="0" width="1500" height="1000" />
      <defs><marker id={id + "-arrow"} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ec4899" stroke="white" strokeWidth=".7" /></marker></defs>
      {!original && <g fill="none" strokeLinecap="round" strokeLinejoin="round" data-demo-mark={mark.tool}>
        <path d={path} stroke="white" strokeWidth="15" />
        <path d={path} stroke="#ec4899" strokeWidth="8" markerEnd={mark.tool === "Arrow" ? "url(#" + id + "-arrow)" : undefined} />
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
      x: Math.max(0, Math.min(1500, (event.clientX - box.left) / box.width * 1500)),
      y: Math.max(0, Math.min(1000, (event.clientY - box.top) / box.height * 1000)),
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
        <li className={styles.stage + " " + styles.captureStage}>
          <div className={styles.copy}>
            <h3>Spot it. Mark it.<br />Move on.</h3>
            <p>Take the photo. Circle, sketch or point to what matters, before you leave the room.</p>
          </div>
          <div className={styles.captureVisual}>
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
                <p id={id + "-hint"}>Try a tool on the illustration.</p>
                <button type="button" aria-pressed={original} onClick={() => { setOriginal(!original); setTouchDrawing(false); }}>{original ? "Show marks" : "See original"}</button>
              </div>
            </div>
          </div>
        </li>
        <li className={styles.stage + " " + styles.inventoryStage}>
          <div className={styles.copy}>
            <h3>A place for<br />every detail.</h3>
            <p>Write the inventory room by room. Your notes and marked photos stay beside the right item, ready to find again.</p>
          </div>
          <div className={styles.inventoryVisual}>
            <div className={styles.inventoryPaper}>
              <div className={styles.inventoryHeader}><strong>Living room inventory</strong><span>3 items</span></div>
              <div className={styles.inventoryRow}><span>Walls &amp; ceiling</span><span className={styles.good}>Good</span></div>
              <div className={styles.inventoryRow}><span>Floor</span><span className={styles.good}>Good</span></div>
              <div className={styles.selectedItem}>
                <div className={styles.itemHeading}><h4>Sideboard</h4><span className={styles.condition}>Fair</span></div>
                <p>{itemNotes}</p>
                <figure className={styles.attachedPhoto}><MarkedPhoto mark={mark} detail /><figcaption>Sideboard detail<br /><strong>1 marked photo</strong></figcaption></figure>
              </div>
            </div>
          </div>
        </li>
        <li className={styles.stage + " " + styles.agreementStage}>
          <div className={styles.copy}>
            <h3>Everyone on<br />the same page.</h3>
            <p>Review and sign on your phone, or let each person sign in their own account. Everyone gets the same agreed record.</p>
          </div>
          <div className={styles.agreementVisual}>
            <Image src="/illustrations/sign-768-8d977bcfeef9.webp" width={768} height={512} sizes="(max-width: 760px) 90vw, 550px" unoptimized alt="The landlord and tenant reviewing and signing their handover record together." className={styles.signingIllustration} />
            <div className={styles.signedRecord}>
              <div className={styles.reportEvidence}><MarkedPhoto mark={mark} detail /><div><strong>Living room · Sideboard</strong><p>{itemNotes}</p></div></div>
              {/* Fictional ink signatures drawn only for this marketing example. */}
              <div className={styles.signatures} role="group" aria-label="Illustrative signatures">
                <div>
                  <svg className={styles.signature} viewBox="0 0 220 72" role="img" aria-label="Sample landlord signature" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 49C25 32 32 13 39 14C46 16 37 43 34 51M20 38C31 33 44 31 53 33M43 44C56 29 64 12 58 13C51 15 45 41 50 46C54 50 64 40 67 35C68 31 62 32 60 38C57 47 66 49 75 40M74 34L84 45M87 32L74 47M96 46C114 30 125 9 117 10C108 12 99 39 102 47C105 54 120 44 127 39M128 33C124 39 123 45 128 45C133 45 138 36 140 32L135 45C143 31 150 30 146 41L144 45C152 31 160 29 156 40C152 51 165 44 173 38C185 29 197 30 206 27" />
                    <path d="M130 24L131 23M25 60C75 52 138 56 195 48" strokeWidth="1.35" />
                  </svg>
                  <span>Landlord</span>
                </div>
                <div>
                  <svg className={styles.signature} viewBox="0 0 220 72" role="img" aria-label="Sample tenant signature" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 23C37 15 61 14 76 17M58 17C49 34 43 58 28 59C18 60 13 51 23 45C29 42 36 45 38 48M51 44L62 31L58 44L72 30L66 44L80 29C75 41 76 48 89 35M94 24L123 18M111 14L98 43C95 52 107 42 114 34C119 28 123 33 119 39C113 48 108 43 115 36C122 29 126 30 123 40C121 46 128 42 135 32L130 44C142 28 149 28 145 39C141 49 153 41 161 34L158 42C169 30 177 32 173 38C171 43 181 40 190 34L205 30" />
                    <path d="M73 57L195 49L180 55" strokeWidth="1.2" />
                  </svg>
                  <span>Tenant</span>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ol>
      <div className={styles.finish}>
        <Link href="https://my.kivilo.app/inspections" prefetch={false}>Start your first handover</Link>
        <p>Illustrated example, with sample inventory and signatures.</p>
      </div>
      <span className={styles.srOnly} role="status">{original ? "Viewing the original illustration. Inventory and report keep the marks." : mark.tool + " annotation shown in the illustration, inventory and example report."}</span>
    </div>
  );
}
