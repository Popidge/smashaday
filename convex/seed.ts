import { mutation } from "./_generated/server";
import { v } from "convex/values";

const smashesData = [
  {
    "word1": "electric car",
    "word2": "carcassonne",
    "category1": "famous_inventions",
    "category2": "popular_board_games",
    "smash": "electric carcassonne",
    "clue1": "Silent commuter that drinks from wall sockets, not gasoline.",
    "clue2": "Place medieval tiles to build roads, cities, and farms with up to five players."
  },
  {
    "word1": "hannibal lecter",
    "word2": "terry pratchett",
    "category1": "famous_movie_characters",
    "category2": "famous_uk_authors",
    "smash": "hannibal lecterry pratchett",
    "clue1": "Elegant psychiatrist who prefers his meals rare and his victims silent.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "glen coe",
    "word2": "coen brothers",
    "category1": "famous_uk_landmarks_natural",
    "category2": "famous_film_directors",
    "smash": "glen coen brothers",
    "clue1": "Steep-sided Scottish valley where a 1692 massacre still echoes.",
    "clue2": "Twin auteurs blend deadpan humor with noir, delivering \"Fargo\" and \"Big Lebowski\" masterpieces."
  },
  {
    "word1": "mastermind",
    "word2": "indiana jones",
    "category1": "popular_gameshows",
    "category2": "famous_movie_characters",
    "smash": "mastermindiana jones",
    "clue1": "Spotlighted black chair, specialist subjects, rapid\u2011fire questions, hosted by Clive Myrie.",
    "clue2": "Whip-wielding professor who prefers ancient relics over paperwork."
  },
  {
    "word1": "doctor who",
    "word2": "who wants to be a millionaire",
    "category1": "famous_uk_tv_shows_modern",
    "category2": "popular_gameshows",
    "smash": "doctor who wants to be a millionaire",
    "clue1": "Time\u2011traveling alien with a sonic screwdriver and ever\u2011changing companions.",
    "clue2": "Contestant climbs a ladder of ten questions, lifelines include Phone\u2011a\u2011Friend."
  },
  {
    "word1": "penicillin",
    "word2": "line of duty",
    "category1": "famous_inventions",
    "category2": "famous_uk_tv_shows_modern",
    "smash": "penicilline of duty",
    "clue1": "Moldy breakthrough that turned wartime infections into survivable battles.",
    "clue2": "Corrupt cops, internal investigations, and a relentless anti\u2011terror unit."
  },
  {
    "word1": "richard linklater",
    "word2": "terry pratchett",
    "category1": "famous_film_directors",
    "category2": "famous_uk_authors",
    "smash": "richard linklaterry pratchett",
    "clue1": "Texas teen's 90s soundtrack meets a 12\u2011year real\u2011time coming\u2011of\u2011age.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "eiffel tower",
    "word2": "tower of london",
    "category1": "famous_landmarks_global",
    "category2": "famous_uk_landmarks_historical",
    "smash": "eiffel tower of london",
    "clue1": "Iron lattice spire overlooking a river, built for the 1889 World's Fair.",
    "clue2": "Royal prison on the Thames, home to the Crown Jewels."
  },
  {
    "word1": "human league",
    "word2": "guess who",
    "category1": "famous_uk_bands_80s",
    "category2": "popular_board_games",
    "smash": "human leaguess who",
    "clue1": "Synth\u2011driven new wave trio behind 'Don't You Want Me'.",
    "clue2": "Two players ask about hair, glasses, or hats to pinpoint hidden opponent."
  },
  {
    "word1": "greg james",
    "word2": "james milner",
    "category1": "famous_uk_tv_presenters",
    "category2": "famous_uk_footballers",
    "smash": "greg james milner",
    "clue1": "Radio 1's energetic prankster who turned chart shows into comedy marathons.",
    "clue2": "Versatile ex-Blackburn winger turned Liverpool midfield engine, four\u2011goal assist streak."
  },
  {
    "word1": "mary poppins",
    "word2": "inside out",
    "category1": "famous_movie_characters",
    "category2": "popular_animated_films",
    "smash": "mary poppinside out",
    "clue1": "Umbrella-wielding nanny who turns a rainy walk into a whimsical adventure.",
    "clue2": "A Pixar mind\u2011scape explores emotions as colorful characters inside a child's head."
  },
  {
    "word1": "spirited away",
    "word2": "wayne rooney",
    "category1": "popular_animated_films",
    "category2": "famous_uk_footballers",
    "smash": "spirited awayne rooney",
    "clue1": "A young girl navigates a bathhouse of spirits after losing her name.",
    "clue2": "Former Everton prodigy turned Manchester United talisman, famed for thunderous strikes and record\u2011breaking assists."
  },
  {
    "word1": "typewriter",
    "word2": "terry pratchett",
    "category1": "famous_inventions",
    "category2": "famous_uk_authors",
    "smash": "typewriterry pratchett",
    "clue1": "Clacking keys turned inked letters into words before computers.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "electric car",
    "word2": "cardiff castle",
    "category1": "famous_inventions",
    "category2": "famous_uk_landmarks_historical",
    "smash": "electric cardiff castle",
    "clue1": "Silent commuter that drinks from wall sockets, not gasoline.",
    "clue2": "Victorian Gothic towers rise above a Roman fort in Wales' capital."
  },
  {
    "word1": "galileo galilei",
    "word2": "leigh francis",
    "category1": "famous_scientists",
    "category2": "famous_uk_comedians",
    "smash": "galileo galileigh francis",
    "clue1": "He turned his telescope toward the heavens, revealing wandering moons and challenging Earth's centrality.",
    "clue2": "Star of a sketch series that smashed celebrity faces, then sold lemon\u2011flavored chaos."
  },
  {
    "word1": "pandemic",
    "word2": "michael bay",
    "category1": "popular_board_games",
    "category2": "famous_film_directors",
    "smash": "pandemichael bay",
    "clue1": "Cooperative disease\u2011fighting for 2\u20114 players, racing against spreading infections.",
    "clue2": "Explosive blockbusters with nonstop explosions, towering skyscrapers, and over\u2011the\u2011top action."
  },
  {
    "word1": "pandemic",
    "word2": "michael faraday",
    "category1": "popular_board_games",
    "category2": "famous_scientists",
    "smash": "pandemichael faraday",
    "clue1": "Cooperative disease\u2011fighting for 2\u20114 players, racing against spreading infections.",
    "clue2": "He turned a magnet\u2019s dance into a flowing current, sparking modern electricity."
  },
  {
    "word1": "james clerk maxwell",
    "word2": "ellen white",
    "category1": "famous_scientists",
    "category2": "famous_uk_sportspeople",
    "smash": "james clerk maxwellen white",
    "clue1": "He wove electricity, magnetism, and light into a single mathematical tapestry.",
    "clue2": "England\u2019s record\u2011breaking forward, she netted the decisive penalty in 2022."
  },
  {
    "word1": "dishwasher",
    "word2": "sherlock",
    "category1": "common_household_items",
    "category2": "famous_uk_tv_shows_modern",
    "smash": "dishwasherlock",
    "clue1": "It hums while turning plates clean after meals.",
    "clue2": "Brilliant London sleuth solves crimes with smartphone clues and a violin."
  },
  {
    "word1": "charles darwin",
    "word2": "windsor castle",
    "category1": "famous_scientists",
    "category2": "famous_uk_landmarks_historical",
    "smash": "charles darwindsor castle",
    "clue1": "He proposed survival of the fittest after a voyage on the Beagle.",
    "clue2": "Royal residence overlooking the Thames, where queens have celebrated jubilees."
  },
  {
    "word1": "victoria sponge",
    "word2": "spongebob squarepants",
    "category1": "famous_uk_foods_snacks",
    "category2": "famous_animated_characters",
    "smash": "victoria spongebob squarepants",
    "clue1": "Light lemon\u2011scented cake layered with sweetened whipped cream and jam.",
    "clue2": "A bright sea sponge flips Krabby Patties and sings his goofy anthem."
  },
  {
    "word1": "kasabian",
    "word2": "ian botham",
    "category1": "uk_top_20_albums_2000s",
    "category2": "famous_uk_sportspeople",
    "smash": "kasabian botham",
    "clue1": "Brit indie\u2011rock trio famed for swaggering stadium anthems like 'Club Foot'.",
    "clue2": "Fast\u2011bowling hero who scored 149* to win 1981 Ashes, also footballer."
  },
  {
    "word1": "david mitchell",
    "word2": "ellen white",
    "category1": "famous_uk_comedians",
    "category2": "famous_uk_sportspeople",
    "smash": "david mitchellen white",
    "clue1": "Deadpan partner in a flat, famed for the line \"I'm not a...\".",
    "clue2": "England\u2019s record\u2011breaking forward, she netted the decisive penalty in 2022."
  },
  {
    "word1": "philip pullman",
    "word2": "manchester",
    "category1": "famous_uk_authors",
    "category2": "famous_uk_cities",
    "smash": "philip pullmanchester",
    "clue1": "Author of a daemonic trio exploring parallel worlds and a golden compass.",
    "clue2": "Rainy northern city of two football cathedrals and a legendary rock band."
  },
  {
    "word1": "jo brand",
    "word2": "andy cole",
    "category1": "famous_uk_comedians",
    "category2": "famous_uk_footballers",
    "smash": "jo brandy cole",
    "clue1": "Former nurse's deadpan musings dominate British panel shows and sitcom cameo.",
    "clue2": "Goal\u2011machine who scored 34 for a north\u2011east side, then shone at Old Trafford."
  },
  {
    "word1": "brighton",
    "word2": "tony stark",
    "category1": "famous_uk_cities",
    "category2": "famous_movie_characters",
    "smash": "brightony stark",
    "clue1": "Pebble beach, flamboyant palace, and iconic pier greet the English Channel.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "snowdonia",
    "word2": "niagara falls",
    "category1": "famous_uk_landmarks_natural",
    "category2": "famous_landmarks_global",
    "smash": "snowdoniagara falls",
    "clue1": "Welsh highlands where dragons perch atop the tallest peak.",
    "clue2": "Bordering two nations, thunderous waters plunge over a horseshoe-shaped cliff."
  },
  {
    "word1": "scotch egg",
    "word2": "eggheads",
    "category1": "famous_uk_foods_snacks",
    "category2": "popular_gameshows",
    "smash": "scotch eggheads",
    "clue1": "Hard\u2011boiled yolk wrapped in seasoned sausage, breaded, then deep\u2011fried.",
    "clue2": "Contestants battle a panel of quiz masters, chaired by Jeremy Vine."
  },
  {
    "word1": "great british bake off",
    "word2": "office usa",
    "category1": "famous_uk_tv_shows_modern",
    "category2": "famous_tv_series_usa",
    "smash": "great british bake office usa",
    "clue1": "Tent, flour, nervous amateurs, judges whispering, signature bakes decide destiny.",
    "clue2": "Scranton paper sales crew's awkward office antics aired on NBC."
  },
  {
    "word1": "first world war",
    "word2": "war and peace",
    "category1": "famous_historical_events",
    "category2": "famous_books",
    "smash": "first world war and peace",
    "clue1": "A global conflict sparked by a 1914 assassination, reshaping empires.",
    "clue2": "Napoleon's march meets Russian aristocracy's tangled romances across generations."
  },
  {
    "word1": "graham norton",
    "word2": "tony stark",
    "category1": "famous_uk_tv_presenters",
    "category2": "famous_movie_characters",
    "smash": "graham nortony stark",
    "clue1": "Witty late\u2011night chat host known for cheeky celebrity gossip and flamboyant banter.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "freddie flintoff",
    "word2": "office usa",
    "category1": "famous_uk_sportspeople",
    "category2": "famous_tv_series_usa",
    "smash": "freddie flintoffice usa",
    "clue1": "Lancashire all-rounder who helped England win the 2005 Ashes and the 1999 World Cup.",
    "clue2": "Scranton paper sales crew's awkward office antics aired on NBC."
  },
  {
    "word1": "first world war",
    "word2": "wardrobe",
    "category1": "famous_historical_events",
    "category2": "common_household_items",
    "smash": "first world wardrobe",
    "clue1": "A global conflict sparked by a 1914 assassination, reshaping empires.",
    "clue2": "Tall wooden closet that houses hanging clothes and seasonal linens."
  },
  {
    "word1": "kasabian",
    "word2": "ian fleming",
    "category1": "uk_top_20_albums_2000s",
    "category2": "famous_uk_authors",
    "smash": "kasabian fleming",
    "clue1": "Brit indie\u2011rock trio famed for swaggering stadium anthems like 'Club Foot'.",
    "clue2": "Creator of a suave spy who prefers shaken, not stirred, in Cold War thrillers."
  },
  {
    "word1": "isaac newton",
    "word2": "tony stark",
    "category1": "famous_scientists",
    "category2": "famous_movie_characters",
    "smash": "isaac newtony stark",
    "clue1": "Fruit fell, three motion principles, and prism experiments.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "ray wilkins",
    "word2": "inside out",
    "category1": "famous_uk_footballers",
    "category2": "popular_animated_films",
    "smash": "ray wilkinside out",
    "clue1": "Midfield maestro for Chelsea and England, later guided youngsters at Fulham.",
    "clue2": "A Pixar mind\u2011scape explores emotions as colorful characters inside a child's head."
  },
  {
    "word1": "peak district",
    "word2": "strictly come dancing",
    "category1": "famous_uk_landmarks_natural",
    "category2": "famous_uk_tv_shows_modern",
    "smash": "peak districtly come dancing",
    "clue1": "Rolling limestone hills and historic stone circles draw millions to England's first national park.",
    "clue2": "Celebrities twirl with pros in glittering ballroom, chasing a sparkling trophy."
  },
  {
    "word1": "countdown",
    "word2": "downton abbey",
    "category1": "popular_gameshows",
    "category2": "famous_uk_tv_shows_modern",
    "smash": "countdownton abbey",
    "clue1": "Two contestants battle letters and numbers under a ticking clock.",
    "clue2": "A grand English manor where lords, ladies, and servants navigate love and duty."
  },
  {
    "word1": "richard feynman",
    "word2": "manchester",
    "category1": "famous_scientists",
    "category2": "famous_uk_cities",
    "smash": "richard feynmanchester",
    "clue1": "He danced with quantum paths, taught diagrams, and loved bongo rhythms.",
    "clue2": "Rainy northern city of two football cathedrals and a legendary rock band."
  },
  {
    "word1": "greg james",
    "word2": "james bond",
    "category1": "famous_uk_tv_presenters",
    "category2": "famous_movie_characters",
    "smash": "greg james bond",
    "clue1": "Radio 1's energetic prankster who turned chart shows into comedy marathons.",
    "clue2": "Suave double\u2011oh\u2011seven who prefers martinis shaken, not stirred."
  },
  {
    "word1": "franz ferdinand",
    "word2": "andy murray",
    "category1": "famous_uk_bands_80s",
    "category2": "famous_uk_sportspeople",
    "smash": "franz ferdinandy murray",
    "clue1": "Scottish post\u2011punk revivalists known for angular guitars and chart\u2011topping 2004 anthem.",
    "clue2": "Two-time Olympic gold medalist who broke a 77\u2011year British Wimbledon drought."
  },
  {
    "word1": "greg james",
    "word2": "james clerk maxwell",
    "category1": "famous_uk_tv_presenters",
    "category2": "famous_scientists",
    "smash": "greg james clerk maxwell",
    "clue1": "Radio 1's energetic prankster who turned chart shows into comedy marathons.",
    "clue2": "He wove electricity, magnetism, and light into a single mathematical tapestry."
  },
  {
    "word1": "pandemic",
    "word2": "michael owen",
    "category1": "popular_board_games",
    "category2": "famous_uk_footballers",
    "smash": "pandemichael owen",
    "clue1": "Cooperative disease\u2011fighting for 2\u20114 players, racing against spreading infections.",
    "clue2": "Lightning\u2011fast striker who dazzled at Anfield, then swapped red for a red\u2011white jersey."
  },
  {
    "word1": "razorlight",
    "word2": "light bulb",
    "category1": "famous_uk_bands_2000s",
    "category2": "famous_inventions",
    "smash": "razorlight bulb",
    "clue1": "Brit indie rock quartet that lit up the mid\u20112000s charts.",
    "clue2": "Glowing glass prison that turned night into day, thanks to a 19th\u2011century tinkerer."
  },
  {
    "word1": "paddington",
    "word2": "tony stark",
    "category1": "famous_animals",
    "category2": "famous_movie_characters",
    "smash": "paddingtony stark",
    "clue1": "Peruvian bear with marmalade, lost luggage, and a London railway station.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "computer",
    "word2": "terry pratchett",
    "category1": "famous_inventions",
    "category2": "famous_uk_authors",
    "smash": "computerry pratchett",
    "clue1": "Babbage's 19th\u2011century 'difference engine' dream realized in modern silicon brains.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "charles darwin",
    "word2": "winnie the pooh",
    "category1": "famous_scientists",
    "category2": "famous_animals",
    "smash": "charles darwinnie the pooh",
    "clue1": "He proposed survival of the fittest after a voyage on the Beagle.",
    "clue2": "Honey\u2011loving bear who befriends a timid donkey and a wise owl."
  },
  {
    "word1": "back to black",
    "word2": "black beauty",
    "category1": "uk_top_20_albums_2000s",
    "category2": "famous_animals",
    "smash": "back to black beauty",
    "clue1": "Amy Winehouse's 2006 soul breakthrough that sparked a UK renaissance",
    "clue2": "Victorian-era novel's chestnut-less steed championing humane treatment of its kind."
  },
  {
    "word1": "eiffel tower",
    "word2": "tower bridge",
    "category1": "famous_landmarks_global",
    "category2": "famous_uk_landmarks_historical",
    "smash": "eiffel tower bridge",
    "clue1": "Iron lattice spire overlooking a river, built for the 1889 World's Fair.",
    "clue2": "Victorian river crossing with twin towers and lifting bascules near the historic fortress."
  },
  {
    "word1": "leaning tower of pisa",
    "word2": "isaac newton",
    "category1": "famous_landmarks_global",
    "category2": "famous_scientists",
    "smash": "leaning tower of pisaac newton",
    "clue1": "A Tuscan bell tower famously tilts, challenging gravity since the 12th century.",
    "clue2": "Fruit fell, three motion principles, and prism experiments."
  },
  {
    "word1": "tower of london",
    "word2": "london marathon",
    "category1": "famous_uk_landmarks_historical",
    "category2": "famous_uk_festivals_non_music",
    "smash": "tower of london marathon",
    "clue1": "Royal prison on the Thames, home to the Crown Jewels.",
    "clue2": "Thousands chase a river's path through historic boroughs each April."
  },
  {
    "word1": "franz ferdinand",
    "word2": "andy cole",
    "category1": "famous_uk_bands_80s",
    "category2": "famous_uk_footballers",
    "smash": "franz ferdinandy cole",
    "clue1": "Scottish post\u2011punk revivalists known for angular guitars and chart\u2011topping 2004 anthem.",
    "clue2": "Goal\u2011machine who scored 34 for a north\u2011east side, then shone at Old Trafford."
  },
  {
    "word1": "pandemic",
    "word2": "microwave",
    "category1": "popular_board_games",
    "category2": "common_household_items",
    "smash": "pandemicrowave",
    "clue1": "Cooperative disease\u2011fighting for 2\u20114 players, racing against spreading infections.",
    "clue2": "Box that zaps leftovers into steaming readiness in seconds."
  },
  {
    "word1": "wonder woman",
    "word2": "manchester",
    "category1": "famous_movie_characters",
    "category2": "famous_uk_cities",
    "smash": "wonder womanchester",
    "clue1": "Amazonian warrior wielding a lasso of truth, defends humanity with compassion.",
    "clue2": "Rainy northern city of two football cathedrals and a legendary rock band."
  },
  {
    "word1": "leigh francis",
    "word2": "francis ford coppola",
    "category1": "famous_uk_comedians",
    "category2": "famous_film_directors",
    "smash": "leigh francis ford coppola",
    "clue1": "Star of a sketch series that smashed celebrity faces, then sold lemon\u2011flavored chaos.",
    "clue2": "Creator of a mafia saga that earned three Oscars for Best Picture."
  },
  {
    "word1": "manchester",
    "word2": "terry pratchett",
    "category1": "famous_uk_cities",
    "category2": "famous_uk_authors",
    "smash": "manchesterry pratchett",
    "clue1": "Rainy northern city of two football cathedrals and a legendary rock band.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "pandemic",
    "word2": "mickey mouse",
    "category1": "popular_board_games",
    "category2": "famous_animated_characters",
    "smash": "pandemickey mouse",
    "clue1": "Cooperative disease\u2011fighting for 2\u20114 players, racing against spreading infections.",
    "clue2": "Cheerful, gloved rodent who first sang \"Steamboat\" in 1928."
  },
  {
    "word1": "diwali in leicester",
    "word2": "terry pratchett",
    "category1": "famous_uk_festivals_non_music",
    "category2": "famous_uk_authors",
    "smash": "diwali in leicesterry pratchett",
    "clue1": "Leicester's streets sparkle with fireworks, lanterns, and sizzling samosa stalls.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "tipping point",
    "word2": "interstellar",
    "category1": "popular_gameshows",
    "category2": "famous_sci_fi_films",
    "smash": "tipping pointerstellar",
    "clue1": "Ben Shephard's quiz leads contestants to drop counters onto a giant coin pusher.",
    "clue2": "A crew traverses wormholes to find a new home for humanity."
  },
  {
    "word1": "john terry",
    "word2": "terry pratchett",
    "category1": "famous_uk_footballers",
    "category2": "famous_uk_authors",
    "smash": "john terry pratchett",
    "clue1": "Longtime Blues defender who captained his nation and lifted multiple league titles.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "bakewell tart",
    "word2": "arthur conan doyle",
    "category1": "famous_uk_foods_snacks",
    "category2": "famous_uk_authors",
    "smash": "bakewell tarthur conan doyle",
    "clue1": "Golden pastry filled with almond frangipane and raspberry jam, often enjoyed with tea.",
    "clue2": "Creator of a pipe\u2011smoking detective and Victorian adventure tales."
  },
  {
    "word1": "connect four",
    "word2": "four weddings and a funeral",
    "category1": "popular_board_games",
    "category2": "famous_comedy_films",
    "smash": "connect four weddings and a funeral",
    "clue1": "Two opponents drop colored discs into a vertical grid, aiming for four in a line.",
    "clue2": "A dapper Brit navigates three joyous ceremonies and one mournful gathering."
  },
  {
    "word1": "anchorman",
    "word2": "manchester",
    "category1": "famous_comedy_films",
    "category2": "famous_uk_cities",
    "smash": "anchormanchester",
    "clue1": "1970s news team battles rival female anchor, absurdly serious about mustaches.",
    "clue2": "Rainy northern city of two football cathedrals and a legendary rock band."
  },
  {
    "word1": "stanley kubrick",
    "word2": "ricky gervais",
    "category1": "famous_film_directors",
    "category2": "famous_uk_comedians",
    "smash": "stanley kubricky gervais",
    "clue1": "Master of symmetrical dread, he filmed a space odyssey and a murderous hotel.",
    "clue2": "Deadpan Brit behind a mockumentary office, known for sharp satire and 'nothing to hide'."
  },
  {
    "word1": "kasabian",
    "word2": "ian botham",
    "category1": "uk_top_20_albums_2000s",
    "category2": "famous_uk_sportspeople",
    "smash": "kasabian botham",
    "clue1": "Brit indie\u2011rock trio famed for swaggering stadium anthems like 'Club Foot'.",
    "clue2": "Fast\u2011bowling hero who scored 149* to win 1981 Ashes, also footballer."
  },
  {
    "word1": "electric car",
    "word2": "carl sagan",
    "category1": "famous_inventions",
    "category2": "famous_scientists",
    "smash": "electric carl sagan",
    "clue1": "Silent commuter that drinks from wall sockets, not gasoline.",
    "clue2": "He turned starlight into poetry, urging us to cherish our tiny blue world."
  },
  {
    "word1": "black beauty",
    "word2": "beauty and the beast",
    "category1": "famous_animals",
    "category2": "popular_animated_films",
    "smash": "black beauty and the beast",
    "clue1": "Victorian-era novel's chestnut-less steed championing humane treatment of its kind.",
    "clue2": "Enchanted castle, cursed prince, village girl, rose, love conquers beastly curse."
  },
  {
    "word1": "elephant",
    "word2": "ant mcpartlin",
    "category1": "uk_top_20_albums_2000s",
    "category2": "famous_uk_tv_presenters",
    "smash": "elephant mcpartlin",
    "clue1": "Jack and Meg's 2003 garage blues triumph.",
    "clue2": "Cheeky co-host of reality talent and jungle survival shows, famous for witty banter."
  },
  {
    "word1": "taskmaster",
    "word2": "mastermind",
    "category1": "famous_uk_tv_shows_modern",
    "category2": "popular_gameshows",
    "smash": "taskmastermind",
    "clue1": "Comedian judges bizarre challenges in a quirky studio",
    "clue2": "Spotlighted black chair, specialist subjects, rapid\u2011fire questions, hosted by Clive Myrie."
  },
  {
    "word1": "mastermind",
    "word2": "industrial revolution",
    "category1": "popular_gameshows",
    "category2": "famous_historical_events",
    "smash": "mastermindustrial revolution",
    "clue1": "Spotlighted black chair, specialist subjects, rapid\u2011fire questions, hosted by Clive Myrie.",
    "clue2": "Steam-powered factories reshaped 18th\u2011century Britain, spawning urban growth and mechanized labor."
  },
  {
    "word1": "great fire of london",
    "word2": "london marathon",
    "category1": "famous_historical_events",
    "category2": "famous_uk_festivals_non_music",
    "smash": "great fire of london marathon",
    "clue1": "1666 blaze that turned medieval streets to ash, sparking modern building codes.",
    "clue2": "Thousands chase a river's path through historic boroughs each April."
  },
  {
    "word1": "newcastle",
    "word2": "castle howard",
    "category1": "famous_uk_cities",
    "category2": "famous_uk_landmarks_historical",
    "smash": "newcastle howard",
    "clue1": "River Tyne's iconic bridges and a football club nicknamed the Magpies.",
    "clue2": "Yorkshire baroque estate that doubled as a Regency palace in a hit series."
  },
  {
    "word1": "curtains",
    "word2": "inside out",
    "category1": "common_household_items",
    "category2": "popular_animated_films",
    "smash": "curtainside out",
    "clue1": "Fabric panels that frame windows and tame sunlight.",
    "clue2": "A Pixar mind\u2011scape explores emotions as colorful characters inside a child's head."
  },
  {
    "word1": "lewis hamilton",
    "word2": "tony stark",
    "category1": "famous_uk_sportspeople",
    "category2": "famous_movie_characters",
    "smash": "lewis hamiltony stark",
    "clue1": "Seven-time Formula One champion who shattered records and championed diversity in motorsport.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "bart simpson",
    "word2": "simpsons",
    "category1": "famous_animated_characters",
    "category2": "famous_tv_series_usa",
    "smash": "bart simpsons",
    "clue1": "Mischief\u2011loving yellow kid who writes on school walls.",
    "clue2": "Yellow family navigates Springfield's antics on a long-running Fox sitcom."
  },
  {
    "word1": "andy murray",
    "word2": "ray wilkins",
    "category1": "famous_uk_sportspeople",
    "category2": "famous_uk_footballers",
    "smash": "andy murray wilkins",
    "clue1": "Two-time Olympic gold medalist who broke a 77\u2011year British Wimbledon drought.",
    "clue2": "Midfield maestro for Chelsea and England, later guided youngsters at Fulham."
  },
  {
    "word1": "homer simpson",
    "word2": "simpsons",
    "category1": "famous_animated_characters",
    "category2": "famous_tv_series_usa",
    "smash": "homer simpsons",
    "clue1": "D'oh! The doughnut-loving, beer-sipping patriarch of a Springfield family.",
    "clue2": "Yellow family navigates Springfield's antics on a long-running Fox sitcom."
  },
  {
    "word1": "tim burton",
    "word2": "tony stark",
    "category1": "famous_film_directors",
    "category2": "famous_movie_characters",
    "smash": "tim burtony stark",
    "clue1": "Creator of gothic fairy tales like a dancing skeleton and a beetle-armed boy.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "twilight struggle",
    "word2": "glen coe",
    "category1": "popular_board_games",
    "category2": "famous_uk_landmarks_natural",
    "smash": "twilight strugglen coe",
    "clue1": "Two-player Cold War card-driven tug-of-war over global influence.",
    "clue2": "Steep-sided Scottish valley where a 1692 massacre still echoes."
  },
  {
    "word1": "treacle tart",
    "word2": "arthur conan doyle",
    "category1": "famous_uk_foods_snacks",
    "category2": "famous_uk_authors",
    "smash": "treacle tarthur conan doyle",
    "clue1": "Sticky golden syrup and breadcrumbs baked in a buttery crust, often served with cream.",
    "clue2": "Creator of a pipe\u2011smoking detective and Victorian adventure tales."
  },
  {
    "word1": "jack charlton",
    "word2": "tony stark",
    "category1": "famous_uk_footballers",
    "category2": "famous_movie_characters",
    "smash": "jack charltony stark",
    "clue1": "Leeds stalwart, 1966 World Cup winner, later guided Ireland to Euro debut.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "bobby charlton",
    "word2": "tony stark",
    "category1": "famous_uk_footballers",
    "category2": "famous_movie_characters",
    "smash": "bobby charltony stark",
    "clue1": "Manchester United's 1960s midfield maestro, World Cup winner and 1968 European champion.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "coldplay",
    "word2": "play your cards right",
    "category1": "famous_uk_bands_2000s",
    "category2": "popular_gameshows",
    "smash": "coldplay your cards right",
    "clue1": "Brit pop-rock outfit that turned stadium anthems into chart\u2011topping ballads.",
    "clue2": "Strategic answers and lifelines guide contestants toward the million-dollar summit."
  },
  {
    "word1": "homeland",
    "word2": "andy cole",
    "category1": "famous_tv_series_usa",
    "category2": "famous_uk_footballers",
    "smash": "homelandy cole",
    "clue1": "CIA operative battles conspiracies in Washington, aired on Showtime.",
    "clue2": "Goal\u2011machine who scored 34 for a north\u2011east side, then shone at Old Trafford."
  },
  {
    "word1": "bradley wiggins",
    "word2": "inside out",
    "category1": "famous_uk_sportspeople",
    "category2": "popular_animated_films",
    "smash": "bradley wigginside out",
    "clue1": "First Briton to win the Tour de France, Olympic time\u2011trial champion.",
    "clue2": "A Pixar mind\u2011scape explores emotions as colorful characters inside a child's head."
  },
  {
    "word1": "kasabian",
    "word2": "ian wright",
    "category1": "uk_top_20_albums_2000s",
    "category2": "famous_uk_footballers",
    "smash": "kasabian wright",
    "clue1": "Brit indie\u2011rock trio famed for swaggering stadium anthems like 'Club Foot'.",
    "clue2": "Prolific London striker who netted over 150 goals for the Gunners after a Palace debut."
  },
  {
    "word1": "enid blyton",
    "word2": "tony stark",
    "category1": "famous_uk_authors",
    "category2": "famous_movie_characters",
    "smash": "enid blytony stark",
    "clue1": "Creator of mischievous schoolchildren and magical island adventures for generations.",
    "clue2": "Billionaire genius builds a glowing red suit to fight villains."
  },
  {
    "word1": "school of rock",
    "word2": "rocky balboa",
    "category1": "famous_comedy_films",
    "category2": "famous_movie_characters",
    "smash": "school of rocky balboa",
    "clue1": "Substitute teacher forms a band with misfit kids for a battle of bands.",
    "clue2": "Underdog Philly boxer who climbs museum steps, shouting love to his wife."
  },
  {
    "word1": "frodo baggins",
    "word2": "inside out",
    "category1": "famous_movie_characters",
    "category2": "popular_animated_films",
    "smash": "frodo bagginside out",
    "clue1": "Reluctant gardener carries cursed jewelry across perilous lands to save his home.",
    "clue2": "A Pixar mind\u2011scape explores emotions as colorful characters inside a child's head."
  },
  {
    "word1": "jo brand",
    "word2": "andy murray",
    "category1": "famous_uk_comedians",
    "category2": "famous_uk_sportspeople",
    "smash": "jo brandy murray",
    "clue1": "Former nurse's deadpan musings dominate British panel shows and sitcom cameo.",
    "clue2": "Two-time Olympic gold medalist who broke a 77\u2011year British Wimbledon drought."
  },
  {
    "word1": "franz ferdinand",
    "word2": "andy cole",
    "category1": "famous_uk_bands_80s",
    "category2": "famous_uk_footballers",
    "smash": "franz ferdinandy cole",
    "clue1": "Scottish post\u2011punk revivalists known for angular guitars and chart\u2011topping 2004 anthem.",
    "clue2": "Goal\u2011machine who scored 34 for a north\u2011east side, then shone at Old Trafford."
  },
  {
    "word1": "flapjack",
    "word2": "jack charlton",
    "category1": "famous_uk_foods_snacks",
    "category2": "famous_uk_footballers",
    "smash": "flapjack charlton",
    "clue1": "Golden oat bar, butter\u2011sugar baked, often enjoyed with tea.",
    "clue2": "Leeds stalwart, 1966 World Cup winner, later guided Ireland to Euro debut."
  },
  {
    "word1": "tipping point",
    "word2": "internet",
    "category1": "popular_gameshows",
    "category2": "famous_inventions",
    "smash": "tipping pointernet",
    "clue1": "Ben Shephard's quiz leads contestants to drop counters onto a giant coin pusher.",
    "clue2": "Global web of linked computers enabling instant worldwide communication."
  },
  {
    "word1": "stuart broad",
    "word2": "broadchurch",
    "category1": "famous_uk_sportspeople",
    "category2": "famous_uk_tv_shows_modern",
    "smash": "stuart broadchurch",
    "clue1": "Tall right\u2011arm paceman who helped England clinch the 2010 T20 World Cup.",
    "clue2": "Coastal town detectives unravel a child's murder, exposing hidden secrets."
  },
  {
    "word1": "taskmaster",
    "word2": "terry pratchett",
    "category1": "famous_uk_tv_shows_modern",
    "category2": "famous_uk_authors",
    "smash": "taskmasterry pratchett",
    "clue1": "Comedian judges bizarre challenges in a quirky studio",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "monsters inc",
    "word2": "inception",
    "category1": "popular_animated_films",
    "category2": "famous_sci_fi_films",
    "smash": "monsters inception",
    "clue1": "A Pixar duo powers a city by scaring, then laughing together.",
    "clue2": "A layered heist through shared dreams blurs the line between reality."
  },
  {
    "word1": "harry potter",
    "word2": "terry pratchett",
    "category1": "famous_movie_characters",
    "category2": "famous_uk_authors",
    "smash": "harry potterry pratchett",
    "clue1": "Scarred boy who lives under stairs, discovers he's a wizard at eleven.",
    "clue2": "Creator of a flat world on the backs of turtles, comedic fantasy."
  },
  {
    "word1": "michael faraday",
    "word2": "day the earth stood still",
    "category1": "famous_scientists",
    "category2": "famous_sci_fi_films",
    "smash": "michael faraday the earth stood still",
    "clue1": "He turned a magnet\u2019s dance into a flowing current, sparking modern electricity.",
    "clue2": "A 1950s alien visitation that halts humanity's progress."
  },
  {
    "word1": "c s lewis",
    "word2": "lewis hamilton",
    "category1": "famous_uk_authors",
    "category2": "famous_uk_sportspeople",
    "smash": "c s lewis hamilton",
    "clue1": "Wizardly professor guides children through a wardrobe into a lion\u2011ruled realm.",
    "clue2": "Seven-time Formula One champion who shattered records and championed diversity in motorsport."
  },
  {
    "word1": "lake district",
    "word2": "strictly come dancing",
    "category1": "famous_uk_landmarks_natural",
    "category2": "famous_uk_tv_shows_modern",
    "smash": "lake districtly come dancing",
    "clue1": "Poetical hills cradling countless tarns, inspiring Wordsworth's wandering verses.",
    "clue2": "Celebrities twirl with pros in glittering ballroom, chasing a sparkling trophy."
  }
];

export const seedSmashes = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const smash of smashesData) {
      await ctx.db.insert("smashes", smash);
    }
    return null;
  },
});
