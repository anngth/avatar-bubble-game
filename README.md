# Avatar Bounce Game

[![Release and Deploy](https://github.com/nguyenthanhan/avatar-bubble-game/workflows/Release%20and%20Deploy/badge.svg)](https://github.com/nguyenthanhan/avatar-bubble-game/actions/workflows/release-and-deploy.yml)
[![Deploy on Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-black)](https://vercel.com/heimers-projects/v0-avatar-bubble-game)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

An interactive physics-based game where users can play with avatar bubbles in a split-screen environment, combining realistic physics, gravity mechanics, and scoring elements. Built with modern web technologies for optimal performance and user experience.

## 🎮 Features

### Core Gameplay

- **Split-screen Physics**: Two distinct zones with different physics behaviors
  - **Left Zone**: Zero-gravity floating bubble interaction
  - **Right Zone**: Gravity-affected gameplay with enhanced physics simulation
- **Character Avatars**: Five unique Vietnamese characters (Tèo, Tí, Trúc, Kỷ An, Dém)
- **Interactive Controls**: Intuitive drag-and-throw mechanics with mouse and touch support
- **Scoring System**: Moving trash can with point-based scoring and visual feedback

### Technical Features

- **Custom Physics Engine**: Realistic 2D physics with bubble collisions and rotations
- **Audio System**: Web Audio API integration with programmatically generated sound effects
- **Visual Effects**: Confetti animations and congratulatory messages in Vietnamese
- **Responsive Design**: Adaptive canvas sizing for desktop and mobile devices
- **Theme Support**: Dark/light mode with system preference detection
- **Performance Optimized**: 60 FPS target with optimized rendering pipeline
- **GitHub Integration**: Small, unobtrusive GitHub button in top-right corner for easy repository access

## 🛠️ Technical Stack

- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with Radix UI components
- **Rendering**: HTML5 Canvas for game graphics
- **Physics**: Custom-built 2D physics engine
- **Audio**: Web Audio API for sound effects
- **Package Manager**: pnpm for faster installations

## 🚀 Getting Started

### Prerequisites

- Node.js 24+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd avatar-bubble-game
```

2. **Install dependencies**

```bash
pnpm install
# or
npm install
```

3. **Run development server**

```bash
pnpm dev
# or
npm run dev
```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
# Build the application
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## 🎯 Game Rules

### Basic Gameplay

- **Add Bubbles**: Use character buttons in the top-right to spawn avatar bubbles
- **Drag & Throw**: Click and drag bubbles to move them around the screen
- **Zone Interaction**: Bubbles can pass through the top half of the center divider
- **Scoring**: Get bubbles into the moving trash can to earn points
- **Physics**: Experience different physics in each zone (gravity vs. floating)
- **Unlimited Play**: No limit to how many bubbles you can add

### Controls

- **Desktop**: Mouse click and drag
- **Mobile**: Touch and drag gestures
- **Audio Toggle**: Button to enable/disable sound effects

## 📱 Performance & Compatibility

- **Target Performance**: 60 FPS gameplay
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Browser Support**: Modern browsers with Web Audio API support
- **Memory Management**: Optimized physics calculations and rendering
- **Cross-platform**: Works on Windows, macOS, Linux, iOS, and Android

## 🏗️ Project Structure

```
avatar-bubble-game/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── bubble-game.tsx   # Main game component
│   └── theme-provider.tsx # Theme management
├── hooks/                # Custom React hooks
│   ├── use-physics-engine.tsx # Physics engine logic
│   ├── use-mobile.ts     # Mobile detection
│   └── use-toast.ts      # Toast notifications
├── lib/                  # Utility libraries
│   ├── constants.ts      # Game constants
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## 🤝 Contributing

This is a private project, but contributions are welcome from authorized team members.

### Development Guidelines

- Follow TypeScript best practices
- Use conventional commit messages
- Ensure responsive design compatibility
- Test on multiple devices and browsers
- Maintain 60 FPS performance target

## 📄 License

This project is private and proprietary. All rights reserved.

## 🔗 Links

- [GitHub Repository](https://github.com/nguyenthanhan/avatar-bubble-game) - Source code and project files
- [Changelog](./CHANGELOG.md) - Project history and updates
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
