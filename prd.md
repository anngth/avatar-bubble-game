# Product Requirements Document (PRD)

## Interactive Avatar Bubble Game

---

## 1. Objective

Develop a React-based interactive webpage where avatar images are displayed as **circular bubbles**. The gameplay combines **realistic 2D physics** for movement and collisions with a **split-screen layout**, **gravity mechanics**, **scoring system**, and **celebratory animations**.

---

## 2. Layout Overview

- **Split Screen**:
  - **Left Zone**: Classic floating bubble interaction without gravity.
  - **Right Zone**: Gravity-affected gameplay area where bubbles fall naturally.
- **Divider Wall**:
  - **Bottom Half**: Solid — bubbles cannot pass through.
  - **Top Half**: Semi-passable — bubbles can pass through if thrown with sufficient velocity.

---

## 3. Avatar Bubble Specifications

- **Size**: Fixed **diameter of 100px** for all bubbles.
- **Shape**: Perfect circle with anti-aliased rendering.
- **Avatar Types**:
  - Five characters: **Tèo**, **Tí**, **Trúc**, **Kỷ An**, **Dém**.
- **Fallback**:
  - Show a default placeholder image if the avatar cannot load.

---

## 4. Bubble Interaction Mechanics

### 4.1 Bubble-to-Bubble Collisions

- **Elastic Collisions**:
  - Natural bouncing upon contact.
- **Rotational Movement**:
  - Bubbles rotate realistically based on collision impact, with rotation speed clamped within reasonable limits.
- **Angular Momentum**:
  - Impart spin during collisions.
- **Trajectory Changes**:
  - Post-collision motion should not be constrained to XY axes.
- **Hard Separation**:
  - No overlap or merging allowed.
- **Inertia Control**:
  - Air friction slows down both linear motion and spin gradually.
  - Limit maximum linear and angular speeds.

---

### 4.2 Bubble-to-Boundary Interactions

- **Wall Bounce**:
  - Reflect off screen edges elastically.
- **Viewport Constraint**:
  - Bubbles must always remain visible within the screen bounds.
- **Window Resize Handling**:
  - Dynamically adjust bubbles to stay inside resized viewport.

---

## 5. User Interaction

- **Drag and Throw**:
  - Users can drag and throw bubbles freely.
- **Collision While Dragging**:
  - Even during drag, bubbles must respect collisions and separation rules.
- **Drag Boundary Constraint**:
  - Bubbles cannot be dragged outside the visible screen.

---

## 6. Gravity Mechanics (Right Zone Only)

- **Gravity Activation**:
  - Bubbles experience constant downward acceleration in the Right Zone.
- **Parabolic Motion**:
  - Realistic arc trajectory under gravity after crossing the divider.

---

## 7. Trash Can Scoring System

- **Trash Can Placement**:
  - Bottom-right of the Right Zone.
- **Moving Trash Can**:
  - Slowly moves horizontally back and forth (left-right ping-pong motion).
- **Scoring Mechanics**:

  - If a bubble falls into the Trash Can:
    - **Trash Can Jump Animation**:
      - Short vertical bounce to celebrate.
    - **Confetti/Flower Animation**:
      - Lightweight particle effects around the Trash Can.
    - **Play "plop" Sound Effect**:
      - Triggered immediately upon successful scoring.
    - **Delete Bubble**:
      - Remove the scored bubble from the screen after the animation starts.
    - **Display Congratulations Message**:
      - Show a small popup, toast notification, or overlay near the Trash Can saying something like "**Congratulations!**" or "**Nice Shot!**".

- **Bounce Off Top Wall**:
  - Valid scoring if the ball bounces off the top of the screen and falls into the Trash Can.

---

## 8. Bubble Management

- **Five Add Buttons**:
  - Top-right area contains five buttons: [Tèo] [Tí] [Trúc] [Kỷ An] [Dém].
  - Each button spawns a corresponding avatar bubble in the Left Zone.
- **No Limit**:
  - Users can add as many bubbles as desired.

---

## 9. Sound and Animation Effects

- **"Plop" Sound**:
  - A soft "plop" sound plays when a ball falls into the Trash Can.
- **Trash Can Jump**:
  - Small jump effect when a successful shot is detected.
- **Confetti Celebration**:
  - Lightweight confetti or flower particle effect to celebrate scoring.
- **Congratulatory Message**:
  - Small visible "toast" or popup congratulating the player after a ball scores.

---

## 10. Technical and Performance Requirements

- **Frontend Framework**: React (latest stable version).
- **Rendering**: Preferably HTML5 Canvas for efficient performance.
- **Physics Engine**: Custom-built lightweight 2D physics (no external libraries like Matter.js).
- **Frame Rate Target**: Maintain smooth **60 FPS** performance.
- **Responsiveness**: Fully responsive design supporting both desktop and mobile devices.

---

# Deliverable

An interactive, responsive webpage where users can throw avatar bubbles through a split-screen layout, leverage realistic 2D physics and gravity to aim for a moving Trash Can, and experience rewarding animations and sounds for successful shots.
