```markdown
# Design System Strategy: High-Altitude Technical Expedition

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Altimeter."** 

Moving away from the generic "gaming HUD," this system adopts an editorial-utilitarian aesthetic inspired by high-end alpine expedition gear and technical surveying instruments. It rejects the "flat" web look in favor of a hyper-functional, layered interface that feels like a piece of physical equipment. 

We break the "template" look by using **Intentional Asymmetry**. Instead of centered, balanced grids, we lean into "Instrument Clusters"—grouping technical data in corners or along axes to mimic the specialized displays of a GPS or weather station. Large, aggressive typography scales collide with minute, high-density data labels to create a sense of professional urgency and precision.

## 2. Colors & Surface Logic
The palette is rooted in high-contrast visibility and environmental depth. 

*   **Primary (#ffb693 / #ff6b00):** Reserved strictly for action and survival. This is your "Safety Orange." It must be used sparingly to draw the eye to critical paths (e.g., "Deploy Anchor," "Oxygen Low").
*   **Surface Hierarchy (The "No-Line" Rule):** Traditional 1px borders are prohibited. Definition is achieved through tonal shifts.
    *   **Base Layer:** `surface` (#131314) for the main environment.
    *   **Nested Modules:** Use `surface_container_low` (#1b1b1c) for secondary data panels and `surface_container_high` (#2a2a2b) for active, interactive modals.
*   **The "Glass & Gradient" Rule:** To simulate the polycarbonate lenses of expedition goggles, floating HUD elements must use a **Backdrop Blur (12px–20px)** with `surface_container` at 70% opacity. 
*   **Signature Textures:** Incorporate a subtle topographical map vector (using `outline_variant` at 10% opacity) as a background fill for large `surface_container_lowest` areas to provide "technical soul."

## 3. Typography: Functional Authority
We utilize a dual-font system to balance industrial strength with data clarity.

*   **Display & Headlines (Space Grotesk):** This is our "Instrument Font." It is wide, technical, and authoritative. Use `display-lg` (3.5rem) for altitude readings and peak names. The tight tracking and idiosyncratic terminals of Space Grotesk suggest precision engineering.
*   **Body & Labels (Inter):** The "Workhorse." Inter provides maximum readability in high-stress scenarios. Use `label-sm` (0.6875rem) with `on_surface_variant` for technical metadata (lat/long, wind speed).
*   **The Hierarchy Shift:** Brand identity is conveyed by extreme scale contrast. A `display-lg` value might sit immediately next to a `label-sm` value to emphasize the relationship between a "Large Metric" and its "Technical Context."

## 4. Elevation & Depth: Tonal Layering
In a rugged environment, shadows don't exist in the vacuum of a screen—they represent physical distance from the mountain face.

*   **The Layering Principle:** Depth is "stacked." Place a `surface_container_highest` instrument panel over a `surface_container_low` map. The contrast in value creates the lift.
*   **Ambient Shadows:** For floating elements, use a "Glacial Shadow." This is extra-diffused (Blur: 40px) using the `on_secondary_fixed_variant` color at 5% opacity. It should feel like a soft occlusion rather than a drop shadow.
*   **The "Ghost Border" Fallback:** If a boundary is required for legibility against a complex topographical background, use a 1px stroke of `outline_variant` (#5a4136) set to **15% opacity**. Never use 100% opaque lines.
*   **Glassmorphism:** Navigation bars and "In-Glove" menus should use `surface_bright` with a 60% alpha and a heavy blur to maintain the "Polycarbonate Gear" aesthetic.

## 5. Components

*   **Buttons:** 
    *   **Primary:** `primary_container` (#ff6b00) background with `on_primary` text. Use `rounded-sm` (0.125rem) for a sharp, machined look.
    *   **Secondary:** `surface_container_highest` with a `ghost border`. 
*   **Technical Gauges:** Custom circular or linear indicators using `tertiary_container` for "Safe Zones" and `primary` for "Danger/Active Zones."
*   **Chips (Gear Tags):** Small, `rounded-none` containers using `secondary_container` for categorizing equipment (e.g., [ROPE: 60M]).
*   **Input Fields:** Use `surface_container_lowest` as the field base. The "active" state is indicated by a 2px bottom-bar of `primary` rather than a full box highlight.
*   **Cards & Lists:** **No Dividers.** Separate expedition logs or gear lists using `spacing-4` (0.9rem) vertical gaps and alternating backgrounds between `surface_container_low` and `surface_container_lowest`.
*   **Topographical Overlays:** A specialized component that renders 2D contour lines over `surface` backgrounds to denote terrain difficulty.

## 6. Do's and Don'ts

*   **DO:** Use `spacing-20` (4.5rem) to let massive "Peak" titles breathe against dense technical data.
*   **DO:** Use `Safety Orange` (#FF6B00) only for things the player can click or things that will kill them.
*   **DON'T:** Use rounded corners larger than `md` (0.375rem). This is expedition gear, not a social media app. Softness is the enemy of the "Rugged" aesthetic.
*   **DON'T:** Use standard "Close" (X) icons. Use technical abbreviations like "ESC" or "TERM" in `label-md` to maintain the utilitarian vibe.
*   **DO:** Ensure all text passes WCAG AA contrast against the `Deep Slate` background using the `Glacial White` (`on_background`) tokens.