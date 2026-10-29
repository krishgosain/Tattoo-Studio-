// Everything studio-specific lives here: swap these values to rebrand the site.
export const STUDIO = {
  name: 'Siyahi',
  native: 'स्याही',
  meaning: 'Siyahi is the Hindustani word for ink.',
  kind: 'Fine-line tattoo atelier',
  area: 'Pali Hill, Bandra West',
  city: 'Mumbai',
  address: ['2nd floor, 14 Pali Mala Road', 'Pali Hill, Bandra West', 'Mumbai 400050'],
  directions: [
    'From Bandra (W) station: 12 minutes by rickshaw, ask for Pali Mala Road via Hill Road.',
    'Two-wheeler parking in the lane; cars are best left on Pali Hill main road.',
    'Ring the brass bell at the gate; we are above the plant nursery.',
  ],
  hours: [
    ['Tuesday to Friday', '12 noon to 9 pm'],
    ['Saturday and Sunday', '11 am to 10 pm'],
    ['Monday', 'Closed for deep clean and drawing day'],
  ],
  whatsapp: '919800000000', // replace with the studio's WhatsApp number, country code first, no +
  phoneDisplay: '+91 98000 00000',
  email: 'hello@siyahi.studio',
  instagram: 'siyahi.ink',
  geo: { lat: 19.0668, lon: 72.8268 },
};

export const PRICING = {
  currency: '₹',
  minimum: 3500,
  hourly: 6000,
  deposit: 2000,
  // per square centimetre of design area, before placement and detail adjustments
  perCm2: { 'fine-line': 34, script: 30, dotwork: 44, blackwork: 48, ornamental: 46, colour: 58 },
};

export const ARTISTS = [
  {
    id: 'meher',
    name: 'Meher Kapadia',
    craft: 'Fine-line, botanicals, micro-script',
    years: 9,
    days: 'Tuesday to Saturday',
    bio: 'Trained in architectural drawing before she ever held a machine. Known for single-needle florals that still read clearly ten years on.',
    handle: 'meher.ink',
  },
  {
    id: 'kabir',
    name: 'Kabir Sethna',
    craft: 'Dotwork, mandala, ornamental blackwork',
    years: 12,
    days: 'Wednesday to Sunday',
    bio: 'Builds geometry by hand, then lets the stipple do the shading. Large back and sleeve projects booked in planned sessions.',
    handle: 'kabir.dots',
  },
  {
    id: 'zoya',
    name: 'Zoya Fernandes',
    craft: 'Lettering in seven scripts',
    years: 7,
    days: 'Thursday to Monday',
    bio: 'Latin, Devanagari, Gujarati, Gurmukhi, Urdu, Tamil and Bengali. Checks every word with a native reader before it reaches skin.',
    handle: 'zoya.letters',
  },
];

export const PROCESS = [
  { title: 'Preview it here', time: 'Today', text: 'Build the design on the 3D body, try it on a photo of your own skin, and send it with your booking.' },
  { title: 'Consult with your artist', time: '15 minutes, free', text: 'On video or at the studio. We check placement, size against the detail, and how the design will age on your skin tone.' },
  { title: 'Final drawing', time: 'Within 48 hours', text: 'Your artist redraws the preview by hand for your body. Two rounds of changes are included.' },
  { title: 'Stencil and session', time: 'On the day', text: 'We place the stencil on you and adjust it in the mirror until it is right. Nothing is inked until you say yes.' },
  { title: 'Healing check', time: 'Week 4', text: 'Come back for a look under studio light. Any touch-up in the first three months is free.' },
];

export const AFTERCARE = [
  { when: 'First 3 hours', what: 'Leave the film on. Then wash with lukewarm water and a fragrance-free soap, pat dry with a paper towel.' },
  { when: 'Days 1 to 4', what: 'Wash twice a day and apply a rice-grain amount of the balm we give you. In Mumbai humidity, less balm heals better than more.' },
  { when: 'Days 5 to 14', what: 'Flaking and itching are normal. Do not scratch or peel. Avoid the gym for the first week if the tattoo sits on a muscle you will train.' },
  { when: 'Weeks 3 to 4', what: 'The skin looks healed but is still settling. Sunscreen of SPF 50 every time it sees the sun, including the walk along Carter Road.' },
];

export const MONSOON = [
  'No wading through flooded streets until the skin is fully closed. Street water carries bacteria a fresh tattoo cannot handle.',
  'Keep a clean, loose sleeve over arm work on crowded local trains; rubbing against wet fabric lifts ink.',
  'No sea, pool or Juhu swims for two weeks.',
  'Dry the tattoo fully after the rain catches you; damp skin under a bandage is how infections start.',
];

export const FAQ = [
  ['How old do I need to be?', 'Eighteen, with a government photo ID on the day. No exceptions, including with a parent present.'],
  ['Does the 3D preview match the final tattoo?', 'It shows size, placement and how the design sits on a curve as closely as a screen can. Your artist redraws it by hand for your body, and you approve the stencil on your skin before anything is inked.'],
  ['How accurate is the price estimate?', 'It uses our real rates, the area of the design, its detail and the placement. The quote your artist gives at consultation is final, and it is usually within the range shown.'],
  ['What about the AI sketches?', 'They are a starting point to show us what you have in mind. Every tattoo is redrawn by an artist; we never ink a generated image as is.'],
  ['Will fine-line work hold up?', 'Lines spread slightly over the years. We set a minimum size for detailed designs so they stay readable, and the ageing slider in the preview shows roughly what ten years looks like.'],
  ['Do you use numbing cream?', 'Yes, on request for ribs, sternum, hands and feet. Tell us when booking so it can go on forty minutes before the session.'],
  ['What is the deposit for?', 'The ₹2,000 deposit holds your slot and is adjusted against the final price. It is refundable if you reschedule at least 48 hours ahead.'],
  ['Is it hygienic?', 'Single-use needles and cartridges opened in front of you, an autoclave for every reusable tool, and surfaces wrapped fresh for each client.'],
];
