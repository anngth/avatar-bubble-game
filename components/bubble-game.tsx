"use client";

import type React from "react";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePhysicsEngine } from "@/hooks/use-physics-engine";
import { avatars } from "@/lib/constants";

export default function BubbleGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [congratsMessage, setCongratsMessage] = useState<string | null>(null);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScore = useCallback((avatarName: string) => {
    setScore((prev) => prev + 1);
    setShowConfetti(true);
    setCongratsMessage(`Bạn đã ném ${avatarName} vào thùng rác!`);

    // Clear any existing timeout before setting a new one
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
    }
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
      setCongratsMessage(null);
    }, 3000);

    // Play sound effect using Web Audio API
    if (audioEnabled) {
      playPlopSound();
    }
  }, [audioEnabled]);

  const { addBubble, startDrag, updateDrag, endDrag, reset } = usePhysicsEngine({
    canvasRef,
    dimensions,
    onScore,
  });

  // Use Web Audio API instead of HTML Audio element
  const audioContextRef = useRef<AudioContext | null>(null);
  const plopSoundBufferRef = useRef<AudioBuffer | null>(null);

  // Function to play the plop sound
  const playPlopSound = () => {
    if (!audioContextRef.current || !plopSoundBufferRef.current) return;

    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = plopSoundBufferRef.current;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  };

  useEffect(() => {
    // Initialize Web Audio API
    try {
      // Create audio context
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        audioContextRef.current = new AudioContext();

        // Create a simple "plop" sound programmatically
        const createPlopSound = async () => {
          try {
            const ctx = audioContextRef.current;
            if (!ctx) return;

            // Create a short buffer for our sound (0.3 seconds)
            const sampleRate = ctx.sampleRate;
            const duration = 0.3;
            const bufferSize = sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
            const data = buffer.getChannelData(0);

            // Generate a simple "plop" sound
            for (let i = 0; i < bufferSize; i++) {
              // Exponential decay
              const t = i / sampleRate;
              const amplitude = Math.exp(-10 * t);

              // Frequency modulation for the "plop" effect
              const frequency = 150 + 200 * Math.exp(-15 * t);
              data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
            }

            plopSoundBufferRef.current = buffer;
          } catch (error) {
            console.error("Failed to create plop sound:", error);
            setAudioEnabled(false);
          }
        };

        createPlopSound();
      } else {
        console.warn("Web Audio API not supported");
        setAudioEnabled(false);
      }
    } catch (error) {
      console.error("Error initializing audio:", error);
      setAudioEnabled(false);
    }

    // Handle resize with debounce to avoid excessive updates
    let resizeTimer: ReturnType<typeof setTimeout>;
    const updateDimensions = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setDimensions({ width, height });
        }
      }, 100);
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(resizeTimer);
      // Clean up confetti timeout
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
      // Clean up audio context
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startDrag(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updateDrag(x, y);
    }
  };

  const handleMouseUp = () => {
    endDrag();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      startDrag(x, y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect && e.touches[0]) {
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      updateDrag(x, y);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDrag();
  };

  // Toggle audio
  const toggleAudio = () => {
    setAudioEnabled((prev) => !prev);

    // Resume audio context if it was suspended (needed for some browsers)
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume().catch(console.error);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl">
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {avatars.map((avatar) => (
          <Button
            key={avatar.name}
            onClick={() => addBubble(avatar.name)}
            className="flex items-center gap-2"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden">
              <img
                src={avatar.src || "/placeholder.svg"}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span>{avatar.name}</span>
          </Button>
        ))}
        <Button variant="outline" onClick={reset} className="ml-2">
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={toggleAudio}
          className="ml-2"
          aria-label={audioEnabled ? "Mute sound" : "Unmute sound"}
        >
          {audioEnabled ? "🔊" : "🔇"}
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-xl font-bold">Score: {score}</div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] border-2 border-gray-300 rounded-lg overflow-hidden bg-white"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="touch-none"
        />

        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            <Confetti />
          </div>
        )}

        {/* Congratulatory message */}
        {congratsMessage && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white px-8 py-6 rounded-lg shadow-xl text-center z-10">
            <h3 className="text-2xl font-bold">Chúc mừng!</h3>
            <h3 className="text-2xl font-bold">{congratsMessage}</h3>
            <p className="mt-2 text-xl">+1 điểm!</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>
          Drag and throw the avatar bubbles from the left side. Try to get them
          into the open trash can on the right side!
        </p>
        <p>
          The left side has no gravity and is interactive, while the right side
          has gravity and is view-only.
        </p>
        <p>
          Bubbles will automatically fall into the trash can when positioned
          above the opening!
        </p>
      </div>
    </div>
  );
}

// Pre-generate confetti particle data to avoid recalculating Math.random() on every render
const CONFETTI_COUNT = 50;
const confettiParticles = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  width: `${Math.random() * 10 + 5}px`,
  height: `${Math.random() * 10 + 5}px`,
  backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
  animationDelay: `${Math.random() * 2}s`,
  animationDuration: `${Math.random() * 3 + 2}s`,
}));

function Confetti() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="confetti-container">
        {confettiParticles.map((p) => (
          <div
            key={p.id}
            className="confetti"
            style={{
              left: p.left,
              width: p.width,
              height: p.height,
              backgroundColor: p.backgroundColor,
              animationDelay: p.animationDelay,
              animationDuration: p.animationDuration,
            }}
          />
        ))}
      </div>
    </div>
  );
}
