"use strict";

// Each master is authored on 24 by 24 graph paper. P is ink, O is an outlined
// paper polygon, L is a pen stroke, B is a solid ellipse, E is an outlined
// ellipse, W is paper. The compiler rasterizes these once, without smoothing.
globalThis.Catalog = (() => {
  const masters = [];
  const lookup = new Map();
  const SIZE = 48;
  function add(family, group, aliases, drawing) {
    const index = masters.length;
    masters.push({ family, group, aliases, drawing, index });
    for (const word of [family.replaceAll("-", " "), ...aliases.split("|").filter(Boolean)]) {
      if (!lookup.has(word)) lookup.set(word, family);
    }
    lookup.set(family, family);
  }
  function vessel(name, aliases, drawing) { add(name, "vessels", aliases, drawing); }
  vessel("sailboat","boat|sail boat|ship|dinghy|sailing","P2,16 21,16 17,21 6,21;L12,2 12,16;O10,3 3,14 10,14;P14,5 20,14 14,14;W6,18 17,18");
  vessel("pirate-ship","pirate|pirate boat|galleon","P1,15 5,16 19,16 23,13 19,21 7,22;L8,6 8,16;O3,7 10,7 9,13 3,14;L15,1 15,16;P15,1 22,2 19,5 15,4;O12,6 19,6 20,13 12,12;W7,18 8,18;W12,18 13,18;W16,18 17,18");
  vessel("canoe","kayak|raft","O1,13 6,15 17,15 22,12 19,17 15,19 7,19 3,17;L5,18 18,4;P16,6 18,3 21,2 20,5 18,7");
  vessel("submarine","sub|submersible","O4,11 7,9 13,9 13,5 17,5 17,7 15,7 15,10 18,10 22,13 20,17 16,19 6,19 3,16 1,18 1,11;E8,14,2,2;E15,14,2,2");
  vessel("lighthouse","beacon","P6,21 9,7 15,7 19,21;O8,5 16,5 16,8 8,8;P6,5 12,1 18,5;W10,12 15,12;W9,16 16,16;P4,22 20,22 20,23 4,23");
  vessel("anchor","mooring","E12,4,3,3;L12,7 12,20;L7,10 17,10;L2,14 5,19 12,22 19,19 22,14;P2,12 2,17 6,15;P22,12 18,15 22,17");
  vessel("sail","canvas sail","O16,2 16,19 2,19;L13,7 13,16 7,16;L3,21 20,21");
  vessel("hull","boat hull|keel","O1,9 6,12 18,12 23,8 19,16 15,19 8,19 3,15;L5,14 17,14");
  vessel("fin","stabilizer|shark fin","O2,19 8,16 13,10 17,3 20,4 20,14 22,19;L8,20 20,20");
  function machine(name, aliases, drawing) { add(name, "machines", aliases, drawing); }
  machine("rocket","spaceship|rocket ship|space ship|spacecraft","P11,2 13,2 17,7 17,13 21,18 21,21 15,18 9,18 3,21 3,18 7,13 7,8;E12,9,3,3;W10,15 14,15;P10,19 14,19 12,23");
  machine("car","auto|automobile|sedan|taxi","P1,13 5,11 8,6 15,6 19,11 22,12 22,17 2,17;W8,10 15,10;W9,9 14,9;E6,17,3,3;E18,17,3,3");
  machine("bus","coach|school bus","O1,5 19,5 22,10 22,18 1,18;P3,7 7,7 7,11 3,11;P9,7 13,7 13,11 9,11;P15,7 18,7 20,11 15,11;E6,18,3,3;E17,18,3,3");
  machine("train","locomotive|engine","P2,9 7,9 7,4 13,4 13,14 16,14 16,6 20,6 20,13 22,16 22,18 2,18;W9,6 11,6;E5,19,3,3;E12,19,3,3;E19,19,3,3");
  machine("plane","airplane|aeroplane|jet","O1,11 9,10 14,2 17,2 14,10 20,10 23,12 20,14 14,14 17,21 14,21 9,14 2,14;L4,12 8,12");
  machine("helicopter","chopper","L5,3 21,3;L13,3 13,7;O3,9 10,10 11,7 18,7 22,11 22,15 18,17 10,16 7,13 2,12;P16,9 18,9 20,12 16,12;L11,17 10,20 19,20 21,18");
  machine("bicycle","bike|cycle","E5,16,4,4;E18,16,4,4;L5,16 9,9 13,16 5,16;L13,16 16,8 18,16;L15,7 19,6;L7,8 11,8");
  machine("tractor","farm tractor","E6,16,5,5;E19,17,3,3;P5,10 8,5 14,5 14,11 19,11 21,14 13,15 10,12;W9,8 11,8;L18,10 18,6");
  machine("robot","automaton|droid","L12,1 12,4;B12,1,1,1;O6,4 18,4 18,11 6,11;P8,7 10,7 10,8 8,8;P14,7 16,7 16,8 14,8;O7,13 17,13 17,19 7,19;L7,14 3,15 2,18;L17,14 21,12 22,9;L9,19 9,22 6,22;L15,19 15,22 18,22");
  machine("satellite","space station|probe","O9,7 15,7 17,12 13,17 7,14;L7,9 4,6;O1,6 4,3 8,6 5,10;O16,18 19,14 23,18 19,22;L15,15 17,17;L14,8 17,3;E18,3,2,2");
  machine("balloon","hot air balloon|blimp","E12,8,8,7;L5,12 9,18;L19,12 15,18;O8,18 16,18 15,22 9,22;L12,2 8,7 9,12");
  machine("wheel","tire|tyre","E12,12,10,10;E12,12,7,7;L5,12 19,12;L12,5 12,19;L7,7 17,17;L7,17 17,7;B12,12,2,2");
  machine("gear","cog|cogwheel","P9,2 15,2 15,5 18,6 20,4 23,8 20,10 20,14 23,16 20,20 17,18 15,19 15,22 9,22 9,19 6,18 4,20 1,16 4,14 4,10 1,8 4,4 6,6 9,5;E12,12,5,5");
  machine("piston","plunger|pump","O4,2 20,2 20,8 16,11 13,11 13,19 16,20 16,22 8,22 8,20 11,19 11,11 8,11 4,8;L5,5 19,5");
  machine("spring","coil|suspension","L5,2 18,2 6,6 18,8 6,11 18,13 6,16 18,18 6,21 18,22");
  machine("wing","airfoil","O2,18 7,12 20,3 22,4 18,10 13,13 7,20;L6,16 16,9");
  machine("propeller","rotor|fan blade","P11,10 8,4 9,1 12,2 14,9;P15,11 21,10 23,12 21,15 15,14;P11,15 7,21 4,22 4,18 9,13;E12,12,3,3");
  machine("nozzle","thruster|exhaust","O7,2 17,2 16,10 14,13 21,21 3,21 10,13 8,10;L6,18 18,18;L10,6 15,6");
  machine("axle","shaft|rod","O2,8 6,8 6,11 18,11 18,7 22,7 22,17 18,17 18,14 6,14 6,18 2,18");
  machine("bolt","screw|fastener","O7,2 16,2 19,5 17,9 14,9 14,19 11,22 10,20 10,9 7,9 5,6;L9,4 15,6;L10,13 14,11;L10,17 14,15");
  machine("pipe","elbow|duct","O2,3 10,3 10,12 13,15 21,15 21,22 11,22 4,17 2,13;L2,6 10,6;L18,15 18,22");
  machine("lever","handle|switch","O3,20 9,13 16,13 21,20;L12,14 17,4;E18,3,2,2;E12,16,2,2");
  machine("magnet","horseshoe magnet","P3,3 9,3 9,14 11,17 14,17 16,14 16,3 22,3 22,15 18,20 14,22 10,22 5,19 3,15;W4,8 8,8;W17,8 21,8");
  machine("cannon","deck gun","O2,10 20,4 22,9 7,15;P4,15 14,14 18,19 2,19;E7,19,3,3;E15,19,2,2");
  machine("clock","watch|timer","E12,12,10,10;L12,5 12,12 17,15;B12,12,1,1");
  function creature(name, aliases, drawing) { add(name, "creatures", aliases, drawing); }
  creature("cat","kitten|kitty","O3,4 9,7 15,7 21,4 20,15 17,19 12,21 7,19 4,15;B8,12,1,1;B16,12,1,1;L10,15 12,17 14,15;L2,14 7,16;L2,18 7,17;L17,16 22,14;L17,17 22,18");
  creature("dog","puppy|hound","P3,4 9,6 7,14 3,16 1,12;P15,6 20,4 23,12 21,16 17,14;E12,12,7,8;B9,11,1,1;B15,11,1,1;B12,14,2,1;L12,15 12,17 14,17");
  creature("bear","teddy|cub","E5,6,4,4;E19,6,4,4;E12,13,9,8;B8,11,1,1;B16,11,1,1;E12,16,4,3;B12,14,2,1");
  creature("fox","vixen|coyote","O2,3 9,7 15,7 22,3 20,13 12,21 4,13;P4,10 9,13 7,14;P20,10 15,13 17,14;B12,18,2,1");
  creature("rabbit","hare|bunny","E8,7,3,6;E16,6,2,6;E12,15,7,6;B9,14,1,1;B15,14,1,1;L10,17 12,18 14,17");
  creature("frog","toad","E7,8,4,4;E17,8,4,4;E12,14,10,6;B7,7,1,1;B17,7,1,1;L5,14 8,16 16,16 19,14");
  creature("fish","minnow|salmon","O2,6 8,10 12,7 16,6 21,9 23,12 20,15 15,17 10,16 8,14 2,18;B18,11,1,1;L15,8 13,12 15,15");
  creature("whale","orca|dolphin","O1,8 5,10 7,6 8,12 12,9 17,8 21,10 23,14 21,17 17,19 11,18 6,15 3,13;B18,12,1,1;L12,17 15,15");
  creature("octopus","squid|kraken","E12,9,7,7;B9,10,1,1;B15,10,1,1;L6,13 4,18 1,17;L9,15 8,21 5,21;L12,16 12,20 14,22;L15,15 18,21 20,20;L18,13 21,17 23,15");
  creature("turtle","tortoise","E11,13,8,6;E20,10,3,2;P4,16 8,17 6,21 3,21;P13,18 17,17 19,20 16,21;L7,10 10,13 8,16;L10,13 15,12 17,14");
  creature("bird","sparrow|chick|seagull","O1,10 7,12 10,9 12,5 16,4 19,7 22,8 19,10 17,15 12,18 6,16;B16,7,1,1;L5,12 10,14 14,10;L10,17 9,21;L14,17 14,21");
  creature("owl","owlet","O4,3 10,6 14,6 20,3 20,14 17,19 12,22 6,18 4,14;E8,11,3,3;E16,11,3,3;B8,11,1,1;B16,11,1,1;P10,15 14,15 12,18");
  creature("bat","flying fox","O1,5 6,7 10,11 10,6 12,8 15,6 14,11 18,7 23,5 21,15 17,13 14,17 12,15 10,18 7,14 3,16;L4,8 7,12;L20,8 17,11");
  creature("butterfly","moth","O11,10 7,3 3,3 1,6 3,12 7,14 3,15 4,20 8,20 12,15 16,20 20,20 21,15 17,14 21,12 23,6 21,3 17,3 13,10;L12,9 12,18;L12,9 9,5;L12,9 15,5;B6,8,2,2;B18,8,2,2");
  creature("bee","bumblebee|wasp","E10,7,4,4;E16,6,3,4;E12,14,8,5;P2,13 5,13 5,16;L8,10 8,18;L12,9 12,18;B17,12,1,1");
  creature("snail","slug","E9,12,6,6;L11,14 8,15 6,12 8,10 10,11;O2,18 13,17 17,14 18,11 21,11 22,16 19,19 2,20;L18,12 17,7;L20,12 22,7");
  creature("dragon","wyvern","O1,16 6,16 10,13 7,3 13,8 15,12 18,5 20,3 20,7 23,9 20,11 18,11 16,17 10,19 5,18;L11,18 9,22;L15,17 16,21;B20,8,1,1");
  creature("monster","creature|beast","O4,4 9,7 16,6 21,2 20,9 22,13 19,20 15,19 12,22 9,19 5,20 2,14 4,10;E12,11,4,3;B12,11,1,1;L8,16 10,17 14,16 16,17");
  creature("jellyfish","jelly","O2,13 3,8 7,4 12,3 17,4 21,8 22,13 17,12 14,14 10,12 6,14;L5,14 6,17 4,21;L10,14 9,17 11,22;L15,14 17,18 15,21;L19,13 20,16 19,19");
  creature("spider","arachnid","E12,13,4,6;E12,7,3,3;L8,9 4,5 2,6;L8,12 3,10 1,12;L8,15 4,17 2,16;L9,18 6,21 3,21;L16,9 20,5 22,6;L16,12 21,10 23,12;L16,15 20,17 22,16;L15,18 18,21 21,21");
  function prop(name, aliases, drawing) { add(name, "objects", aliases, drawing); }
  prop("witch","sorceress|magician|wizard","P2,9 7,7 11,1 16,3 13,4 15,8 21,10;O8,10 15,10 18,13 15,14 14,16 10,15 8,13;P10,15 14,15 19,21 5,21;L3,18 20,13;P17,13 22,10 23,14 18,15");
  prop("person","stick figure|stickman|simple person|human|girl|boy|character","E12,5,3,3;L12,8 12,15;L5,11 12,10 19,12;L12,15 6,22;L12,15 18,22");
  prop("astronaut","spaceman|spacewoman","E12,6,5,5;P8,5 16,5 15,8 9,8;O7,11 17,11 18,17 15,18 16,22 13,22 12,18 11,22 8,22 9,17 6,17;L7,12 3,15 2,13;L17,12 21,13 22,10");
  prop("money-bag","money|bag of money|sack|moneybag|cash|treasure bag","P7,2 12,4 17,2 15,7 9,7;O9,8 15,8 20,13 22,19 19,22 5,22 2,19 4,14;L8,8 16,8;L15,12 10,12 9,14 14,16 13,18 8,18;L12,10 12,20");
  prop("coin","gold|penny|token","E12,12,8,10;E12,12,6,8;L9,10 12,8 12,16;L10,16 14,16");
  prop("chest","treasure|treasure chest|trunk","O2,11 3,7 6,5 18,5 21,7 22,11 22,20 2,20;L2,12 22,12;L6,5 6,20;L18,5 18,20;O10,11 14,11 14,15 10,15");
  prop("key","skeleton key","E7,8,5,5;L10,12 19,21;L16,17 19,14;L18,19 21,16;B7,8,1,1");
  prop("lantern","lamp|light","E12,4,4,3;P6,8 9,6 15,6 18,8;O7,9 17,9 16,18 8,18;P6,19 18,19 19,22 5,22;P11,16 12,11 14,16");
  prop("book","journal|notebook","O1,5 6,4 12,7 18,4 23,5 23,19 18,18 12,21 6,18 1,19;L12,7 12,21;L4,8 9,9;L15,9 20,8");
  prop("house","home|cottage|building","P1,11 12,2 23,11;O4,11 20,11 20,22 4,22;P11,15 15,15 15,22 11,22;E7,15,1,1");
  prop("castle","fort|fortress","O2,5 5,5 5,8 8,8 8,5 11,5 11,11 14,11 14,5 17,5 17,8 20,8 20,5 23,5 22,22 2,22;P9,22 9,17 12,14 15,17 15,22;L4,11 9,11");
  prop("bridge","viaduct","O1,10 5,9 10,11 14,11 19,9 23,10 23,19 20,19 20,15 17,13 14,15 14,19 10,19 10,15 7,13 4,15 4,19 1,19;L2,8 22,8");
  prop("umbrella","parasol","O1,12 4,7 9,4 15,4 20,7 23,12 19,11 16,13 12,11 8,13 5,11;L12,4 12,19 14,21 17,20 17,17;L12,2 12,4");
  prop("kite","diamond kite","O12,1 20,9 12,18 4,9;L12,2 12,17;L5,9 19,9;L12,18 14,20 17,19 19,22;P14,20 14,23 17,21");
  prop("hat","pointed hat|witch hat","O2,17 7,15 12,2 17,4 14,6 17,15 22,17 19,19 6,19;L8,13 16,14");
  prop("cup","mug|teacup","E18,12,5,4;O3,8 17,8 17,16 14,20 7,20 3,16;L4,22 18,22;L7,6 6,4 8,2");
  prop("broom","broomstick","L3,3 15,15;P13,14 15,12 22,16 23,20 21,19 21,22 18,20 18,23 15,20;W16,16 19,19");
  prop("wand","magic wand|baton","P3,20 15,8 17,10 5,22;P17,2 18,5 22,6 19,8 19,11 16,9 13,10 14,7 12,5 16,5");
  prop("basket","basketry|bucket","O2,10 22,10 19,21 5,21;L5,10 7,5 10,3 14,3 17,5 19,10;L6,14 18,14;L7,17 17,17;L9,12 10,20;L15,12 14,20");
  prop("ladder","steps|rung","L4,22 9,2;L14,22 19,2;L8,5 18,5;L7,10 17,10;L6,15 16,15;L5,20 15,20");
  function nature(name, aliases, drawing) { add(name, "nature", aliases, drawing); }
  nature("tree","pine|forest|evergreen","P12,1 18,8 15,8 20,14 17,14 22,19 14,19 14,23 10,23 10,19 2,19 7,14 4,14 9,8 6,8;W9,16 12,15");
  nature("flower","blossom|daisy","L12,10 12,22;O11,18 5,15 7,19 11,20;E12,4,3,3;E7,7,3,3;E8,12,3,3;E16,12,3,3;E17,7,3,3;E12,8,3,3");
  nature("leaf","foliage|leaves","O2,18 5,10 11,5 22,3 19,13 13,19 5,20;L2,22 18,7;L8,15 8,11;L11,13 15,13");
  nature("mushroom","toadstool|fungus","O2,13 4,8 9,4 15,4 20,8 22,13;O10,14 14,14 15,20 17,22 7,22 9,20;B7,10,1,1;B13,7,2,1;B17,10,1,1");
  nature("rain","raindrops|rainfall|shower","L6,3 3,8;L14,2 11,7;L21,5 18,10;L8,12 5,17;L15,11 12,16;L20,16 17,21;L9,18 7,22");
  nature("drop","raindrop|droplet|tear","O12,2 14,7 18,12 19,16 17,20 14,22 10,22 6,20 5,17 6,13 10,7;L8,16 8,18 10,20");
  nature("cloud","clouds|mist","O1,15 2,12 5,11 6,7 10,6 13,8 15,7 18,8 19,11 21,11 23,14 21,17 4,17;L5,19 14,19");
  nature("planet","saturn|world|planets","E12,12,7,7;L2,16 4,13 7,11;L22,8 21,10 18,13 12,16 6,18 2,18 2,16;L17,7 21,6 22,8");
  nature("moon","crescent|luna","P18,2 13,5 11,9 11,13 14,17 18,18 22,17 20,20 15,22 9,21 5,18 2,14 2,9 5,5 10,2;W5,11 7,9");
  nature("star","stars|starlight","P12,1 15,8 23,9 17,14 19,22 12,18 5,22 7,14 1,9 9,8");
  nature("sun","sunlight|sunshine","E12,12,5,5;L12,1 12,4;L12,20 12,23;L1,12 4,12;L20,12 23,12;L4,4 6,6;L18,18 21,21;L4,20 6,18;L18,6 21,3");
  nature("comet","meteor|shooting star","E6,17,4,4;L6,13 16,2;L9,14 22,3;L11,17 21,10;B6,17,1,1");
  nature("rock","rocks|stone|boulder|asteroid","O2,15 5,9 11,5 17,6 21,12 22,18 16,20 5,20;L3,15 10,14 13,9;L10,14 13,18 20,18");
  nature("mountain","mountains|hill|peak","O1,20 8,8 12,14 16,3 23,20;L12,14 16,10 18,12 19,10;L5,13 8,14 9,12");
  nature("wave","ocean|sea|water|waves","O1,17 5,15 8,10 12,5 17,4 21,6 17,6 14,9 15,13 18,16 23,16 21,19 15,20 8,18 2,20;L7,16 10,13");
  nature("island","atoll|beach","O1,18 8,16 17,16 23,18 18,20 6,20;L11,16 12,10 15,5;L15,5 11,3 7,4;L15,5 17,2 21,2;L15,5 19,5 22,8;L15,5 12,7 10,10");
  nature("snowflake","snow|frost","L12,1 12,23;L2,6 22,18;L2,18 22,6;L9,4 12,7 15,4;L9,20 12,17 15,20;L3,10 7,9 7,5;L17,19 17,15 21,14;L3,14 7,15 7,19;L17,5 17,9 21,10");
  nature("flame","fire|ember|flames","O12,1 14,9 17,7 20,13 20,17 16,21 9,22 5,19 3,16 4,10 7,13 9,9;P11,19 10,16 12,12 14,16 14,19");
  nature("crystal","gem|diamond|jewel","O3,8 7,3 17,3 21,8 12,22;L3,8 21,8;L8,4 8,8 12,21 16,8 16,4");
  nature("feather","quill|plume","O3,20 6,12 10,6 16,2 21,2 20,8 17,13 14,13 15,15 11,17 8,16 8,18;L2,23 17,6");
  nature("shell","seashell|scallop","O10,20 4,15 2,9 5,5 9,4 12,2 15,4 19,5 22,9 20,15 14,20 14,22 10,22;L12,19 6,7;L12,19 12,5;L13,19 18,7");
  nature("vine","tendril|vineyard","L4,22 8,19 11,14 12,9 17,4 21,3;O10,16 6,14 5,10 9,11 11,13;O13,9 15,12 20,11 18,8;O16,5 13,3 14,1 18,2");
  nature("seed","pod|sprout","E10,17,6,4;L11,15 14,10 14,5;O14,7 15,4 20,2 19,6 15,8");
  nature("lightning","bolt of lightning|thunder","P12,1 20,1 14,9 20,9 6,23 10,14 4,14");
  function piece(name, aliases, drawing) { add(name, "geometry", aliases, drawing); }
  piece("circle","disk|disc|round","E12,12,10,10");
  piece("triangle","triangular|wedge","O12,2 22,21 2,21;L8,16 12,9");
  piece("square","box|rectangle","O3,3 21,3 21,21 3,21;L6,8 6,6 10,6");
  piece("hexagon","hex|honeycomb","O6,3 17,3 23,12 17,21 6,21 1,12");
  piece("arch","arc|archway","O2,21 2,11 4,6 9,3 15,3 20,6 22,11 22,21 18,21 18,12 16,8 12,7 8,8 6,12 6,21");
  piece("elbow","corner|bent rod","O3,3 9,3 9,15 21,15 21,21 3,21");
  piece("cross","plus|intersection","P9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9");
  piece("spiral","curl|whorl","L21,17 18,21 10,22 4,18 2,12 4,6 10,3 16,4 20,9 20,14 16,17 11,17 7,14 7,10 10,7 14,8 16,11 14,14 11,13");
  piece("chevron","angle|pointer","P3,3 10,3 21,12 10,21 3,21 14,12");
  piece("ring","hoop|loop","E12,12,10,10;E12,12,6,6");
  piece("strut","beam|girder","O2,5 22,5 22,18 2,18;L3,16 7,7 12,16 17,7 21,16");
  piece("hinge","joint|connector","O1,4 10,4 10,20 1,20;O14,4 23,4 23,20 14,20;L12,3 12,21;B5,8,1,1;B5,16,1,1;B19,8,1,1;B19,16,1,1");
  piece("flag","banner|pennant","L4,2 4,23;O5,3 11,4 16,2 22,4 21,13 16,11 11,13 5,12");
  piece("shard","splinter|fragment","O3,20 9,7 21,1 17,10 12,18;L4,20 14,12");
  piece("beam","ray|stripe","O2,17 18,3 22,6 6,21");
  piece("hand","palm|glove","O4,11 7,12 7,5 9,4 10,11 11,2 13,2 14,11 15,4 17,4 17,12 19,7 21,8 20,17 16,21 10,22 6,18 2,14");
  piece("foot","shoe|boot","O7,2 16,2 16,12 18,15 22,16 23,20 21,22 3,22 3,18 6,16 7,12;L4,19 20,19");
  piece("eye","iris|pupil","O1,12 6,7 12,5 18,7 23,12 17,17 12,19 6,17;E12,12,5,5;B12,12,2,2");
  piece("gripper","claw|pincer","O8,2 11,7 8,13 11,16 15,16 17,12 15,8 18,3 21,10 20,16 16,20 13,21 12,23 9,22 9,19 5,16 4,11");
  // Five-bit rows double as a complete construction alphabet and numeral set.
  const glyphRows = {
    A:[14,17,17,31,17,17,17], B:[30,17,17,30,17,17,30], C:[14,17,16,16,16,17,14],
    D:[28,18,17,17,17,18,28], E:[31,16,16,30,16,16,31], F:[31,16,16,30,16,16,16],
    G:[14,17,16,23,17,17,15], H:[17,17,17,31,17,17,17], I:[14,4,4,4,4,4,14],
    J:[7,2,2,2,2,18,12], K:[17,18,20,24,20,18,17], L:[16,16,16,16,16,16,31],
    M:[17,27,21,21,17,17,17], N:[17,25,25,21,19,19,17], O:[14,17,17,17,17,17,14],
    P:[30,17,17,30,16,16,16], Q:[14,17,17,17,21,18,13], R:[30,17,17,30,20,18,17],
    S:[15,16,16,14,1,1,30], T:[31,4,4,4,4,4,4], U:[17,17,17,17,17,17,14],
    V:[17,17,17,17,17,10,4], W:[17,17,17,21,21,27,17], X:[17,17,10,4,10,17,17],
    Y:[17,17,10,4,4,4,4], Z:[31,1,2,4,8,16,31],
    0:[14,19,21,21,21,25,14], 1:[4,12,4,4,4,4,14], 2:[14,17,1,2,4,8,31],
    3:[30,1,1,14,1,1,30], 4:[2,6,10,18,31,2,2], 5:[31,16,16,30,1,1,30],
    6:[6,8,16,30,17,17,14], 7:[31,1,2,4,8,8,8], 8:[14,17,17,14,17,17,14],
    9:[14,17,17,15,1,2,12],
  };
  for (const [letter, rows] of Object.entries(glyphRows)) {
    const type = /[A-Z]/.test(letter) ? "letter" : "digit";
    add(type + "-" + letter.toLowerCase(), "glyphs", type + " " + letter.toLowerCase(), rows);
  }

  // A kit mounts two real parts onto the main silhouette. Each socket bank is
  // curated for its family. Socket A and B have distinct positions and swapping
  // the parts changes the assembly. These are reusable composite blocks: a
  // winged gear with a nozzle can itself be used as an actor, prop or fitting.
  const fittings = {
    vessels: "sail hull fin anchor flag cannon wheel propeller lantern ladder pipe strut",
    machines: "axle gear nozzle piston propeller spring wheel bolt wing hinge gripper lever",
    creatures: "wing fin claw eye foot feather leaf hat shell gripper hand vine",
    objects: "hat hand foot lantern book coin wand broom umbrella kite key basket",
    nature: "leaf flower drop shell feather crystal star moon flame seed vine snowflake",
    geometry: "eye hand foot hinge gripper spring magnet axle wing nozzle pipe lever",
    glyphs: "coin crystal leaf feather star moon wing spring flag wheel shell flame",
  };
  const commonFittings = "circle triangle square hexagon arch elbow cross spiral chevron ring strut hinge flag shard beam drop leaf star gear bolt fin".split(" ");
  const kits = {};
  for (const [group, parts] of Object.entries(fittings)) {
    const candidates = [...parts.replace("claw", "gripper").split(" "), ...commonFittings,
      "rock","snowflake","wave","nozzle","eye","key","sail","feather","moon","flower","seed"];
    const bank = [...new Set(candidates)].filter(part => masters.some(m => m.family===part)).slice(0,32);
    if (bank.length !== 32) throw Error("Incomplete socket bank for " + group);
    kits[group] = Object.freeze(bank);
  }
  const firstKit = 976, kitSize = 32;
  const FAMILY_NAMES = Object.freeze(masters.map(master => master.family));
  const familyIndices = new Map(FAMILY_NAMES.map((name, i) => [name, i]));
  const phrases = [...lookup.keys()].sort((a, b) => b.length - a.length);
  function familyFor(text) {
    const source = String(text ?? "").toLowerCase().trim();
    if (lookup.has(source)) return lookup.get(source);
    if (/^[a-z0-9]$/.test(source)) return (/\d/.test(source) ? "digit-" : "letter-") + source;
    const words = " " + source.replace(/[^a-z0-9]+/g, " ").trim() + " ";
    for (const phrase of phrases) {
      if (words.includes(" " + phrase + " ") || words.includes(" " + phrase + "s ")) return lookup.get(phrase);
    }
    return null;
  }
  const mod = (value, length) => ((Math.trunc(Number(value) || 0) % length) + length) % length;
  const variantsPerFamily = 5 * 5 * 5 * 4 * 4;
  const blockCount = variantsPerFamily * masters.length;

  // Each bank begins with 976 stable renditions distributed across widths,
  // heights, slants, pen styles and finishes. The next 1,024 are two-socket
  // assemblies with individually addressable, separately chosen parts.
  function blockId(family, variant = 0) {
    const name = familyIndices.has(family) ? family : familyFor(family);
    return familyIndices.has(name) ? familyIndices.get(name) * variantsPerFamily + mod(variant, variantsPerFamily) : null;
  }
  function fittingOptions(family) {
    const index = familyIndices.get(familyIndices.has(family) ? family : familyFor(family));
    return index === undefined ? [] : kits[masters[index].group];
  }
  function assemble(family, first, second) {
    const options = fittingOptions(family);
    const primary = options.indexOf(familyFor(first)), secondary = options.indexOf(familyFor(second));
    if (primary < 0 || secondary < 0) return null;
    return blockId(family,firstKit + primary*kitSize + secondary);
  }
  function block(id) {
    if (!Number.isInteger(id) || id < 0 || id >= blockCount) return null;
    const master = masters[Math.floor(id / variantsPerFamily)];
    const variant = id % variantsPerFamily;
    const info = {id, family: master.family, group: master.group, variant};
    if (variant >= firstKit) {
      const kit = variant - firstKit, bank = kits[master.group];
      return {...info, fittings:[bank[Math.floor(kit / kitSize)],bank[kit % kitSize]]};
    }
    const engraving = variant * 739 % variantsPerFamily;
    return {...info,
      width: 27 + (engraving % 5) * 3, height: 29 + (Math.floor(engraving / 5) % 5) * 3,
      slant: [0, -.12, .12, -.24, .24][Math.floor(engraving / 25) % 5],
      nib: Math.floor(engraving / 125) % 4, finish: Math.floor(engraving / 500),
    };
  }

  const MASTER = 24;
  const EMPTY = 0, INK = 1, PAPER = 2;
  function compile(master) {
    if (master.mask) return master.mask;
    const mask = new Uint8Array(MASTER * MASTER);
    function pixel(x, y, tone) {
      if (x >= 0 && y >= 0 && x < MASTER && y < MASTER) mask[y * MASTER + x] = tone;
    }
    function line(x1, y1, x2, y2, tone) {
      const dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
      const dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
      let error = dx + dy;
      while (true) {
        pixel(x1, y1, tone);
        if (x1 === x2 && y1 === y2) break;
        const step = 2 * error;
        if (step >= dy) { error += dy; x1 += sx; }
        if (step <= dx) { error += dx; y1 += sy; }
      }
    }
    function polygon(points, tone) {
      for (let y = 0; y < MASTER; y++) {
        const xs = [];
        for (let i = 0; i < points.length; i++) {
          const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % points.length];
          if ((y1 <= y + .5 && y2 > y + .5) || (y2 <= y + .5 && y1 > y + .5)) {
            xs.push(x1 + (y + .5 - y1) * (x2 - x1) / (y2 - y1));
          }
        }
        xs.sort((a, b) => a - b);
        for (let i = 0; i < xs.length; i += 2) {
          for (let x = Math.ceil(xs[i] - .5); x < xs[i + 1] - .5; x++) pixel(x, y, tone);
        }
      }
    }
    if (Array.isArray(master.drawing)) {
      master.drawing.forEach((row, y) => {
        for (let x = 0; x < 5; x++) if (row & (16 >> x)) {
          for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) pixel(4 + x * 3 + dx, 1 + y * 3 + dy, INK);
        }
      });
    } else {
      for (const token of master.drawing.split(";")) {
        const command = token.charAt(0);
        const points = token.slice(1).split(" ").map(pair => pair.split(",").map(Number));
        if (command === "E" || command === "B") {
          const [cx, cy, rx, ry] = points[0];
          for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
            if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.09) {
              const inside = rx > 1 && ry > 1 && ((x-cx)/(rx-1))**2 + ((y-cy)/(ry-1))**2 < 1;
              pixel(x, y, command === "E" && inside ? PAPER : INK);
            }
          }
          continue;
        }
        if (command === "P" || command === "O") {
          polygon(points, command === "P" ? INK : PAPER);
          points.push(points[0]);
        }
        for (let i = 1; i < points.length; i++) line(...points[i-1], ...points[i], command === "W" ? PAPER : INK);
      }
    }
    master.mask = mask;
    return mask;
  }

  // Precompile the nib into graph-paper cells. A heavier nib widens the mark
  // towards the lower/right edge, retaining open highlights and counters.
  function nibMask(master, nib) {
    master.nibs ||= [];
    if (master.nibs[nib]) return master.nibs[nib];
    const base = compile(master);
    if (nib === 0) return master.nibs[0] = base;
    const mask = base.slice();
    for (let y = 0; y < MASTER; y++) for (let x = 0; x < MASTER; x++) {
      const index = y * MASTER + x;
      if (base[index] !== INK) continue;
      if (nib !== 2 && x + 1 < MASTER) mask[index + 1] = INK;
      if (nib !== 1 && y + 1 < MASTER) mask[index + MASTER] = INK;
    }
    return master.nibs[nib] = mask;
  }
  const mappings = new Map();
  function pixelMap(b) {
    const key = b.variant % 125;
    if (mappings.has(key)) return mappings.get(key);
    const map = new Int16Array(SIZE * SIZE).fill(-1);
    for (let y = 0; y < SIZE; y++) {
      const dy = y + .5 - SIZE / 2;
      const sy = Math.floor(dy * MASTER / b.height + MASTER / 2);
      if (sy < 0 || sy >= MASTER) continue;
      const left = SIZE / 2 - b.width / 2 - dy * b.slant;
      for (let x = Math.max(0, Math.ceil(left - .5)); x < Math.min(SIZE, left + b.width - .5); x++) {
        const sx = Math.floor((x + .5 - left) * MASTER / b.width);
        if (sx >= 0 && sx < MASTER) map[y * SIZE + x] = sy * MASTER + sx;
      }
    }
    mappings.set(key, map);
    return map;
  }
  const engraving = Array.from({length: 4}, (_, finish) => {
    const paper = new Uint8Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (finish === 1) paper[y * SIZE + x] = (x + 2 * y) % 7 === 0;
      if (finish === 2) paper[y * SIZE + x] = (x + 2*Math.floor(y/3)) % 4 === 1 && y % 3 === 1;
      if (finish === 3) paper[y * SIZE + x] = (x - y + SIZE) % 5 === 0;
    }
    return paper;
  });
  function placePart(target,src,left,top,width,height) {
    for (let y=0;y<height;y++) {
      const sy=Math.floor((y+.5)*MASTER/height);
      for (let x=0;x<width;x++) {
        const tone=src[sy*MASTER + Math.floor((x+.5)*MASTER/width)];
        if (tone!==EMPTY) target[(top+y)*SIZE+left+x]=tone;
      }
    }
  }
  // The core and two fittings are stamped from authored art, with no scale,
  // nib, hatch or skew variation within the kit bank. Its structural inventory
  // can therefore be counted and verified independently of aesthetic variants.
  const sockets = {
    vessels:[[1,11],[29,4]],machines:[[0,15],[29,12]],creatures:[[0,8],[29,8]],
    objects:[[0,17],[30,9]],nature:[[0,9],[30,18]],geometry:[[0,13],[30,13]],
    glyphs:[[0,17],[30,17]],
  };
  function kitRaster(master,parts) {
    const pixels = new Uint8Array(SIZE*SIZE);
    const [a,b] = sockets[master.group];
    placePart(pixels,compile(master),8,6,32,36);
    // A short stem makes each fitting read as connected to the central piece.
    for (let i=0;i<8;i++) {
      pixels[(a[1]+9)*SIZE+a[0]+10+i]=INK;
      pixels[(b[1]+9)*SIZE+b[0]-3+i]=INK;
    }
    placePart(pixels,compile(masters[familyIndices.get(parts[0])]),a[0],a[1],18,20);
    placePart(pixels,compile(masters[familyIndices.get(parts[1])]),b[0],b[1],18,20);
    return pixels;
  }
  function raster(id) {
    const b = block(id);
    if (!b) return null;
    const master = masters[Math.floor(id / variantsPerFamily)];
    if (b.fittings) return kitRaster(master,b.fittings);
    const src = nibMask(master, b.nib);
    const map = pixelMap(b), paper = engraving[b.finish];
    const pixels = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < pixels.length; i++) {
      const pos = map[i];
      if (pos < 0) continue;
      const tone = src[pos];
      pixels[i] = tone === INK && paper[i] ? PAPER : tone;
    }
    return pixels;
  }
  const tiles = new Map();
  function tileFor(id) {
    if (tiles.has(id)) return tiles.get(id);
    const mask = raster(id);
    if (!mask) return null;
    let surface;
    if (typeof OffscreenCanvas === "function") surface = new OffscreenCanvas(SIZE, SIZE);
    else if (globalThis.document) {
      surface = document.createElement("canvas"); surface.width = surface.height = SIZE;
    }
    let tile = mask;
    if (surface) {
      const context = surface.getContext("2d");
      const frame = context.createImageData(SIZE, SIZE);
      for (let i = 0; i < mask.length; i++) {
        const tone = mask[i];
        if (tone === EMPTY) continue;
        const offset = i * 4, intensity = tone === PAPER ? 255 : 27;
        frame.data[offset] = frame.data[offset+1] = frame.data[offset+2] = intensity;
        frame.data[offset+3] = 255;
      }
      context.putImageData(frame, 0, 0);
      tile = surface;
    }
    if (tiles.size >= 256) tiles.delete(tiles.keys().next().value);
    tiles.set(id, tile);
    return tile;
  }
  function paint(ctx, id, x, y, size = SIZE) {
    const tile = tileFor(id);
    if (!tile || size <= 0) return;
    x = Math.round(x); y = Math.round(y); size = Math.max(1, Math.round(size));
    if (!(tile instanceof Uint8Array)) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tile, x, y, size, size);
      return;
    }
    const scale = size / SIZE;
    for (let i = 0; i < tile.length; i++) {
      if (tile[i] === EMPTY) continue;
      const px = i % SIZE, py = Math.floor(i / SIZE);
      ctx.fillStyle = tile[i] === INK ? "#1b1b1b" : "#fff";
      ctx.fillRect(x + Math.round(scale * px), y + Math.round(scale * py),
        Math.round(scale * (px + 1)) - Math.round(scale * px), Math.round(scale * (py + 1)) - Math.round(scale * py));
    }
  }
  function draw(ctx, id, x, y, size = SIZE) { paint(ctx, id, x - size/2, y - size/2, size); }

  // An executable style has three independent parts: the player's verb (or the
  // actor's behavior), the trajectory, and the spatial arrangement. Scenes feed
  // these grammars their own cast, scale, timing, background and seed.
  const verbs = {
    game: {
      assemble: "Drag the loose parts into place.",
      dodge: "Steer through the gaps.",
      launch: "Hold to climb. Release to coast.",
      collect: "Gather the scattered pieces.",
      match: "Touch the matching pair.",
      guide: "Lead the traveler to the destination.",
      balance: "Keep the load centered.",
      catch: "Move underneath the falling pieces.",
      stack: "Set one piece on top of another.",
      explore: "Find the hidden landmarks.",
      race: "Pass each marker in order.",
      steer: "Trace a route between the markers.",
      cannon: "Tap to send a puff across the scene.",
    },
    animation: {
      drift: "Float through the scene.",
      bloom: "Unfold outward from a bud.",
      march: "Travel in a measured procession.",
      trail: "Leave a trail of little echoes.",
      flock: "Move with a loose flock.",
      unfurl: "Open one segment at a time.",
      tumble: "Turn end over end.",
      pulse: "Expand and settle.",
      shimmer: "Trade patches of light and shade.",
      sway: "Rock from side to side.",
      rise: "Lift away from the ground.",
      swirl: "Circle a changing center.",
      sail: "Glide across open water.",
    },
  };
  const TAU = Math.PI * 2;
  const fract = x => x - Math.floor(x);
  const wave = x => Math.sin(x);
  const paths = {
    pendulum(t) { return [wave(t), .25 * (1 - Math.cos(t)), .35 * wave(t), 1]; },
    ellipse(t) { return [Math.cos(t), .68 * wave(t), .12 * wave(t + 1), 1]; },
    "figure-eight"(t) { return [wave(t), wave(2*t)*.6, .2*Math.cos(t), 1]; },
    bob(t) { return [.09*wave(.7*t), -.95*Math.abs(wave(t)), .05*wave(t), 1+.08*Math.cos(2*t)]; },
    switchback(t) { const q=4*Math.abs(fract(t/TAU)-.5)-1; return [q, wave(t)*.25, .18*q, 1]; },
    ripple(t) { return [wave(t)*.78, wave(3*t)*.27, .13*Math.cos(3*t), 1+.05*wave(2*t)]; },
    spiral(t) { const r=.57+.41*wave(t*.42); return [r*Math.cos(t),r*wave(t),.2*wave(t*.5),.92+.12*r]; },
    lilt(t) { return [wave(t+.4*wave(2*t)), .36*wave(t+1), .34*wave(t), 1+.035*wave(3*t)]; },
    tide(t) { return [.65*wave(t*.6), .47*wave(t+.8), .14*wave(t*.6), .97+.08*wave(t)]; },
    flutter(t) { return [.42*wave(t), .32*wave(3*t)+.14*wave(5*t), .28*wave(2*t), .92+.12*Math.abs(Math.cos(2*t))]; },
  };
  const clampNorm = n => Math.max(.03, Math.min(.97, n));
  function mix(seed) {
    let n = Number(seed) >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const layouts = {
    row(u, i, count, phase) { return [.08+.84*u, .52+.05*wave(phase)]; },
    column(u, i, count, phase) { return [.5+.06*wave(phase), .1+.8*u]; },
    stairs(u) { return [.12+.76*u, .78-.59*u]; },
    ring(u,i,count,phase) { const a=TAU*i/count+phase; return [.5+.34*Math.cos(a),.5+.32*wave(a)]; },
    arch(u) { return [.08+.84*u, .74-.48*wave(Math.PI*u)]; },
    banks(u,i,count) { const span=Math.max(1,Math.ceil(count/2)-1); return [.14+.72*Math.floor(i/2)/span, i%2 ? .72 : .27]; },
    zigzag(u,i) { return [.09+.82*u, i%2 ? .67 : .34]; },
    grid(u,i,count) { const cols=Math.ceil(Math.sqrt(count)); const rows=Math.ceil(count/cols); return [((i%cols)+.5)/cols, (Math.floor(i/cols)+.5)/rows]; },
    delta(u,i,count) { const row=Math.floor((Math.sqrt(8*i+1)-1)/2); const last=Math.floor((Math.sqrt(8*(count-1)+1)-1)/2); const col=i-row*(row+1)/2; return [.5+(col-row/2)*.8/(last+1), .14+.72*row/Math.max(1,last)]; },
    constellation(u,i,count,phase,seed) { return [.08+.84*mix(seed+17*i+73)/4294967296, .1+.8*mix(seed+31*i+149)/4294967296]; },
  };
  const pathNames = Object.keys(paths), layoutNames = Object.keys(layouts);
  // The style index carries game/animation rules only. Choreography and
  // staging are independently composed from the scene seed for each production.
  const objectives = ["pocket","duet","tide","compass","relay","reservoir","echo","chapters","interval","return"];
  const modifiers = ["steady","focus","windup","turns","rubato","pendulum","afterglow","tandem","lifeline","metronome"];
  const stories = ["arrival","departure","encounter","reunion","procession","migration","hatching","lanterns","reprise","voyage"];
  const reactions = ["ripple","scatter","gather","lift","mirror","echo","breathe","bow","spin","freeze"];
  const grammar = {};
  function stage(descriptor, seed = 0) {
    if (!descriptor) return null;
    const n = mix((seed>>>0)^Math.imul(1+descriptor.id,0x9e3779b1));
    return { ...descriptor, motion:pathNames[n % pathNames.length],
      layout:layoutNames[mix(n+1) % layoutNames.length] };
  }
  for (const kind of ["game","animation"]) {
    const table = [];
    const game = kind === "game";
    for (const [mechanic, rule] of Object.entries(verbs[kind])) {
      for (const axis of (game ? objectives : stories)) {
        for (const response of (game ? modifiers : reactions)) {
          const rules = game ? {objective:axis, modifier:response} : {story:axis,response};
          table.push(Object.freeze(stage({id:table.length,kind,mechanic,rule,...rules})));
        }
      }
    }
    grammar[kind] = Object.freeze(table);
  }
  const noStyles = Object.freeze([]);
  const styles = kind => grammar[kind] || noStyles;
  const styleCount = kind => styles(kind).length;
  const mechanics = kind => Object.keys(verbs[kind] || {});
  function style(kind, id, seed) {
    const descriptor = Number.isInteger(id) && id >= 0 ? styles(kind)[id] || null : null;
    return seed === undefined ? descriptor : stage(descriptor, seed);
  }
  function styleFor(kind, mechanic, seed = 0) {
    const verbsForKind = mechanics(kind);
    if (!verbsForKind.length) return null;
    let index = verbsForKind.indexOf(mechanic);
    if (index < 0) index = mix(seed + 1) % verbsForKind.length;
    const perVerb = objectives.length * modifiers.length;
    return style(kind, index*perVerb + mix(seed)%perVerb, seed);
  }
  function motion(descriptor, seconds = 0, index = 0) {
    const path = paths[descriptor?.motion] || paths.pendulum;
    const [x,y,angle,scale] = path(seconds + index*1.43);
    return {x,y,angle,scale};
  }
  function layout(descriptor, index, total, seed = 0) {
    total = Math.max(1, Math.trunc(total));
    const i = mod(index,total), u = total === 1 ? .5 : i/(total-1);
    const arrange = layouts[descriptor?.layout] || layouts.row;
    const [x,y] = arrange(u,i,total,TAU*mix(seed)/4294967296,seed>>>0);
    return {x:clampNorm(x), y:clampNorm(y)};
  }
  const goalText = {
    pocket:"Earn 3 marks", duet:"Try a tap and a hold", tide:"Earn marks at both tides",
    compass:"Touch 3 corners, earn a mark", relay:"Earn, touch, earn again",
    reservoir:"Hold 2s, then earn a mark", echo:"Earn two marks within 8s",
    chapters:"Complete two rounds", interval:"Space two marks 5s apart",
    return:"Touch first area again, earn",
  };
  const modifierText = {
    steady:"steady", focus:"hold slows", windup:"hold winds", turns:"tap toggles pace",
    rubato:"rest slows", pendulum:"side sets pace", afterglow:"marks slow time",
    tandem:"hold then coast", lifeline:"one rescue", metronome:"tide tempo",
  };
  function gameRules(descriptor, seed=0) {
    return { objective:descriptor?.objective || "pocket", modifier:descriptor?.modifier || "steady",
      seconds:0, held:0, isDown:false, downAt:0, lastInput:0, lastPress:-100, lastPoint:-100,
      firstPoint:-1, points:0, taps:0, holds:0, inputCount:0, rounds:0, energy:0, tideMarks:0,
      regionMask:0, firstRegion:-1, hasLeft:false, returned:false, lastX:.5,
      relayInput:0, roundDone:false, rescued:false, earned:false, pair:false, spaced:false,
      storedMark:false, side:mix(seed)&1 };
  }
  function gameTick(state,d,down) {
    if (!state || !Number.isFinite(d) || d <= 0) return;
    state.seconds += d;
    state.isDown = !!down;
    if (down) {
      state.held += d;
      state.energy = Math.min(4,state.energy + d);
      if (state.held >= .55) state.holds = Math.max(1,state.holds);
    } else { state.held = 0; }
  }
  function gameInput(state,type,x,y) {
    if (!state) return;
    state.lastInput = state.seconds;
    if (type === "press") {
      state.inputCount++;
      state.downAt = state.seconds;
      state.lastPress = state.seconds;
      state.isDown = true; state.held = 0;
      state.lastX = x;
      const region = Number(x>=.5) + 2*Number(y>=.5);
      state.regionMask |= 1<<region;
      if (state.firstRegion < 0) state.firstRegion = region;
      else if (region !== state.firstRegion) state.hasLeft = true;
      else if (state.hasLeft) state.returned = true;
    } else if(type === "release") {
      if (state.seconds-state.downAt >= .55) state.holds++;
      else state.taps++;
      state.isDown = false; state.held = 0;
    }
  }
  function gamePoint(state) {
    state.points++;
    state.tideMarks |= 1 << (Math.floor(state.seconds/3.5)%2);
    if (state.points > 1 && state.seconds-state.lastPoint <= 8) state.pair=true;
    if (state.firstPoint < 0) {
      state.firstPoint=state.seconds;
      state.relayInput=state.inputCount;
    } else {
      if (state.seconds-state.firstPoint >= 5) state.spaced=true;
      if (state.inputCount>state.relayInput) state.roundDone=true;
    }
    if (state.energy>=2) state.storedMark=true;
    state.lastPoint=state.seconds;
  }
  function reachedGoal(state) {
    switch(state.objective) {
      case "duet": return state.taps>0 && state.holds>0 && state.points>0;
      case "tide": return state.tideMarks===3;
      case "compass": return [7,11,13,14,15].includes(state.regionMask) && state.points>0;
      case "relay": return state.roundDone;
      case "reservoir": return state.storedMark;
      case "echo": return state.pair;
      case "chapters": return state.rounds>=2;
      case "interval": return state.spaced;
      case "return": return state.returned && state.points>0;
      default: return state.points>=3;
    }
  }
  function gameFinish(state) {
    state.rounds++;
    state.earned = reachedGoal(state);
    return state.earned ? "win" : "retry";
  }
  function gameRescue(state) {
    if (state.modifier !== "lifeline" || state.rescued) return false;
    state.rescued = true; return true;
  }
  function gameSpeed(state) {
    const since = state.seconds-state.lastInput;
    switch(state.modifier) {
      case "focus": return state.isDown ? .57 : 1;
      case "windup": return state.isDown ? .7+.35*Math.min(2,state.held) : .8;
      case "turns": return state.inputCount%2 ? .66 : 1.1;
      case "rubato": return Math.max(.55,1.12-Math.min(3,since)*.2);
      case "pendulum": return state.lastX < .5 ? .68 : 1.14;
      case "afterglow": return state.seconds-state.lastPoint < 1.6 ? .56 : 1;
      case "tandem": return state.isDown ? .83 : since<1.2 ? 1.36 : .94;
      case "metronome": return Math.floor(state.seconds/2.5+state.side)%2 ? 1.18 : .76;
      default: return 1;
    }
  }
  function gameStatus(state) {
    let mission = goalText[state.objective];
    if (state.objective==="tide") mission += Math.floor(state.seconds/3.5)%2 ? " ↑" : " ↓";
    else if(state.objective==="chapters") mission += " "+Math.min(state.rounds+1,2)+"/2";
    else if(state.objective==="pocket") mission += " "+Math.min(state.points,3)+"/3";
    if(state.modifier==="steady" || reachedGoal(state)) return mission;
    const modText = modifierText[state.modifier];
    return mission.length+modText.length+3<=40 ? mission+" · "+modText : mission;
  }
  // Each storyboard sequences four distinct, interpolated tableaux. Coordinates
  // are center offsets in logical pixels; spread controls the accompanying cast.
  // A touch reaction layers independently over the current beat.
  const tableau = {
    near:[0,0,1,1,0,0], far:[-24,-12,.54,.48,-.06,0], enter:[-42,8,.75,.5,-.12,0],
    exit:[40,-14,.61,1.5,.14,1], lift:[4,-26,1.12,1.23,-.07,1], land:[1,12,.95,.82,.035,0],
    greet:[-10,3,.96,.57,.18,0], meet:[12,0,1.04,.29,-.1,0], part:[23,-2,.84,1.67,.1,1],
    sleep:[-3,9,.7,.23,-.04,0], hatch:[0,-6,1.21,1.51,.04,2], line:[-17,1,.89,1.4,0,2],
    drift:[17,5,1.05,1.04,-.14,1], lights:[2,-8,.87,1.6,.03,3], pause:[0,2,1.03,.71,0,0],
  };
  const scripts = {
    arrival:["far","enter","greet","near"],departure:["near","greet","exit","far"],
    encounter:["enter","meet","pause","part"],reunion:["part","greet","meet","land"],
    procession:["line","enter","near","exit"],migration:["land","lift","drift","far"],
    hatching:["sleep","pause","hatch","near"],lanterns:["sleep","lights","lift","drift"],
    reprise:["greet","part","greet","near"],voyage:["land","drift","far","enter"],
  };
  function animationFrame(descriptor,t,touches=0,sinceTouch=Infinity,held=false) {
    const story = scripts[descriptor?.story] || scripts.arrival;
    const response = descriptor?.response || "ripple";
    const age = Number.isFinite(sinceTouch) ? Math.max(0, sinceTouch) : 2.2;
    let clock = t;
    if (touches>0 && response==="freeze" && held) clock -= Math.min(t,age);
    const beat = Math.floor(Math.max(0,clock)/2.8), q = fract(Math.max(0,clock)/2.8);
    const blend = q*q*(3-2*q);
    const a = tableau[story[beat%4]], b = tableau[story[(beat+1)%4]];
    let [dx,dy,scale,spread,angle,echo] = a.map((v,i)=>v+(b[i]-v)*blend);
    const effect = touches>0 ? Math.max(0,1-age/2.2) : 0;
    const step = touches%2 ? 1 : -1;
    if (touches>0) switch (response) {
      case "scatter": spread += effect*1.2; scale -= .12*effect; break;
      case "gather": spread *= 1-.82*effect; dx += step*6*effect; break;
      case "lift": dy -= effect*(held?29:18); scale += .12*effect; break;
      case "mirror": dx *= step; angle *= step; spread += .12*effect; break;
      case "echo": echo += 2.7*effect; dx += Math.sin(age*5)*effect*5; break;
      case "breathe": scale *= 1+effect*.3*Math.sin(age*3+.7); break;
      case "bow": dy += 11*effect; angle += step*effect*.34; scale *= 1-.12*effect; break;
      case "spin": angle += step*Math.PI*2*(1-effect); break;
      case "freeze": if(held){spread *= .86;scale *= .95;} break;
      default: spread += effect*.42*Math.sin(age*7); dy += effect*3*Math.sin(age*7);
    }
    return {dx,dy,scale,spread,angle,echo:Math.max(0,Math.min(4,Math.round(echo))),phase:clock};
  }
  return Object.freeze({
    blockCount, variantsPerFamily, firstKit, kitCount:masters.length*kitSize*kitSize, families:FAMILY_NAMES, block, blockId, familyFor, fittingOptions, assemble,
    rasterSize:SIZE, raster, paint, draw, styles, styleCount, style, styleFor, mechanics,
    motion, layout, stage, gameRules, gameInput, gameTick, gamePoint, gameFinish, gameRescue, gameSpeed, gameStatus, animationFrame, rule: descriptor => descriptor?.rule || "",
    glyphRows: char => glyphRows[String(char).toUpperCase()]?.slice() || null,
  });
})();
