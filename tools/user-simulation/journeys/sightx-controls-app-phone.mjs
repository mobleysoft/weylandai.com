// tools/user-simulation/journeys/sightx-controls-app-phone.mjs
//
// S0 controls journey: SightX on the app page (/sightx/), phone. W (here the touch stick) moves the player at least
// 1 unit, a drag turns the view at least 0.5 rad, and no request leaves MobCorp's hosts.
// See tools/user-simulation/lib/controls-kit.mjs. Usage: node tools/user-simulation/journeys/sightx-controls-app-phone.mjs
import { Journey } from "../lib/journey-kit.mjs";
import { appJourney } from "../lib/controls-kit.mjs";

const J = new Journey("sightx-controls-app-phone", "SightX controls: app page, phone");
await J.run(() => appJourney(J, "phone"));
