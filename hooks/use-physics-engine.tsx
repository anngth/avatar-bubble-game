"use client";

import type React from "react";

import { useEffect, useRef } from "react";
import { avatars } from "@/lib/constants";

// Types
interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  avatarName: string;
  img: HTMLImageElement | null;
  fallingIntoTrash?: boolean;
  stationaryTime?: number;
  disappearing?: boolean;
  disappearProgress?: number;
}

interface TrashCan {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: number;
  speed: number;
  jumping: boolean;
  jumpHeight: number;
  jumpProgress: number;
}

interface PhysicsEngineProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  dimensions: { width: number; height: number };
  onScore: (avatarName: string) => void;
}

export function usePhysicsEngine({
  canvasRef,
  dimensions,
  onScore,
}: PhysicsEngineProps) {
  const bubblesRef = useRef<Bubble[]>([]);
  // Store onScore in a ref so the animation loop never needs to re-run when the callback changes
  const onScoreRef = useRef(onScore);
  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);
  const nextIdRef = useRef(1);
  const animationFrameRef = useRef<number | null>(null);
  const draggedBubbleRef = useRef<number | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const velocityHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const avatarImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const defaultAvatarRef = useRef<HTMLImageElement | null>(null);
  const trashCanRef = useRef<TrashCan>({
    x: 0,
    y: 0,
    width: 75, // Width at the top of the trash can
    height: 100,
    direction: 1,
    speed: 1.5, // Slightly faster movement
    jumping: false,
    jumpHeight: 20,
    jumpProgress: 0,
  });

  // We'll draw the trash can directly instead of loading an image
  const trashCanImageRef = useRef<HTMLImageElement | null>(null);

  // ── Slingshot ──────────────────────────────────────────────────────────────
  // Anchors are placed in the left zone, far enough from the divider so a
  // bubble (radius 25) can pass between anchor and divider comfortably.
  // Positions are expressed as ratios so they scale with canvas size.
  const SLING_ANCHOR_X_RATIO = 0.08; // upper anchor X: 8% from left
  const SLING_ANCHOR_A_Y_RATIO = 0.2; // upper anchor at 20% height
  const SLING_ANCHOR_B_X_RATIO = 0.38; // lower anchor X: 38% from left
  const SLING_ANCHOR_B_Y_RATIO = 0.8; // lower anchor at 80% height
  const SLING_MAX_STRETCH = 100; // px — max pull distance
  const SLING_MIN_STRETCH = 10; // px — minimum to trigger launch
  const SLING_POWER = 0.55; // velocity multiplier per px of stretch

  // Runtime slingshot state (not React state — lives in refs for animation loop)
  const slingshotRef = useRef<{
    anchorA: { x: number; y: number };
    anchorB: { x: number; y: number };
    activeBubbleId: number | null;
    pullPoint: { x: number; y: number } | null;
    // Band deformation when a free-flying bubble hits the band
    deform: {
      active: boolean;
      contactY: number; // Y position along the band where bubble hit
      depth: number; // current deformation depth (px, grows then shrinks)
      maxDepth: number; // peak depth reached
      phase: "pressing" | "rebounding" | "idle";
      bubbleId: number | null;
    };
  }>({
    anchorA: { x: 0, y: 0 },
    anchorB: { x: 0, y: 0 },
    activeBubbleId: null,
    pullPoint: null,
    deform: {
      active: false,
      contactY: 0,
      depth: 0,
      maxDepth: 0,
      phase: "idle",
      bubbleId: null,
    },
  });
  // Which anchor peg is being repositioned by the user: null | 'A' | 'B'
  const draggingAnchorRef = useRef<"A" | "B" | null>(null);
  // ──────────────────────────────────────────────────────────────────────────

  const BUBBLE_RADIUS = 25; // 50px diameter
  const DIVIDER_X_RATIO = 0.5; // Position at 50% of the canvas width
  const GRAVITY = 0.2;
  const AIR_RESISTANCE = 0.99;
  const ANGULAR_DAMPING = 0.98;
  const MAX_VELOCITY = 15;
  const MAX_ANGULAR_VELOCITY = 0.2;
  const DIVIDER_PASSABLE_THRESHOLD = 5; // Minimum velocity to pass through the top half of the divider
  const STATIONARY_THRESHOLD = 0.5; // Speed below which a bubble is considered stationary
  const STATIONARY_TIME_LIMIT = 60; // Frames to wait before starting disappear animation
  const DISAPPEAR_DURATION = 60; // Frames the disappear animation takes

  // Load images
  useEffect(() => {
    // Load avatar images
    const loadedImages: Record<string, HTMLImageElement> = {};

    avatars.forEach((avatar) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        loadedImages[avatar.name] = img;
        avatarImagesRef.current = {
          ...avatarImagesRef.current,
          ...loadedImages,
        };
      };
      img.onerror = () => {
        console.error(`Failed to load image for ${avatar.name}`);
      };
      img.src = avatar.src;
    });

    // Load default avatar
    const defaultImg = new Image();
    defaultImg.crossOrigin = "anonymous";
    defaultImg.onload = () => {
      defaultAvatarRef.current = defaultImg;
    };
    defaultImg.onerror = () => {
      console.error("Failed to load default avatar image");
    };
    defaultImg.src = "/placeholder.svg?height=50&width=50"; // Changed to match new bubble size
  }, []);

  // Initialize and start animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update trash can position based on dimensions
    trashCanRef.current = {
      ...trashCanRef.current,
      x: dimensions.width * 0.75,
      y: dimensions.height,
    };

    // Update slingshot anchor positions based on canvas size
    slingshotRef.current.anchorA = {
      x: dimensions.width * SLING_ANCHOR_X_RATIO,
      y: dimensions.height * SLING_ANCHOR_A_Y_RATIO,
    };
    slingshotRef.current.anchorB = {
      x: dimensions.width * SLING_ANCHOR_B_X_RATIO,
      y: dimensions.height * SLING_ANCHOR_B_Y_RATIO,
    };

    // Animation loop
    const animate = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw divider
      const dividerX = dimensions.width * DIVIDER_X_RATIO;
      // Divider: top 1/4 = passable (thin dashed line), bottom 3/4 = solid (thick wall)
      const dividerSolidY = dimensions.height / 4; // solid part starts at 1/4 from top

      // --- Solid wall (bottom 3/4) ---
      // Background fill with subtle red tint
      ctx.fillStyle = "rgba(180, 60, 60, 0.15)";
      ctx.fillRect(
        dividerX - 8,
        dividerSolidY,
        16,
        dimensions.height - dividerSolidY,
      );
      // Main wall body
      ctx.fillStyle = "#666";
      ctx.fillRect(
        dividerX - 6,
        dividerSolidY,
        12,
        dimensions.height - dividerSolidY,
      );
      // Left highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(
        dividerX - 6,
        dividerSolidY,
        3,
        dimensions.height - dividerSolidY,
      );
      // Right shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(
        dividerX + 3,
        dividerSolidY,
        3,
        dimensions.height - dividerSolidY,
      );
      // Outline
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        dividerX - 6,
        dividerSolidY,
        12,
        dimensions.height - dividerSolidY,
      );
      // Top cap of wall (junction line)
      ctx.fillStyle = "#888";
      ctx.fillRect(dividerX - 8, dividerSolidY - 3, 16, 3);

      // --- Passable gap (top 1/4) ---
      // Subtle green tint background to hint "passable"
      ctx.fillStyle = "rgba(80, 200, 120, 0.08)";
      ctx.fillRect(dividerX - 8, 0, 16, dividerSolidY);
      // Thin dashed center line
      ctx.beginPath();
      ctx.setLineDash([5, 7]);
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX, dividerSolidY - 3);
      ctx.strokeStyle = "rgba(120, 220, 150, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrow pointing right at the middle of the gap to hint "throw here"
      const arrowY = dividerSolidY / 2;
      ctx.beginPath();
      ctx.moveTo(dividerX - 5, arrowY - 5);
      ctx.lineTo(dividerX + 5, arrowY);
      ctx.lineTo(dividerX - 5, arrowY + 5);
      ctx.strokeStyle = "rgba(120, 220, 150, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();

      // Update trash can position
      const trashCan = trashCanRef.current;

      // ── Draw slingshot ────────────────────────────────────────────────────
      const sling = slingshotRef.current;
      const sA = sling.anchorA;
      const sB = sling.anchorB;
      const pull = sling.pullPoint;

      // The tip of the V when avatar is being pulled into the band
      // When not pulling: band is a straight line A→B (no tip needed)
      const tip = pull ? { x: Math.min(pull.x, sA.x), y: pull.y } : null;

      // Compute stretch for visual feedback (only when pulling)
      const stretchDist = tip
        ? Math.sqrt((tip.x - sA.x) ** 2 + (tip.y - (sA.y + sB.y) / 2) ** 2)
        : 0;
      const stretchRatio = Math.min(stretchDist / SLING_MAX_STRETCH, 1);

      // Band color: green → yellow → red as stretch increases
      const r = Math.round(stretchRatio * 220);
      const g = Math.round((1 - stretchRatio) * 180 + 60);
      const bandColor = `rgb(${r},${g},40)`;

      // Draw band
      const deform = sling.deform;
      ctx.save();
      ctx.lineWidth = 3 + stretchRatio * 3;
      ctx.strokeStyle = bandColor;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      if (tip) {
        // Avatar being pulled: V shape — A → pullPoint → B
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.lineTo(sB.x, sB.y);
      } else if (
        deform.active &&
        deform.depth > 0.5 &&
        sling.activeBubbleId === null
      ) {
        // Free-flying bubble pressing into band: show dent
        const bandTotalY = sB.y - sA.y;
        const tContact =
          bandTotalY > 0
            ? Math.max(0, Math.min(1, (deform.contactY - sA.y) / bandTotalY))
            : 0.5;
        const contactX = sA.x + tContact * (sB.x - sA.x);
        const contactY = sA.y + tContact * (sB.y - sA.y);
        const dentX = contactX + deform.depth;
        const dentY = contactY;

        ctx.moveTo(sA.x, sA.y);
        ctx.quadraticCurveTo(
          contactX + deform.depth * 0.5,
          contactY - 15,
          dentX,
          dentY,
        );
        ctx.quadraticCurveTo(
          contactX + deform.depth * 0.5,
          contactY + 15,
          sB.x,
          sB.y,
        );
      } else {
        // Default: straight line A → B
        ctx.moveTo(sA.x, sA.y);
        ctx.lineTo(sB.x, sB.y);
      }
      ctx.stroke();

      // Draw anchor pegs
      [sA, sB].forEach((anchor, idx) => {
        const isBeingDragged =
          (idx === 0 && draggingAnchorRef.current === "A") ||
          (idx === 1 && draggingAnchorRef.current === "B");

        // Outer glow ring to hint draggability
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, isBeingDragged ? 11 : 9, 0, Math.PI * 2);
        ctx.fillStyle = isBeingDragged
          ? "rgba(255, 200, 80, 0.35)"
          : "rgba(255, 255, 255, 0.15)";
        ctx.fill();

        // Peg body
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = isBeingDragged ? "#f5a623" : "#8B4513";
        ctx.fill();
        ctx.strokeStyle = isBeingDragged ? "#c07000" : "#5C2D0A";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
      });

      ctx.restore();
      // ─────────────────────────────────────────────────────────────────────

      // Move trash can horizontally
      trashCan.x += trashCan.speed * trashCan.direction;

      // Handle trash can jumping animation
      let trashCanY = trashCan.y;
      if (trashCan.jumping) {
        trashCan.jumpProgress += 0.1;
        if (trashCan.jumpProgress >= Math.PI) {
          trashCan.jumping = false;
          trashCan.jumpProgress = 0;
        } else {
          trashCanY -= Math.sin(trashCan.jumpProgress) * trashCan.jumpHeight;
        }
      }

      // Bounce off edges within the right zone
      if (trashCan.x <= dividerX + trashCan.width / 2) {
        trashCan.x = dividerX + trashCan.width / 2;
        trashCan.direction = 1;
      } else if (trashCan.x >= dimensions.width - trashCan.width / 2) {
        trashCan.x = dimensions.width - trashCan.width / 2;
        trashCan.direction = -1;
      }

      // Draw trash can directly
      drawTrashCan(
        ctx,
        trashCan.x - trashCan.width / 2,
        trashCanY,
        trashCan.width,
        trashCan.height,
      );

      // Update and draw bubbles
      const updatedBubbles = [...bubblesRef.current];

      for (let i = 0; i < updatedBubbles.length; i++) {
        const bubble = updatedBubbles[i];

        // Skip physics update if being dragged
        if (draggedBubbleRef.current === bubble.id) continue;

        // Check if bubble is directly above the trash can and fits its width
        if (
          !bubble.fallingIntoTrash &&
          bubble.x > dividerX &&
          Math.abs(bubble.x - trashCan.x) <
            trashCan.width / 2 - bubble.radius &&
          bubble.y + bubble.radius < trashCanY - trashCan.height * 0.9 &&
          bubble.y + bubble.radius > trashCanY - trashCan.height * 0.9 - 50
        ) {
          // Mark the bubble as falling into the trash
          bubble.fallingIntoTrash = true;
          bubble.vx = 0;
          bubble.vy = 5; // Set a downward velocity
        }

        // Special handling for bubbles falling into trash
        if (bubble.fallingIntoTrash) {
          // Move bubble directly toward trash can center
          const targetX = trashCan.x;
          bubble.x = bubble.x + (targetX - bubble.x) * 0.1;
          bubble.y += 5; // Fall faster than normal gravity

          // Check if bubble has fallen deep enough into the trash can
          if (bubble.y > trashCanY - trashCan.height * 0.5) {
            // Score! Remove the bubble
            const avatarName = bubble.avatarName;
            updatedBubbles.splice(i, 1);
            i--;

            // Trigger score callback and trash can jump
            onScoreRef.current(avatarName);
            trashCanRef.current.jumping = true;
            trashCanRef.current.jumpProgress = 0;
            continue;
          }
        } else {
          // Apply gravity — full gravity in right zone, none in left zone
          // Use a smooth transition within 30px of the divider to avoid sudden acceleration
          if (bubble.x > dividerX) {
            bubble.vy += GRAVITY;
          } else if (bubble.x > dividerX - 30) {
            const t = (bubble.x - (dividerX - 30)) / 30; // 0 → 1 as bubble approaches divider
            bubble.vy += GRAVITY * t;
          }

          // Check if bubble is stationary in the right zone
          if (bubble.x > dividerX && !bubble.fallingIntoTrash) {
            const speed = Math.sqrt(
              bubble.vx * bubble.vx + bubble.vy * bubble.vy,
            );

            // If bubble is on the ground and nearly stationary
            if (
              bubble.y + bubble.radius >= dimensions.height - 2 &&
              speed < STATIONARY_THRESHOLD
            ) {
              // Initialize or increment stationary time
              bubble.stationaryTime = (bubble.stationaryTime || 0) + 1;
              // If stationary for long enough, start disappearing
              if (
                bubble.stationaryTime > STATIONARY_TIME_LIMIT &&
                !bubble.disappearing
              ) {
                bubble.disappearing = true;
                bubble.disappearProgress = 0;
              }
            } else {
              // Reset stationary time if moving
              bubble.stationaryTime = 0;
            }

            // Handle disappearing animation
            if (bubble.disappearing) {
              bubble.disappearProgress = (bubble.disappearProgress || 0) + 1;

              // Remove bubble when animation completes
              if (bubble.disappearProgress >= DISAPPEAR_DURATION) {
                updatedBubbles.splice(i, 1);
                i--;
                continue;
              }
            }
          }

          // Apply air resistance
          bubble.vx *= AIR_RESISTANCE;
          bubble.vy *= AIR_RESISTANCE;
          bubble.angularVelocity *= ANGULAR_DAMPING;

          // Cap velocities
          const speed = Math.sqrt(
            bubble.vx * bubble.vx + bubble.vy * bubble.vy,
          );
          if (speed > MAX_VELOCITY) {
            const ratio = MAX_VELOCITY / speed;
            bubble.vx *= ratio;
            bubble.vy *= ratio;
          }

          if (Math.abs(bubble.angularVelocity) > MAX_ANGULAR_VELOCITY) {
            bubble.angularVelocity =
              Math.sign(bubble.angularVelocity) * MAX_ANGULAR_VELOCITY;
          }

          // Update position
          bubble.x += bubble.vx;
          bubble.y += bubble.vy;
          bubble.rotation += bubble.angularVelocity;

          // Check for collision with divider
          if (
            (bubble.x - bubble.radius < dividerX &&
              bubble.x + bubble.radius > dividerX) ||
            (bubble.x + bubble.radius > dividerX &&
              bubble.x - bubble.radius < dividerX)
          ) {
            // Bottom 3/4 = solid wall
            if (bubble.y > dimensions.height / 4) {
              // Solid collision with divider
              if (bubble.x < dividerX) {
                bubble.x = dividerX - bubble.radius;
                bubble.vx = -Math.abs(bubble.vx) * 0.8;
                bubble.angularVelocity += bubble.vy * 0.01;
              } else {
                bubble.x = dividerX + bubble.radius;
                bubble.vx = Math.abs(bubble.vx) * 0.8;
                bubble.angularVelocity -= bubble.vy * 0.01;
              }
            }
            // Top 1/4 = passable with sufficient velocity
            else {
              const horizontalSpeed = Math.abs(bubble.vx);
              if (horizontalSpeed < DIVIDER_PASSABLE_THRESHOLD) {
                // Not enough speed to pass through
                if (bubble.x < dividerX) {
                  bubble.x = dividerX - bubble.radius;
                  bubble.vx = -Math.abs(bubble.vx) * 0.8;
                  bubble.angularVelocity += bubble.vy * 0.01;
                } else {
                  bubble.x = dividerX + bubble.radius;
                  bubble.vx = Math.abs(bubble.vx) * 0.8;
                  bubble.angularVelocity -= bubble.vy * 0.01;
                }
              }
              // Else: enough speed to pass through, do nothing
            }
          }

          // Check for collision with walls — right zone bubbles are bounded by dividerX on left
          if (bubble.x > dividerX) {
            // Left boundary for right-zone bubbles is the divider
            if (bubble.x - bubble.radius < dividerX) {
              bubble.x = dividerX + bubble.radius;
              bubble.vx = Math.abs(bubble.vx) * 0.8;
              bubble.angularVelocity -= bubble.vy * 0.01;
            } else if (bubble.x + bubble.radius > dimensions.width) {
              bubble.x = dimensions.width - bubble.radius;
              bubble.vx = -Math.abs(bubble.vx) * 0.8;
              bubble.angularVelocity += bubble.vy * 0.01;
            }
          } else {
            // Left zone: bounded by left wall and divider
            if (bubble.x - bubble.radius < 0) {
              bubble.x = bubble.radius;
              bubble.vx = Math.abs(bubble.vx) * 0.8;
              bubble.angularVelocity -= bubble.vy * 0.01;
            } else if (bubble.x + bubble.radius > dimensions.width) {
              bubble.x = dimensions.width - bubble.radius;
              bubble.vx = -Math.abs(bubble.vx) * 0.8;
              bubble.angularVelocity += bubble.vy * 0.01;
            }
          }

          if (bubble.y - bubble.radius < 0) {
            bubble.y = bubble.radius;
            bubble.vy = Math.abs(bubble.vy) * 0.8;
            bubble.angularVelocity -= bubble.vx * 0.01;
          } else if (bubble.y + bubble.radius > dimensions.height) {
            bubble.y = dimensions.height - bubble.radius;
            bubble.vy = -Math.abs(bubble.vy) * 0.8;
            bubble.angularVelocity += bubble.vx * 0.01;
          }

          // ── Slingshot band bounce with elastic deformation ────────────────
          if (sling.activeBubbleId !== bubble.id) {
            const bA = sling.anchorA;
            const bB = sling.anchorB;
            const deform = sling.deform;

            // Band vector and length
            const bandDx = bB.x - bA.x;
            const bandDy = bB.y - bA.y;
            const bandLen = Math.sqrt(bandDx * bandDx + bandDy * bandDy);

            // Unit normal pointing RIGHT (toward play area)
            const nx = -bandDy / bandLen;
            const ny = bandDx / bandLen;
            const normalX = nx > 0 ? nx : -nx;
            const normalY = nx > 0 ? ny : -ny;

            // Project bubble onto band segment
            const toDx = bubble.x - bA.x;
            const toDy = bubble.y - bA.y;
            const t = Math.max(
              0,
              Math.min(
                1,
                (toDx * bandDx + toDy * bandDy) / (bandLen * bandLen),
              ),
            );
            const closestX = bA.x + t * bandDx;
            const closestY = bA.y + t * bandDy;
            const distToBand = Math.sqrt(
              (bubble.x - closestX) ** 2 + (bubble.y - closestY) ** 2,
            );

            const dot = bubble.vx * normalX + bubble.vy * normalY;

            if (distToBand < bubble.radius && dot < 0) {
              // ── Start or continue pressing phase ──
              if (deform.phase === "idle" || deform.bubbleId !== bubble.id) {
                // New contact: record where on the band the bubble hit
                deform.active = true;
                deform.phase = "pressing";
                deform.contactY = closestY;
                deform.depth = 0;
                deform.maxDepth = 0;
                deform.bubbleId = bubble.id;
              }

              if (deform.phase === "pressing") {
                // Accumulate deformation depth proportional to incoming speed
                const incomingSpeed = Math.abs(dot);
                deform.depth = Math.min(deform.depth + incomingSpeed * 0.6, 40);
                deform.maxDepth = Math.max(deform.maxDepth, deform.depth);

                // Hold bubble at band surface while pressing
                bubble.x = closestX + normalX * bubble.radius;
                bubble.y = closestY + normalY * bubble.radius;
                // Absorb velocity into deformation (slow bubble down)
                bubble.vx *= 0.6;
                bubble.vy *= 0.6;

                // Transition to rebounding when bubble nearly stops against band
                const speed = Math.sqrt(bubble.vx ** 2 + bubble.vy ** 2);
                if (speed < 1.5) {
                  deform.phase = "rebounding";
                }
              }
            } else if (
              deform.phase === "rebounding" &&
              deform.bubbleId === bubble.id
            ) {
              // ── Rebound: band snaps back, launching bubble ──
              const restitution = 0.9; // elastic band returns most energy
              const launchSpeed = deform.maxDepth * restitution * 0.35;

              // Launch direction = band normal (rightward)
              bubble.vx = normalX * launchSpeed;
              bubble.vy = normalY * launchSpeed;
              bubble.angularVelocity = (normalX - normalY) * 0.05;

              // Reset deformation
              deform.phase = "idle";
              deform.active = false;
              deform.depth = 0;
              deform.maxDepth = 0;
              deform.bubbleId = null;
            } else if (
              deform.bubbleId === bubble.id &&
              distToBand >= bubble.radius
            ) {
              // Bubble has left the band area — reset if idle
              if (deform.phase === "pressing") {
                // Released before full press — small bounce
                deform.phase = "rebounding";
              }
            }
          }

          // ── Animate band deformation decay (runs every frame) ─────────────
          if (sling.deform.phase === "idle" && sling.deform.depth > 0) {
            sling.deform.depth *= 0.85; // spring back
            if (sling.deform.depth < 0.5) {
              sling.deform.depth = 0;
              sling.deform.active = false;
            }
          }
          // ─────────────────────────────────────────────────────────────────

          // Check for collision with trash can - using the tapered shape
          // We need to check collision with the trapezoidal shape
          if (
            bubble.x > dividerX &&
            bubble.y > trashCanY - trashCan.height * 0.9 - bubble.radius
          ) {
            // Calculate the width at the current y-level (tapered shape)
            const heightFromBottom = trashCanY - bubble.y;
            const widthRatio = heightFromBottom / (trashCan.height * 0.9);
            const bottomWidth = trashCan.width * 0.7; // Bottom is 70% of top width
            const currentWidth =
              bottomWidth + (trashCan.width - bottomWidth) * widthRatio;

            // Calculate left and right edges at current y-level
            const leftEdge = trashCan.x - currentWidth / 2;
            const rightEdge = trashCan.x + currentWidth / 2;

            // Check if bubble is above the trash can opening
            if (
              !bubble.fallingIntoTrash &&
              bubble.x > leftEdge + bubble.radius * 0.3 &&
              bubble.x < rightEdge - bubble.radius * 0.3 &&
              bubble.y < trashCanY - trashCan.height * 0.9 + bubble.radius &&
              bubble.y > trashCanY - trashCan.height * 0.9 - bubble.radius
            ) {
              // Mark as falling into trash
              bubble.fallingIntoTrash = true;
              bubble.vx = 0;
              continue;
            }

            // Check for collision with the trash can sides
            if (
              bubble.x > leftEdge - bubble.radius &&
              bubble.x < rightEdge + bubble.radius
            ) {
              if (bubble.x < trashCan.x) {
                // Left side of trash can — push bubble left
                const newX = leftEdge - bubble.radius;

                // If pushing bubble would cross the divider, no room left → disappear
                if (newX < dividerX + bubble.radius) {
                  if (!bubble.disappearing) {
                    bubble.disappearing = true;
                    bubble.disappearProgress = 0;
                  }
                } else {
                  bubble.x = newX;
                  bubble.vx = -Math.abs(bubble.vx) * 0.8;
                  bubble.angularVelocity += bubble.vy * 0.01;
                }
              } else {
                // Right side of trash can — push bubble right
                const newX = rightEdge + bubble.radius;

                // If pushing bubble would go past the right wall, no room left → disappear
                if (newX > dimensions.width - bubble.radius) {
                  if (!bubble.disappearing) {
                    bubble.disappearing = true;
                    bubble.disappearProgress = 0;
                  }
                } else {
                  bubble.x = newX;
                  bubble.vx = Math.abs(bubble.vx) * 0.8;
                  bubble.angularVelocity -= bubble.vy * 0.01;
                }
              }
            }
          }
        }
      }

      // Check for collisions between bubbles
      for (let i = 0; i < updatedBubbles.length; i++) {
        const bubbleA = updatedBubbles[i];
        if (bubbleA.fallingIntoTrash) continue;

        const aIsDragged = draggedBubbleRef.current === bubbleA.id;

        for (let j = i + 1; j < updatedBubbles.length; j++) {
          const bubbleB = updatedBubbles[j];
          if (bubbleB.fallingIntoTrash) continue;

          const bIsDragged = draggedBubbleRef.current === bubbleB.id;

          const dx = bubbleB.x - bubbleA.x;
          const dy = bubbleB.y - bubbleA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = bubbleA.radius + bubbleB.radius;

          if (distance < minDistance && distance > 0) {
            const angle = Math.atan2(dy, dx);
            const overlap = minDistance - distance;

            if (aIsDragged && !bIsDragged) {
              // A is dragged: only push B away, A stays put
              bubbleB.x += Math.cos(angle) * overlap;
              bubbleB.y += Math.sin(angle) * overlap;
              // Give B a velocity from the push
              bubbleB.vx += Math.cos(angle) * overlap * 0.3;
              bubbleB.vy += Math.sin(angle) * overlap * 0.3;
            } else if (bIsDragged && !aIsDragged) {
              // B is dragged: only push A away, B stays put
              bubbleA.x -= Math.cos(angle) * overlap;
              bubbleA.y -= Math.sin(angle) * overlap;
              bubbleA.vx -= Math.cos(angle) * overlap * 0.3;
              bubbleA.vy -= Math.sin(angle) * overlap * 0.3;
            } else if (!aIsDragged && !bIsDragged) {
              // Neither dragged: normal elastic collision
              const targetX = bubbleA.x + Math.cos(angle) * minDistance;
              const targetY = bubbleA.y + Math.sin(angle) * minDistance;

              const ax = (targetX - bubbleB.x) * 0.05;
              const ay = (targetY - bubbleB.y) * 0.05;
              bubbleA.x -= ax;
              bubbleA.y -= ay;
              bubbleB.x += ax;
              bubbleB.y += ay;

              const v1 = Math.sqrt(
                bubbleA.vx * bubbleA.vx + bubbleA.vy * bubbleA.vy,
              );
              const v2 = Math.sqrt(
                bubbleB.vx * bubbleB.vx + bubbleB.vy * bubbleB.vy,
              );
              const dir1 = Math.atan2(bubbleA.vy, bubbleA.vx);
              const dir2 = Math.atan2(bubbleB.vy, bubbleB.vx);

              const vx1 = v1 * Math.cos(dir1 - angle);
              const vy1 = v1 * Math.sin(dir1 - angle);
              const vx2 = v2 * Math.cos(dir2 - angle);
              const vy2 = v2 * Math.sin(dir2 - angle);

              bubbleA.vx = Math.cos(angle) * vx2 - Math.sin(angle) * vy1;
              bubbleA.vy = Math.sin(angle) * vx2 + Math.cos(angle) * vy1;
              bubbleB.vx = Math.cos(angle) * vx1 - Math.sin(angle) * vy2;
              bubbleB.vy = Math.sin(angle) * vx1 + Math.cos(angle) * vy2;

              const impactForce = Math.abs(vx1 - vx2) + Math.abs(vy1 - vy2);
              bubbleA.angularVelocity +=
                (Math.random() * 2 - 1) * impactForce * 0.01;
              bubbleB.angularVelocity +=
                (Math.random() * 2 - 1) * impactForce * 0.01;
            }
            // Both dragged: skip (shouldn't happen, only one drag at a time)
          }
        }
      }

      // Draw bubbles
      for (const bubble of updatedBubbles) {
        ctx.save();
        ctx.translate(bubble.x, bubble.y);

        // Apply disappearing animation if needed
        if (bubble.disappearing) {
          const progress = (bubble.disappearProgress || 0) / DISAPPEAR_DURATION;
          const translateY = progress * 50; // Move down by 50px
          const opacity = 1 - progress; // Fade out

          // Apply translation for disappearing effect
          ctx.translate(0, translateY);
          ctx.globalAlpha = opacity;
        }

        ctx.rotate(bubble.rotation);

        // Draw circular clip for the avatar
        ctx.beginPath();
        ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
        ctx.clip();

        // Update the bubble's image reference if needed
        if (!bubble.img && avatarImagesRef.current[bubble.avatarName]) {
          bubble.img = avatarImagesRef.current[bubble.avatarName];
        }

        // Draw avatar image or placeholder
        if (
          bubble.img &&
          bubble.img.complete &&
          bubble.img.naturalHeight !== 0
        ) {
          try {
            ctx.drawImage(
              bubble.img,
              -bubble.radius,
              -bubble.radius,
              bubble.radius * 2,
              bubble.radius * 2,
            );
          } catch (error) {
            console.error("Error drawing image:", error);
            // Fallback to a colored circle
            ctx.fillStyle = getColorForAvatar(bubble.avatarName);
            ctx.fill();
          }
        } else if (
          defaultAvatarRef.current &&
          defaultAvatarRef.current.complete &&
          defaultAvatarRef.current.naturalHeight !== 0
        ) {
          try {
            ctx.drawImage(
              defaultAvatarRef.current,
              -bubble.radius,
              -bubble.radius,
              bubble.radius * 2,
              bubble.radius * 2,
            );
          } catch (error) {
            console.error("Error drawing default image:", error);
            // Fallback to a colored circle
            ctx.fillStyle = getColorForAvatar(bubble.avatarName);
            ctx.fill();
          }
        } else {
          // Fallback to a colored circle if no image is available
          ctx.fillStyle = getColorForAvatar(bubble.avatarName);
          ctx.fill();
        }

        // Draw bubble border
        ctx.beginPath();
        ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
        ctx.strokeStyle = bubble.fallingIntoTrash
          ? "rgba(255, 255, 0, 0.7)"
          : "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = bubble.fallingIntoTrash ? 4 : 3;
        ctx.stroke();

        ctx.restore();
      }

      // Update reference
      bubblesRef.current = updatedBubbles;

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions]);

  // Function to draw the trash can directly on the canvas
  const drawTrashCan = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const topWidth = width;
    const bottomWidth = width * 0.7; // Bottom is 70% of top width
    const canHeight = height * 0.9;

    // Calculate coordinates for the tapered trash can
    const topLeft = { x: x, y: y - canHeight };
    const topRight = { x: x + topWidth, y: y - canHeight };
    const bottomLeft = { x: x + (topWidth - bottomWidth) / 2, y: y };
    const bottomRight = { x: bottomLeft.x + bottomWidth, y: y };

    // Draw the tapered trash can body
    ctx.fillStyle = "#555555";
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.fill();

    // Draw the trash can outline
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // Draw horizontal lines for detail
    ctx.strokeStyle = "#444444";
    ctx.lineWidth = 1.5;

    // Top rim
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y + 5);
    ctx.lineTo(topRight.x, topRight.y + 5);
    ctx.stroke();

    // Middle line
    const midY = y - canHeight / 2;
    const midWidth = bottomWidth + (topWidth - bottomWidth) / 2;
    const midLeft = x + (topWidth - midWidth) / 2;
    ctx.beginPath();
    ctx.moveTo(midLeft, midY);
    ctx.lineTo(midLeft + midWidth, midY);
    ctx.stroke();

    // Bottom line
    ctx.beginPath();
    ctx.moveTo(bottomLeft.x + 5, bottomLeft.y - 15);
    ctx.lineTo(bottomRight.x - 5, bottomRight.y - 15);
    ctx.stroke();

    // Draw vertical lines for texture
    const verticalLines = 3;
    for (let i = 1; i < verticalLines; i++) {
      const ratio = i / verticalLines;
      const topX = topLeft.x + topWidth * ratio;
      const bottomX = bottomLeft.x + bottomWidth * ratio;

      ctx.beginPath();
      ctx.moveTo(topX, topLeft.y + 10);
      ctx.lineTo(bottomX, bottomLeft.y - 10);
      ctx.stroke();
    }

    // Draw a subtle highlight to indicate the trash can is ready to receive bubbles
    const anyBubblesAbove = bubblesRef.current.some(
      (bubble) =>
        !bubble.fallingIntoTrash &&
        bubble.x > topLeft.x &&
        bubble.x < topRight.x &&
        bubble.y + bubble.radius < topLeft.y &&
        bubble.y + bubble.radius > topLeft.y - 50,
    );

    if (anyBubblesAbove) {
      ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
      ctx.beginPath();
      ctx.moveTo(topLeft.x, topLeft.y);
      ctx.lineTo(topRight.x, topRight.y);
      ctx.lineTo(topRight.x, topRight.y + 10);
      ctx.lineTo(topLeft.x, topLeft.y + 10);
      ctx.closePath();
      ctx.fill();
    }
  };

  const getColorForAvatar = (name: string): string => {
    const colors: Record<string, string> = {
      Tèo: "#FF5733",
      Tí: "#33FF57",
      Chúc: "#3357FF",
      Dũ: "#F033FF",
      Dém: "#FF9933",
    };
    return colors[name] || "#CCCCCC";
  };

  // Add a new bubble
  const addBubble = (avatarName: string) => {
    const dividerX = dimensions.width * DIVIDER_X_RATIO;
    const newBubble: Bubble = {
      id: nextIdRef.current++,
      x: Math.random() * (dividerX - BUBBLE_RADIUS * 2) + BUBBLE_RADIUS,
      y:
        Math.random() * (dimensions.height - BUBBLE_RADIUS * 2) + BUBBLE_RADIUS,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: BUBBLE_RADIUS,
      rotation: 0,
      angularVelocity: 0,
      avatarName,
      img: null, // Start with null, we'll update it in the render loop
    };

    bubblesRef.current = [...bubblesRef.current, newBubble];
  };

  // Start dragging a bubble or an anchor peg
  const startDrag = (x: number, y: number) => {
    const dividerX = dimensions.width * DIVIDER_X_RATIO;
    const sling = slingshotRef.current;
    const ANCHOR_HIT_RADIUS = 14; // px — generous hit area for the peg

    // Only allow interactions in the left zone
    if (x > dividerX) return;

    // ── Check anchor pegs first (higher priority than bubbles) ──
    const distA = Math.sqrt(
      (x - sling.anchorA.x) ** 2 + (y - sling.anchorA.y) ** 2,
    );
    const distB = Math.sqrt(
      (x - sling.anchorB.x) ** 2 + (y - sling.anchorB.y) ** 2,
    );

    if (distA <= ANCHOR_HIT_RADIUS) {
      draggingAnchorRef.current = "A";
      return;
    }
    if (distB <= ANCHOR_HIT_RADIUS) {
      draggingAnchorRef.current = "B";
      return;
    }

    // ── Otherwise find a bubble ──
    for (let i = bubblesRef.current.length - 1; i >= 0; i--) {
      const bubble = bubblesRef.current[i];
      const dx = x - bubble.x;
      const dy = y - bubble.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= bubble.radius) {
        draggedBubbleRef.current = bubble.id;
        dragStartPosRef.current = { x, y };
        lastMousePosRef.current = { x, y };
        velocityHistoryRef.current = [];
        return;
      }
    }
  };

  // Update dragging position
  const updateDrag = (x: number, y: number) => {
    const dividerX = dimensions.width * DIVIDER_X_RATIO;
    const sling = slingshotRef.current;

    // ── Anchor peg repositioning ──────────────────────────────────────────
    if (draggingAnchorRef.current !== null) {
      // Constrain anchor to left zone only, with margin so bubble can pass
      const clampedX = Math.max(
        BUBBLE_RADIUS + 10,
        Math.min(dividerX - BUBBLE_RADIUS * 2 - 10, x),
      );
      const clampedY = Math.max(
        BUBBLE_RADIUS + 10,
        Math.min(dimensions.height - BUBBLE_RADIUS - 10, y),
      );

      if (draggingAnchorRef.current === "A") {
        sling.anchorA = { x: clampedX, y: clampedY };
      } else {
        sling.anchorB = { x: clampedX, y: clampedY };
      }
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    if (draggedBubbleRef.current === null || !lastMousePosRef.current) return;

    const bubbleIndex = bubblesRef.current.findIndex(
      (b) => b.id === draggedBubbleRef.current,
    );
    if (bubbleIndex === -1) return;

    const bubble = bubblesRef.current[bubbleIndex];

    // Track velocity for throw (always, before any early return)
    const vx = x - lastMousePosRef.current.x;
    const vy = y - lastMousePosRef.current.y;
    velocityHistoryRef.current.push({ x: vx, y: vy });
    if (velocityHistoryRef.current.length > 5)
      velocityHistoryRef.current.shift();
    lastMousePosRef.current = { x, y };

    // ── Slingshot zone detection ──────────────────────────────────────────
    // The slingshot pocket opens to the LEFT of the anchors.
    // User drags avatar LEFT past the anchor line to stretch the band.
    // Releasing fires the avatar to the RIGHT (opposite of stretch direction).
    const slingMidX = sling.anchorA.x; // anchors share same X
    const slingMinY =
      Math.min(sling.anchorA.y, sling.anchorB.y) - BUBBLE_RADIUS;
    const slingMaxY =
      Math.max(sling.anchorA.y, sling.anchorB.y) + BUBBLE_RADIUS;

    // Enter slingshot mode when avatar is dragged into the pocket zone
    // (to the left of anchors and between their Y range)
    const inSlingshotZone =
      x <= slingMidX + BUBBLE_RADIUS && y >= slingMinY && y <= slingMaxY;

    if (inSlingshotZone || sling.activeBubbleId === bubble.id) {
      // Clamp: can't stretch further left than maxStretch, can't go past anchor X to the right
      const clampedX = Math.max(
        slingMidX - SLING_MAX_STRETCH,
        Math.min(slingMidX, x),
      );
      const clampedY = Math.max(slingMinY, Math.min(slingMaxY, y));

      sling.activeBubbleId = bubble.id;
      sling.pullPoint = { x: clampedX, y: clampedY };

      bubble.x = clampedX;
      bubble.y = clampedY;
      bubble.vx = 0;
      bubble.vy = 0;
      bubblesRef.current[bubbleIndex] = bubble;
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    // When mouse reaches the divider, release the bubble so physics takes over
    if (x >= dividerX - bubble.radius) {
      let avgVx = 0;
      let avgVy = 0;
      for (const v of velocityHistoryRef.current) {
        avgVx += v.x;
        avgVy += v.y;
      }
      avgVx /= velocityHistoryRef.current.length;
      avgVy /= velocityHistoryRef.current.length;

      const multiplier = 1.5;
      bubble.vx = avgVx * multiplier;
      bubble.vy = avgVy * multiplier;
      bubble.angularVelocity = (avgVx - avgVy) * 0.01;
      bubble.x = dividerX - bubble.radius;
      bubble.y = Math.max(
        bubble.radius,
        Math.min(dimensions.height - bubble.radius, y),
      );

      bubblesRef.current[bubbleIndex] = bubble;
      draggedBubbleRef.current = null;
      dragStartPosRef.current = null;
      lastMousePosRef.current = null;
      velocityHistoryRef.current = [];
      return;
    }

    // Normal drag within left zone
    bubble.x = Math.max(bubble.radius, Math.min(dividerX - bubble.radius, x));
    bubble.y = Math.max(
      bubble.radius,
      Math.min(dimensions.height - bubble.radius, y),
    );
    bubblesRef.current[bubbleIndex] = bubble;
  };

  // End dragging and apply velocity
  const endDrag = () => {
    // ── Release anchor peg ────────────────────────────────────────────────
    if (draggingAnchorRef.current !== null) {
      draggingAnchorRef.current = null;
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    if (draggedBubbleRef.current === null) return;

    const bubbleIndex = bubblesRef.current.findIndex(
      (b) => b.id === draggedBubbleRef.current,
    );
    if (bubbleIndex === -1) {
      draggedBubbleRef.current = null;
      return;
    }

    const bubble = bubblesRef.current[bubbleIndex];
    const sling = slingshotRef.current;

    // ── Slingshot launch ──────────────────────────────────────────────────
    if (sling.activeBubbleId === bubble.id && sling.pullPoint) {
      const pull = sling.pullPoint;
      const anchorMidX = sling.anchorA.x;
      const anchorMidY = (sling.anchorA.y + sling.anchorB.y) / 2;

      // Stretch vector: from pull point back to anchor midpoint
      // pull is to the LEFT of anchor → launchDx is POSITIVE (rightward)
      const launchDx = anchorMidX - pull.x;
      const launchDy = anchorMidY - pull.y;
      const stretchDist = Math.sqrt(launchDx * launchDx + launchDy * launchDy);

      if (stretchDist > SLING_MIN_STRETCH) {
        const speed = Math.min(stretchDist, SLING_MAX_STRETCH) * SLING_POWER;
        bubble.vx = (launchDx / stretchDist) * speed;
        bubble.vy = (launchDy / stretchDist) * speed;
        bubble.angularVelocity = (bubble.vx - bubble.vy) * 0.02;
      }

      // Clear slingshot state
      sling.activeBubbleId = null;
      sling.pullPoint = null;
    } else {
      // Normal throw from velocity history
      if (velocityHistoryRef.current.length > 0) {
        let vx = 0;
        let vy = 0;
        for (const v of velocityHistoryRef.current) {
          vx += v.x;
          vy += v.y;
        }
        vx /= velocityHistoryRef.current.length;
        vy /= velocityHistoryRef.current.length;
        bubble.vx = vx * 1.5;
        bubble.vy = vy * 1.5;
        bubble.angularVelocity = (vx - vy) * 0.01;
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    bubblesRef.current[bubbleIndex] = bubble;
    draggedBubbleRef.current = null;
    dragStartPosRef.current = null;
    lastMousePosRef.current = null;
  };

  // Reset the game
  const reset = () => {
    bubblesRef.current = [];
    draggedBubbleRef.current = null;
    dragStartPosRef.current = null;
    lastMousePosRef.current = null;
    draggingAnchorRef.current = null;
    slingshotRef.current.activeBubbleId = null;
    slingshotRef.current.pullPoint = null;
  };

  return {
    addBubble,
    startDrag,
    updateDrag,
    endDrag,
    reset,
  };
}
