// Site-wide facts. Anything marked `confirm: true` came from the old site or a handout
// and still needs SRM's sign-off — see CONTENT-TODO.md.

export const org = {
  name: 'Shasta Sustainable Resource Management',
  short: 'Shasta SRM',
  founded: 1987,
  address: { street: '20811 Industry Rd', city: 'Anderson', state: 'CA', zip: '96007' },
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=20811+Industry+Rd+Anderson+CA+96007',
  phone: { main: '530-339-7600', dropoff: '530-339-7617' },
  email: { hr: 'staylor@trlcmill.com', office: 'ap@srm-energy.com' },
  hr: { name: 'Shannon Taylor', title: 'HR Manager', hours: 'Mon–Sat, 8 a.m.–5 p.m.' },
  applyUrl: 'https://apply.srm-energy.com',
  social: {
    facebook: 'https://www.facebook.com/shastasrm',
    linkedin: 'https://www.linkedin.com/company/shastasrm/',
  },
  geo: { lat: 40.448, lon: -122.297, tz: 'America/Los_Angeles' },
};

export const facts = {
  capacityMW: { value: 55, confirm: true },
  tonsPerDay: { value: 1250, confirm: true },
  homesPowered: { value: 62600, confirm: true },
  oilBarrelsOffset: { value: 789238, confirm: true },
  coalTonsOffset: { value: 237521, confirm: true },
  runsAroundTheClock: { value: true, confirm: true },
};

export const fmt = (n: number) => n.toLocaleString('en-US');

// Weekly schedules. Days: 0 = Sunday … 6 = Saturday. Hours in local 24h time.
export type Window = { open: number; close: number };
export type Schedule = { label: string; note: string; days: (Window | null)[] };

export const schedules: Record<'dropoff' | 'delivery', Schedule> = {
  dropoff: {
    label: 'Public wood waste drop-off',
    note: 'Hours can change and are posted at the delivery gate. For today’s hours, call 530-339-7617, option 2.',
    days: [null, { open: 8, close: 17 }, { open: 8, close: 17 }, { open: 8, close: 17 }, { open: 8, close: 17 }, { open: 8, close: 17 }, { open: 8, close: 17 }],
  },
  delivery: {
    label: 'Commercial fuel deliveries',
    note: 'Temporary schedule. Confirm with the fuel office before hauling.',
    days: [null, { open: 5, close: 24 }, { open: 5, close: 24 }, { open: 5, close: 24 }, { open: 5, close: 24 }, { open: 5, close: 24 }, { open: 8, close: 17 }],
  },
};

export const dropoff = {
  accepted: ['Tree limbs and logs', 'Chipped tree wood', 'Pallets and crates', 'Logging slash', 'Clean scrap lumber', 'Clean plywood', 'Clean particle board'],
  rejected: ['Painted or treated wood', 'Stumps and roots', 'Yard waste, leaves, grass clippings', 'Pine needles', 'Shrubs and bushes', 'Oleander, manzanita, juniper, crape myrtle', 'Bamboo, palm fronds, vines', 'Shakes and shingles', 'Laminated wood', 'Cardboard', 'Dirt, soil, and rocks'],
  rules: [
    'Use the public gate. Never the truck gate.',
    'Pull up to the stop sign and wait. An attendant inspects every load before you unload.',
    'Any load with unacceptable material is turned away. We can’t sort it for you.',
    'Keep to 5 MPH. Heavy equipment and trucks always have the right of way.',
    'Stay at least 10 feet from anyone else who is unloading.',
    'Wear sturdy footwear. Customers in sandals won’t be allowed to unload. Gloves are a good idea.',
    'Children under 14 stay inside the vehicle. No pets.',
    'No smoking and no gas-powered tools: fire danger in the yard is extremely high.',
    'No climbing on vehicles or trailers, no tie-off pulls, and no unhitching trailers.',
    'Don’t take anything home. Salvaging isn’t allowed.',
  ],
};

export const docs = [
  { href: '/docs/public-pile-handout.pdf', title: 'Wood to Energy Recycling handout', desc: 'Hours, accepted materials, and yard rules for public drop-off.', size: '223 KB', audience: 'public' },
  { href: '/docs/public-pile-handout-page-2.pdf', title: 'Recycling customer safety rules', desc: 'The reverse side of the handout, printable on its own.', size: '92 KB', audience: 'public' },
  { href: '/docs/srm-safety-rules-book.pdf', title: 'Safety Rules Book (OHS-3300)', desc: 'SRM’s health and safety rules for employees and contractors. 74 pages.', size: '635 KB', audience: 'crew' },
  { href: '/docs/srm-safety-acknowledgement.pdf', title: 'Acknowledgement of Receipt', desc: 'Sign and bring it with you, or return it within 10 days of receipt.', size: '173 KB', audience: 'crew' },
] as const;

export const nav = [
  { href: '/how-it-works/', label: 'How it works' },
  { href: '/forests-and-wildfire/', label: 'Forests & wildfire' },
  { href: '/careers/', label: 'Careers' },
  { href: '/drop-off/', label: 'Drop-off' },
];
