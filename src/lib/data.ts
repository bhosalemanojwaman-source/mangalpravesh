export const STATUS = ['Not started', 'In progress', 'Clear', 'Review needed', 'High risk'];
export const STAGES = ['Land', 'Approvals', 'Foundation', 'Structure', 'Plumbing and electrical', 'Plaster and finishing', 'Interiors', 'Contingency'];
export const LAND: [string, string, string][] = [
  ['title', 'Title deeds and ownership history', 'Trace ownership back about 30 years. A lawyer should confirm the chain.'],
  ['thandaper', 'Thandaper and Basic Tax Register match the seller', 'Owner, area and survey number should match.'],
  ['certs', 'Possession and location certificates', 'Issued through the village office.'],
  ['tax', 'Land tax paid up to date', 'Ask for the latest receipt.'],
  ['ec', 'Encumbrance certificate is clean', 'Shows loans, mortgages or charges.'],
  ['court', 'Court and litigation search done', 'Search by seller name and by plot. An open case is a red flag.'],
  ['paddy', 'Not listed as paddy land or wetland', 'Kerala restricts building on such land.'],
  ['crz', 'Coastal, river and other limits checked', 'Applies near the coast, rivers and canals.'],
  ['zoning', 'Road access and local body rules allow your house', 'Check setbacks, road width and permitted use.'],
  ['survey', 'Boundary survey matches the documents', 'Measure on site and compare with the plan.'],
];
export const inr = (n: number) => '\u20B9' + Math.round(n).toLocaleString('en-IN');
