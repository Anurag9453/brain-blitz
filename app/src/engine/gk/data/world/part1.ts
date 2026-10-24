import type { GkData, FactTable } from "../../types";

// [country, capital, continent ("" when transcontinental/ambiguous), band]
type Row = [string, string, string, 6 | 7 | 8 | 9 | 10];
const C: Row[] = [
  ["India", "New Delhi", "Asia", 6], ["Pakistan", "Islamabad", "Asia", 6], ["Bangladesh", "Dhaka", "Asia", 6],
  ["Nepal", "Kathmandu", "Asia", 6], ["Bhutan", "Thimphu", "Asia", 7], ["Afghanistan", "Kabul", "Asia", 7],
  ["Maldives", "Malé", "Asia", 7], ["Myanmar", "Naypyidaw", "Asia", 9], ["China", "Beijing", "Asia", 6],
  ["Japan", "Tokyo", "Asia", 6], ["South Korea", "Seoul", "Asia", 7], ["North Korea", "Pyongyang", "Asia", 8],
  ["Mongolia", "Ulaanbaatar", "Asia", 9], ["Thailand", "Bangkok", "Asia", 7], ["Vietnam", "Hanoi", "Asia", 7],
  ["Laos", "Vientiane", "Asia", 9], ["Cambodia", "Phnom Penh", "Asia", 8], ["Malaysia", "Kuala Lumpur", "Asia", 7],
  ["Philippines", "Manila", "Asia", 7], ["Brunei", "Bandar Seri Begawan", "Asia", 10], ["Iran", "Tehran", "Asia", 7],
  ["Iraq", "Baghdad", "Asia", 7], ["Saudi Arabia", "Riyadh", "Asia", 7], ["United Arab Emirates", "Abu Dhabi", "Asia", 8],
  ["Qatar", "Doha", "Asia", 8], ["Kuwait", "Kuwait City", "Asia", 8], ["Oman", "Muscat", "Asia", 8],
  ["Jordan", "Amman", "Asia", 8], ["Lebanon", "Beirut", "Asia", 8], ["Syria", "Damascus", "Asia", 8],
  ["Uzbekistan", "Tashkent", "Asia", 9], ["Turkmenistan", "Ashgabat", "Asia", 10], ["Kyrgyzstan", "Bishkek", "Asia", 10],
  ["Tajikistan", "Dushanbe", "Asia", 10], ["Bahrain", "Manama", "Asia", 9],
  ["United Kingdom", "London", "Europe", 6], ["France", "Paris", "Europe", 6], ["Germany", "Berlin", "Europe", 6],
  ["Italy", "Rome", "Europe", 6], ["Spain", "Madrid", "Europe", 6], ["Portugal", "Lisbon", "Europe", 7],
  ["Netherlands", "Amsterdam", "Europe", 7], ["Belgium", "Brussels", "Europe", 7], ["Switzerland", "Bern", "Europe", 8],
  ["Austria", "Vienna", "Europe", 7], ["Greece", "Athens", "Europe", 7], ["Sweden", "Stockholm", "Europe", 7],
  ["Norway", "Oslo", "Europe", 7], ["Denmark", "Copenhagen", "Europe", 7], ["Finland", "Helsinki", "Europe", 7],
  ["Poland", "Warsaw", "Europe", 7], ["Hungary", "Budapest", "Europe", 8], ["Czech Republic", "Prague", "Europe", 8],
  ["Ukraine", "Kyiv", "Europe", 8], ["Ireland", "Dublin", "Europe", 7], ["Romania", "Bucharest", "Europe", 9],
  ["Bulgaria", "Sofia", "Europe", 9], ["Serbia", "Belgrade", "Europe", 9], ["Croatia", "Zagreb", "Europe", 9],
  ["Iceland", "Reykjavik", "Europe", 8], ["Belarus", "Minsk", "Europe", 9],
  ["Nigeria", "Abuja", "Africa", 7], ["Kenya", "Nairobi", "Africa", 7], ["Ethiopia", "Addis Ababa", "Africa", 8],
  ["Ghana", "Accra", "Africa", 8], ["Tanzania", "Dodoma", "Africa", 10], ["Uganda", "Kampala", "Africa", 8],
  ["Morocco", "Rabat", "Africa", 8], ["Algeria", "Algiers", "Africa", 9],
  ["Libya", "Tripoli", "Africa", 9], ["Sudan", "Khartoum", "Africa", 9], ["Zimbabwe", "Harare", "Africa", 9],
  ["Zambia", "Lusaka", "Africa", 9], ["Angola", "Luanda", "Africa", 9], ["Senegal", "Dakar", "Africa", 9],
  ["Mozambique", "Maputo", "Africa", 9], ["Madagascar", "Antananarivo", "Africa", 10], ["Namibia", "Windhoek", "Africa", 10],
  ["Botswana", "Gaborone", "Africa", 10], ["Rwanda", "Kigali", "Africa", 9], ["Somalia", "Mogadishu", "Africa", 9],
  ["Mali", "Bamako", "Africa", 10], ["Cameroon", "Yaoundé", "Africa", 10], ["Malawi", "Lilongwe", "Africa", 10],
  ["Mauritius", "Port Louis", "Africa", 8], ["Seychelles", "Victoria", "Africa", 10],
  ["United States", "Washington, D.C.", "North America", 6], ["Canada", "Ottawa", "North America", 6],
  ["Mexico", "Mexico City", "North America", 7], ["Cuba", "Havana", "North America", 8],
  ["Jamaica", "Kingston", "North America", 8], ["Panama", "Panama City", "North America", 9],
  ["Costa Rica", "San José", "North America", 9],
  ["Brazil", "Brasília", "South America", 7], ["Argentina", "Buenos Aires", "South America", 7],
  ["Chile", "Santiago", "South America", 8], ["Peru", "Lima", "South America", 8], ["Colombia", "Bogotá", "South America", 8],
  ["Venezuela", "Caracas", "South America", 8], ["Ecuador", "Quito", "South America", 9],
  ["Uruguay", "Montevideo", "South America", 9], ["Paraguay", "Asunción", "South America", 10],
  ["Australia", "Canberra", "Oceania", 6], ["New Zealand", "Wellington", "Oceania", 7], ["Fiji", "Suva", "Oceania", 9],
  ["Papua New Guinea", "Port Moresby", "Oceania", 10],
  ["Russia", "Moscow", "", 6], ["Turkey", "Ankara", "", 7], ["Egypt", "Cairo", "", 6],
  ["Kazakhstan", "Astana", "", 9], ["Georgia", "Tbilisi", "", 10], ["Armenia", "Yerevan", "", 10],
  ["Azerbaijan", "Baku", "", 10],
];

const leak = (c: string, k: string) => k.toLowerCase().includes(c.toLowerCase().split(" ")[0]);
const capitals: FactTable = {
  topic: "Capitals of Countries",
  cols: ["country", "capital"],
  rows: C.map(([a, b, , c]) => [a, b, c]),
  asks: [
    { to: 1, q: ["What is the capital of {0}?", "{0} has which city as its capital?", "The capital of {0} is ___."] },
  ],
};
const capitalsRev: FactTable = {
  topic: "Capitals of Countries",
  cols: ["country", "capital"],
  rows: C.filter((r) => !leak(r[0], r[1])).map(([a, b, , c]) => [a, b, c]),
  asks: [
    { to: 0, q: ["{1} is the capital of which country?", "Which country has {1} as its capital?"] },
  ],
};

const cont: FactTable = {
  topic: "Continents of Countries",
  cols: ["country", "continent"],
  rows: C.filter((r) => r[2]).map(([a, , b, c]) => [a, b, Math.max(6, c - 1)]),
  asks: [
    { to: 1, q: ["On which continent is {0} located?", "{0} lies in which continent?"] },
    { to: 0, q: ["Which of these countries is in {1}?"] },
  ],
};

const capCont: FactTable = {
  topic: "Capitals of Countries",
  cols: ["capital", "continent"],
  rows: C.filter((r) => r[2]).map(([, a, b, c]) => [a, b, Math.min(10, c + 1)]),
  asks: [{ to: 1, q: ["The city of {0} is on which continent?"] }],
};

// [country, currency, band]
const cur: (string | number)[][] = [
  ["India", "Indian rupee", 6], ["Pakistan", "Pakistani rupee", 7], ["Nepal", "Nepalese rupee", 7],
  ["Sri Lanka", "Sri Lankan rupee", 7], ["Bangladesh", "Taka", 7], ["Bhutan", "Ngultrum", 9], ["Maldives", "Rufiyaa", 9],
   ["Myanmar", "Kyat", 9], ["China", "Yuan (Renminbi)", 7], ["Japan", "Yen", 6],
  ["South Korea", "South Korean won", 8], ["Thailand", "Baht", 8], ["Vietnam", "Dong", 9], ["Cambodia", "Riel", 10],
  ["Laos", "Kip", 10], ["Malaysia", "Ringgit", 8], ["Indonesia", "Rupiah", 8], ["Philippines", "Philippine peso", 9],
  ["Singapore", "Singapore dollar", 7], ["Mongolia", "Tugrik", 10], ["Iran", "Iranian rial", 9],
  ["Saudi Arabia", "Saudi riyal", 8], ["United Arab Emirates", "UAE dirham", 8], ["Qatar", "Qatari riyal", 9],
  ["Kuwait", "Kuwaiti dinar", 9], ["Oman", "Omani rial", 10], ["Jordan", "Jordanian dinar", 10],
  ["Iraq", "Iraqi dinar", 9], ["Turkey", "Turkish lira", 8], ["Egypt", "Egyptian pound", 8], ["Nigeria", "Naira", 8],
  ["Kenya", "Kenyan shilling", 9], ["Ethiopia", "Birr", 10], ["South Africa", "Rand", 8], ["Ghana", "Cedi", 10],
  ["Zambia", "Kwacha", 10], ["Botswana", "Pula", 10], ["Angola", "Kwanza", 10], ["Morocco", "Moroccan dirham", 10],
  ["United Kingdom", "Pound sterling", 6], ["Russia", "Rouble", 7], ["Switzerland", "Swiss franc", 8],
  ["Sweden", "Swedish krona", 9], ["Norway", "Norwegian krone", 9], ["Denmark", "Danish krone", 9],
  ["Poland", "Zloty", 9], ["Hungary", "Forint", 10], ["Czech Republic", "Czech koruna", 10], ["Ukraine", "Hryvnia", 10],
  ["Kazakhstan", "Tenge", 10], ["Brazil", "Brazilian real", 8], ["Mexico", "Mexican peso", 8],
  ["Argentina", "Argentine peso", 9], ["Canada", "Canadian dollar", 7], ["Australia", "Australian dollar", 7],
  ["New Zealand", "New Zealand dollar", 8], ["United States", "US dollar", 6], ["Peru", "Sol", 10], ["Romania", "Leu", 10],
  ["Algeria", "Algerian dinar", 10], ["Uzbekistan", "Uzbek som", 10], ["Tanzania", "Tanzanian shilling", 10],
  ["Uganda", "Ugandan shilling", 10],
];
const adj = (r: (string | number)[]) => String(r[0]).toLowerCase().split(" ").some((w) => w.length > 3 && String(r[1]).toLowerCase().includes(w.slice(0, 4)));
const currencies: FactTable = {
  topic: "Currencies of the World",
  cols: ["country", "currency"],
  rows: cur,
  asks: [
    { to: 1, q: ["What is the currency of {0}?", "Which currency is used in {0}?", "{0}'s currency is the ___."] },
  ],
};
const currenciesRev: FactTable = {
  topic: "Currencies of the World",
  cols: ["country", "currency"],
  rows: cur.filter((r) => !adj(r)),
  asks: [
    { to: 0, q: ["The {1} is the currency of which country?", "Which country uses the {1} as its currency?"] },
  ],
};

export const PART: GkData = {
  cat: "world",
  mcq: {
    "Currencies of the World": [
      ["Which of these countries uses the euro?", "Germany", "Switzerland", "Sweden", "Norway", 7],
      ["Which of these countries uses the euro?", "France", "United Kingdom", "Denmark", "Poland", 7],
      ["Which of these countries uses the euro?", "Italy", "Hungary", "Czech Republic", "Russia", 7],
      ["Which of these countries uses the euro?", "Portugal", "Norway", "Iceland", "Turkey", 8],
      ["Which of these countries uses the euro?", "Ireland", "United Kingdom", "Switzerland", "Sweden", 8],
      ["Which of these countries uses the euro?", "Greece", "Serbia", "Turkey", "Ukraine", 8],
      ["In which year did euro notes and coins enter circulation?", "2002", "1992", "1999", "2008", 9],
      ["Which of these currencies is NOT named 'dollar'?", "Yen", "Canadian dollar", "Australian dollar", "Singapore dollar", 7],
      ["Which of these is the currency of Japan?", "Yen", "Yuan", "Won", "Baht", 6],
      ["The paise is a subunit of which currency?", "Indian rupee", "Yen", "Dollar", "Pound", 6],
      ["The cent is a hundredth part of which currency?", "US dollar", "Yen", "Rouble", "Rupee", 7],
      ["How many pence make one pound sterling?", "100", "10", "50", "12", 7],
      ["The currency 'Yuan' is also known as the ___.", "Renminbi", "Rupiah", "Ringgit", "Rial", 9],
    ],
  },
  tables: [capitals, capitalsRev, cont, capCont, currencies, currenciesRev],
};
