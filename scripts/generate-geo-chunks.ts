import fs from "fs";
import path from "path";
import { COUNTRIES } from "../src/data/countries";

interface GeoCountryChunk {
  code: string;
  name: string;
  stateLabel: string;
  districtLabel: string;
  states: { name: string; districts: string[] }[];
}

const DETAILED_GEO: Record<
  string,
  { stateLabel: string; districtLabel: string; states: Record<string, string[]> }
> = {
  IN: {
    stateLabel: "State / Union Territory",
    districtLabel: "District",
    states: {
      "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
      "Arunachal Pradesh": ["Changlang", "East Kameng", "East Siang", "Itanagar Capital Complex", "Lohit", "Lower Subansiri", "Papum Pare", "Tawang", "West Kameng", "West Siang"],
      "Assam": ["Barpeta", "Cachar", "Darrang", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Nagaon", "Sivasagar", "Sonitpur", "Tinsukia"],
      "Bihar": ["Araria", "Aurangabad", "Begusarai", "Bhagalpur", "Bhojpur", "Darbhanga", "Gaya", "Muzaffarpur", "Nalanda", "Patna", "Purnia", "Rohtas", "Samastipur", "Saran", "Vaishali"],
      "Chhattisgarh": ["Bastar", "Bilaspur", "Dhamtari", "Durg", "Janjgir-Champa", "Korba", "Raigarh", "Raipur", "Rajnandgaon", "Surguja"],
      "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
      "Goa": ["North Goa", "South Goa"],
      "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Banaskantha", "Bharuch", "Bhavnagar", "Gandhinagar", "Jamnagar", "Junagadh", "Kutch", "Mehsana", "Rajkot", "Surat", "Vadodara", "Valsad"],
      "Haryana": ["Ambala", "Bhiwani", "Faridabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Karnal", "Kurukshetra", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
      "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
      "Jammu and Kashmir": ["Anantnag", "Baramulla", "Budgam", "Doda", "Jammu", "Kathua", "Kupwara", "Pulwama", "Rajouri", "Srinagar", "Udhampur"],
      "Jharkhand": ["Bokaro", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Giridih", "Hazaribagh", "Palamu", "Ranchi", "West Singhbhum"],
      "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Dakshina Kannada", "Davanagere", "Dharwad", "Hassan", "Kalaburagi", "Kodagu", "Kolar", "Mandya", "Mysuru", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura"],
      "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
      "Ladakh": ["Kargil", "Leh"],
      "Madhya Pradesh": ["Bhopal", "Chhindwara", "Dewas", "Gwalior", "Indore", "Jabalpur", "Katni", "Mandsaur", "Morena", "Ratlam", "Rewa", "Sagar", "Satna", "Ujjain", "Vidisha"],
      "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Jalgaon", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nashik", "Palghar", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Solapur", "Thane"],
      "Manipur": ["Bishnupur", "Churachandpur", "Imphal East", "Imphal West", "Senapati", "Thoubal", "Ukhrul"],
      "Meghalaya": ["East Garo Hills", "East Khasi Hills", "Ri-Bhoi", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
      "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
      "Nagaland": ["Dimapur", "Kohima", "Mokokchung", "Mon", "Phek", "Tuensang", "Wokha", "Zunheboto"],
      "Odisha": ["Balasore", "Bhadrak", "Cuttack", "Ganjam", "Jajpur", "Kalahandi", "Kendrapara", "Khordha", "Koraput", "Mayurbhanj", "Puri", "Sambalpur", "Sundargarh"],
      "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
      "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Moga", "Mohali (SAS Nagar)", "Patiala", "Sangrur"],
      "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Chittorgarh", "Churu", "Jaipur", "Jaisalmer", "Jodhpur", "Kota", "Nagaur", "Pali", "Sikar", "Udaipur"],
      "Sikkim": ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"],
      "Tamil Nadu": ["Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dindigul", "Erode", "Kanchipuram", "Kanyakumari", "Madurai", "Nagapattinam", "Namakkal", "Salem", "Thanjavur", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tiruppur", "Vellore", "Villupuram"],
      "Telangana": ["Adilabad", "Hyderabad", "Karimnagar", "Khammam", "Mahabubnagar", "Medak", "Medchal-Malkajgiri", "Nalgonda", "Nizamabad", "Rangareddy", "Sangareddy", "Siddipet", "Warangal"],
      "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
      "Uttar Pradesh": ["Agra", "Aligarh", "Ayodhya", "Bareilly", "Gautam Buddha Nagar", "Ghaziabad", "Gorakhpur", "Jhansi", "Kanpur Nagar", "Lucknow", "Mathura", "Meerut", "Moradabad", "Prayagraj", "Saharanpur", "Varanasi"],
      "Uttarakhand": ["Almora", "Chamoli", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
      "West Bengal": ["Bankura", "Birbhum", "Cooch Behar", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Purba Bardhaman", "Purba Medinipur", "South 24 Parganas"],
      "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
      "Chandigarh": ["Chandigarh"],
      "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
      "Lakshadweep": ["Lakshadweep"],
    },
  },
  US: {
    stateLabel: "State",
    districtLabel: "District / city / area",
    states: {
      Alabama: ["Birmingham", "Huntsville", "Mobile", "Montgomery"],
      Alaska: ["Anchorage", "Fairbanks", "Juneau"],
      Arizona: ["Chandler", "Mesa", "Phoenix", "Scottsdale", "Tucson"],
      Arkansas: ["Fayetteville", "Fort Smith", "Little Rock"],
      California: ["Fresno", "Los Angeles", "Oakland", "Sacramento", "San Diego", "San Francisco", "San Jose"],
      Colorado: ["Aurora", "Boulder", "Colorado Springs", "Denver"],
      Connecticut: ["Bridgeport", "Hartford", "New Haven", "Stamford"],
      Delaware: ["Dover", "Newark", "Wilmington"],
      "District of Columbia": ["Washington"],
      Florida: ["Jacksonville", "Miami", "Orlando", "St. Petersburg", "Tampa"],
      Georgia: ["Atlanta", "Augusta", "Columbus", "Savannah"],
      Hawaii: ["Hilo", "Honolulu", "Kahului"],
      Idaho: ["Boise", "Idaho Falls", "Meridian"],
      Illinois: ["Aurora", "Chicago", "Naperville", "Peoria", "Springfield"],
      Indiana: ["Bloomington", "Evansville", "Fort Wayne", "Indianapolis"],
      Iowa: ["Cedar Rapids", "Davenport", "Des Moines"],
      Kansas: ["Kansas City", "Overland Park", "Topeka", "Wichita"],
      Kentucky: ["Bowling Green", "Lexington", "Louisville"],
      Louisiana: ["Baton Rouge", "Lafayette", "New Orleans", "Shreveport"],
      Maine: ["Augusta", "Bangor", "Portland"],
      Maryland: ["Annapolis", "Baltimore", "Frederick", "Rockville"],
      Massachusetts: ["Boston", "Cambridge", "Springfield", "Worcester"],
      Michigan: ["Ann Arbor", "Detroit", "Grand Rapids", "Lansing"],
      Minnesota: ["Duluth", "Minneapolis", "Rochester", "Saint Paul"],
      Mississippi: ["Biloxi", "Gulfport", "Jackson"],
      Missouri: ["Columbia", "Kansas City", "Springfield", "St. Louis"],
      Montana: ["Billings", "Bozeman", "Missoula"],
      Nebraska: ["Lincoln", "Omaha"],
      Nevada: ["Henderson", "Las Vegas", "Reno"],
      "New Hampshire": ["Concord", "Manchester", "Nashua"],
      "New Jersey": ["Edison", "Jersey City", "Newark", "Paterson", "Trenton"],
      "New Mexico": ["Albuquerque", "Las Cruces", "Santa Fe"],
      "New York": ["Albany", "Buffalo", "New York City", "Rochester", "Syracuse", "Yonkers"],
      "North Carolina": ["Asheville", "Charlotte", "Durham", "Greensboro", "Raleigh"],
      "North Dakota": ["Bismarck", "Fargo", "Grand Forks"],
      Ohio: ["Akron", "Cincinnati", "Cleveland", "Columbus", "Dayton", "Toledo"],
      Oklahoma: ["Norman", "Oklahoma City", "Tulsa"],
      Oregon: ["Bend", "Eugene", "Portland", "Salem"],
      Pennsylvania: ["Allentown", "Erie", "Harrisburg", "Philadelphia", "Pittsburgh"],
      "Rhode Island": ["Cranston", "Providence", "Warwick"],
      "South Carolina": ["Charleston", "Columbia", "Greenville"],
      "South Dakota": ["Rapid City", "Sioux Falls"],
      Tennessee: ["Chattanooga", "Knoxville", "Memphis", "Nashville"],
      Texas: ["Austin", "Dallas", "El Paso", "Fort Worth", "Houston", "San Antonio"],
      Utah: ["Provo", "Salt Lake City", "West Valley City"],
      Vermont: ["Burlington", "Montpelier"],
      Virginia: ["Alexandria", "Arlington", "Norfolk", "Richmond", "Virginia Beach"],
      Washington: ["Bellevue", "Seattle", "Spokane", "Tacoma"],
      "West Virginia": ["Charleston", "Huntington", "Morgantown"],
      Wisconsin: ["Green Bay", "Madison", "Milwaukee"],
      Wyoming: ["Casper", "Cheyenne"],
    },
  },
  GB: {
    stateLabel: "Nation / Region",
    districtLabel: "District / city / area",
    states: {
      England: ["Birmingham", "Bristol", "Cambridge", "Leeds", "Liverpool", "London", "Manchester", "Newcastle", "Nottingham", "Oxford", "Sheffield", "Southampton"],
      Scotland: ["Aberdeen", "Dundee", "Edinburgh", "Glasgow", "Inverness"],
      Wales: ["Cardiff", "Newport", "Swansea", "Wrexham"],
      "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Newry"],
    },
  },
  CA: {
    stateLabel: "Province / Territory",
    districtLabel: "District / city / area",
    states: {
      Alberta: ["Calgary", "Edmonton", "Lethbridge", "Red Deer"],
      "British Columbia": ["Burnaby", "Kelowna", "Surrey", "Vancouver", "Victoria"],
      Manitoba: ["Brandon", "Winnipeg"],
      "New Brunswick": ["Fredericton", "Moncton", "Saint John"],
      "Newfoundland and Labrador": ["St. John's"],
      "Nova Scotia": ["Halifax", "Sydney"],
      Ontario: ["Brampton", "Hamilton", "Kitchener", "London", "Mississauga", "Ottawa", "Toronto", "Waterloo"],
      "Prince Edward Island": ["Charlottetown"],
      Quebec: ["Gatineau", "Laval", "Montreal", "Quebec City", "Sherbrooke"],
      Saskatchewan: ["Regina", "Saskatoon"],
      "Northwest Territories": ["Yellowknife"],
      Nunavut: ["Iqaluit"],
      Yukon: ["Whitehorse"],
    },
  },
  AU: {
    stateLabel: "State / Territory",
    districtLabel: "District / city / area",
    states: {
      "New South Wales": ["Newcastle", "Sydney", "Wollongong"],
      Victoria: ["Ballarat", "Geelong", "Melbourne"],
      Queensland: ["Brisbane", "Cairns", "Gold Coast", "Sunshine Coast", "Townsville"],
      "Western Australia": ["Bunbury", "Perth"],
      "South Australia": ["Adelaide"],
      Tasmania: ["Hobart", "Launceston"],
      "Australian Capital Territory": ["Canberra"],
      "Northern Territory": ["Alice Springs", "Darwin"],
    },
  },
  DE: {
    stateLabel: "State (Bundesland)",
    districtLabel: "District / city / area",
    states: {
      "Baden-Württemberg": ["Freiburg", "Heidelberg", "Karlsruhe", "Mannheim", "Stuttgart"],
      Bavaria: ["Augsburg", "Munich", "Nuremberg", "Regensburg"],
      Berlin: ["Berlin"],
      Brandenburg: ["Potsdam"],
      Bremen: ["Bremen"],
      Hamburg: ["Hamburg"],
      Hesse: ["Darmstadt", "Frankfurt", "Kassel", "Wiesbaden"],
      "Lower Saxony": ["Braunschweig", "Göttingen", "Hanover", "Oldenburg"],
      "North Rhine-Westphalia": ["Bonn", "Cologne", "Dortmund", "Düsseldorf", "Essen", "Münster"],
      Saxony: ["Dresden", "Leipzig"],
    },
  },
  FR: {
    stateLabel: "Region",
    districtLabel: "District / city / area",
    states: {
      "Île-de-France": ["Boulogne-Billancourt", "Paris", "Saint-Denis", "Versailles"],
      "Auvergne-Rhône-Alpes": ["Clermont-Ferrand", "Grenoble", "Lyon", "Saint-Étienne"],
      "Provence-Alpes-Côte d'Azur": ["Aix-en-Provence", "Marseille", "Nice", "Toulon"],
      "Nouvelle-Aquitaine": ["Bordeaux", "Limoges", "Poitiers"],
      Occitanie: ["Montpellier", "Nîmes", "Toulouse"],
      "Hauts-de-France": ["Amiens", "Lille"],
      "Grand Est": ["Metz", "Nancy", "Reims", "Strasbourg"],
      Bretagne: ["Brest", "Rennes"],
      "Pays de la Loire": ["Angers", "Nantes"],
      Normandie: ["Caen", "Le Havre", "Rouen"],
    },
  },
  JP: {
    stateLabel: "Prefecture",
    districtLabel: "District / city / area",
    states: {
      Tokyo: ["Chiyoda", "Minato", "Setagaya", "Shibuya", "Shinjuku"],
      Osaka: ["Osaka", "Sakai"],
      Kanagawa: ["Kawasaki", "Yokohama"],
      Aichi: ["Nagoya"],
      Hokkaido: ["Sapporo"],
      Fukuoka: ["Fukuoka", "Kitakyushu"],
      Kyoto: ["Kyoto"],
      Hyogo: ["Kobe"],
      Saitama: ["Saitama"],
      Chiba: ["Chiba"],
    },
  },
  BR: {
    stateLabel: "State",
    districtLabel: "District / city / area",
    states: {
      "São Paulo": ["Campinas", "Guarulhos", "Santos", "São Paulo"],
      "Rio de Janeiro": ["Niterói", "Rio de Janeiro"],
      "Minas Gerais": ["Belo Horizonte", "Uberlândia"],
      Bahia: ["Salvador"],
      Paraná: ["Curitiba", "Londrina"],
      "Rio Grande do Sul": ["Porto Alegre"],
      Pernambuco: ["Recife"],
      Ceará: ["Fortaleza"],
      "Distrito Federal": ["Brasília"],
    },
  },
  ID: {
    stateLabel: "Province",
    districtLabel: "District / city / area",
    states: {
      Jakarta: ["Central Jakarta", "East Jakarta", "North Jakarta", "South Jakarta", "West Jakarta"],
      "West Java": ["Bandung", "Bekasi", "Bogor", "Depok"],
      "East Java": ["Malang", "Surabaya"],
      "Central Java": ["Semarang", "Surakarta"],
      Bali: ["Badung", "Denpasar", "Gianyar"],
      "North Sumatra": ["Medan"],
    },
  },
  PK: {
    stateLabel: "Province",
    districtLabel: "District",
    states: {
      Punjab: ["Faisalabad", "Gujranwala", "Lahore", "Multan", "Rawalpindi", "Sialkot"],
      Sindh: ["Hyderabad", "Karachi", "Sukkur"],
      "Khyber Pakhtunkhwa": ["Abbottabad", "Mardan", "Peshawar", "Swat"],
      Balochistan: ["Gwadar", "Quetta"],
      "Islamabad Capital Territory": ["Islamabad"],
    },
  },
  NG: {
    stateLabel: "State",
    districtLabel: "District / city / area",
    states: {
      Lagos: ["Ikeja", "Ikorodu", "Lagos Island", "Surulere"],
      "Federal Capital Territory": ["Abuja"],
      Kano: ["Kano"],
      Rivers: ["Port Harcourt"],
      Oyo: ["Ibadan"],
      Kaduna: ["Kaduna"],
    },
  },
  PH: {
    stateLabel: "Region",
    districtLabel: "District / city / area",
    states: {
      "Metro Manila": ["Makati", "Manila", "Pasig", "Quezon City", "Taguig"],
      Calabarzon: ["Antipolo", "Calamba", "Cavite City"],
      "Central Visayas": ["Cebu City", "Lapu-Lapu", "Mandaue"],
      "Davao Region": ["Davao City"],
    },
  },
  KR: {
    stateLabel: "Province / Metropolitan City",
    districtLabel: "District / city / area",
    states: {
      Seoul: ["Gangnam", "Jongno", "Mapo", "Songpa"],
      Busan: ["Haeundae", "Busanjin"],
      Incheon: ["Namdong", "Yeonsu"],
      Gyeonggi: ["Seongnam", "Suwon", "Yongin"],
      Daegu: ["Suseong"],
      Daejeon: ["Yuseong"],
    },
  },
  MX: {
    stateLabel: "State",
    districtLabel: "District / city / area",
    states: {
      "Mexico City": ["Benito Juárez", "Coyoacán", "Cuauhtémoc", "Miguel Hidalgo"],
      Jalisco: ["Guadalajara", "Zapopan"],
      "Nuevo León": ["Monterrey", "San Pedro Garza García"],
      Puebla: ["Puebla"],
      "Baja California": ["Mexicali", "Tijuana"],
    },
  },
  ES: {
    stateLabel: "Autonomous Community",
    districtLabel: "District / city / area",
    states: {
      Madrid: ["Madrid", "Móstoles"],
      Catalonia: ["Barcelona", "Girona", "Tarragona"],
      Andalusia: ["Granada", "Málaga", "Seville"],
      Valencia: ["Alicante", "Valencia"],
      "Basque Country": ["Bilbao", "San Sebastián"],
    },
  },
  IT: {
    stateLabel: "Region",
    districtLabel: "District / city / area",
    states: {
      Lombardy: ["Bergamo", "Brescia", "Milan"],
      Lazio: ["Rome"],
      Campania: ["Naples"],
      Piedmont: ["Turin"],
      Tuscany: ["Florence", "Pisa"],
      Veneto: ["Padua", "Venice", "Verona"],
      "Emilia-Romagna": ["Bologna", "Parma"],
    },
  },
  ZA: {
    stateLabel: "Province",
    districtLabel: "District / city / area",
    states: {
      Gauteng: ["Johannesburg", "Pretoria", "Soweto"],
      "Western Cape": ["Cape Town", "Stellenbosch"],
      "KwaZulu-Natal": ["Durban", "Pietermaritzburg"],
      "Eastern Cape": ["Gqeberha"],
    },
  },
  SG: {
    stateLabel: "Region",
    districtLabel: "District / city / area",
    states: {
      Central: ["Bukit Merah", "Downtown Core", "Orchard", "Toa Payoh"],
      East: ["Bedok", "Pasir Ris", "Tampines"],
      North: ["Sembawang", "Woodlands", "Yishun"],
      "North-East": ["Hougang", "Punggol", "Sengkang"],
      West: ["Bukit Batok", "Clementi", "Jurong East"],
    },
  },
  AE: {
    stateLabel: "Emirate",
    districtLabel: "District / city / area",
    states: {
      "Abu Dhabi": ["Abu Dhabi City", "Al Ain"],
      Dubai: ["Bur Dubai", "Deira", "Dubai Marina", "Jumeirah"],
      Sharjah: ["Sharjah City"],
      Ajman: ["Ajman City"],
    },
  },
  NZ: {
    stateLabel: "Region",
    districtLabel: "District / city / area",
    states: {
      Auckland: ["Auckland Central", "Manukau", "North Shore"],
      Wellington: ["Lower Hutt", "Wellington City"],
      Canterbury: ["Christchurch"],
      Waikato: ["Hamilton"],
      Otago: ["Dunedin", "Queenstown"],
    },
  },
};

function main() {
  const outDir = path.join(process.cwd(), "public", "data", "geo");
  fs.mkdirSync(outDir, { recursive: true });

  const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

  // Write compact countries index
  fs.writeFileSync(
    path.join(outDir, "countries.json"),
    JSON.stringify(sorted.map((c) => ({ code: c.code, name: c.name })))
  );

  // Write individual country chunks
  for (const country of sorted) {
    const detailed = DETAILED_GEO[country.code];
    const chunk: GeoCountryChunk = detailed
      ? {
          code: country.code,
          name: country.name,
          stateLabel: detailed.stateLabel,
          districtLabel: detailed.districtLabel,
          states: Object.entries(detailed.states)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, districts]) => ({
              name,
              districts: [...districts].sort((a, b) => a.localeCompare(b)),
            })),
        }
      : {
          code: country.code,
          name: country.name,
          stateLabel: "State / Province / Region",
          districtLabel: "District / city / area",
          states: [],
        };

    fs.writeFileSync(
      path.join(outDir, `${country.code}.json`),
      JSON.stringify(chunk)
    );
  }

  console.log(`Generated countries.json and ${sorted.length} country geo chunks in ${outDir}`);
}

main();
