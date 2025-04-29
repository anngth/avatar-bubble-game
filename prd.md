# Product Requirements Document (PRD)

## Avatar Bounce Game

---

## 1. Objective

Build a React-based interactive webpage "Avatar Bounce Game" where avatar images are rendered as **bouncing bubbles**. The gameplay features **realistic 2D physics**, a **split-screen layout**, **gravity mechanics**, **scoring system**, and **celebratory feedback** to create an engaging, skill-based bouncing game.

---

## 2. Layout Overview

- **Split Screen Layout**:
  - **Left Zone**: Classic floating physics without gravity.
  - **Right Zone**: Gravity-enabled gameplay where bubbles fall naturally.
- **Divider Wall**:

  - Separates Left and Right Zones.
  - Bottom section: **Solid** — bubbles cannot pass.
  - Top section: **Semi-passable** — bubbles can cross if thrown hard enough.
  - Divider slightly slanted (~5–7 degrees) to support ball sliding toward Right Zone.

- **Lower Left Interaction Zone**:
  - The Left Zone is vertically divided into **upper** and **lower** halves.
  - **Only the Lower Half** is an **Interaction Zone**:
    - Users can drag and throw bubbles here.
    - **Boundaries**:
      - **Right Wall**: Hard vertical wall; bubbles cannot pass through.
      - **Top Wall**: Semi-passable, **tilted rightward by 7 degrees** to prevent ball trapping.
    - Visual cue recommended (e.g., a line or shading) to show boundary between interaction and view-only areas.

---

## 3. Avatar Bubble Specifications

- **Size**: Fixed **100px diameter** for all bubbles.
- **Shape**: Perfect circles with anti-aliased rendering.
- **Avatar Types**: Five characters:
  - **Tèo**, **Tí**, **Trúc**, **Kỷ An**, **Dém**.
- **Placeholder**: Display default fallback image if avatar fails to load.

---

## 4. Bubble Interaction Mechanics

### 4.1 Bubble-to-Bubble Collisions

- **Elastic Collisions**:
  - Realistic bouncing based on conservation of momentum and kinetic energy.
- **Rotational Movement**:
  - Bubbles rotate after collision.
  - Rotation speed proportional to collision force, capped to avoid unrealistic spins.
- **Angular Momentum**:
  - Natural spin after collisions.
- **Hard Separation**:
  - No overlapping; immediate resolution after contact.
- **Inertia Control**:
  - Apply friction to slow down linear and rotational movements.
  - Limit max velocities to maintain a controllable, smooth experience.

### 4.2 Bubble-to-Boundary Interactions

- **Left Zone Boundaries**:

  - Bounce off screen edges elastically.
  - Stay completely inside the screen bounds.
  - Window resizing adjusts boundaries dynamically.

- **Top Wall of Lower Left Zone**:

  - Tilted **7 degrees** rightward.
  - If a ball collides:
    - With sufficient force: passes into Right Zone.
    - Without sufficient force: slides naturally toward the divider opening.

- **Backup Anti-Stuck Mechanism**:
  - If a bubble remains stationary near the tilted top wall (velocity < 0.5px/frame) for >2 seconds:
    - Apply a **small downward gravity force** (~10–15% of main gravity) to pull it gently down.

---

## 5. User Interaction

- **Drag and Throw**:
  - Users can only drag and throw bubbles within the Lower Left Interaction Zone.
- **Collision During Dragging**:
  - While dragging, bubbles still detect collisions.
  - No passing through other bubbles.
- **Boundary Constraint While Dragging**:
  - Bubbles cannot be dragged out of screen bounds or out of the Interaction Zone.
- **Dynamic Bubble Movement**:
  - Once thrown, bubbles can freely move across zones if physics allows.

---

## 6. Gravity Mechanics (Right Zone)

- **Gravity Activation**:
  - Bubbles entering the Right Zone are affected by downward gravity.
- **Parabolic Motion**:
  - Natural curved paths when thrown into Right Zone.
- **Gravity Strength**:
  - Gravity should be realistic but adjustable to fine-tune gameplay experience.

---

## 7. Trash Can Scoring System

- **Trash Can Placement**:
  - Located at the bottom of the Right Zone.
- **Moving Trash Can**:
  - Moves horizontally left and right at a slow, steady speed (ping-pong motion).
- **Scoring Conditions**:
  - If a bubble lands inside the Trash Can:
    - **Play "plop" sound**.
    - **Trash Can performs a jump animation** (short vertical bounce).
    - **Confetti/Flower burst animation** triggers.
    - **Bubble is removed from screen**.
    - **Display Congratulations Message**:
      - Show small popup or toast like "**Congratulations!**" near the Trash Can.
- **Bounce Score Validity**:
  - Bounces off the top screen and landing in Trash Can also count.

---

## 8. Bubble Management

- **Five Add Buttons**:
  - At top-right corner: five buttons labeled [Tèo], [Tí], [Chúc], [Dũ], [Dém].
  - Each button adds a corresponding avatar bubble into the Lower Left Interaction Zone.
- **Unlimited Addition**:
  - No strict cap on number of added bubbles (unless future optimization is needed).

---

## 9. Sound and Animation Effects

- **"Plop" Sound**:
  - Soft plop when bubble falls into Trash Can.
- **Trash Can Jump Animation**:
  - Quick vertical bounce for celebration.
- **Confetti/Flower Animation**:
  - Lightweight particle burst upon successful scoring.
- **Congratulatory Toast**:
  - Popup saying "Nice Shot!", "Awesome!" or similar when scoring.

---

## 10. Technical and Performance Requirements

- **Frontend Framework**: React (latest stable version).
- **Rendering**: Prefer HTML5 Canvas for smooth animation.
- **Physics Engine**: Custom lightweight 2D physics, no external physics libraries like Matter.js.
- **Frame Rate Target**: Maintain 60 FPS across desktop and mobile.
- **Responsiveness**: Fully responsive design, supporting both touch and mouse devices.

---

# Deliverable

An engaging, polished interactive webpage where users throw avatar bubbles using realistic 2D physics, aim for a moving Trash Can across a split-screen environment, and experience delightful animations and audio feedback upon successful shots.
