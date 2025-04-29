"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
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
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubblesRef = useRef<Bubble[]>([]);
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
      y: dimensions.height, // Position bottom at canvas edge
    };

    // Animation loop
    const animate = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw divider
      const dividerX = dimensions.width * DIVIDER_X_RATIO;
      ctx.beginPath();
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX, dimensions.height);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw divider solid part (bottom half)
      ctx.beginPath();
      ctx.rect(dividerX - 5, dimensions.height / 2, 10, dimensions.height / 2);
      ctx.fillStyle = "#666";
      ctx.fill();

      // Draw divider passable part (top half)
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX, dimensions.height / 2);
      ctx.strokeStyle = "#888";
      ctx.stroke();
      ctx.setLineDash([]);

      // Update trash can position
      const trashCan = trashCanRef.current;

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
        trashCan.height
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
            onScore(avatarName);
            trashCanRef.current.jumping = true;
            trashCanRef.current.jumpProgress = 0;
            continue;
          }
        } else {
          // Apply gravity in right zone
          if (bubble.x > dividerX) {
            bubble.vy += GRAVITY;
          }

          // Check if bubble is stationary in the right zone
          if (bubble.x > dividerX && !bubble.fallingIntoTrash) {
            const speed = Math.sqrt(
              bubble.vx * bubble.vx + bubble.vy * bubble.vy
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
            bubble.vx * bubble.vx + bubble.vy * bubble.vy
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
            // Check if in bottom half (solid part)
            if (bubble.y > dimensions.height / 2) {
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
            // Top half (passable with sufficient velocity)
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

          // Check for collision with walls
          if (bubble.x - bubble.radius < 0) {
            bubble.x = bubble.radius;
            bubble.vx = Math.abs(bubble.vx) * 0.8;
            bubble.angularVelocity -= bubble.vy * 0.01;
          } else if (bubble.x + bubble.radius > dimensions.width) {
            bubble.x = dimensions.width - bubble.radius;
            bubble.vx = -Math.abs(bubble.vx) * 0.8;
            bubble.angularVelocity += bubble.vy * 0.01;
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
              // Determine which side of the trash can was hit
              if (bubble.x < trashCan.x) {
                // Left collision - calculate exact collision point on the tapered side
                bubble.x = leftEdge - bubble.radius;
                bubble.vx = -Math.abs(bubble.vx) * 0.8;
                bubble.angularVelocity += bubble.vy * 0.01;
              } else {
                // Right collision - calculate exact collision point on the tapered side
                bubble.x = rightEdge + bubble.radius;
                bubble.vx = Math.abs(bubble.vx) * 0.8;
                bubble.angularVelocity -= bubble.vy * 0.01;
              }
            }
          }
        }
      }

      // Check for collisions between bubbles
      for (let i = 0; i < updatedBubbles.length; i++) {
        const bubbleA = updatedBubbles[i];

        // Skip collision checks for bubbles falling into trash
        if (bubbleA.fallingIntoTrash) continue;

        for (let j = i + 1; j < updatedBubbles.length; j++) {
          const bubbleB = updatedBubbles[j];

          // Skip collision checks for bubbles falling into trash
          if (bubbleB.fallingIntoTrash) continue;

          // Skip if either bubble is being dragged
          if (
            draggedBubbleRef.current === bubbleA.id ||
            draggedBubbleRef.current === bubbleB.id
          )
            continue;

          const dx = bubbleB.x - bubbleA.x;
          const dy = bubbleB.y - bubbleA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = bubbleA.radius + bubbleB.radius;

          if (distance < minDistance) {
            // Collision detected
            const angle = Math.atan2(dy, dx);
            const targetX = bubbleA.x + Math.cos(angle) * minDistance;
            const targetY = bubbleA.y + Math.sin(angle) * minDistance;

            // Move bubbles apart to prevent overlapping
            const ax = (targetX - bubbleB.x) * 0.05;
            const ay = (targetY - bubbleB.y) * 0.05;

            bubbleA.x -= ax;
            bubbleA.y -= ay;
            bubbleB.x += ax;
            bubbleB.y += ay;

            // Calculate new velocities (elastic collision)
            const v1 = Math.sqrt(
              bubbleA.vx * bubbleA.vx + bubbleA.vy * bubbleA.vy
            );
            const v2 = Math.sqrt(
              bubbleB.vx * bubbleB.vx + bubbleB.vy * bubbleB.vy
            );

            const dir1 = Math.atan2(bubbleA.vy, bubbleA.vx);
            const dir2 = Math.atan2(bubbleB.vy, bubbleB.vx);

            const vx1 = v1 * Math.cos(dir1 - angle);
            const vy1 = v1 * Math.sin(dir1 - angle);
            const vx2 = v2 * Math.cos(dir2 - angle);
            const vy2 = v2 * Math.sin(dir2 - angle);

            // Final velocities after collision
            const finalVx1 = vx2;
            const finalVy1 = vy1;
            const finalVx2 = vx1;
            const finalVy2 = vy2;

            // Convert back to original coordinate system
            bubbleA.vx =
              Math.cos(angle) * finalVx1 - Math.sin(angle) * finalVy1;
            bubbleA.vy =
              Math.sin(angle) * finalVx1 + Math.cos(angle) * finalVy1;
            bubbleB.vx =
              Math.cos(angle) * finalVx2 - Math.sin(angle) * finalVy2;
            bubbleB.vy =
              Math.sin(angle) * finalVx2 + Math.cos(angle) * finalVy2;

            // Add angular velocity based on impact
            const impactForce = Math.abs(vx1 - vx2) + Math.abs(vy1 - vy2);
            bubbleA.angularVelocity +=
              (Math.random() * 2 - 1) * impactForce * 0.01;
            bubbleB.angularVelocity +=
              (Math.random() * 2 - 1) * impactForce * 0.01;
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
              bubble.radius * 2
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
              bubble.radius * 2
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
      setBubbles(updatedBubbles);

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
  }, [dimensions, onScore]);

  // Function to draw the trash can directly on the canvas
  const drawTrashCan = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
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
        bubble.y + bubble.radius > topLeft.y - 50
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
      Trúc: "#3357FF",
      "Kỷ An": "#F033FF",
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
    setBubbles(bubblesRef.current);
  };

  // Start dragging a bubble
  const startDrag = (x: number, y: number) => {
    const dividerX = dimensions.width * DIVIDER_X_RATIO;

    // Only allow dragging in the left zone
    if (x > dividerX) {
      return; // Ignore mouse interactions in the right zone
    }

    // Find the bubble being clicked
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
    if (draggedBubbleRef.current === null || !lastMousePosRef.current) return;

    // Find the dragged bubble
    const bubbleIndex = bubblesRef.current.findIndex(
      (b) => b.id === draggedBubbleRef.current
    );
    if (bubbleIndex === -1) return;

    const bubble = bubblesRef.current[bubbleIndex];

    // Calculate new position
    let newX = x;
    let newY = y;

    // Keep bubble within bounds
    newX = Math.max(
      bubble.radius,
      Math.min(dimensions.width - bubble.radius, newX)
    );
    newY = Math.max(
      bubble.radius,
      Math.min(dimensions.height - bubble.radius, newY)
    );

    // Update bubble position
    bubble.x = newX;
    bubble.y = newY;

    // Track velocity for throw
    const vx = x - lastMousePosRef.current.x;
    const vy = y - lastMousePosRef.current.y;

    velocityHistoryRef.current.push({ x: vx, y: vy });
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }

    lastMousePosRef.current = { x, y };

    // Update bubble reference
    bubblesRef.current[bubbleIndex] = bubble;
    setBubbles([...bubblesRef.current]);
  };

  // End dragging and apply velocity
  const endDrag = () => {
    if (draggedBubbleRef.current === null) return;

    // Find the dragged bubble
    const bubbleIndex = bubblesRef.current.findIndex(
      (b) => b.id === draggedBubbleRef.current
    );
    if (bubbleIndex === -1) {
      draggedBubbleRef.current = null;
      return;
    }

    const bubble = bubblesRef.current[bubbleIndex];

    // Calculate throw velocity from history
    if (velocityHistoryRef.current.length > 0) {
      let vx = 0;
      let vy = 0;

      // Average the last few velocity samples
      for (const v of velocityHistoryRef.current) {
        vx += v.x;
        vy += v.y;
      }

      vx /= velocityHistoryRef.current.length;
      vy /= velocityHistoryRef.current.length;

      // Apply a multiplier to make throws feel good
      const multiplier = 1.5;
      bubble.vx = vx * multiplier;
      bubble.vy = vy * multiplier;

      // Add some angular velocity based on the throw direction
      bubble.angularVelocity = (vx - vy) * 0.01;
    }

    // Update bubble reference
    bubblesRef.current[bubbleIndex] = bubble;
    setBubbles([...bubblesRef.current]);

    // Reset drag state
    draggedBubbleRef.current = null;
    dragStartPosRef.current = null;
    lastMousePosRef.current = null;
  };

  // Reset the game
  const reset = () => {
    bubblesRef.current = [];
    setBubbles([]);
    draggedBubbleRef.current = null;
    dragStartPosRef.current = null;
    lastMousePosRef.current = null;
  };

  return {
    addBubble,
    startDrag,
    updateDrag,
    endDrag,
    reset,
  };
}
