# Avatar Bubble Game

An interactive physics-based game where users can play with avatar bubbles in a split-screen environment, combining realistic physics, gravity mechanics, and scoring elements.

## Features

- Split-screen gameplay with different physics in each zone
  - Left Zone: Classic floating bubble interaction
  - Right Zone: Gravity-affected gameplay
- Five unique character avatars: Tèo, Tí, Trúc, Kỷ An, and Dém
- Realistic 2D physics with bubble collisions and rotations
- Interactive drag-and-throw mechanics
- Moving trash can scoring system with animations
- Celebratory effects including sounds and confetti

## Technical Stack

- React (Latest stable version)
- HTML5 Canvas for rendering
- Custom-built 2D physics engine
- Next.js for the application framework

## Getting Started

1. Clone the repository

```bash
git clone <repository-url>
cd avatar-bubble-game
```

2. Install dependencies

```bash
pnpm install
```

3. Run development server

```bash
pnpm dev
```

4. Build for production

```bash
pnpm build
```

5. Start production server

```bash
pnpm start
```

## Game Rules

- Add bubbles using the character buttons in the top-right
- Drag and throw bubbles freely within the screen bounds
- Bubbles can pass through the top half of the center divider
- Score points by getting bubbles into the moving trash can
- Experience gravity effects in the right zone
- No limit to how many bubbles you can add

## Performance

- Targets 60 FPS gameplay
- Responsive design supporting both desktop and mobile devices
- Optimized canvas rendering for smooth animations

## License

This project is private and proprietary.
