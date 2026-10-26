// Foundational Class 6 & Class 7 General Knowledge (NCERT / School Level)
// Designed to give Level 1 (Rookie) and Level 2 (Sharp) players approachable,
// unambiguous, confidence-building questions across all 8 GK categories.

import type { GkData } from "../types";

export const FOUNDATIONS: GkData[] = [
  // ==========================================================================
  // 1. GEOGRAPHY (Class 6 & 7)
  // ==========================================================================
  {
    cat: "geography",
    mcq: {
      "Solar System": [
        ["Which planet is closest to the Sun?", "Mercury", "Venus", "Earth", "Mars", 6],
        ["Which planet is known as the 'Red Planet'?", "Mars", "Jupiter", "Venus", "Saturn", 6],
        ["Which is the largest planet in our Solar System?", "Jupiter", "Saturn", "Neptune", "Earth", 6],
        ["Which planet is famous for its bright rings?", "Saturn", "Mars", "Mercury", "Venus", 6],
        ["Which planet is known as Earth's twin in size?", "Venus", "Mars", "Mercury", "Jupiter", 6],
        ["Which is the only planet known to support life?", "Earth", "Mars", "Venus", "Jupiter", 6],
        ["What is the natural satellite of the Earth?", "The Moon", "Phobos", "Titan", "Europa", 6],
        ["The Sun is primarily a ___.", "Star", "Planet", "Comet", "Asteroid", 6],
        ["Which planet is farthest from the Sun in our Solar System?", "Neptune", "Uranus", "Saturn", "Jupiter", 6],
        ["Which galaxy is Earth located in?", "Milky Way", "Andromeda", "Triangulum", "Whirlpool", 6],
        ["What causes day and night on Earth?", "Rotation of Earth", "Revolution of Earth", "Moon's orbit", "Solar flares", 6],
        ["What causes the change of seasons on Earth?", "Revolution and tilt of Earth", "Daily rotation", "Tides", "Eclipses", 6],
        ["How long does Earth take to complete one rotation?", "About 24 hours", "365 days", "30 days", "12 hours", 6],
        ["How many days does a normal (non-leap) year have?", "365", "366", "360", "354", 6],
        ["How many days does a leap year have?", "366", "365", "364", "367", 6],
      ],
      "Continents & Oceans": [
        ["How many continents are there on Earth?", "7", "5", "6", "8", 6],
        ["Which is the largest continent by area?", "Asia", "Africa", "North America", "Europe", 6],
        ["Which is the smallest continent by land area?", "Australia", "Europe", "Antarctica", "South America", 6],
        ["Which is the largest and deepest ocean on Earth?", "Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean", 6],
        ["Which ocean is named after India?", "Indian Ocean", "Pacific Ocean", "Atlantic Ocean", "Southern Ocean", 6],
        ["Which is the coldest, ice-covered continent at the South Pole?", "Antarctica", "Europe", "Asia", "Australia", 6],
        ["Which is the longest river in the world?", "Nile", "Amazon", "Yangtze", "Mississippi", 6],
        ["Which is the largest hot desert in the world?", "Sahara Desert", "Thar Desert", "Gobi Desert", "Kalahari Desert", 6],
        ["Which is the highest mountain peak in the world?", "Mount Everest", "K2", "Kangchenjunga", "Lhotse", 6],
        ["Which imaginary line at 0° latitude divides Earth into Northern and Southern Hemispheres?", "Equator", "Prime Meridian", "Tropic of Cancer", "Arctic Circle", 6],
        ["Which important latitude passes almost halfway through India?", "Tropic of Cancer", "Equator", "Tropic of Capricorn", "Arctic Circle", 6],
      ],
      "India Basics": [
        ["What is the capital of India?", "New Delhi", "Mumbai", "Kolkata", "Chennai", 6],
        ["Which is the longest river flowing through India?", "Ganga", "Yamuna", "Narmada", "Tapi", 6],
        ["Which desert lies mainly in Rajasthan?", "Thar Desert", "Sahara Desert", "Gobi Desert", "Atacama Desert", 6],
        ["Which mountain range forms the northern boundary of India?", "The Himalayas", "The Aravallis", "The Vindhyas", "The Nilgiris", 6],
        ["Which water body lies to the east of peninsular India?", "Bay of Bengal", "Arabian Sea", "Red Sea", "Mediterranean Sea", 6],
        ["Which water body lies to the west of peninsular India?", "Arabian Sea", "Bay of Bengal", "South China Sea", "Caspian Sea", 6],
        ["Which island group of India lies in the Arabian Sea?", "Lakshadweep", "Andaman and Nicobar", "Majuli", "Sriharikota", 7],
        ["Which island group of India lies in the Bay of Bengal?", "Andaman and Nicobar", "Lakshadweep", "Diu", "Salsette", 7],
        ["Which is the largest state of India by area?", "Rajasthan", "Madhya Pradesh", "Maharashtra", "Uttar Pradesh", 6],
        ["Which is the smallest state of India by area?", "Goa", "Sikkim", "Tripura", "Nagaland", 6],
        ["Which Indian state is known as the 'Land of Five Rivers'?", "Punjab", "Haryana", "Gujarat", "Bihar", 6],
        ["Which city in India is called the 'Pink City'?", "Jaipur", "Udaipur", "Jodhpur", "Bikaner", 6],
        ["Which state is known as the 'Spice Garden of India'?", "Kerala", "Assam", "Punjab", "Odisha", 7],
      ],
    },
    tables: [
      {
        topic: "Indian States & Capitals",
        cols: ["State", "Capital"],
        rows: [
          ["Maharashtra", "Mumbai", 6],
          ["Karnataka", "Bengaluru", 6],
          ["Tamil Nadu", "Chennai", 6],
          ["West Bengal", "Kolkata", 6],
          ["Rajasthan", "Jaipur", 6],
          ["Gujarat", "Gandhinagar", 6],
          ["Uttar Pradesh", "Lucknow", 6],
          ["Bihar", "Patna", 6],
          ["Madhya Pradesh", "Bhopal", 6],
          ["Kerala", "Thiruvananthapuram", 6],
          ["Telangana", "Hyderabad", 6],
          ["Odisha", "Bhubaneswar", 6],
          ["Assam", "Dispur", 7],
          ["Goa", "Panaji", 6],
          ["Himachal Pradesh", "Shimla", 6],
          ["Jharkhand", "Ranchi", 7],
          ["Chhattisgarh", "Raipur", 7],
          ["Uttarakhand", "Dehradun", 7],
          ["Sikkim", "Gangtok", 7],
          ["Manipur", "Imphal", 7],
          ["Meghalaya", "Shillong", 7],
          ["Mizoram", "Aizawl", 7],
          ["Nagaland", "Kohima", 7],
          ["Tripura", "Agartala", 7],
          ["Arunachal Pradesh", "Itanagar", 7],
        ],
        asks: [
          { to: 1, q: ["What is the capital of {0}?", "Which city is the capital of {0}?"] },
          { to: 0, q: ["{1} is the capital of which Indian state?", "Which state has {1} as its capital?"] },
        ],
      },
      {
        topic: "City Nicknames of India",
        cols: ["City", "Nickname"],
        rows: [
          ["Jaipur", "Pink City", 6],
          ["Udaipur", "City of Lakes", 6],
          ["Jodhpur", "Blue City", 7],
          ["Bengaluru", "Silicon Valley of India", 6],
          ["Kolkata", "City of Joy", 6],
          ["Mumbai", "City of Dreams", 6],
          ["Surat", "Diamond City of India", 7],
          ["Nagpur", "Orange City", 6],
          ["Amritsar", "Golden City of Punjab", 6],
          ["Kochi", "Queen of the Arabian Sea", 7],
          ["Ahmedabad", "Manchester of India", 7],
          ["Rishikesh", "Yoga Capital of the World", 7],
        ],
        asks: [
          { to: 1, q: ["What is the popular nickname of {0}?"] },
          { to: 0, q: ["Which Indian city is known as the '{1}'?"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // 2. SCIENCE & TECH (Class 6 & 7)
  // ==========================================================================
  {
    cat: "scitech",
    mcq: {
      "Everyday Science": [
        ["Which gas do humans breathe in to survive?", "Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen", 6],
        ["Which gas do plants absorb from the air during photosynthesis?", "Carbon dioxide", "Oxygen", "Argon", "Helium", 6],
        ["Which is the most abundant gas in Earth's atmosphere?", "Nitrogen", "Oxygen", "Carbon dioxide", "Hydrogen", 6],
        ["At what temperature does pure water boil at sea level?", "100°C", "0°C", "50°C", "90°C", 6],
        ["At what temperature does pure water freeze into ice?", "0°C", "100°C", "32°C", "-10°C", 6],
        ["What is the chemical formula of water?", "H₂O", "CO₂", "NaCl", "O₂", 6],
        ["Which pigment gives green leaves their colour?", "Chlorophyll", "Haemoglobin", "Melanin", "Carotene", 6],
        ["Which organ pumps blood throughout the human body?", "Heart", "Lungs", "Liver", "Brain", 6],
        ["How many bones are there in an adult human body?", "206", "300", "106", "250", 6],
        ["Which is the longest and strongest bone in the human body?", "Femur (thigh bone)", "Stapes", "Humerus", "Rib", 6],
        ["Which is the smallest bone in the human body, located in the ear?", "Stapes", "Femur", "Tibia", "Ulna", 7],
        ["Which organ in the human body filters waste to make urine?", "Kidneys", "Lungs", "Heart", "Stomach", 6],
        ["Which vitamin is produced by the human skin in sunlight?", "Vitamin D", "Vitamin C", "Vitamin A", "Vitamin B12", 6],
        ["Citrus fruits like oranges and lemons are rich in ___.", "Vitamin C", "Vitamin D", "Vitamin B12", "Iron", 6],
        ["Which metal is a liquid at room temperature?", "Mercury", "Iron", "Copper", "Aluminium", 7],
        ["What force pulls objects toward the centre of the Earth?", "Gravity", "Magnetism", "Friction", "Buoyancy", 6],
        ["Sound cannot travel through a ___.", "Vacuum", "Solid", "Liquid", "Gas", 7],
        ["How many colours are seen in a rainbow (VIBGYOR)?", "7", "5", "6", "8", 6],
        ["Animals that eat only plants are called ___.", "Herbivores", "Carnivores", "Omnivores", "Decomposers", 6],
        ["Animals that eat only other animals are called ___.", "Carnivores", "Herbivores", "Omnivores", "Producers", 6],
        ["Animals that eat both plants and animals are called ___.", "Omnivores", "Herbivores", "Carnivores", "Parasites", 6],
      ],
    },
    tables: [
      {
        topic: "Scientific Instruments",
        cols: ["Instrument", "Measures / Used For"],
        rows: [
          ["Thermometer", "Temperature", 6],
          ["Barometer", "Atmospheric pressure", 7],
          ["Speedometer", "Instantaneous speed of a vehicle", 6],
          ["Odometer", "Distance travelled by a vehicle", 6],
          ["Anemometer", "Wind speed", 7],
          ["Seismograph", "Earthquake waves", 7],
          ["Stethoscope", "Heartbeat and lung sounds", 6],
          ["Microscope", "Magnifying tiny objects and cells", 6],
          ["Telescope", "Viewing distant stars and planets", 6],
          ["Hygrometer", "Humidity in air", 7],
          ["Lactometer", "Purity of milk", 7],
          ["Ammeter", "Electric current", 7],
        ],
        asks: [
          { to: 1, q: ["What is a {0} used for?", "What does a {0} measure or do?"] },
          { to: 0, q: ["Which instrument is used for {1}?"] },
        ],
      },
      {
        topic: "Vitamins & Deficiency Diseases",
        cols: ["Nutrient", "Deficiency Disease"],
        rows: [
          ["Vitamin A", "Night blindness", 6],
          ["Vitamin B1", "Beriberi", 6],
          ["Vitamin C", "Scurvy (bleeding gums)", 6],
          ["Vitamin D", "Rickets (weak bones)", 6],
          ["Iron", "Anaemia", 6],
          ["Iodine", "Goitre (swollen neck gland)", 6],
        ],
        asks: [
          { to: 1, q: ["Deficiency of {0} in the diet causes ___."] },
          { to: 0, q: ["{1} is caused by the deficiency of ___."] },
        ],
      },
      {
        topic: "Famous Inventions",
        cols: ["Invention / Discovery", "Inventor / Scientist"],
        rows: [
          ["Telephone", "Alexander Graham Bell", 6],
          ["Practical Electric Bulb", "Thomas Alva Edison", 6],
          ["Aeroplane", "Wright Brothers", 6],
          ["Penicillin (first antibiotic)", "Alexander Fleming", 7],
          ["World Wide Web (WWW)", "Tim Berners-Lee", 7],
          ["Radium and Polonium", "Marie Curie", 7],
          ["Law of Universal Gravitation", "Isaac Newton", 6],
          ["Printing Press", "Johannes Gutenberg", 7],
          ["Steam Engine (improved)", "James Watt", 7],
          ["Vaccination (Smallpox)", "Edward Jenner", 7],
        ],
        asks: [
          { to: 1, q: ["Who is credited with the invention or discovery of {0}?"] },
          { to: 0, q: ["What is {1} famously credited with inventing or discovering?"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // 3. HISTORY (Class 6 & 7)
  // ==========================================================================
  {
    cat: "history",
    mcq: {
      "Indian History Basics": [
        ["Who is revered as the 'Father of the Nation' in India?", "Mahatma Gandhi", "Jawaharlal Nehru", "Subhas Chandra Bose", "Sardar Patel", 6],
        ["In which year did India gain independence?", "1947", "1950", "1942", "1945", 6],
        ["On which date is Independence Day celebrated in India?", "15 August", "26 January", "2 October", "14 November", 6],
        ["On which date is Republic Day celebrated in India?", "26 January", "15 August", "2 October", "26 November", 6],
        ["Whose birthday is celebrated as Gandhi Jayanti on 2 October?", "Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Patel", "B. R. Ambedkar", 6],
        ["Who was the first Prime Minister of independent India?", "Jawaharlal Nehru", "Sardar Vallabhbhai Patel", "Lal Bahadur Shastri", "Rajendra Prasad", 6],
        ["Who was the first President of independent India?", "Dr. Rajendra Prasad", "Dr. S. Radhakrishnan", "Jawaharlal Nehru", "Zakir Husain", 6],
        ["Who is known as the 'Iron Man of India'?", "Sardar Vallabhbhai Patel", "Subhas Chandra Bose", "Bhagat Singh", "Lala Lajpat Rai", 6],
        ["Who popularly gave the slogan 'Jai Hind'?", "Subhas Chandra Bose", "Mahatma Gandhi", "Bal Gangadhar Tilak", "Jawaharlal Nehru", 6],
        ["Who gave the slogan 'Swaraj is my birthright and I shall have it'?", "Bal Gangadhar Tilak", "Mahatma Gandhi", "Bhagat Singh", "Lala Lajpat Rai", 7],
        ["Who gave the slogan 'Give me blood, and I shall give you freedom'?", "Subhas Chandra Bose", "Bhagat Singh", "Chandra Shekhar Azad", "Mangal Pandey", 7],
        ["Which ancient civilisation built the Great Bath at Mohenjo-daro?", "Indus Valley Civilisation", "Vedic Civilisation", "Maurya Empire", "Gupta Empire", 6],
        ["Which Mauryan emperor embraced Buddhism after the Kalinga War?", "Ashoka", "Chandragupta Maurya", "Bindusara", "Samudragupta", 6],
        ["Who built the Taj Mahal in Agra?", "Shah Jahan", "Akbar", "Aurangzeb", "Humayun", 6],
        ["Who founded the Maurya Empire with the guidance of Chanakya?", "Chandragupta Maurya", "Ashoka", "Harsha", "Kanishka", 6],
      ],
    },
    tables: [
      {
        topic: "Great Leaders & Popular Titles",
        cols: ["Leader", "Popular Title"],
        rows: [
          ["Mahatma Gandhi", "Bapu / Father of the Nation", 6],
          ["Sardar Vallabhbhai Patel", "Iron Man of India", 6],
          ["Subhas Chandra Bose", "Netaji", 6],
          ["Rabindranath Tagore", "Gurudev", 6],
          ["Sarojini Naidu", "Nightingale of India", 6],
          ["B. R. Ambedkar", "Babasaheb", 6],
          ["Lala Lajpat Rai", "Punjab Kesari", 7],
          ["Bal Gangadhar Tilak", "Lokmanya", 7],
          ["A. P. J. Abdul Kalam", "Missile Man of India", 6],
          ["Homi J. Bhabha", "Father of the Indian Nuclear Programme", 7],
          ["Vikram Sarabhai", "Father of the Indian Space Programme", 7],
          ["Dadabhai Naoroji", "Grand Old Man of India", 7],
        ],
        asks: [
          { to: 1, q: ["By what popular title is {0} known?"] },
          { to: 0, q: ["Who is popularly known as '{1}'?"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // 4. POLITY & CIVICS (Class 6 & 7)
  // ==========================================================================
  {
    cat: "polity",
    mcq: {
      "National Symbols & Civics": [
        ["What is the National Animal of India?", "Royal Bengal Tiger", "Asiatic Lion", "Indian Elephant", "Snow Leopard", 6],
        ["What is the National Bird of India?", "Indian Peacock", "Great Indian Bustard", "Sarus Crane", "Kingfisher", 6],
        ["What is the National Flower of India?", "Lotus", "Rose", "Marigold", "Jasmine", 6],
        ["What is the National Fruit of India?", "Mango", "Banana", "Guava", "Jackfruit", 6],
        ["What is the National Tree of India?", "Banyan Tree", "Neem Tree", "Peepal Tree", "Ashoka Tree", 6],
        ["What is the National Aquatic Animal of India?", "Ganges River Dolphin", "Blue Whale", "Olive Ridley Turtle", "Dugong", 6],
        ["Who composed the National Anthem of India, 'Jana Gana Mana'?", "Rabindranath Tagore", "Bankim Chandra Chatterjee", "Muhammad Iqbal", "Subramania Bharati", 6],
        ["Who wrote the National Song of India, 'Vande Mataram'?", "Bankim Chandra Chatterjee", "Rabindranath Tagore", "Sarojini Naidu", "Premchand", 6],
        ["How many spokes are there in the Ashoka Chakra on India's National Flag?", "24", "12", "32", "16", 6],
        ["What is the colour of the top band of the Indian National Flag?", "Saffron", "Green", "White", "Blue", 6],
        ["What is the colour of the bottom band of the Indian National Flag?", "Green", "Saffron", "White", "Navy Blue", 6],
        ["What is the minimum voting age in India?", "18 years", "21 years", "16 years", "25 years", 6],
        ["Who is Known as the 'Chief Architect of the Indian Constitution'?", "Dr. B. R. Ambedkar", "Jawaharlal Nehru", "Mahatma Gandhi", "Sardar Patel", 6],
        ["What is the National Motto of India inscribed below the State Emblem?", "Satyameva Jayate", "Vande Mataram", "Jai Hind", "Ahimsa Paramo Dharma", 6],
      ],
    },
    tables: [],
  },

  // ==========================================================================
  // 5. CULTURE & MONUMENTS (Class 6 & 7)
  // ==========================================================================
  {
    cat: "culture",
    mcq: {
      "Festivals & Culture": [
        ["Which festival is known as the 'Festival of Lights' in India?", "Diwali", "Holi", "Pongal", "Onam", 6],
        ["Which festival is popularly known as the 'Festival of Colours'?", "Holi", "Diwali", "Bihu", "Dussehra", 6],
        ["Onam is the most famous harvest festival of which state?", "Kerala", "Tamil Nadu", "Assam", "Punjab", 6],
        ["Pongal is the major harvest festival of which state?", "Tamil Nadu", "Kerala", "Gujarat", "Bihar", 6],
        ["Bihu is the traditional festival of which Indian state?", "Assam", "Odisha", "Punjab", "Manipur", 6],
        ["Baisakhi is widely celebrated as a harvest festival in ___.", "Punjab", "Kerala", "West Bengal", "Goa", 6],
        ["Garba and Dandiya Raas are famous folk dances of ___.", "Gujarat", "Rajasthan", "Bihar", "Odisha", 6],
        ["Bhangra and Giddha are popular folk dances of ___.", "Punjab", "Haryana", "Assam", "Maharashtra", 6],
      ],
    },
    tables: [
      {
        topic: "Famous Indian Monuments",
        cols: ["Monument", "City / Location"],
        rows: [
          ["Taj Mahal", "Agra", 6],
          ["Red Fort (Lal Qila)", "New Delhi", 6],
          ["Qutub Minar", "New Delhi", 6],
          ["Gateway of India", "Mumbai", 6],
          ["Charminar", "Hyderabad", 6],
          ["Hawa Mahal", "Jaipur", 6],
          ["Victoria Memorial", "Kolkata", 6],
          ["Golden Temple (Harmandir Sahib)", "Amritsar", 6],
          ["Mysore Palace", "Mysuru", 6],
          ["Meenakshi Temple", "Madurai", 7],
          ["Sun Temple", "Konark", 7],
          ["Gol Gumbaz", "Vijayapura (Bijapur)", 7],
          ["Sanchi Stupa", "Sanchi (Madhya Pradesh)", 7],
        ],
        asks: [
          { to: 1, q: ["Where is the {0} located?"] },
          { to: 0, q: ["Which famous monument is located in {1}?"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // 6. WORLD & COUNTRIES (Class 6 & 7)
  // ==========================================================================
  {
    cat: "world",
    mcq: {
      "World Basics": [
        ["Which country is known as the 'Land of the Rising Sun'?", "Japan", "China", "Thailand", "South Korea", 6],
        ["Which country is home to kangaroos and koalas?", "Australia", "New Zealand", "South Africa", "Brazil", 6],
        ["Where are the famous ancient Pyramids of Giza located?", "Egypt", "Mexico", "Peru", "Iraq", 6],
        ["In which city is the Eiffel Tower located?", "Paris", "London", "Rome", "Berlin", 6],
        ["In which city is the Statue of Liberty located?", "New York City", "Washington, D.C.", "Los Angeles", "Chicago", 6],
      ],
    },
    tables: [
      {
        topic: "World Countries & Capitals",
        cols: ["Country", "Capital"],
        rows: [
          ["Japan", "Tokyo", 6],
          ["China", "Beijing", 6],
          ["United Kingdom", "London", 6],
          ["France", "Paris", 6],
          ["United States", "Washington, D.C.", 6],
          ["Russia", "Moscow", 6],
          ["Australia", "Canberra", 7],
          ["Canada", "Ottawa", 7],
          ["Germany", "Berlin", 7],
          ["Italy", "Rome", 6],
          ["Nepal", "Kathmandu", 6],
          ["Sri Lanka", "Sri Jayawardenepura Kotte / Colombo", 6],
          ["Bangladesh", "Dhaka", 6],
          ["Bhutan", "Thimphu", 6],
          ["Afghanistan", "Kabul", 7],
          ["Maldives", "Malé", 7],
        ],
        asks: [
          { to: 1, q: ["What is the capital of {0}?"] },
          { to: 0, q: ["{1} is the capital of which country?"] },
        ],
      },
      {
        topic: "World Currencies",
        cols: ["Country", "Currency"],
        rows: [
          ["India", "Indian Rupee (₹)", 6],
          ["United States", "US Dollar ($)", 6],
          ["United Kingdom", "Pound Sterling (£)", 6],
          ["Japan", "Yen (¥)", 6],
          ["Bangladesh", "Taka", 6],
          ["Russia", "Ruble", 7],
          ["Bhutan", "Ngultrum", 7],
        ],
        asks: [
          { to: 1, q: ["What is the official currency of {0}?"] },
          { to: 0, q: ["Which country uses the {1} as its currency?"] },
        ],
      },
    ],
  },

  // ==========================================================================
  // 7. ECONOMY & EVERYDAY CIVICS (Class 6 & 7)
  // ==========================================================================
  {
    cat: "economy",
    mcq: {
      "Money & Occupations": [
        ["Which bank prints and issues currency notes in India?", "Reserve Bank of India (RBI)", "State Bank of India", "World Bank", "NABARD", 6],
        ["Whose portrait appears on Indian Mahatma Gandhi Series currency notes?", "Mahatma Gandhi", "Jawaharlal Nehru", "B. R. Ambedkar", "Sardar Patel", 6],
        ["Farming, fishing, and forestry belong to which sector of the economy?", "Primary sector", "Secondary sector", "Tertiary sector", "IT sector", 7],
        ["Manufacturing goods in factories belongs to which sector?", "Secondary sector", "Primary sector", "Tertiary sector", "Agricultural sector", 7],
        ["Banking, teaching, and transport belong to which sector?", "Tertiary (Service) sector", "Primary sector", "Secondary sector", "Mining sector", 7],
        ["What is the full form of ATM in banking?", "Automated Teller Machine", "Any Time Money", "All Time Machine", "Automated Transfer Mode", 6],
        ["What is the 10-digit alphanumeric card issued by the Income Tax Department in India?", "PAN Card", "Aadhaar Card", "Voter ID", "Ration Card", 7],
        ["How many digits are there in an Aadhaar number?", "12", "10", "16", "8", 6],
      ],
    },
    tables: [],
  },

  // ==========================================================================
  // 8. SPORTS (Class 6 & 7)
  // ==========================================================================
  {
    cat: "sports",
    mcq: {
      "Sports Basics": [
        ["How many players are on the field in one cricket team?", "11", "9", "7", "15", 6],
        ["How many players are on the field in one football (soccer) team?", "11", "7", "9", "5", 6],
        ["How many players are on the court for one basketball team at a time?", "5", "6", "7", "11", 6],
        ["How many squares are there on a standard chessboard?", "64", "32", "81", "100", 6],
        ["How many rings are there in the Olympic symbol?", "5", "4", "6", "7", 6],
        ["How often are the Summer Olympic Games held?", "Every 4 years", "Every 2 years", "Every 5 years", "Every year", 6],
        ["Which Indian cricketer is known as the 'Master Blaster' or 'God of Cricket'?", "Sachin Tendulkar", "Virat Kohli", "M. S. Dhoni", "Kapil Dev", 6],
        ["Which Indian athlete won Olympic gold in javelin throw at Tokyo 2020?", "Neeraj Chopra", "Abhinav Bindra", "Bajrang Punia", "P. V. Sindhu", 6],
        ["Who was the first Indian to win an individual Olympic gold medal (2008 Shooting)?", "Abhinav Bindra", "Neeraj Chopra", "Sushil Kumar", "Leander Paes", 6],
        ["Viswanathan Anand and D. Gukesh are champions of which game?", "Chess", "Badminton", "Table Tennis", "Billiards", 6],
        ["P. V. Sindhu and Saina Nehwal are famous Indian players of ___.", "Badminton", "Tennis", "Squash", "Table Tennis", 6],
        ["Major Dhyan Chand is celebrated as the 'Wizard' of which sport?", "Hockey", "Cricket", "Football", "Kabaddi", 6],
      ],
    },
    tables: [],
  },
];
