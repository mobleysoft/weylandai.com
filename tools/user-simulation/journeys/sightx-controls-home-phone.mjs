// tools/user-simulation/journeys/sightx-controls-home-phone.mjs
//
// S0 controls journey: SightX on the homepage backdrop, phone. W (here the touch stick) moves the player at least
// 1 unit, a drag turns the view at least 0.5 rad, and no request leaves MobCorp's hosts.
// See tools/user-simulation/lib/controls-kit.mjs. Usage: node tools/user-simulation/journeys/sightx-controls-home-phone.mjs
import { Journey } from "../lib/journey-kit.mjs";
import { homeJourney } from "../lib/controls-kit.mjs";

const J = new Journey("sightx-controls-home-phone", "SightX controls: homepage, phone");
await J.run(() => homeJourney(J, "phone"));
