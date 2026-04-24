export type Region = {
  id: string;
  emoji: string;
  label: string;
  conditions: string[];
};

export const REGIONS: Region[] = [
  {
    id: 'california',
    emoji: '🌉',
    label: 'California, USA',
    conditions: [
      'Valley fever (coccidioidomycosis) — soil/dust inhalation, flu-like with chest pain',
      'Lyme disease — tick bite, bullseye rash, joint pain',
      'Western rattlesnake envenomation — fang marks, rapid swelling',
      'Hantavirus — rodent exposure, fever + respiratory distress',
      'Wildfire smoke inhalation — respiratory irritation, headache',
    ],
  },
  {
    id: 'us_southeast',
    emoji: '🌿',
    label: 'US Southeast',
    conditions: [
      'Rocky Mountain spotted fever — tick bite, fever + petechial rash',
      'Ehrlichiosis / Anaplasmosis — tick bite, fever + low white cell count',
      'Copperhead / water moccasin envenomation — fang marks, swelling',
      'Fire ant anaphylaxis — multiple stings, allergic reaction',
      'Vibrio wound infection — seawater exposure, rapidly worsening wound',
    ],
  },
  {
    id: 'southeast_asia',
    emoji: '🌴',
    label: 'Southeast Asia',
    conditions: [
      'Dengue fever — mosquito bite, high fever + severe bone pain + rash',
      'Scrub typhus — mite bite, eschar + fever + swollen lymph nodes',
      'Melioidosis — soil/water exposure, pneumonia or skin infection',
      'Leptospirosis — flood/water exposure, jaundice + muscle pain',
      'Malaria — mosquito bite (rural), cyclical fever + chills',
      'Hand, foot and mouth disease — child, oral sores + rash on extremities',
    ],
  },
  {
    id: 'sub_saharan_africa',
    emoji: '🌍',
    label: 'Sub-Saharan Africa',
    conditions: [
      'Malaria — mosquito bite, cyclical fever + chills + headache',
      'Typhoid fever — contaminated food/water, sustained fever + abdominal pain',
      'Cholera — contaminated water, profuse watery diarrhea',
      'Schistosomiasis — freshwater exposure, rash then organ involvement',
      'Meningococcal meningitis — meningitis belt, sudden fever + neck stiffness + rash',
      'Rabies — animal bite, wound redness + neurological symptoms',
    ],
  },
  {
    id: 'south_asia',
    emoji: '🕌',
    label: 'South Asia',
    conditions: [
      'Dengue fever — mosquito bite, high fever + severe joint pain + rash',
      'Chikungunya — mosquito bite, fever + debilitating joint pain',
      'Typhoid — contaminated food/water, prolonged fever + rose spots',
      'Kala-azar (visceral leishmaniasis) — sandfly bite, prolonged fever + splenomegaly',
      'Japanese encephalitis — rural mosquito, fever + altered consciousness',
      'Leptospirosis — flood exposure, jaundice + renal failure',
    ],
  },
  {
    id: 'latin_america',
    emoji: '🌎',
    label: 'Latin America',
    conditions: [
      'Dengue fever — mosquito bite, fever + pain behind eyes + rash',
      'Chikungunya — mosquito bite, fever + symmetric joint pain',
      'Zika virus — mosquito bite, mild fever + rash + conjunctivitis',
      'Chagas disease — triatomine bug bite, swollen eye + cardiac symptoms',
      'Yellow fever — jungle mosquito, fever + jaundice + bleeding',
      'Leishmaniasis — sandfly bite, skin ulcer or visceral involvement',
    ],
  },
  {
    id: 'middle_east',
    emoji: '🏜️',
    label: 'Middle East & North Africa',
    conditions: [
      'Heat stroke — extreme heat exposure, confusion + hot dry skin',
      'MERS-CoV — camel contact or hospital exposure, severe respiratory illness',
      'Cutaneous leishmaniasis — sandfly bite, painless skin ulcer',
      'Brucellosis — unpasteurized dairy or livestock, undulant fever + joint pain',
      'Scorpion envenomation — sting, local pain ± systemic effects',
      'Dehydration / hyponatremia — heat + exertion, weakness + cramping',
    ],
  },
  {
    id: 'wilderness',
    emoji: '🏔️',
    label: 'Mountain / Wilderness',
    conditions: [
      'Acute mountain sickness (AMS) — rapid ascent >2500m, headache + nausea',
      'High-altitude pulmonary edema (HAPE) — breathlessness at altitude, cough + pink froth',
      'Hypothermia — cold exposure, confusion + shivering cessation',
      'Frostbite — freezing, white/numb extremities',
      'Giardia — untreated water, delayed-onset diarrhea + bloating',
      'Lightning strike — thunderstorm, altered consciousness + burns',
    ],
  },
];

export function getLocationContext(region: Region): string {
  return (
    `Location: ${region.label}. ` +
    `Regional conditions to weight more heavily when symptoms are consistent: ` +
    region.conditions.join('; ') + '.'
  );
}
