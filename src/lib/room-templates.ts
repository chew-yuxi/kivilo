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
  { name: 'Fridge', category: 'APPLIANCE' },
  { name: 'Washing machine', category: 'APPLIANCE' },
]

const BEDROOM: TemplateRow[] = [
  { name: 'Bed', category: 'FURNITURE' },
  { name: 'Wardrobe', category: 'FURNITURE' },
]

const LIVING: TemplateRow[] = [
  { name: 'Sofa', category: 'FURNITURE' },
  { name: 'Table', category: 'FURNITURE' },
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
  const living = name.includes('living') || name.includes('lounge') || name === 'hall'
  return [
    ...EVERY_ROOM,
    ...(name.includes('kitchen') ? KITCHEN : []),
    ...(name.includes('bedroom') || name.includes('bed room') ? BEDROOM : []),
    ...(living ? LIVING : []),
    ...(name.includes('dining') && !living
      ? [{ name: 'Table', category: 'FURNITURE' as const }]
      : []),
    ...(['bath', 'toilet', 'shower', 'wc'].some((word) => name.includes(word)) ? BATHROOM : []),
  ]
}
