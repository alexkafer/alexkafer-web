# Lunar Lander Game Design Notes

## Purpose

This document describes the lunar lander prototype as a playable experience, not as a technical implementation. It is intended to guide exploration of a port to a more robust game engine while preserving the current play style, social surface, and mood.

## Experience pillar

Lunar Lander is a shared precision-flight sandbox: part classic arcade landing challenge, part mission-control toy, part early MMO settlement sim. The player is asked to do one difficult thing well - bring a fragile craft down safely - and every success or failure leaves a mark on the shared lunar surface.

The best version should feel like a group of people crowding around a black-and-white vector monitor while multiple pilots try to thread needle landings, found tiny outposts, and turn a hostile moon into infrastructure.

## Core game loop

1. Spawn a lander into the shared lunar world.
2. Read the terrain, landing pads, ship telemetry, fuel, and nearby player activity.
3. Pilot the descent with thrust, rotation, and optional side-thruster corrections.
4. Touch down safely on a valid pad, or crash into the surface.
5. Let the world react: safe landings smooth terrain and can create outposts; crashes produce explosions, craters, and possible base damage.
6. Use successful landings and deployed bases to build more surface capability.
7. Repeat with better routes, better pads, better timing, upgraded systems, or more players in the same world.

The immediate loop is short and arcade-like. The meta loop is slower: land, found, build, repair, automate, launch, transfer, and expand.

## Player objectives

### Immediate objectives

- Land without exceeding safe descent speed, sideways drift, or tilt.
- Aim for scoring pads with higher multipliers.
- Conserve fuel while still staying in control.
- Keep the ship upright and centered over flat terrain.
- Recover from imperfect approaches using rotation and lateral thrust.

### Shared-world objectives

- Add safe landing surfaces to the world through successful touchdowns.
- Deploy base-kit landers to found early surface bases.
- Protect existing bases from crash damage.
- Build storage, mines, landing pads, and other support rooms.
- Produce and manage resources such as fuel, metal, ice, oxygen, and research.
- Research automation and advanced flight support.
- Launch from surface bases to orbital stations.
- Plan longer-term transfers between the Moon, Mars, and Europa.

### Long-term fantasy

The prototype points toward a cooperative frontier: pilots do risky manual landings while commanders grow a settlement network. The world should slowly evolve from raw jagged terrain into a lived-in network of pads, outposts, bases, stations, and cargo routes.

## Play style

The flight model should stay tense, deliberate, and skill-based. The lander is not a nimble arcade ship; it is a heavy vehicle with momentum, limited fuel, and a narrow landing envelope. Players should feel that every control input matters.

Successful play is about anticipation rather than reaction. Pilots rotate early, pulse thrust carefully, manage horizontal drift, and choose whether to chase a high-value pad or accept a safer landing zone.

The game should welcome spectacle. A crash is not only failure; it is part of the shared story. Explosions, craters, and base damage make bad landings visible and memorable without stopping the broader session.

## Flight mechanics

- **Thrust:** The main engine pushes along the current ship angle and consumes fuel while held.
- **Rotation:** Left and right rotation adjust the ship angle for braking, steering, and touchdown posture.
- **Lateral thrust:** Craft with side thrusters can use lateral pulses for fine horizontal correction; phones and gamepads expose this input clearly.
- **Fuel:** Fuel creates pressure. It rewards clean approaches and punishes hovering too long.
- **Gravity and momentum:** The descent is continuous and unforgiving; vertical and horizontal speed must be managed together.
- **Touchdown safety:** A landing only counts if the lander contacts with its feet, on a landing pad, within safe vertical speed, horizontal speed, and angle limits.
- **Scoring:** Landing pads have visible multipliers. Higher multipliers imply tighter or riskier targets.
- **Crash consequences:** Crashes generate visible explosions, carve craters into terrain, and can damage nearby bases.
- **Outpost creation:** Safe landings create small outpost/platform moments, including an astronaut/build sequence that turns touchdown into visible world progress.
- **Base deployment:** A base-kit lander can turn a successful landing into a starter base with supplies and expandable rooms.

## Settlement and progression mechanics

The game already gestures beyond individual landings into a light base-building economy.

- **Bases** act as persistent footholds on the surface.
- **Rooms** define base function: command habitat, storage, mines, processors, workshops, landing pads, shields, and launch control.
- **Storage** tracks resources that support construction, repair, automation, and travel.
- **Production** turns rooms into ongoing resource generators or processors.
- **Automation** lets bases perform background duties such as mining, repair, and future logistics.
- **Research** unlocks better craft, safety systems, automation, travel, and new destinations.
- **Stations and flights** extend the surface game into orbital logistics and body-to-body transfers.

For a richer engine port, this layer should remain readable and tactile. It should not become a menu-only strategy game; base growth should feel connected to the landings players performed.

## Multi-modal user experience

The current prototype supports several ways to participate:

- **Desktop pilot:** The main screen is both playfield and control station. Keyboard controls spawn, fly, pan the camera, reset, deploy base-kit craft, and operate base commands.
- **Gamepad pilot:** A controller offers a couch-friendly flight mode with analog steering/side input, face-button thrust, spawn, and reset.
- **Phone pilot:** A QR code opens a dedicated phone flight stick. The phone spawns its own ship and streams thrust, rotation, strafe, reset, and respawn inputs into the same shared world.
- **Spectator/mission-control screen:** The desktop world view can act as the big shared display while phones become personal cockpits.

The multi-modal promise is important: the game is not just playable on different devices; each device has a role. A desktop/laptop is the shared tactical map. A phone is a focused flight stick. A gamepad is the comfortable local cockpit.

## Multiplayer and shared-world UX

The game behaves like a small shared MMO prototype:

- Every active lander appears in the same lunar playfield.
- Ships are labeled sequentially, making pilots easy to call out in a room.
- The local ship is highlighted distinctly from phone and remote ships.
- A world counter reinforces that multiple landers are active together.
- Phone pilots can join without taking over the desktop session.
- Everyone sees the same terrain changes, crashes, outposts, bases, flights, and base damage.
- The world is collaborative but allows chaotic interference: another player's crash can scar the terrain or threaten infrastructure.

The social experience should lean into lightweight coordination: "Land on the 3x pad," "Do not hit the base," "Deploy the kit here," "Someone repair that," "Launch to station." Voice chat or same-room play should feel natural even before any in-game chat exists.

## Visual and art style

The current art style is minimal, high-contrast, and vector-driven:

- Black void background.
- White wireframe terrain.
- Sparse pixel-like star field.
- Thin-line landers, legs, thrust plumes, side-thruster bursts, hatches, astronauts, platforms, and base outlines.
- Large uppercase mono HUD typography.
- Cyan for systems, phone/remote identity, bases, and trajectory/helper energy.
- Amber for the local pilot/ship emphasis and key actions.
- Red/pink only when damage or danger needs attention.

The vibe is "retro mission control," closer to an oscilloscope or early vector arcade cabinet than a textured sci-fi scene. A future engine port can add depth, particles, lighting, sound, and camera work, but should preserve the crisp read-first silhouette language.

## HUD and feedback

The HUD should remain functional and theatrical:

- World/ship/loadout/time/fuel/systems on the left.
- Score/altitude/horizontal speed/vertical speed/angle on the right.
- Landing-zone callouts when passing over a valid pad.
- Color-coded safety feedback when safety systems are installed.
- Trajectory helper when a flight computer is installed.
- Base Ops panel for settlement state, storage, rooms, queues, automation, stations, and flights.
- Phone QR panel for instantly adding pilots.

The interface should feel like operating a machine, not browsing an app. Labels should be terse, uppercase, and readable at a glance.

## Vibe and emotional target

The game should feel:

- Tense during descent.
- Loud and funny when someone crashes.
- Satisfying when a clean landing creates visible infrastructure.
- Cooperative when players protect and expand shared bases.
- Experimental and slightly handmade, like a lab prototype that found a real game loop.
- Lonely and vast in the skybox, but social around the controls.

The strongest emotional beat is the transition from isolation to foothold: a fragile craft lands on a dead surface, a tiny astronaut appears, a platform gets built, and suddenly the moon has a human-made mark.

## Port considerations for a robust engine

When exploring a port, preserve these experiential requirements:

- Shared world state must remain central; terrain and base changes are not cosmetic.
- Landings and crashes need immediate visible consequences.
- Multi-device play should be a first-class design goal, not an afterthought.
- The phone-controller fantasy should remain simple: scan, spawn, fly.
- Flight controls must stay readable, responsive, and skillful across keyboard, gamepad, and touch.
- The art direction can gain polish, but should not lose the vector/mission-control clarity.
- Base-building should support the landing loop instead of replacing it.
- Multiplayer should make players aware of each other through ships, labels, shared scars, shared infrastructure, and shared risk.

The port should use a stronger engine to deepen feel, persistence, animation, audio, terrain interaction, and networked play while keeping the prototype's core identity: a shared lunar landing table where precise flying turns into a growing frontier.
