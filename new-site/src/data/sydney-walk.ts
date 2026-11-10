// Content for the private trip-planning page at /sydney-walk (src/pages/sydney-walk.astro).
// Photo ids are file names in public/trips/sydney-2026; sizes live in sydney-walk-photos.json.

export type DayType = "travel" | "mountain" | "coast" | "island" | "rest";

export interface Photo {
  id: string;
  caption: string;
}

export interface Day {
  dow: string;
  date: number;
  type: DayType;
  /** Two or three words for the seven-day strip. */
  short: string;
  title: string;
  text: string;
  stats?: string[];
  sleep?: string;
  photos: Photo[];
}

export interface Plan {
  id: string;
  option: string;
  name: string;
  where: string;
  pitch: string;
  feels: string;
  hero: Photo[];
  /** Solitude, swimming, shade, easy logistics: out of 5. */
  ratings: [number, number, number, number];
  ratingsBy: "me" | "claude";
  glance: {
    tent: string;
    rest: string;
    walking: string;
    bookings: string;
    extra: string;
  };
  facts: string[];
  check?: string[];
  days: Day[];
}

export const dayTypes: Record<DayType, string> = {
  travel: "Travel",
  mountain: "Mountains",
  coast: "Coast",
  island: "Island",
  rest: "Rest and sitting",
};

export const criteria = ["Solitude", "Swimming", "Shade", "Easy logistics"];

export const plans: Plan[] = [
  {
    id: "mountains",
    option: "Option 1",
    name: "Mountains",
    where: "Blue Mountains, Grose Valley",
    pitch:
      "Three nights deep in a wilderness valley under sandstone cliffs and giant blue gums, then a day on the cliff edge.",
    feels:
      "Real solitude, shade, forest and creeks. The huge views are from the cliff edges.",
    hero: [
      {
        id: "m-hero",
        caption:
          "The Grose Valley from Govetts Leap. The valley floor is where you camp.",
      },
    ],
    ratings: [5, 2, 4, 3],
    ratingsBy: "me",
    glance: {
      tent: "3 nights",
      rest: "1 (Wed)",
      walking: "about 40 km",
      bookings: "Acacia Flat, Burra Korain, guesthouse",
      extra: "Train about A$10 each way",
    },
    facts: [
      "Valley camping is free with a A$6 booking fee.",
      "No phone reception in the valley. Carry the free PLB from the Heritage Centre.",
      "Boil creek water for 3 minutes.",
      "Gas stoves only, no fires.",
      "Upper mountains in December: around 23°C by day and 12°C at night, warmer on the valley floor.",
    ],
    check: [
      "Grose Valley tracks have had long closures since the 2019–20 fires and the 2022 floods. Check each leg (Victoria Falls, the river track, Rodriguez Pass up to Evans Lookout) on the NPWS alerts page before booking.",
    ],
    days: [
      {
        dow: "Sun",
        date: 13,
        type: "travel",
        short: "To Blackheath",
        title: "Train to Blackheath",
        text: "About 2 hours from Central. Pick up a free emergency beacon (PLB) at the Blue Mountains Heritage Centre, buy food at the IGA, sleep in a guesthouse.",
        stats: ["Train ~2 h", "~A$10"],
        sleep: "Guesthouse, Blackheath",
        photos: [
          {
            id: "blackheath-town",
            caption:
              "Blackheath village from above, the station in the foreground",
          },
          { id: "blackheath-station", caption: "Blackheath station" },
          {
            id: "govetts-2",
            caption:
              "Govetts Leap, 3 km from the village, if there is evening light",
          },
        ],
      },
      {
        dow: "Mon",
        date: 14,
        type: "mountain",
        short: "Victoria Falls",
        title: "Mount Victoria, down past Victoria Falls to Burra Korain",
        text: "Train one stop to Mount Victoria, then walk down past Victoria Falls into the valley. A short day, so there is time to sit at camp.",
        stats: ["2–3 h walking", "Downhill"],
        sleep: "Tent, Burra Korain",
        photos: [
          {
            id: "vf-cascades",
            caption: "The cascades on Victoria Creek, above the falls",
          },
          {
            id: "vf-lookout",
            caption:
              "The upper Grose Valley from Victoria Falls Lookout, where the descent starts",
          },
          {
            id: "vf-track",
            caption: "On the Victoria Falls track (1979, it looks the same)",
          },
          { id: "mt-victoria", caption: "Mount Victoria station" },
        ],
      },
      {
        dow: "Tue",
        date: 15,
        type: "mountain",
        short: "Grose River",
        title: "Along the Grose River to the Blue Gum Forest",
        text: "Follow the river about 8 km downstream between the cliffs to the Blue Gum Forest. Camp at Acacia Flat, a few minutes further.",
        stats: ["~8 km", "River flat, rough in places"],
        sleep: "Tent, Acacia Flat",
        photos: [
          {
            id: "grose-river",
            caption: "The Grose River near the Blue Gum Forest",
          },
          {
            id: "grose-rapids",
            caption: "The Grose further downstream: boulders and pools",
          },
          {
            id: "bluegum-1",
            caption: "Blue Gum Forest: tall, pale trunks and an open floor",
          },
        ],
      },
      {
        dow: "Wed",
        date: 16,
        type: "rest",
        short: "Acacia Flat",
        title: "Rest and sitting day at Acacia Flat",
        text: "Creek pools and short wanders through the forest. The cliffs catch the first and last light, well above the camp.",
        sleep: "Tent, Acacia Flat",
        photos: [
          {
            id: "bluegum-2",
            caption:
              "Blue gums with the valley wall lit behind them. Acacia Flat is next to this forest",
          },
          { id: "bluegum-3", caption: "The track through the Blue Gum Forest" },
          {
            id: "grose-sunrise",
            caption: "Sunrise on the cliffs of the Grose Valley",
          },
        ],
      },
      {
        dow: "Thu",
        date: 17,
        type: "mountain",
        short: "Climb out",
        title: "Climb out to Evans Lookout and Blackheath",
        text: "About 7.5 km up Govetts Creek and through the Grand Canyon to Evans Lookout, then on to Blackheath for a bed and a proper dinner.",
        stats: ["~7.5 km", "About 600 m up"],
        sleep: "Guesthouse, Blackheath",
        photos: [
          {
            id: "evans",
            caption: "Looking back into the valley from Evans Lookout",
          },
          {
            id: "grand-canyon-1",
            caption: "Inside the Grand Canyon near Blackheath",
          },
          {
            id: "grand-canyon-2",
            caption: "Tree ferns on the Grand Canyon track",
          },
          {
            id: "bridal-veil",
            caption: "The cliffs at Govetts Leap with Bridal Veil Falls",
          },
        ],
      },
      {
        dow: "Fri",
        date: 18,
        type: "mountain",
        short: "Cliff Top Walk",
        title: "Grand Cliff Top Walk, Wentworth Falls to Katoomba",
        text: "19 km along the cliff edge above the Jamison Valley, past waterfalls and lookouts to the Three Sisters. Day pack only, a train at both ends.",
        stats: ["19 km", "Day pack"],
        sleep: "Bed, Katoomba or Sydney",
        photos: [
          {
            id: "sisters-2",
            caption:
              "The Three Sisters and Mount Solitary over morning mist in the Jamison Valley",
          },
          { id: "wentworth-1", caption: "Wentworth Falls" },
          { id: "wentworth-2", caption: "The upper falls at Wentworth Falls" },
          { id: "jamison", caption: "The Jamison Valley from Wentworth Falls" },
          { id: "leura", caption: "Leura Cascades, about halfway" },
          { id: "tarpeian", caption: "Tarpeian Lookout near Leura" },
          { id: "katoomba-falls", caption: "Katoomba Falls" },
          { id: "sisters-1", caption: "The Three Sisters in the last light" },
        ],
      },
      {
        dow: "Sat",
        date: 19,
        type: "travel",
        short: "Fly home",
        title: "Train to Sydney, fly",
        text: "Two hours back to Central, collect the luggage, airport.",
        photos: [
          {
            id: "sisters-3",
            caption: "The Three Sisters, 2.5 km from Katoomba station",
          },
        ],
      },
    ],
  },
  {
    id: "coast",
    option: "Option 2",
    name: "Coast",
    where: "Royal National Park and Kiama",
    pitch:
      "Sandstone cliffs and empty beaches south of Sydney, two nights behind a beach, swimming most days.",
    feels: "More fun, more swimming, but busier and exposed with little shade.",
    hero: [
      {
        id: "c-hero",
        caption:
          "Eagle Rock and Curracurrong Falls on the Coast Track, between Wattamolla and Garie",
      },
    ],
    ratings: [2, 5, 1, 4],
    ratingsBy: "me",
    glance: {
      tent: "2 nights",
      rest: "1 (Tue)",
      walking: "about 46 km",
      bookings: "North Era, beds in Bundeena and Kiama",
      extra: "Ferry cash only",
    },
    facts: [
      "North Era is the only legal campsite on the Coast Track: A$12 per site, must be booked, and it does fill up.",
      "December on the coast: about 24–26°C by day, 16–18°C at night, sea about 21–22°C.",
      "Around 90 mm of rain in the month, in short showers or afternoon storms.",
      "Extreme UV and very little shade.",
      "Swim only at patrolled beaches (rips).",
      "The Bundeena ferry is cash only.",
    ],
    days: [
      {
        dow: "Sun",
        date: 13,
        type: "travel",
        short: "To Bundeena",
        title: "Train to Cronulla, ferry to Bundeena",
        text: "Train to Cronulla, then the small ferry across Port Hacking to Bundeena. Bring cash for the ferry. Sleep in a bed.",
        stats: ["Train ~1 h", "Ferry ~25 min, cash only"],
        sleep: "Bed, Bundeena",
        photos: [
          { id: "ferry", caption: "The Bundeena ferry arriving" },
          { id: "ferry-wharf", caption: "The ferry at the Cronulla wharf" },
        ],
      },
      {
        dow: "Mon",
        date: 14,
        type: "coast",
        short: "Coast Track",
        title: "Coast Track, Bundeena to North Era",
        text: "About 18 km along the clifftops: the “balconies”, Wedding Cake Rock, Marley, the lagoon at Wattamolla, Eagle Rock and Garie Beach. Camp behind the beach at North Era.",
        stats: ["~18 km", "Exposed, carry water"],
        sleep: "Tent, North Era",
        photos: [
          {
            id: "track-1",
            caption: "The Coast Track cliffs south of Bundeena",
          },
          {
            id: "wedding-cake-1",
            caption: "Wedding Cake Rock (fenced now, you look from the side)",
          },
          {
            id: "wedding-cake-2",
            caption: "The cliff line next to Wedding Cake Rock",
          },
          { id: "track-2", caption: "The track through heath towards Marley" },
          { id: "marley", caption: "Marley Beach" },
          { id: "wattamolla-1", caption: "Wattamolla lagoon and beach" },
          { id: "wattamolla-2", caption: "Wattamolla from the air" },
          {
            id: "curracurrong",
            caption: "Curracurrong Falls dropping straight into the sea",
          },
          { id: "garie-1", caption: "Garie Beach from the track" },
          { id: "garie-2", caption: "Garie Beach, patrolled in summer" },
        ],
      },
      {
        dow: "Tue",
        date: 15,
        type: "rest",
        short: "North Era",
        title: "Rest and sitting day at North Era",
        text: "Dawn and sunset on the beach, swimming, nowhere to be. The campground is the grass behind the dunes.",
        sleep: "Tent, North Era",
        photos: [
          { id: "era-2", caption: "North Era Beach from the headland" },
          { id: "era-sunrise", caption: "Sunrise at Era" },
          { id: "era-dusk", caption: "Dusk at North Era" },
          { id: "era-deer", caption: "Deer on the flats behind the beach" },
          { id: "era-1", caption: "North and South Era in the late afternoon" },
        ],
      },
      {
        dow: "Wed",
        date: 16,
        type: "coast",
        short: "To Otford",
        title: "North Era to Otford, train to Kiama",
        text: "About 8 km and 3 hours via Burning Palms and up through palm forest to Otford. Then the train south along the coast to Kiama, a bit over an hour.",
        stats: ["~8 km, 3 h", "Train 1 h+"],
        sleep: "Bed, Kiama",
        photos: [
          { id: "burning-palms-1", caption: "Burning Palms Beach" },
          {
            id: "burning-palms-2",
            caption:
              "Looking down on one of the southern beaches from the track",
          },
          {
            id: "figure8",
            caption:
              "Figure Eight Pools on the rock shelf south of Burning Palms. Low tide and calm seas only",
          },
          { id: "otford", caption: "Otford Lookout at the end of the track" },
          { id: "otford-station", caption: "Otford station" },
        ],
      },
      {
        dow: "Thu",
        date: 17,
        type: "coast",
        short: "Kiama north",
        title: "Kiama Coast Walk, north and middle sections",
        text: "About 14 km from Minnamurra station past Bombo Headland’s basalt columns and the Kiama Blowhole to Loves Bay.",
        stats: ["~14 km", "Town beaches on the way"],
        sleep: "Bed, Kiama",
        photos: [
          { id: "bombo-1", caption: "Basalt columns at Bombo Headland" },
          {
            id: "minnamurra",
            caption: "The Minnamurra River mouth, at the start",
          },
          { id: "bombo-beach", caption: "Bombo Beach" },
          { id: "cathedral", caption: "Cathedral Rocks" },
          { id: "blowhole", caption: "Kiama Blowhole" },
          { id: "lighthouse", caption: "Kiama lighthouse on Blowhole Point" },
        ],
      },
      {
        dow: "Fri",
        date: 18,
        type: "coast",
        short: "To Gerringong",
        title: "Loves Bay to Gerringong",
        text: "About 6 km, the wildest section: clifftop pasture above the sea with no houses, ending at Werri Beach. Train towards Sydney.",
        stats: ["~6 km", "No shade at all"],
        sleep: "Bed, Gerringong or Sydney",
        photos: [
          { id: "kiama-1", caption: "The Kiama Coast Walk south of Loves Bay" },
          { id: "loves-bay", caption: "Looking back north towards Kiama" },
          { id: "kiama-2", caption: "Green headlands and rock platforms" },
          { id: "kiama-4", caption: "Pasture to the cliff edge" },
          { id: "kiama-3", caption: "The mown track across the headlands" },
          {
            id: "werri-1",
            caption: "Werri Beach and Gerringong from the last headland",
          },
        ],
      },
      {
        dow: "Sat",
        date: 19,
        type: "travel",
        short: "Fly home",
        title: "To Sydney, fly",
        text: "Train to Central (about 2.5 hours from Gerringong), collect the luggage, airport.",
        photos: [
          {
            id: "werri-2",
            caption:
              "Werri Beach, for a last swim if you stay in Gerringong on Friday",
          },
        ],
      },
    ],
  },
  {
    id: "both",
    option: "Option 3",
    name: "Both",
    where: "Coast first, then mountains",
    pitch:
      "One night behind a beach, then two in the Blue Gum Forest. The most variety.",
    feels:
      "The most variety, but Tuesday is mostly travel and there is only one rest day.",
    hero: [
      { id: "c-hero", caption: "Eagle Rock on the Coast Track" },
      { id: "m-hero", caption: "The Grose Valley from Govetts Leap" },
    ],
    ratings: [4, 4, 3, 2],
    ratingsBy: "me",
    glance: {
      tent: "3 nights",
      rest: "1 (Thu)",
      walking: "about 48 km",
      bookings: "North Era and Acacia Flat, three beds",
      extra: "Tuesday: ~4 h of trains",
    },
    facts: [
      "Two campsite bookings: North Era and Acacia Flat.",
      "Tuesday is mostly travel: about 4 hours by train with a change in Sydney.",
      "Only one rest day.",
      "Everything from both lists applies: cash for the ferry, the PLB from the Heritage Centre, boiled creek water, no fires.",
    ],
    check: [
      "The descent from Govetts Leap to Junction Rock has had long closures. Check it on the NPWS alerts page before booking Acacia Flat.",
    ],
    days: [
      {
        dow: "Sun",
        date: 13,
        type: "travel",
        short: "To Bundeena",
        title: "Train and ferry to Bundeena",
        text: "Train to Cronulla, cash-only ferry to Bundeena, bed.",
        stats: ["Train ~1 h", "Ferry ~25 min"],
        sleep: "Bed, Bundeena",
        photos: [{ id: "ferry", caption: "The Bundeena ferry" }],
      },
      {
        dow: "Mon",
        date: 14,
        type: "coast",
        short: "Coast Track",
        title: "Coast Track to North Era",
        text: "The full 18 km clifftop day past Wedding Cake Rock, Wattamolla and Garie. Camp behind the beach.",
        stats: ["~18 km"],
        sleep: "Tent, North Era",
        photos: [
          {
            id: "wedding-cake-2",
            caption: "The Coast Track cliffs near Wedding Cake Rock",
          },
          { id: "wattamolla-1", caption: "Wattamolla lagoon" },
          { id: "garie-1", caption: "Garie Beach" },
          { id: "era-1", caption: "North and South Era, the night’s camp" },
        ],
      },
      {
        dow: "Tue",
        date: 15,
        type: "travel",
        short: "Otford, trains",
        title: "North Era to Otford, then trains to Blackheath",
        text: "Dawn on the beach, 8 km out to Otford, then about 4 hours by train with a change in Sydney. Bed in Blackheath, PLB and food for the valley.",
        stats: ["~8 km", "Train ~4 h"],
        sleep: "Guesthouse, Blackheath",
        photos: [
          { id: "era-sunrise", caption: "Sunrise at Era before leaving" },
          { id: "burning-palms-1", caption: "Burning Palms on the way out" },
          { id: "otford", caption: "Otford Lookout" },
          {
            id: "blackheath-station",
            caption: "Blackheath station, that evening",
          },
        ],
      },
      {
        dow: "Wed",
        date: 16,
        type: "mountain",
        short: "Into the valley",
        title: "Govetts Leap, then down to Acacia Flat",
        text: "Walk about 3 km from Blackheath to Govetts Leap, then down about 11 km (4–5 hours) beside the falls and along Govetts Creek to Acacia Flat.",
        stats: ["~14 km", "About 600 m down"],
        sleep: "Tent, Acacia Flat",
        photos: [
          { id: "govetts-1", caption: "The Grose Valley from Govetts Leap" },
          {
            id: "bridal-veil",
            caption: "Bridal Veil Falls. The track goes down beside it",
          },
          {
            id: "pulpit",
            caption: "Pulpit Rock, on the rim just north of Govetts Leap",
          },
          { id: "grose-river", caption: "The Grose River near camp" },
        ],
      },
      {
        dow: "Thu",
        date: 17,
        type: "rest",
        short: "Blue Gum Forest",
        title: "Rest and sitting day in the Blue Gum Forest",
        text: "The one still day of the week: forest, creek pools, cliffs overhead.",
        sleep: "Tent, Acacia Flat",
        photos: [
          { id: "bluegum-2", caption: "Blue gums under the valley wall" },
          { id: "bluegum-1", caption: "Blue Gum Forest" },
          {
            id: "grose-sunrise",
            caption: "Sunrise on the Grose Valley cliffs",
          },
        ],
      },
      {
        dow: "Fri",
        date: 18,
        type: "mountain",
        short: "Climb out",
        title: "Climb out to Evans Lookout",
        text: "About 7.5 km up through the Grand Canyon to Evans Lookout. Bed in Blackheath or go straight back to Sydney.",
        stats: ["~7.5 km", "About 600 m up"],
        sleep: "Bed, Blackheath or Sydney",
        photos: [
          { id: "evans", caption: "Evans Lookout" },
          { id: "grand-canyon-1", caption: "The Grand Canyon" },
          { id: "blackheath-town", caption: "Blackheath village" },
        ],
      },
      {
        dow: "Sat",
        date: 19,
        type: "travel",
        short: "Fly home",
        title: "To Sydney, fly",
        text: "Train to Central, collect the luggage, airport.",
        photos: [
          { id: "grose-mist", caption: "A last look at the Grose Valley" },
        ],
      },
    ],
  },
  {
    id: "tasmania",
    option: "Option 4, added by Claude",
    name: "Tasmania",
    where: "Maria Island, east coast",
    pitch:
      "Four nights on a car-free island national park: painted sandstone, white beaches, wombats on the grass, one small mountain.",
    feels:
      "The closest to a retreat of the four: no cars, no shop, very few people overnight. Colder, less certain weather, and two extra flights.",
    hero: [
      {
        id: "t-hero",
        caption:
          "The Painted Cliffs, half an hour’s walk from the Darlington campground",
      },
    ],
    ratings: [4, 2, 3, 2],
    ratingsBy: "claude",
    glance: {
      tent: "4 nights",
      rest: "1 (Wed)",
      walking: "about 45 km",
      bookings: "Flights, bus, ferry, two beds in Hobart",
      extra: "Flights roughly A$150–350 return",
    },
    facts: [
      "Sydney to Hobart is about a 2 hour flight. A shuttle bus runs Hobart to Triabunna (about 1 h 15); the ferry to Darlington takes about 30–45 minutes and sails several times a day in summer.",
      "No cars and no shop on the island. Carry all food for five days. Gas canister from Hobart.",
      "Camping at Darlington costs a few dollars a night; Frenchs Farm and Encampment Cove are free. Rainwater tanks at each (treat it, and they can run low).",
      "A Tasmanian parks pass is needed on top of the ferry ticket.",
      "December is cooler than Sydney: roughly 20°C by day and 10°C at night, sea about 15–16°C. Pack for wind and rain.",
      "Leave the laptop at Sydney Airport storage rather than Central, or with the Hobart accommodation.",
      "Tasmania has its own quarantine: no fresh fruit or vegetables on the flight in.",
    ],
    check: [
      "I have not checked December 2026 timetables, prices or availability. The ferry and bus times are from the operators’ undated summer schedules.",
      "Saturday needs a Hobart–Sydney flight that connects with the flight home. Fly up Friday evening if the gap is tight.",
      "Ferries are cancelled in bad weather, so Friday’s boat off the island is the weak point of the plan.",
    ],
    days: [
      {
        dow: "Sun",
        date: 13,
        type: "travel",
        short: "Fly to Hobart",
        title: "Fly to Hobart",
        text: "Morning flight from Sydney. Buy gas and five days of food in Hobart, sleep in a bed.",
        stats: ["Flight ~2 h"],
        sleep: "Bed, Hobart",
        photos: [
          {
            id: "bishop",
            caption:
              "Where you are heading: Maria Island’s north coast, with Bishop and Clerk on the skyline",
          },
        ],
      },
      {
        dow: "Mon",
        date: 14,
        type: "island",
        short: "Darlington",
        title: "Bus and ferry to Darlington",
        text: "Morning shuttle to Triabunna, ferry across. Pitch the tent at Darlington, then walk the Fossil Cliffs loop and go to the Painted Cliffs around low tide.",
        stats: ["Bus ~1 h 15", "Ferry ~40 min", "~8 km of short walks"],
        sleep: "Tent, Darlington",
        photos: [
          { id: "darlington", caption: "Arriving at Darlington by ferry" },
          {
            id: "fossil",
            caption: "The Fossil Cliffs, an hour’s loop from camp",
          },
          { id: "painted-2", caption: "The Painted Cliffs at low tide" },
          { id: "wombat-2", caption: "Wombats live around the campground" },
        ],
      },
      {
        dow: "Tue",
        date: 15,
        type: "island",
        short: "Walk south",
        title: "Walk south to Frenchs Farm",
        text: "About 11 km on a flat coastal track past the Painted Cliffs and a string of empty beaches. Encampment Cove is 2 km further if Frenchs Farm has company.",
        stats: ["~11 km", "Flat"],
        sleep: "Tent, Frenchs Farm",
        photos: [
          {
            id: "painted-3",
            caption: "Patterned sandstone on the island’s shore",
          },
          { id: "maria-east", caption: "Clear, cold water" },
          {
            id: "painted-2",
            caption: "The Painted Cliffs, passed again on the way south",
          },
        ],
      },
      {
        dow: "Wed",
        date: 16,
        type: "rest",
        short: "Frenchs Farm",
        title: "Rest and sitting day",
        text: "Sit, then wander to the isthmus: a narrow strip of sand with a long beach on each side.",
        sleep: "Tent, Frenchs Farm",
        photos: [
          {
            id: "maria-beach",
            caption: "A beach on Maria Island: shallow, clear and cold",
          },
          {
            id: "bishop-top",
            caption:
              "The isthmus and the southern half of the island, seen from Bishop and Clerk",
          },
        ],
      },
      {
        dow: "Thu",
        date: 17,
        type: "island",
        short: "Back north",
        title: "Back to Darlington",
        text: "The same 11 km north. Evening on the grass with the wombats and Cape Barren geese.",
        stats: ["~11 km"],
        sleep: "Tent, Darlington",
        photos: [
          {
            id: "wombat",
            caption: "A wombat. They graze on the lawns around Darlington",
          },
          { id: "darlington", caption: "Darlington from the water" },
        ],
      },
      {
        dow: "Fri",
        date: 18,
        type: "island",
        short: "Bishop and Clerk",
        title: "Bishop and Clerk, then off the island",
        text: "Start early for the summit: about 11 km return and 600 m up, with a boulder scramble at the top. Afternoon ferry, bus to Hobart, bed.",
        stats: ["~11 km return", "3–5 h"],
        sleep: "Bed, Hobart",
        photos: [
          { id: "bishop", caption: "Bishop and Clerk above the Fossil Cliffs" },
          { id: "bishop-top", caption: "The view south from the top" },
          { id: "fossil", caption: "The track starts along these cliffs" },
        ],
      },
      {
        dow: "Sat",
        date: 19,
        type: "travel",
        short: "Fly home",
        title: "Hobart to Sydney, fly home",
        text: "Morning flight to Sydney, collect the luggage at the airport, check in.",
        photos: [
          {
            id: "painted-3",
            caption: "Patterned sandstone on Maria Island’s shore",
          },
        ],
      },
    ],
  },
];

export const everyPlan = [
  {
    title: "Clean gear before flying",
    text: "Clean the tent, pegs and boots, and declare camping gear on the Australian arrival card. They are strict about soil.",
  },
  {
    title: "No gas on the plane",
    text: "Buy the canister locally and leave what is left behind.",
  },
  {
    title: "Check alerts the day before",
    text: "Tracks close on high fire-danger days in December.",
  },
  {
    title: "Book early",
    text: "North Era, Acacia Flat and Blackheath guesthouses fill up before the Australian school holidays start around 19 December.",
  },
  { title: "Daylight", text: "Sunrise about 5:40, sunset about 20:00." },
  {
    title: "Luggage",
    text: "Laptop and conference gear stay in storage near Sydney Central, about A$6–8 a day.",
  },
];

export const ruledOut = [
  {
    name: "Six Foot Track",
    why: "Jenolan Caves closed until 2027, no transport at the end.",
  },
  { name: "Overland Track, Tasmania", why: "Booked out." },
  {
    name: "NZ Great Walks",
    why: "Booked out, and the university only covers the return flight from Sydney.",
  },
  { name: "Bali", why: "Rainy season." },
];

export const otherIdeas: {
  name: string;
  where: string;
  text: string;
  photos: Photo[];
}[] = [
  {
    name: "Freycinet Peninsula Circuit",
    where: "Tasmania, 2–3 days",
    text: "About 30 km around Wineglass Bay, Hazards Beach and Cooks Beach, with free walk-in campsites. It could replace half of the Maria Island plan. Without a car it is fiddly: one or two buses a day from Hobart to Coles Bay with a change, and the trailhead is 5 km past the village. Water at the camps is unreliable in summer.",
    photos: [
      { id: "wineglass", caption: "Wineglass Bay from Mount Amos" },
      { id: "hazards-beach", caption: "A beach in Freycinet National Park" },
      { id: "hazards", caption: "The Hazards from Hazards Beach" },
    ],
  },
  {
    name: "Three Capes Track",
    where: "Tasmania, 4 days",
    text: "The big sea-cliff walk: 48 km, three nights in shared cabins, boat from Port Arthur included. Roughly A$500–600 and usually booked far ahead, so check availability first. Cabins with up to 48 walkers and a fixed schedule make it the least retreat-like option here, and the tent stays in the bag.",
    photos: [
      { id: "cape-pillar", caption: "The dolerite cliffs of Cape Pillar" },
    ],
  },
  {
    name: "Mount Solitary traverse",
    where: "Blue Mountains, 2–3 days",
    text: "Katoomba to Wentworth Falls over the mountain in the middle of the Jamison Valley, a train at both ends and almost nobody up there. Hard, with scrambling, and there is no reliable water on top in summer. It could replace the Cliff Top Walk day in Option 1 for someone who wants a second wild night.",
    photos: [
      { id: "solitary", caption: "Mount Solitary from the Katoomba cliffs" },
    ],
  },
  {
    name: "Bouddi Coastal Walk",
    where: "Central Coast, 1 day",
    text: "Eight kilometres of sandstone coast north of Sydney with a small walk-in campground at Little Beach. Train to Woy Woy and a bus. Too short to carry a week, but a quieter alternative to the two Kiama days.",
    photos: [{ id: "bouddi", caption: "Bouddi National Park" }],
  },
];

export const links = [
  {
    label: "NPWS alerts and closures",
    href: "https://www.nationalparks.nsw.gov.au/alerts/alerts-list",
  },
  {
    label: "Acacia Flat campground",
    href: "https://www.nationalparks.nsw.gov.au/camping-and-accommodation/campgrounds/acacia-flat-campground",
  },
  {
    label: "North Era",
    href: "https://www.nationalparks.nsw.gov.au/things-to-do/beach/north-era-beach",
  },
  {
    label: "Maria Island National Park",
    href: "https://parks.tas.gov.au/explore-our-parks/maria-island-national-park",
  },
  { label: "Maria Island ferry", href: "https://encountermaria.com.au/" },
];
