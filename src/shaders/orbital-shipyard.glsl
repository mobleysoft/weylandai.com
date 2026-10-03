// =============================================================================
// WeylandAI SightX: Star Wars / Star Trek Inspired Orbital Shipyard & Sky
// Modular GLSL ES 3.00 Replacement for weylandai.com / weyland-sightx-worker
// =============================================================================
// Design Philosophy & Architecture:
// 1. SKY & SUN:
//    - Removed the 43 oversized star discs from BRIGHT_STAR_DIR/COL that rendered
//      as 43 giant suns.
//    - Implemented a physically authentic pinpoint starfield with two octaves of
//      sub-pixel stars and spectral temperature color variations.
//    - Implemented a soft, mottled Milky Way galactic band.
//    - Ensured ONE true dramatic Sun: razor-sharp white disc (sunDot > 0.999989)
//      casting harsh directional orbital key lighting and crisp deep shadows.
//    - Photorealistic NASA Earth with Rayleigh atmospheric limb scattering and
//      ocean specular glint preserved below.
//
// 2. ORBITAL SHIPYARD & CAPITAL VESSEL (Utopia Planitia / Fondor / Kuat Drive Yards):
//    - Replaced the suburban office building, desks, and floating folders with an
//      authentic open orbital drydock gantry cradle and capital seed vessel.
//    - Massive Hexagonal / Arched Open Gantry Cradle:
//      * Heavy longitudinal keel spine and gantry rails along Z = -4.0 to +28.0
//      * 6 transverse hexagonal gantry ribs / arched portal frames with gussets
//      * Diagonal X-truss open construction bay lattice along the sidewalls
//      * Overhead high-bay floodlight stanchions (Material 6.0)
//    - Capital Starship / Seed Vessel under construction inside berth:
//      * Elongated forward prow / command hull with angular chines (Z ~ -2.0 to 5.5)
//      * Bridge superstructure and forward navigational deflector dish (Material 19.0)
//      * Exposed structural rib cage bulkheads and 3 open interior deck levels
//      * Partially-fitted exterior armor plates and yellow alignment jigs
//      * Cylindrical antimatter reactor core with magnetic constriction field coils
//      * Two swept aft engine nacelle pylons with luminous cyan plasma glow (Mat 19.0)
//    - Docking Gantry Umbilical Arm:
//      * Heavy articulated boom connecting gantry catwalk to ship airlock
//    - Robotic Welding Arms:
//      * Multi-segment articulated manipulator arms with periodic motion
//      * High-intensity intermittent welding arcs / sparks (Material 35.0)
//    - Preserved:
//      * handSdf() first-person gloved astronaut hands
//      * Third-person helmet and reflective visor
//      * STRESS VIEW hook (Material 20.0 structural members)
//      * FilmLine Earth Relay Screening Pavilion & East power/thermal truss
// =============================================================================

// --- Transformation Helpers ---
vec3 rotX(vec3 v, float a){
  float c=cos(a), s=sin(a);
  return vec3(v.x, v.y*c-v.z*s, v.y*s+v.z*c);
}
vec3 rotY(vec3 v, float a){
  float c=cos(a), s=sin(a);
  return vec3(v.x*c+v.z*s, v.y, -v.x*s+v.z*c);
}
vec3 rotZ(vec3 v, float a){
  float c=cos(a), s=sin(a);
  return vec3(v.x*c-v.y*s, v.x*s+v.y*c, v.z);
}

// --- Orbital Shipyard Distance Function ---
vec2 map(vec3 p){
  if(u_planMode==1){
    vec2 planResult=vec2(p.y,8.0);
    planResult=put(planResult,sdPlanWall(p),1.0);
    return planResult;
  }

  vec2 res = vec2(1e9, 0.0);

  // =========================================================================
  // 1. MASSIVE HEXAGONAL / ARCHED OPEN GANTRY CRADLE
  //    (Star Trek Utopia Planitia / Star Wars Fondor / Kuat Drive Yards)
  //    Berth spans Z = -4.0 to +28.0, X = -10.0 to +10.0, Y = -2.0 to 11.0.
  //    All structural truss/gantry members use Material 20.0 (STRESS VIEW).
  // =========================================================================

  // (A) Longitudinal Heavy Keel Beams & Gantry Rails (Z from -4.0 to 28.0)
  float keelSpine = sdBox(vec3(p.x, p.y - (-2.0), p.z - 12.0), vec3(0.55, 0.45, 16.5));
  res = put(res, keelSpine, 20.0);

  // Twin lower gantry runway / maintenance catwalks (port & starboard)
  float catwalks = sdBox(vec3(abs(p.x) - 8.5, p.y - (-1.4), p.z - 12.0), vec3(0.75, 0.08, 16.5));
  float guardrails = sdBox(vec3(abs(p.x) - 7.8, p.y - (-0.9), p.z - 12.0), vec3(0.04, 0.42, 16.5));
  res = put(res, min(catwalks, guardrails), 20.0);

  // Mid-height gantry crane rails
  float midRails = sdBox(vec3(abs(p.x) - 9.2, p.y - 5.5, p.z - 12.0), vec3(0.32, 0.32, 16.5));
  res = put(res, midRails, 20.0);

  // Upper overhead gantry runner rails
  float topRails = sdBox(vec3(abs(p.x) - 4.5, p.y - 10.6, p.z - 12.0), vec3(0.35, 0.35, 16.5));
  res = put(res, topRails, 20.0);

  // (B) Massive Transverse Gantry Ribs / Hexagonal Arches
  // 6 primary structural frames at Z = -3.0, 3.0, 9.0, 15.0, 21.0, 27.0
  for(int ri = 0; ri < 6; ri++){
    float zRib = -3.0 + float(ri) * 6.0;
    vec3 rp = vec3(abs(p.x), p.y, p.z - zRib);

    // Bottom transverse frame beam
    float botBeam = sdBox(rp - vec3(4.0, -2.0, 0.0), vec3(4.5, 0.35, 0.45));
    
    // Outer vertical gantry column
    float colBeam = sdBox(rp - vec3(9.0, 2.5, 0.0), vec3(0.40, 4.0, 0.45));

    // Upper inward-angled arch rafter (connecting outer column to top roof)
    vec2 rafterRot = rotZ(vec3(rp.x - 6.75, rp.y - 8.5, 0.0), 0.73).xy;
    float rafterBeam = sdBox(vec3(rafterRot.x, rafterRot.y, rp.z), vec3(0.32, 3.1, 0.45));

    // Top horizontal roof cap beam
    float topBeam = sdBox(rp - vec3(2.25, 10.6, 0.0), vec3(2.5, 0.32, 0.45));

    // Structural corner gussets / knee braces
    float gusset1 = sdBox(rp - vec3(7.8, 6.0, 0.0), vec3(0.28, 0.28, 0.35));
    float gusset2 = sdBox(rp - vec3(4.8, 9.6, 0.0), vec3(0.28, 0.28, 0.35));

    float ribSdf = min(min(botBeam, colBeam), min(rafterBeam, topBeam));
    ribSdf = min(ribSdf, min(gusset1, gusset2));
    res = put(res, ribSdf, 20.0);

    // Gantry berth floodlight stanchions pointing down into the drydock
    float floodHousing = sdBox(rp - vec3(4.0, 10.0, 0.0), vec3(0.35, 0.18, 0.25));
    res = put(res, floodHousing, 20.0);
    float floodLens = sdBox(rp - vec3(4.0, 9.85, 0.0), vec3(0.28, 0.04, 0.20));
    res = put(res, floodLens, 6.0); // Emissive warm luminaire
  }

  // (C) Open Construction Bay Lattice / Diagonal Truss Bracing
  if(p.z >= -3.5 && p.z <= 27.5){
    float zBay = mod(p.z + 3.0, 6.0) - 3.0;
    float absX = abs(p.x);
    vec3 t1 = rotY(vec3(absX - 9.0, p.y - 2.5, zBay), 0.52);
    vec3 t2 = rotY(vec3(absX - 9.0, p.y - 2.5, zBay), -0.52);
    float diagTruss = min(sdBox(t1, vec3(0.10, 3.6, 0.10)), sdBox(t2, vec3(0.10, 3.6, 0.10)));
    res = put(res, diagTruss, 20.0);
  }

  // (D) Heavy Articulated Umbilical Arm Connecting Cradle to Ship
  float umbBoom1 = sdCapsule(p, vec3(-8.5, 3.8, 7.5), vec3(-5.2, 4.1, 7.8), 0.24);
  float umbElbow = sdSphere(p - vec3(-5.2, 4.1, 7.8), 0.38);
  float umbBoom2 = sdCapsule(p, vec3(-5.2, 4.1, 7.8), vec3(-2.2, 3.5, 7.5), 0.20);
  res = put(res, min(min(umbBoom1, umbBoom2), umbElbow), 20.0);
  float umbCollar = sdCylZ(p - vec3(-2.3, 3.5, 7.5), 0.42, 0.18);
  res = put(res, umbCollar, 4.0);

  // (E) Robotic Welding Arms with Intermittent Sparks (Material 35.0)
  // Welding Station 1: Port midsection (Z ~ 8.2, X ~ -3.2, Y ~ 4.2)
  {
    vec3 armBase = vec3(-4.5, 5.2, 8.0);
    float armCycle = fract(u_t / 6.0);
    float armReach = clamp(smoothstep(0.0, 0.25, armCycle) - smoothstep(0.55, 0.85, armCycle), 0.0, 1.0);
    float shoulderA = mix(-1.3, -0.4, armReach);
    float elbowA = mix(1.8, 0.6, armReach);
    
    vec3 rel1 = rotX(p - armBase, -shoulderA);
    float seg1 = sdCylZ(rel1 - vec3(0.0, 0.0, 0.4), 0.06, 0.4);
    vec3 elbowPos = armBase + rotX(vec3(0.0, 0.0, 0.8), shoulderA);
    float seg2A = shoulderA + elbowA;
    vec3 rel2 = rotX(p - elbowPos, -seg2A);
    float seg2 = sdCylZ(rel2 - vec3(0.0, 0.0, 0.35), 0.045, 0.35);
    float joints = min(sdSphere(p - armBase, 0.12), sdSphere(p - elbowPos, 0.09));
    res = put(res, min(min(seg1, seg2), joints), 20.0);

    vec3 tipPos = elbowPos + rotX(vec3(0.0, 0.0, 0.7), seg2A);
    res = put(res, sdSphere(p - tipPos, 0.06), 13.0);

    // Intermittent high-intensity electric welding arc / sparks (Material 35.0)
    float weldGate = step(0.3, sin(u_t * 4.0));
    float weldFlicker = step(0.48, fract(sin(u_t * 91.3) * 43758.5453));
    float arcSize = weldGate * weldFlicker * 0.075 + 0.003;
    res = put(res, sdSphere(p - tipPos, arcSize), 35.0);
  }

  // Welding Station 2: Starboard upper bulkhead (Z ~ 11.2, X ~ 3.2, Y ~ 4.8)
  {
    vec3 armBase2 = vec3(4.2, 5.8, 11.0);
    float armCycle2 = fract((u_t + 3.0) / 7.0);
    float armReach2 = clamp(smoothstep(0.0, 0.28, armCycle2) - smoothstep(0.52, 0.82, armCycle2), 0.0, 1.0);
    float shoulderA2 = mix(-1.2, -0.35, armReach2);
    float elbowA2 = mix(1.7, 0.5, armReach2);
    
    vec3 rel1_2 = rotX(p - armBase2, -shoulderA2);
    float seg1_2 = sdCylZ(rel1_2 - vec3(0.0, 0.0, 0.38), 0.06, 0.38);
    vec3 elbowPos2 = armBase2 + rotX(vec3(0.0, 0.0, 0.76), shoulderA2);
    float seg2A2 = shoulderA2 + elbowA2;
    vec3 rel2_2 = rotX(p - elbowPos2, -seg2A2);
    float seg2_2 = sdCylZ(rel2_2 - vec3(0.0, 0.0, 0.32), 0.045, 0.32);
    res = put(res, min(min(seg1_2, seg2_2), min(sdSphere(p - armBase2, 0.12), sdSphere(p - elbowPos2, 0.09))), 20.0);

    vec3 tipPos2 = elbowPos2 + rotX(vec3(0.0, 0.0, 0.64), seg2A2);
    res = put(res, sdSphere(p - tipPos2, 0.06), 13.0);

    float weldGate2 = step(0.35, sin(u_t * 3.3 + 2.1));
    float weldFlicker2 = step(0.5, fract(sin(u_t * 117.5) * 43758.5453));
    float arcSize2 = weldGate2 * weldFlicker2 * 0.075 + 0.003;
    res = put(res, sdSphere(p - tipPos2, arcSize2), 35.0);
  }

  // =========================================================================
  // 2. CAPITAL STARSHIP / SEED VESSEL UNDER CONSTRUCTION
  //    (Star Trek / Star Wars inspired capital vessel)
  //    Positioned inside berth along Z = -2.0 to 24.5, Y = 3.6, X = 0.
  // =========================================================================

  // (A) Forward Prow / Bow Section (Z ~ -2.0 to 5.5)
  {
    float zProw = p.z - 1.8;
    if(zProw >= -4.0 && zProw <= 4.0){
      float bowTaper = clamp((p.z - (-2.0)) / 7.5, 0.0, 1.0);
      float halfW = 0.45 + 1.95 * bowTaper;
      float halfH = 0.35 + 0.85 * bowTaper;
      vec3 bp = p - vec3(0.0, 3.6, 1.8);
      float prowBox = sdBox(bp, vec3(halfW, halfH, 3.7));
      float chine = dot(abs(bp.xy), vec2(0.7071, 0.7071)) - (0.85 + 1.25 * bowTaper);
      float prowHull = max(prowBox, chine);
      res = put(res, prowHull, 17.0); // Capital ship hull plating
    }

    // Forward Bridge / Command Tower (Dorsal superstructure at Z ~ 3.5, Y ~ 4.8)
    float bridgeSuper = sdBox(p - vec3(0.0, 4.75, 3.4), vec3(0.85, 0.32, 1.25));
    float bridgeUpper = sdBox(p - vec3(0.0, 5.15, 3.6), vec3(0.48, 0.16, 0.75));
    res = put(res, min(bridgeSuper, bridgeUpper), 17.0);
    // Bridge sensor strip / viewport band
    float bridgeVisor = sdBox(p - vec3(0.0, 4.82, 2.12), vec3(0.62, 0.06, 0.06));
    res = put(res, bridgeVisor, 10.0); // Emissive viewport strip

    // Navigational Deflector / Forward Sensor Array (Tip at Z = -2.1, Y = 3.4)
    float deflCowl = sdCylZ(p - vec3(0.0, 3.4, -2.0), 0.58, 0.16);
    res = put(res, deflCowl, 20.0);
    float deflDish = sdSphere(p - vec3(0.0, 3.4, -2.02), 0.40);
    res = put(res, deflDish, 19.0); // Luminous cyan deflector glow
  }

  // (B) Exposed Structural Rib Cage & Under-Construction Interior Decks (Z ~ 5.5 to 13.5)
  {
    float midSpine = sdBox(p - vec3(0.0, 1.8, 9.5), vec3(0.45, 0.35, 4.0));
    res = put(res, midSpine, 20.0);

    // Three exposed interior deck plates (Deck 1, 2, 3)
    float deck1 = sdBox(p - vec3(0.0, 2.5, 9.5), vec3(1.85, 0.05, 3.9));
    float deck2 = sdBox(p - vec3(0.0, 3.6, 9.5), vec3(2.15, 0.05, 3.9));
    float deck3 = sdBox(p - vec3(0.0, 4.7, 9.5), vec3(1.75, 0.05, 3.9));
    res = put(res, min(deck1, min(deck2, deck3)), 20.0);

    // Transverse structural ring bulkheads / rib cage frames (4 rings spaced at Z = 6.5, 8.5, 10.5, 12.5)
    for(int bi = 0; bi < 4; bi++){
      float zBulk = 6.5 + float(bi) * 2.0;
      vec3 bkp = vec3(abs(p.x), p.y, p.z - zBulk);
      float ribPost = sdBox(bkp - vec3(2.15, 3.6, 0.0), vec3(0.10, 1.45, 0.10));
      float ribRoof = sdBox(bkp - vec3(1.0, 5.05, 0.0), vec3(1.2, 0.10, 0.10));
      float ribFloor = sdBox(bkp - vec3(1.0, 2.15, 0.0), vec3(1.2, 0.10, 0.10));
      float deckCol = sdCyl(vec3(bkp.x - 1.0, bkp.y - 3.6, bkp.z), 0.06, 1.35);
      float ribFrame = min(min(ribPost, ribRoof), min(ribFloor, deckCol));
      res = put(res, ribFrame, 20.0);
    }

    // Partially-fitted exterior hull plating (lower port side partially completed)
    float hullPlates = sdBox(p - vec3(-2.25, 2.9, 8.2), vec3(0.08, 0.75, 1.9));
    res = put(res, hullPlates, 17.0);
    // Upper starboard alignment jigs / construction clamps
    float clampJig = sdBox(p - vec3(2.28, 4.3, 11.2), vec3(0.12, 0.16, 0.16));
    res = put(res, clampJig, 10.0); // Safety yellow alignment clamp
  }

  // (C) Cylindrical Reactor / Antimatter Core Housing (Z ~ 13.5 to 17.5, Y ~ 3.6)
  {
    float coreVessel = sdCyl(p - vec3(0.0, 3.6, 15.0), 1.15, 1.6);
    res = put(res, coreVessel, 17.0);

    // Magnetic constriction field rings
    for(int ci = 0; ci < 3; ci++){
      float yRing = 2.6 + float(ci) * 1.0;
      float mRing = sdCyl(p - vec3(0.0, yRing, 15.0), 1.32, 0.14);
      res = put(res, mRing, 2.0); // Anodized bronze magnetic coils
    }

    // Antimatter intermix inspection core (pulsing cyan glow)
    float coreChamber = sdCyl(p - vec3(0.0, 3.6, 15.0), 0.88, 0.55);
    res = put(res, coreChamber, 19.0); // Luminous plasma glow

    // Heavy plasma transfer conduits to engine pylons
    float conduit = sdCylZ(vec3(abs(p.x) - 1.25, p.y - 3.8, p.z - 16.5), 0.24, 1.4);
    res = put(res, conduit, 20.0);
  }

  // (D) Two Aft Engine Nacelle Pylons with Luminous Blue/Cyan Plasma Glow
  // Pylons sweep outboard and aft: X = 0 -> +/- 5.2, Y = 3.6 -> 4.8, Z = 16.2 -> 18.5
  for(int si = 0; si < 2; si++){
    float side = si == 0 ? -1.0 : 1.0;
    vec3 pylonRoot = vec3(side * 1.3, 3.5, 16.2);
    vec3 pylonTip  = vec3(side * 5.2, 4.8, 18.5);
    float pylonStrut = sdCapsule(p, pylonRoot, pylonTip, 0.28);
    res = put(res, pylonStrut, 20.0);

    // Twin Engine Nacelles (at X = +/- 5.2, Y = 4.8, Z from 15.0 to 24.5)
    vec3 np = vec3(p.x - side * 5.2, p.y - 4.8, p.z - 19.5);
    
    // Nacelle main body cylinder
    float nacelleBody = sdCylZ(np, 0.65, 4.4);
    res = put(res, nacelleBody, 17.0);

    // Forward Bussard Ramscoop / Intake Cowling (Z ~ 15.0)
    float bussard = sdSphere(p - vec3(side * 5.2, 4.8, 15.0), 0.72);
    res = put(res, bussard, 2.0); // Copper/bronze ramscoop cowl

    // Warp Nacelle Plasma Glow Channel (Inboard & outboard luminous cyan glow)
    float plasmaChannel = sdBox(vec3(abs(np.x) - 0.56, np.y, np.z), vec3(0.12, 0.18, 3.2));
    res = put(res, plasmaChannel, 19.0); // Luminous blue/cyan plasma glow

    // Aft sublight / impulse exhaust manifold nozzle (Z ~ 24.0)
    float exhaustNozzle = sdCylZ(p - vec3(side * 5.2, 4.8, 24.0), 0.52, 0.22);
    res = put(res, exhaustNozzle, 19.0); // Luminous engine glow
  }

  // Maintenance inspection pod (scale contrast, Star Wars / Trek cue)
  {
    vec3 podC = vec3(2.5 + sin(u_t * 0.08) * 0.8, 6.5 + sin(u_t * 0.12) * 0.15, 4.0 + cos(u_t * 0.06) * 0.7);
    vec3 pp = p - podC;
    res = put(res, sdCylZ(vec3(pp.z, pp.y, pp.x), 0.05, 0.12), 20.0);
    res = put(res, sdSphere(pp - vec3(0.0, 0.0, 0.08), 0.04), 13.0);
    res = put(res, sdSphere(pp - vec3(0.0, 0.0, -0.10), 0.02), 16.0);
  }

  // Station power/thermal truss (East bay) - preserved
  {
    vec3 stC = vec3(15.0, 2.2, 13.0);
    vec3 tp = p - stC;
    res = put(res, sdCylZ(tp, 0.22, 4.4), 20.0);
    for(int i = 0; i < 2; i++){
      float side = i < 1 ? 1.0 : -1.0;
      res = put(res, sdBox(tp - vec3(side * 3.0, 0.0, -1.6), vec3(2.6, 0.03, 1.6)), 18.0);
      res = put(res, sdBox(tp - vec3(side * 0.9, 0.0, -1.6), vec3(0.08, 0.07, 1.5)), 20.0);
      res = put(res, sdBox(tp - vec3(side * 2.1, 0.0,  2.2), vec3(1.5, 0.45, 0.035)), 21.0);
      res = put(res, sdBox(tp - vec3(side * 0.7, 0.0,  2.2), vec3(0.08, 0.07, 0.4)), 20.0);
    }
  }

  // FilmLine Earth Relay Screening Pavilion (South plaza, Z = 30.0) - preserved
  {
    vec3 fc = vec3(0.0, 0.0, 30.0);
    vec3 fp = p - fc;
    res = put(res, sdBox(fp - vec3(0.0, -0.05, 2.6), vec3(6.0, 0.05, 3.8)), 7.0);
    res = put(res, sdBox(fp - vec3(0.0, 0.0, -4.2), vec3(3.3, 0.02, 3.3)), 8.0);
    float thFront = sdBox(fp - vec3(0.0, 1.7, -1.2), vec3(3.14, 1.7, 0.14));
    thFront = max(thFront, -sdDoorOpening(fp - vec3(0.0, 0.0, -1.2), 1.0, 2.3));
    res = put(res, thFront, 22.0);
    res = put(res, sdBox(fp - vec3(0.0, 1.7, -7.2), vec3(3.14, 1.7, 0.14)), 22.0);
    res = put(res, sdBox(fp - vec3(-3.0, 1.7, -4.2), vec3(0.14, 1.7, 3.14)), 22.0);
    res = put(res, sdBox(fp - vec3( 3.0, 1.7, -4.2), vec3(0.14, 1.7, 3.14)), 22.0);
    res = put(res, sdBox(fp - vec3(0.0, 3.42, -4.2), vec3(3.28, 0.14, 3.28)), 5.0);
    res = put(res, sdBox(fp - vec3(0.0, 2.55, 0.05), vec3(1.35, 0.10, 1.25)), 23.0);
    res = put(res, sdBox(fp - vec3(0.0, 2.15, -1.05), vec3(1.0, 0.32, 0.03)), 24.0);
    res = put(res, sdBox(fp - vec3(-1.15, 1.15, -1.05), vec3(0.08, 1.15, 0.06)), 23.0);
    res = put(res, sdBox(fp - vec3( 1.15, 1.15, -1.05), vec3(0.08, 1.15, 0.06)), 23.0);
    res = put(res, sdBox(fp - vec3(0.0, 2.0, -7.05), vec3(1.6, 1.0, 0.03)), 28.0);
    {
      vec3 rp = fp - vec3(0.0, 1.9, -4.6);
      float flangeA = sdCylZ(rp - vec3(0.0, 0.0, -0.12), 0.55, 0.015);
      float flangeB = sdCylZ(rp - vec3(0.0, 0.0,  0.12), 0.55, 0.015);
      for(int i = 0; i < 6; i++){
        float ang = float(i) * 1.0472;
        vec3 hp = rp - vec3(cos(ang) * 0.32, sin(ang) * 0.32, 0.0);
        float hole = sdCylZ(hp, 0.07, 0.03);
        flangeA = max(flangeA, -hole);
        flangeB = max(flangeB, -hole);
      }
      res = put(res, flangeA, 25.0);
      res = put(res, flangeB, 25.0);
      res = put(res, sdCylZ(rp, 0.09, 0.14), 25.0);
      res = put(res, sdCylZ(rp, 0.46, 0.10), 26.0);
      res = put(res, sdBox(rp - vec3(0.0, -0.62, 0.0), vec3(0.09, 0.18, 0.012)), 26.0);
      vec3 starP = rp - vec3(0.0, 0.0, -0.09);
      vec2 srot = vec2(starP.x * 0.7071 - starP.y * 0.7071, starP.x * 0.7071 + starP.y * 0.7071);
      res = put(res, sdBox(vec3(srot, starP.z), vec3(0.045, 0.045, 0.01)), 27.0);
    }
  }

  // Astronaut embodiment (first-person hands or third-person helmet/visor)
  if(u_thirdPerson < 0.5){
    vec3 cfwd   = normalize(u_dir);
    vec3 cright = normalize(cross(u_up, cfwd));
    vec3 cup    = cross(cfwd, cright);
    vec3 rel    = p - u_cam;
    vec3 vp = vec3(dot(rel,cright), dot(rel,cup), dot(rel,cfwd));
    bool portrait = u_res.x < u_res.y;
    float lower = clamp(u_handsLowered, 0.0, 1.0);
    res = put(res, min(handSdf(vp,-1.0,portrait,lower), handSdf(vp,1.0,portrait,lower)), 30.0);
  } else {
    vec3 afwd   = normalize(u_astroFwd);
    vec3 aright = normalize(cross(u_astroUp, afwd));
    vec3 aup    = cross(afwd, aright);
    vec3 arel   = p - u_astroPos;
    vec3 al = vec3(dot(arel,aright), dot(arel,aup), dot(arel,afwd));
    float helmet = sdSphere(al - vec3(0.0,0.0,-0.05), 0.26);
    res = put(res, helmet, 31.0);
    vec3 visorP = (al - vec3(0.0,0.0,0.07)) * vec3(1.0,1.08,1.0);
    float visor = length(visorP) - 0.215;
    float visorMask = al.z - 0.05;
    res = put(res, max(visor, -visorMask), 32.0);
  }

  return res;
}

// --- Orbital Sky & Dramatic Single Sun Function ---
vec3 sky(vec3 ro, vec3 rd){
  // One consistent orbital sun direction
  vec3 sunDir = rotX(normalize(vec3(0.42, 0.68, 0.38)), sunSweepAngle());
  vec3 nadir  = vec3(0.0,-1.0,0.0);
  float earthDist   = 2200.0;
  float earthRadius = earthDist*sin(radians(70.0));
  vec3 earthCenter  = ro + nadir*earthDist;

  vec3 oc = ro-earthCenter;
  float b = dot(rd,oc);
  float c = dot(oc,oc)-earthRadius*earthRadius;
  float disc = b*b-c;

  if(disc>0.0){
    float t=-b-sqrt(disc);
    if(t>0.0){
      vec3 hit = ro+rd*t;
      vec3 N    = normalize(hit-earthCenter);
      vec3 Nsurf    = rotX(N, -earthSweepAngle());
      float sunFacing = max(dot(N,sunDir),0.0);
      vec2 euv      = earthUV(Nsurf);
      vec3 dayTex   = texture(u_earthDay, euv).rgb;
      vec3 nightTex = texture(u_earthNight, euv).rgb;
      vec3 Ncloud     = rotX(N, -(earthSweepAngle()*0.82));
      float cloudTex  = texture(u_earthCloud, earthUV(Ncloud)).r;
      float cloudMask = smoothstep(0.30,0.62,cloudTex);
      vec3 lit      = mix(dayTex, vec3(0.94,0.95,0.97), cloudMask*0.72);
      float term    = smoothstep(0.0,0.18,sunFacing);
      vec3 nightCol = vec3(0.006,0.01,0.02) + nightTex*2.2;
      vec3 earthLit = mix(nightCol, lit*(0.35+1.35*sunFacing), term);
      vec3 atmoGlow = atmosphereRim(N, rd, sunFacing);
      float oceanMask = smoothstep(0.015,0.14, dayTex.b-max(dayTex.r,dayTex.g)) * (1.0-cloudMask);
      vec3  Hsun       = normalize(sunDir-rd);
      float glint      = pow(max(dot(N,Hsun),0.0), 240.0) * oceanMask * sunFacing * 3.2;
      return clamp(earthLit+atmoGlow+vec3(1.0,0.98,0.92)*glint, 0.0, 1.9);
    }
  }

  // Pinpoint starfield (sub-pixel, no oversized glowing discs)
  vec3 rdSky = rotX(rd, -sunSweepAngle());
  float h1 = hash(floor(rdSky*520.0));
  float star1 = step(0.9982, h1) * (0.35 + 0.65*fract(h1*143.1));
  float h2 = hash(floor(rdSky*960.0));
  float star2 = step(0.9994, h2) * (0.6 + 0.4*fract(h2*521.7));
  vec3 starTint1 = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.95, 0.88), fract(h1*33.1));
  vec3 starTint2 = mix(vec3(0.92, 0.96, 1.0), vec3(1.0, 0.85, 0.72), fract(h2*77.9));
  vec3 stars = vec3(star1)*starTint1 + vec3(star2)*starTint2;

  // Soft Milky Way band along galactic plane
  vec3 galacticPole = normalize(vec3(0.36,0.84,-0.41));
  float milkyD     = dot(rdSky, galacticPole);
  float milkyBand  = exp(-milkyD*milkyD*18.0);
  float milkyNoise = noise(rdSky*6.0)*0.6 + noise(rdSky*15.0)*0.4;
  vec3 milkyWay    = vec3(0.50,0.54,0.64) * milkyBand * (0.05 + milkyNoise*0.13);

  // Distant Moon (LROC mosaic, airless Lambertian shading)
  vec3 moonDir    = normalize(vec3(-0.58,0.22,0.60));
  float moonDist  = 1400.0;
  float moonRad   = moonDist*sin(radians(1.6));
  vec3 moonCenter = ro + moonDir*moonDist;
  vec3 mOc    = ro - moonCenter;
  float mB    = dot(rdSky, mOc);
  float mC    = dot(mOc,mOc)-moonRad*moonRad;
  float mDisc = mB*mB-mC;
  vec3 moonCol = vec3(0.0);
  if(mDisc>0.0){
    float mT = -mB-sqrt(mDisc);
    if(mT>0.0){
      vec3 mHit = ro+rdSky*mT;
      vec3 mN   = normalize(mHit-moonCenter);
      vec3 moonTex = texture(u_moonTex, earthUV(mN)).rgb;
      float mNdL = max(dot(mN,sunDir),0.0);
      moonCol = moonTex*mNdL*1.7;
    }
  }

  // ONE TRUE DRAMATIC SUN:
  // Brilliant white disc, sharp sub-degree angular size (half-angle ~0.265 deg)
  float sunDot = max(dot(rd,sunDir),0.0);
  vec3 sunDisk = vec3(0.0);
  if(sunDot > 0.999989){
    float core = smoothstep(0.999989, 0.999994, sunDot);
    sunDisk = vec3(1.0, 1.0, 1.0) * core * 14.0;
  }
  float faintGlow = pow(sunDot, 128.0) * 0.05;
  return stars + milkyWay + moonCol + sunDisk + vec3(0.96, 0.98, 1.0)*faintGlow;
}
