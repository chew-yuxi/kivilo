import type { ItemCategory } from '@/generated/prisma'

type TemplateRow = { name: string; category: ItemCategory }

const EVERY_ROOM: TemplateRow[] = [
  { name: 'Walls', category: 'SURFACE' },
  { name: 'Ceiling', category: 'SURFACE' },
  { name: 'Floor', category: 'SURFACE' },
  { name: 'Door', category: 'FIXTURE' },
  { name: 'Lights and switches', category: 'FIXTURE' },
]

const KITCHEN: TemplateRow[] = [
  { name: 'Cabinets', category: 'FIXTURE' },
  { name: 'Sink and tap', category: 'FIXTURE' },
  { name: 'Hob', category: 'APPLIANCE' },
  { name: 'Cooker hood', category: 'APPLIANCE' },
]

const BATHROOM: TemplateRow[] = [
  { name: 'Toilet', category: 'FIXTURE' },
  { name: 'Basin and tap', category: 'FIXTURE' },
  { name: 'Shower', category: 'FIXTURE' },
  { name: 'Mirror', category: 'FIXTURE' },
]

/// The standard rows a new room starts with, chosen by its name since that is all a new
/// room has. They are ordinary lines: the inspector edits, removes or adds to them
/// exactly as to a line they added themselves.
export function templateRows(roomName: string): TemplateRow[] {
  const name = roomName.toLowerCase()
  return [
    ...EVERY_ROOM,
    ...(name.includes('kitchen') ? KITCHEN : []),
    ...(['bath', 'toilet', 'shower', 'wc'].some((word) => name.includes(word)) ? BATHROOM : []),
  ]
}
