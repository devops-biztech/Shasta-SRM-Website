// The eight steps of the forest-to-power story. Shared by the homepage journey and How it works.

export type Flow = 'fuel' | 'boil' | 'steam' | 'power';
export type Step = { id: string; title: string; text: string; flow: Flow; more: string };

export const steps: Step[] = [
  {
    id: 'forest', flow: 'fuel', title: 'Forest thinning',
    text: 'Crews thin crowded stands in the Shasta-Trinity and Lassen National Forests and on nearby private land. Those small trees and that brush are what let wildfires run.',
    more: 'Decades of fire suppression left many North State forests far denser than they used to be. Thinning removes the small trees and brush in between the big ones, the “ladder fuels” that carry a ground fire up into the crowns.',
  },
  {
    id: 'chip', flow: 'fuel', title: 'Chipping',
    text: 'Limbs, tops, and brush with no lumber value are chipped for fuel instead of being left to dry out or burned in open piles.',
    more: 'Material from a thinning project has little or no value as lumber. Without a plant like ours, it is usually piled and burned in the woods, or left to dry out on the forest floor.',
  },
  {
    id: 'haul', flow: 'fuel', title: 'The haul',
    text: 'Trucks bring the chips down out of the mountains to our plant in Anderson, in the Sacramento Valley.',
    more: 'Fuel comes from projects across the region, down to our fuel yard off Industry Road in Anderson.',
  },
  {
    id: 'yard', flow: 'fuel', title: 'Fuel yard',
    text: 'Up to 1,250 tons of wood arrive every day, including limbs, pallets, and clean lumber that neighbors drop off through our free recycling program.',
    more: 'The yard blends and stores fuel so the boiler gets a steady supply. Our Wood to Energy Recycling Program accepts clean tree wood and lumber from the public at no cost.',
  },
  {
    id: 'boiler', flow: 'boil', title: 'Boiler',
    text: 'Controlled combustion turns the wood into high-pressure steam, capturing energy that would otherwise go up in smoke from an open burn pile.',
    more: 'Conveyors feed chips into the boiler, where they burn under controlled conditions. The heat boils water inside the boiler’s tube walls, making high-pressure steam.',
  },
  {
    id: 'turbine', flow: 'steam', title: 'Turbine',
    text: 'That steam spins a turbine generator rated at 55 megawatts.',
    more: 'Steam expands through the turbine and spins the generator. Then it is condensed back into water and returned to the boiler to be used again.',
  },
  {
    id: 'grid', flow: 'power', title: 'The grid',
    text: 'Our substation steps the electricity up to grid voltage and sends it out across Northern California.',
    more: 'Unlike solar and wind, a biomass plant can run whatever the weather and whatever the time of day.',
  },
  {
    id: 'home', flow: 'power', title: 'Your home',
    text: 'The end of the line: enough renewable electricity for about 62,600 homes.',
    more: 'That power comes from material that would otherwise have been burned in the open or left to feed the next wildfire.',
  },
];

// UI keeps to the two flow colors: fuel green until the turbine, power gold from the turbine on.
export const flowColor: Record<Flow, string> = { fuel: 'var(--fuel)', boil: 'var(--fuel)', steam: 'var(--gold)', power: 'var(--gold)' };
