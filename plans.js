/* plans.js — baseline maintenance libraries.
   These are typical manufacturer-recommended intervals for each class of
   machine. They are a starting point: open a vehicle and edit any interval
   to match its own owner's manual. "u" = usage interval in the vehicle's
   unit (miles or hours). "m" = calendar interval in months. Whichever
   comes first wins. */

const PROFILES = {
  /* ---------------- autos (miles) ---------------- */
  car_na: {
    label: "Car / SUV, naturally aspirated gas", category: "autos", unit: "mi",
    tasks: [
      { n: "Engine oil and filter", u: 7500, m: 12, g: "Engine" },
      { n: "Tire rotation", u: 7500, m: 12, g: "Chassis" },
      { n: "Engine air filter", u: 30000, m: 36, g: "Engine" },
      { n: "Cabin air filter", u: 15000, m: 12, g: "Interior" },
      { n: "Brake inspection (pads, rotors, hoses)", u: 15000, m: 12, g: "Chassis" },
      { n: "Brake fluid flush", u: 45000, m: 36, g: "Chassis" },
      { n: "Engine coolant flush", u: 100000, m: 120, g: "Engine" },
      { n: "Spark plugs", u: 100000, m: 120, g: "Engine" },
      { n: "Automatic transmission fluid", u: 60000, m: 72, g: "Drivetrain" },
      { n: "Serpentine belt inspection", u: 60000, m: 60, g: "Engine" },
      { n: "Battery load test", u: 0, m: 12, g: "Electrical" },
      { n: "Wiper blades", u: 0, m: 12, g: "Body" },
      { n: "Alignment check", u: 30000, m: 24, g: "Chassis" }
    ]
  },
  car_turbo: {
    label: "Car, turbocharged / performance", category: "autos", unit: "mi",
    tasks: [
      { n: "Engine oil and filter", u: 5000, m: 6, g: "Engine", note: "Shorten to 5k on a tuned car" },
      { n: "Tire rotation", u: 5000, m: 6, g: "Chassis" },
      { n: "Engine air filter", u: 20000, m: 24, g: "Engine" },
      { n: "Cabin air filter", u: 15000, m: 12, g: "Interior" },
      { n: "Spark plugs", u: 30000, m: 48, g: "Engine", note: "Colder plug and tighter gap if tuned" },
      { n: "Brake fluid flush", u: 20000, m: 24, g: "Chassis" },
      { n: "DSG / DCT fluid and filter", u: 40000, m: 48, g: "Drivetrain" },
      { n: "Haldex / AWD coupler fluid", u: 40000, m: 48, g: "Drivetrain" },
      { n: "Intake valve walnut blasting", u: 45000, m: 0, g: "Engine", note: "Direct injection carbon buildup" },
      { n: "Engine coolant flush", u: 60000, m: 60, g: "Engine" },
      { n: "Brake pad and rotor inspection", u: 10000, m: 12, g: "Chassis" },
      { n: "PCV / crankcase breather check", u: 60000, m: 72, g: "Engine" },
      { n: "Battery load test", u: 0, m: 12, g: "Electrical" },
      { n: "Alignment check", u: 20000, m: 24, g: "Chassis" }
    ]
  },
  truck_diesel: {
    label: "Truck, diesel", category: "autos", unit: "mi",
    tasks: [
      { n: "Engine oil and filter", u: 7500, m: 12, g: "Engine" },
      { n: "Fuel filters (primary and secondary)", u: 15000, m: 12, g: "Engine" },
      { n: "Engine air filter", u: 30000, m: 24, g: "Engine" },
      { n: "Tire rotation", u: 7500, m: 12, g: "Chassis" },
      { n: "DEF system check", u: 15000, m: 12, g: "Emissions" },
      { n: "Transmission fluid and filter", u: 60000, m: 60, g: "Drivetrain" },
      { n: "Front and rear differential fluid", u: 50000, m: 60, g: "Drivetrain" },
      { n: "Transfer case fluid", u: 60000, m: 60, g: "Drivetrain" },
      { n: "Coolant flush", u: 100000, m: 60, g: "Engine" },
      { n: "Brake inspection", u: 15000, m: 12, g: "Chassis" },
      { n: "Batteries load test", u: 0, m: 12, g: "Electrical" }
    ]
  },
  car_hybrid: {
    label: "Hybrid", category: "autos", unit: "mi",
    tasks: [
      { n: "Engine oil and filter", u: 10000, m: 12, g: "Engine" },
      { n: "Tire rotation", u: 5000, m: 6, g: "Chassis" },
      { n: "Hybrid battery cooling filter", u: 0, m: 12, g: "Hybrid" },
      { n: "Inverter coolant", u: 100000, m: 120, g: "Hybrid" },
      { n: "Engine coolant", u: 100000, m: 120, g: "Engine" },
      { n: "Cabin air filter", u: 15000, m: 12, g: "Interior" },
      { n: "Engine air filter", u: 30000, m: 36, g: "Engine" },
      { n: "Brake fluid flush", u: 45000, m: 36, g: "Chassis" },
      { n: "Brake inspection", u: 15000, m: 12, g: "Chassis" },
      { n: "Spark plugs", u: 120000, m: 120, g: "Engine" },
      { n: "12V battery test", u: 0, m: 12, g: "Electrical" }
    ]
  },
  car_ev: {
    label: "Electric vehicle", category: "autos", unit: "mi",
    tasks: [
      { n: "Tire rotation", u: 6000, m: 6, g: "Chassis" },
      { n: "Cabin air filter", u: 15000, m: 12, g: "Interior" },
      { n: "Brake fluid test and flush", u: 0, m: 24, g: "Chassis" },
      { n: "Brake caliper clean and lubricate", u: 0, m: 12, g: "Chassis", note: "Regen means pads sit unused" },
      { n: "Battery coolant service", u: 100000, m: 96, g: "Battery" },
      { n: "Reduction gear fluid", u: 100000, m: 0, g: "Drivetrain" },
      { n: "12V battery test", u: 0, m: 12, g: "Electrical" },
      { n: "A/C desiccant bag", u: 0, m: 84, g: "Interior" }
    ]
  },

  /* ---------------- equipment (hours) ---------------- */
  mower_small_engine: {
    label: "Mower / small gas engine", category: "equipment", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 100, m: 12, g: "Engine", note: "First change at 8 hours on a new engine" },
      { n: "Air filter — clean", u: 25, m: 0, g: "Engine" },
      { n: "Air filter — replace", u: 100, m: 12, g: "Engine" },
      { n: "Spark plugs", u: 200, m: 24, g: "Engine" },
      { n: "Fuel filter", u: 200, m: 12, g: "Engine" },
      { n: "Grease all fittings", u: 25, m: 0, g: "Chassis" },
      { n: "Sharpen and balance blades", u: 25, m: 0, g: "Deck" },
      { n: "Deck belt inspection", u: 50, m: 12, g: "Deck" },
      { n: "Deck wash-out and level check", u: 50, m: 12, g: "Deck" },
      { n: "Spindle bearing check", u: 100, m: 12, g: "Deck" },
      { n: "Hydro transmission fluid", u: 400, m: 60, g: "Drivetrain" },
      { n: "Valve lash adjustment", u: 300, m: 0, g: "Engine" },
      { n: "Battery terminals clean", u: 0, m: 12, g: "Electrical" },
      { n: "Fuel stabilizer and off-season storage prep", u: 0, m: 12, g: "Seasonal" }
    ]
  },
  tractor_diesel: {
    label: "Tractor / diesel utility", category: "equipment", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 200, m: 12, g: "Engine" },
      { n: "Engine air filter — clean", u: 100, m: 0, g: "Engine" },
      { n: "Engine air filter — replace", u: 400, m: 24, g: "Engine" },
      { n: "Fuel filter and water separator", u: 200, m: 12, g: "Engine" },
      { n: "Hydraulic / transmission fluid and filter", u: 400, m: 24, g: "Hydraulics" },
      { n: "Front axle / front diff oil", u: 400, m: 24, g: "Drivetrain" },
      { n: "Grease all fittings (loader, 3-point, driveline)", u: 50, m: 0, g: "Chassis" },
      { n: "Coolant check and strength test", u: 400, m: 12, g: "Engine" },
      { n: "Coolant flush", u: 1000, m: 24, g: "Engine" },
      { n: "Fan and alternator belt tension", u: 200, m: 12, g: "Engine" },
      { n: "Wheel bolt torque", u: 50, m: 6, g: "Chassis" },
      { n: "Tire pressure and ballast check", u: 0, m: 6, g: "Chassis" },
      { n: "Valve clearance", u: 800, m: 0, g: "Engine" },
      { n: "Battery and terminal service", u: 0, m: 12, g: "Electrical" }
    ]
  },
  generator: {
    label: "Generator", category: "equipment", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 100, m: 12, g: "Engine" },
      { n: "Air filter", u: 100, m: 12, g: "Engine" },
      { n: "Spark plug", u: 200, m: 24, g: "Engine" },
      { n: "Exercise run under load", u: 0, m: 1, g: "Operation" },
      { n: "Battery test (electric start)", u: 0, m: 6, g: "Electrical" },
      { n: "Transfer switch operation test", u: 0, m: 12, g: "Electrical" },
      { n: "Valve lash", u: 500, m: 0, g: "Engine" },
      { n: "Fuel system inspection", u: 0, m: 12, g: "Engine" }
    ]
  },
  implement: {
    label: "Implement / trailer (no engine)", category: "equipment", unit: "hr",
    tasks: [
      { n: "Grease all fittings", u: 25, m: 6, g: "Chassis" },
      { n: "Gearbox oil level", u: 100, m: 12, g: "Drivetrain" },
      { n: "Gearbox oil change", u: 500, m: 36, g: "Drivetrain" },
      { n: "Driveline shear bolt / slip clutch check", u: 100, m: 12, g: "Drivetrain" },
      { n: "Blade / tine wear inspection", u: 50, m: 12, g: "Working parts" },
      { n: "Wheel bearing repack", u: 0, m: 24, g: "Chassis" },
      { n: "Lights and wiring check", u: 0, m: 12, g: "Electrical" },
      { n: "Tire pressure", u: 0, m: 6, g: "Chassis" }
    ]
  },

  /* ---------------- boats (hours) ---------------- */
  outboard: {
    label: "Outboard", category: "boats", unit: "hr",
    tasks: [
      { n: "Engine oil and filter (4-stroke)", u: 100, m: 12, g: "Engine" },
      { n: "Lower unit gear lube", u: 100, m: 12, g: "Drivetrain" },
      { n: "Water pump impeller", u: 200, m: 24, g: "Cooling" },
      { n: "Spark plugs", u: 300, m: 24, g: "Engine" },
      { n: "Fuel filter / water separator", u: 100, m: 12, g: "Fuel" },
      { n: "Anode inspection and replacement", u: 100, m: 12, g: "Corrosion" },
      { n: "Propeller inspection and shaft grease", u: 50, m: 12, g: "Drivetrain" },
      { n: "Thermostat inspection", u: 300, m: 36, g: "Cooling" },
      { n: "Timing belt (where fitted)", u: 500, m: 60, g: "Engine" },
      { n: "Steering and tilt fluid check", u: 100, m: 12, g: "Controls" },
      { n: "Battery service", u: 0, m: 12, g: "Electrical" },
      { n: "Winterize / fog and drain", u: 0, m: 12, g: "Seasonal" }
    ]
  },
  sterndrive: {
    label: "Sterndrive / inboard gas", category: "boats", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 100, m: 12, g: "Engine" },
      { n: "Drive gear lube", u: 100, m: 12, g: "Drivetrain" },
      { n: "Water pump impeller", u: 100, m: 12, g: "Cooling" },
      { n: "Bellows inspection", u: 0, m: 12, g: "Drivetrain" },
      { n: "Bellows replacement", u: 0, m: 36, g: "Drivetrain" },
      { n: "Gimbal bearing grease", u: 50, m: 12, g: "Drivetrain" },
      { n: "Anodes", u: 0, m: 12, g: "Corrosion" },
      { n: "Spark plugs and cap", u: 300, m: 36, g: "Engine" },
      { n: "Fuel filter / water separator", u: 100, m: 12, g: "Fuel" },
      { n: "Bilge pump and float switch test", u: 0, m: 3, g: "Safety" },
      { n: "Engine alignment check", u: 0, m: 24, g: "Drivetrain" },
      { n: "Winterize: drain block and antifreeze", u: 0, m: 12, g: "Seasonal" }
    ]
  },
  inboard_diesel: {
    label: "Inboard diesel", category: "boats", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 150, m: 12, g: "Engine" },
      { n: "Primary and secondary fuel filters", u: 200, m: 12, g: "Fuel" },
      { n: "Raw water impeller", u: 200, m: 12, g: "Cooling" },
      { n: "Raw water strainer clean", u: 25, m: 1, g: "Cooling" },
      { n: "Heat exchanger clean", u: 1000, m: 60, g: "Cooling" },
      { n: "Coolant change", u: 1000, m: 24, g: "Cooling" },
      { n: "Transmission fluid", u: 300, m: 24, g: "Drivetrain" },
      { n: "Belts and hoses", u: 300, m: 12, g: "Engine" },
      { n: "Shaft seal / stuffing box", u: 0, m: 12, g: "Hull" },
      { n: "Anodes", u: 0, m: 12, g: "Corrosion" },
      { n: "Valve clearance", u: 1000, m: 0, g: "Engine" },
      { n: "Bottom paint and haul-out", u: 0, m: 24, g: "Hull" }
    ]
  },
  pwc: {
    label: "Personal watercraft", category: "boats", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 50, m: 12, g: "Engine" },
      { n: "Spark plugs", u: 100, m: 12, g: "Engine" },
      { n: "Pump oil", u: 100, m: 12, g: "Drivetrain" },
      { n: "Impeller and wear ring inspection", u: 100, m: 12, g: "Drivetrain" },
      { n: "Flush cooling system", u: 0, m: 1, g: "Cooling", note: "After every saltwater use" },
      { n: "Supercharger service (if fitted)", u: 200, m: 24, g: "Engine" },
      { n: "Hull and drain plug inspection", u: 0, m: 12, g: "Hull" },
      { n: "Winterize and fog", u: 0, m: 12, g: "Seasonal" }
    ]
  },

  /* ---------------- recreational ---------------- */
  light_aircraft: {
    label: "Light aircraft / LSA", category: "recreational", unit: "hr",
    tasks: [
      { n: "Oil and filter change", u: 50, m: 4, g: "Engine", note: "25 hr if no filter, shorter for float ops" },
      { n: "Annual or condition inspection", u: 0, m: 12, g: "Airframe" },
      { n: "Oil analysis sample", u: 50, m: 4, g: "Engine" },
      { n: "Spark plug clean, gap and rotate", u: 100, m: 12, g: "Engine" },
      { n: "Compression check", u: 100, m: 12, g: "Engine" },
      { n: "Air filter", u: 100, m: 12, g: "Engine" },
      { n: "Fuel screen and gascolator clean", u: 100, m: 12, g: "Fuel" },
      { n: "Gearbox / prop reduction inspection", u: 100, m: 12, g: "Drivetrain" },
      { n: "Propeller bolt torque and track", u: 100, m: 12, g: "Propeller" },
      { n: "Control cable and pulley inspection", u: 100, m: 12, g: "Airframe" },
      { n: "Rubber hoses and fuel lines", u: 0, m: 60, g: "Fuel" },
      { n: "ELT battery", u: 0, m: 24, g: "Avionics" },
      { n: "Transponder and static system check", u: 0, m: 24, g: "Avionics" },
      { n: "Landing gear rig, retract cycle and float pump-out", u: 25, m: 6, g: "Gear", note: "Amphib: check float compartments before every flight" },
      { n: "Corrosion inspection and rinse", u: 25, m: 6, g: "Airframe", note: "After any saltwater operation" },
      { n: "Tire pressure and brake wear", u: 25, m: 3, g: "Gear" }
    ]
  },
  rv_motorhome: {
    label: "Motorhome", category: "recreational", unit: "mi",
    tasks: [
      { n: "Chassis engine oil and filter", u: 6000, m: 12, g: "Chassis engine" },
      { n: "Generator oil and filter", u: 150, m: 12, g: "Generator", note: "Generator interval is in hours" },
      { n: "Roof seal and sealant inspection", u: 0, m: 6, g: "Body" },
      { n: "Wheel bearing repack", u: 20000, m: 24, g: "Chassis" },
      { n: "Tire age and pressure check", u: 0, m: 3, g: "Chassis", note: "Replace at 5-7 years regardless of tread" },
      { n: "Brake inspection", u: 15000, m: 12, g: "Chassis" },
      { n: "Propane system leak test", u: 0, m: 12, g: "Propane" },
      { n: "Water heater anode rod", u: 0, m: 12, g: "Plumbing" },
      { n: "Fresh water system sanitize", u: 0, m: 6, g: "Plumbing" },
      { n: "Holding tank flush and seal lube", u: 0, m: 6, g: "Plumbing" },
      { n: "Air conditioner filter and coil clean", u: 0, m: 6, g: "Appliances" },
      { n: "Battery water and charge check", u: 0, m: 3, g: "Electrical" },
      { n: "Winterize plumbing", u: 0, m: 12, g: "Seasonal" },
      { n: "Smoke, CO and LP detector test", u: 0, m: 6, g: "Safety" }
    ]
  },
  travel_trailer: {
    label: "Travel trailer / camper", category: "recreational", unit: "mi",
    tasks: [
      { n: "Roof seal inspection", u: 0, m: 6, g: "Body" },
      { n: "Wheel bearing repack", u: 12000, m: 12, g: "Chassis" },
      { n: "Brake magnet and shoe inspection", u: 12000, m: 12, g: "Chassis" },
      { n: "Tire age and pressure", u: 0, m: 3, g: "Chassis" },
      { n: "Lug nut torque", u: 500, m: 6, g: "Chassis" },
      { n: "Propane leak test and regulator", u: 0, m: 12, g: "Propane" },
      { n: "Water heater anode rod", u: 0, m: 12, g: "Plumbing" },
      { n: "Fresh water sanitize", u: 0, m: 6, g: "Plumbing" },
      { n: "Slide-out seals and rails", u: 0, m: 6, g: "Body" },
      { n: "Winterize plumbing", u: 0, m: 12, g: "Seasonal" },
      { n: "Battery charge and water", u: 0, m: 3, g: "Electrical" }
    ]
  },
  atv_utv: {
    label: "ATV / UTV / side-by-side", category: "recreational", unit: "hr",
    tasks: [
      { n: "Engine oil and filter", u: 100, m: 12, g: "Engine" },
      { n: "Air filter clean or replace", u: 25, m: 6, g: "Engine" },
      { n: "CVT belt inspection", u: 50, m: 12, g: "Drivetrain" },
      { n: "CVT clutch housing clean", u: 100, m: 12, g: "Drivetrain" },
      { n: "Front and rear differential oil", u: 200, m: 24, g: "Drivetrain" },
      { n: "Spark plugs", u: 200, m: 24, g: "Engine" },
      { n: "Coolant", u: 0, m: 24, g: "Cooling" },
      { n: "Grease all fittings and prop shafts", u: 50, m: 6, g: "Chassis" },
      { n: "Brake pad inspection", u: 50, m: 12, g: "Chassis" },
      { n: "Radiator screen clean", u: 25, m: 3, g: "Cooling" },
      { n: "Wheel bearings and A-arm play", u: 100, m: 12, g: "Chassis" }
    ]
  },
  motorcycle: {
    label: "Motorcycle", category: "recreational", unit: "mi",
    tasks: [
      { n: "Engine oil and filter", u: 5000, m: 12, g: "Engine" },
      { n: "Chain clean, lube and tension", u: 500, m: 1, g: "Drivetrain" },
      { n: "Air filter", u: 12000, m: 24, g: "Engine" },
      { n: "Brake fluid flush", u: 0, m: 24, g: "Chassis" },
      { n: "Coolant", u: 0, m: 24, g: "Cooling" },
      { n: "Valve clearance check", u: 16000, m: 0, g: "Engine" },
      { n: "Spark plugs", u: 16000, m: 48, g: "Engine" },
      { n: "Fork oil", u: 20000, m: 24, g: "Suspension" },
      { n: "Tire condition and pressure", u: 0, m: 1, g: "Chassis" },
      { n: "Final drive / sprockets", u: 15000, m: 0, g: "Drivetrain" },
      { n: "Battery tender and terminal check", u: 0, m: 6, g: "Electrical" }
    ]
  },
  snowmobile: {
    label: "Snowmobile", category: "recreational", unit: "mi",
    tasks: [
      { n: "Engine oil and filter (4-stroke)", u: 2500, m: 12, g: "Engine" },
      { n: "Chaincase oil", u: 2500, m: 12, g: "Drivetrain" },
      { n: "Drive belt inspection", u: 500, m: 12, g: "Drivetrain" },
      { n: "Clutch clean and inspect", u: 1500, m: 12, g: "Drivetrain" },
      { n: "Spark plugs", u: 2500, m: 12, g: "Engine" },
      { n: "Grease front end and rear suspension", u: 500, m: 3, g: "Chassis" },
      { n: "Track tension and alignment", u: 500, m: 3, g: "Chassis" },
      { n: "Hyfax / slide wear", u: 1000, m: 12, g: "Chassis" },
      { n: "Carbides and skis", u: 1000, m: 12, g: "Chassis" },
      { n: "Coolant", u: 0, m: 24, g: "Cooling" },
      { n: "Off-season storage: fog, stabilize, lift track", u: 0, m: 12, g: "Seasonal" }
    ]
  }
};

const CATEGORIES = [
  { key: "autos", label: "Autos", color: "#6bb0e8" },
  { key: "equipment", label: "Equipment", color: "#d98a4a" },
  { key: "boats", label: "Boats", color: "#3fb5ac" },
  { key: "recreational", label: "Recreational", color: "#a98bdd" }
];
