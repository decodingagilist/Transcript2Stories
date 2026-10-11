export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  significance: string;
  region: string;
}

const HOLIDAYS_2026: PublicHoliday[] = [
  // Singapore
  { date: '2026-01-01', name: "New Year's Day", significance: "New Year celebration", region: 'Singapore' },
  { date: '2026-01-29', name: 'Chinese New Year (Day 1)', significance: 'Lunar New Year — Year of the Horse', region: 'Singapore' },
  { date: '2026-01-30', name: 'Chinese New Year (Day 2)', significance: 'Second day of Lunar New Year', region: 'Singapore' },
  { date: '2026-04-03', name: 'Good Friday', significance: 'Christian observance of crucifixion of Jesus', region: 'Singapore' },
  { date: '2026-05-01', name: 'Labour Day', significance: "International Workers' Day", region: 'Singapore' },
  { date: '2026-05-24', name: 'Vesak Day', significance: 'Birth, enlightenment and death of Buddha', region: 'Singapore' },
  { date: '2026-06-05', name: 'Hari Raya Haji', significance: 'Islamic festival of sacrifice (Eid al-Adha)', region: 'Singapore' },
  { date: '2026-08-09', name: 'National Day', significance: "Singapore's Independence Day — 1965", region: 'Singapore' },
  { date: '2026-10-20', name: 'Deepavali', significance: 'Hindu festival of lights', region: 'Singapore' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'Christian celebration of birth of Jesus', region: 'Singapore' },

  // United States
  { date: '2026-01-01', name: "New Year's Day", significance: "New Year celebration", region: 'United States' },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day', significance: 'Honour Dr. King\'s civil rights legacy', region: 'United States' },
  { date: '2026-02-16', name: "Presidents' Day", significance: 'Honour US Presidents (Washington/Lincoln)', region: 'United States' },
  { date: '2026-05-25', name: 'Memorial Day', significance: 'Honour fallen military personnel', region: 'United States' },
  { date: '2026-06-19', name: 'Juneteenth', significance: 'Emancipation of enslaved African Americans', region: 'United States' },
  { date: '2026-07-04', name: 'Independence Day', significance: "US Declaration of Independence — 1776", region: 'United States' },
  { date: '2026-09-07', name: 'Labor Day', significance: "Celebrate workers' contributions", region: 'United States' },
  { date: '2026-11-26', name: 'Thanksgiving', significance: 'Harvest festival and giving thanks', region: 'United States' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'Christian celebration of birth of Jesus', region: 'United States' },

  // United Kingdom
  { date: '2026-01-01', name: "New Year's Day", significance: "New Year celebration", region: 'United Kingdom' },
  { date: '2026-04-03', name: 'Good Friday', significance: 'Christian observance — national holiday', region: 'United Kingdom' },
  { date: '2026-04-06', name: 'Easter Monday', significance: 'Christian celebration of resurrection', region: 'United Kingdom' },
  { date: '2026-05-04', name: 'Early May Bank Holiday', significance: 'Spring Bank Holiday', region: 'United Kingdom' },
  { date: '2026-05-25', name: 'Spring Bank Holiday', significance: 'Late spring public holiday', region: 'United Kingdom' },
  { date: '2026-08-31', name: 'Summer Bank Holiday', significance: 'Late summer public holiday', region: 'United Kingdom' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'National public holiday', region: 'United Kingdom' },
  { date: '2026-12-28', name: 'Boxing Day (substitute)', significance: 'Day after Christmas — national holiday', region: 'United Kingdom' },

  // India
  { date: '2026-01-26', name: 'Republic Day', significance: "India's Constitution came into effect — 1950", region: 'India' },
  { date: '2026-03-02', name: 'Holi', significance: 'Hindu festival of colours and spring', region: 'India' },
  { date: '2026-04-14', name: 'Ambedkar Jayanti', significance: 'Birth anniversary of Dr. B.R. Ambedkar', region: 'India' },
  { date: '2026-04-14', name: 'Good Friday', significance: 'Christian observance — partial holiday', region: 'India' },
  { date: '2026-08-15', name: 'Independence Day', significance: "India's Independence from British rule — 1947", region: 'India' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', significance: 'Birth anniversary of Mahatma Gandhi', region: 'India' },
  { date: '2026-10-20', name: 'Dussehra', significance: 'Hindu festival — victory of good over evil', region: 'India' },
  { date: '2026-11-08', name: 'Diwali', significance: 'Hindu festival of lights', region: 'India' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'National holiday', region: 'India' },

  // Australia
  { date: '2026-01-01', name: "New Year's Day", significance: "New Year celebration", region: 'Australia' },
  { date: '2026-01-26', name: 'Australia Day', significance: "Commemoration of first British settlement — 1788", region: 'Australia' },
  { date: '2026-04-03', name: 'Good Friday', significance: 'National public holiday', region: 'Australia' },
  { date: '2026-04-04', name: 'Easter Saturday', significance: 'Public holiday in most states', region: 'Australia' },
  { date: '2026-04-06', name: 'Easter Monday', significance: 'National public holiday', region: 'Australia' },
  { date: '2026-04-25', name: 'ANZAC Day', significance: 'Commemorate Australian and NZ armed forces', region: 'Australia' },
  { date: '2026-06-08', name: "King's Birthday", significance: "Celebration of the monarch's official birthday", region: 'Australia' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'National holiday', region: 'Australia' },
  { date: '2026-12-28', name: 'Boxing Day', significance: 'Public holiday — day after Christmas', region: 'Australia' },

  // Malaysia
  { date: '2026-01-01', name: "New Year's Day", significance: "New Year celebration", region: 'Malaysia' },
  { date: '2026-01-29', name: 'Chinese New Year (Day 1)', significance: 'Lunar New Year — Year of the Horse', region: 'Malaysia' },
  { date: '2026-01-30', name: 'Chinese New Year (Day 2)', significance: 'Second day of Lunar New Year', region: 'Malaysia' },
  { date: '2026-05-01', name: 'Labour Day', significance: "International Workers' Day", region: 'Malaysia' },
  { date: '2026-05-24', name: 'Wesak Day', significance: 'Birth, enlightenment and nirvana of Buddha', region: 'Malaysia' },
  { date: '2026-06-05', name: 'Hari Raya Aidiladha', significance: 'Islamic festival of sacrifice', region: 'Malaysia' },
  { date: '2026-08-31', name: 'National Day (Merdeka)', significance: "Malaysia's Independence Day — 1957", region: 'Malaysia' },
  { date: '2026-09-16', name: 'Malaysia Day', significance: "Formation of Malaysia — 1963", region: 'Malaysia' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'National holiday', region: 'Malaysia' },

  // Philippines
  { date: '2026-01-01', name: "New Year's Day", significance: "New Year celebration", region: 'Philippines' },
  { date: '2026-04-02', name: 'Maundy Thursday', significance: 'Holy Week — Christian observance', region: 'Philippines' },
  { date: '2026-04-03', name: 'Good Friday', significance: 'Holy Week — Christian observance', region: 'Philippines' },
  { date: '2026-04-09', name: 'Araw ng Kagitingan (Day of Valor)', significance: 'Commemorate fall of Bataan — 1942', region: 'Philippines' },
  { date: '2026-05-01', name: 'Labour Day', significance: "International Workers' Day", region: 'Philippines' },
  { date: '2026-06-12', name: 'Independence Day', significance: "Philippine independence proclaimed — 1898", region: 'Philippines' },
  { date: '2026-08-31', name: 'National Heroes Day', significance: 'Honour Philippine heroes', region: 'Philippines' },
  { date: '2026-11-01', name: "All Saints' Day", significance: 'Catholic day to honour saints', region: 'Philippines' },
  { date: '2026-11-30', name: "Bonifacio Day", significance: "Birthday of Andrés Bonifacio — national hero", region: 'Philippines' },
  { date: '2026-12-25', name: 'Christmas Day', significance: 'Major national holiday', region: 'Philippines' },
  { date: '2026-12-30', name: "Rizal Day", significance: "Death anniversary of José Rizal — national hero", region: 'Philippines' },

  // Germany
  { date: '2026-01-01', name: "Neujahr (New Year's Day)", significance: "New Year celebration", region: 'Germany' },
  { date: '2026-04-03', name: 'Karfreitag (Good Friday)', significance: 'Christian observance', region: 'Germany' },
  { date: '2026-04-06', name: 'Ostermontag (Easter Monday)', significance: 'Christian celebration of resurrection', region: 'Germany' },
  { date: '2026-05-01', name: 'Tag der Arbeit (Labour Day)', significance: "International Workers' Day", region: 'Germany' },
  { date: '2026-05-14', name: 'Christi Himmelfahrt (Ascension)', significance: 'Christian celebration of ascension', region: 'Germany' },
  { date: '2026-05-25', name: 'Pfingstmontag (Whit Monday)', significance: 'Christian Pentecost', region: 'Germany' },
  { date: '2026-10-03', name: 'Tag der Deutschen Einheit', significance: 'German Reunification Day — 1990', region: 'Germany' },
  { date: '2026-12-25', name: '1. Weihnachtstag (Christmas Day)', significance: 'National holiday', region: 'Germany' },
  { date: '2026-12-26', name: '2. Weihnachtstag (Boxing Day)', significance: 'Second Christmas Day', region: 'Germany' },
];

export const GEOGRAPHIES = [
  'Singapore', 'United States', 'United Kingdom', 'India',
  'Australia', 'Malaysia', 'Philippines', 'Germany',
];

export function getHolidaysForRegions(regions: string[]): PublicHoliday[] {
  if (!regions.length) return [];
  const regionSet = new Set(regions);
  const seen = new Set<string>();
  return HOLIDAYS_2026.filter(h => {
    if (!regionSet.has(h.region)) return false;
    const key = `${h.date}-${h.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function getHolidaysOnDate(date: string, regions: string[]): PublicHoliday[] {
  const regionSet = new Set(regions);
  return HOLIDAYS_2026.filter(h => h.date === date && regionSet.has(h.region));
}
