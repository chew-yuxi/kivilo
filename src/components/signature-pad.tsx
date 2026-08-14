'use client'

import { useRef, useState, useTransition } from 'react'
import { signInspection } from '@/lib/actions'

export function SignaturePad({
  inspectionId,
  stakeholderId,
  stakeholderName,
  role,
  signedAt,
}: {
  inspectionId: string
  stakeholderId: string
  stakeholderName: string
  role: string
  signedAt: Date | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [pending, startTransition] = useTransition()

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const { x, y } = position(event)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = position(event)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasInk(true)
  }

  function clear() {
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  if (signedAt) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm font-medium text-emerald-900">
          {stakeholderName} <span className="font-normal text-emerald-700">({role})</span>
        </p>
        <p className="mt-0.5 text-xs text-emerald-700">
          Signed {signedAt.toLocaleString('en-SG')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium">
        {stakeholderName} <span className="font-normal text-gray-500">({role})</span>
      </p>
      <canvas
        ref={canvasRef}
        width={520}
        height={140}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={() => (drawing.current = false)}
        className="mt-3 w-full touch-none rounded border border-dashed border-gray-300 bg-gray-50"
      />
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={clear} className="text-xs text-gray-500 hover:underline">
          Clear
        </button>
        <button
          type="button"
          disabled={!hasInk || pending}
          onClick={() => {
            const imageData = canvasRef.current?.toDataURL('image/png')
            if (!imageData) return
            startTransition(() => void signInspection(inspectionId, stakeholderId, imageData))
          }}
          className="rounded-md bg-brand-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
        >
          Sign
        </button>
      </div>
    </div>
  )
}
