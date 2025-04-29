import BubbleGame from "@/components/bubble-game";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-purple-50">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Avatar Bubble Game
      </h1>
      <BubbleGame />
    </main>
  );
}
