# Changelog

All notable changes to the project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-08-02

### Added

- **Core Game Engine**: Interactive physics-based bubble game with split-screen gameplay
- **Avatar System**: Five unique Vietnamese character avatars (Tèo, Tí, Trúc, Kỷ An, Dém)
- **Physics Engine**: Custom-built 2D physics engine with realistic bubble collisions and rotations
- **Split-Screen Zones**:
  - Left Zone: Classic floating bubble interaction with zero gravity
  - Right Zone: Gravity-affected gameplay with enhanced physics simulation
- **Interactive Controls**: Drag-and-throw mechanics for bubble manipulation with mouse and touch support
- **Scoring System**: Moving trash can with point-based scoring and visual feedback
- **Audio System**: Web Audio API integration with programmatically generated "plop" sound effects
- **Visual Effects**: Confetti animations and congratulatory messages in Vietnamese
- **Responsive Design**: Mobile and desktop support with adaptive canvas sizing
- **Performance Optimization**: 60 FPS target with optimized canvas rendering and physics calculations
- **UI Components**: Comprehensive UI library built with Radix UI components and Tailwind CSS
- **Theme Support**: Dark/light mode support with theme provider and system preference detection
- **Accessibility**: Basic keyboard navigation and screen reader support
- **Error Handling**: Graceful error handling for audio and physics systems

### Changed

- **Architecture**: Built with Next.js 15 and React 19 for modern web development
- **Styling**: Implemented with Tailwind CSS for consistent design system and responsive layouts
- **Type Safety**: Full TypeScript implementation for better development experience and code reliability
- **Build System**: Optimized build process with pnpm package manager for faster installations

### Fixed

- **Audio Compatibility**: Replaced HTML Audio elements with Web Audio API for better browser support
- **Mobile Responsiveness**: Optimized touch controls and responsive canvas sizing for various screen sizes
- **Performance**: Optimized physics calculations and rendering pipeline for smooth gameplay
- **Memory Management**: Improved garbage collection and memory usage in physics engine
- **Cross-browser Support**: Enhanced compatibility across different browsers and devices

## [1.0.3] - 2025-08-03

### Added

- **README Badges**: Added project status badges including GitHub Actions, Vercel deployment, MIT license, TypeScript, and Next.js
- **Documentation**: Updated README with GitHub repository link and improved project visibility

## [1.0.2] - 2025-08-02

### Added

- **GitHub Link**: Added small GitHub button in top-right corner linking to project repository
- **Minimal UI**: Borderless, transparent GitHub button with hover effects for clean design

## [Unreleased]

### Planned Features

- **Multiplayer Support**: Real-time collaborative gameplay with WebSocket integration
- **Custom Avatars**: User-uploaded avatar support with image processing
- **Level System**: Progressive difficulty levels with new challenges and objectives
- **Leaderboards**: Global and local high score tracking with persistent storage
- **Power-ups**: Special abilities and modifiers for bubbles (speed boost, size change, etc.)
- **Sound Customization**: User-selectable sound effects and background music
- **Game Modes**: Time-based challenges, survival mode, and puzzle modes
- **Achievement System**: Unlockable achievements and rewards for gameplay milestones

### Technical Improvements

- **Performance Monitoring**: Add analytics and performance tracking with real-time metrics
- **Accessibility**: Enhanced keyboard navigation, screen reader support, and ARIA labels
- **PWA Features**: Offline support, app-like experience, and push notifications
- **Internationalization**: Multi-language support beyond Vietnamese with i18n framework
- **Testing**: Comprehensive unit and integration test coverage with Jest and React Testing Library
- **CI/CD Pipeline**: Automated testing, building, and deployment workflows
- **Documentation**: Interactive API documentation and developer guides
- **Security**: Enhanced security measures and input validation

_This changelog will be updated with each new release to document all changes, improvements, and new features._
