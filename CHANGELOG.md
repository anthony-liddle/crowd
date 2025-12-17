# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Mobile app with React Native (Expo)
- Server API with Fastify and Drizzle ORM
- PostgreSQL database with PostGIS extension
- Location-based messaging functionality
- Ephemeral message system with expiration
- Docker Compose configuration for database
- Environment variable configuration
- GitHub issue and PR templates
- CI workflow for type checking and builds
- Comprehensive project documentation

### Features
- **Mobile App**
  - Message feed with pull-to-refresh
  - Create messages with custom duration and radius
  - Location-based message visibility
  - Modern UI with NativeWind (Tailwind CSS)
  - Character counter for message input
  - Toast notifications for user feedback

- **Server API**
  - POST /messages - Create new messages
  - GET /messages/feed - Fetch nearby messages
  - GET /health - Health check endpoint
  - PostGIS spatial queries for location features
  - Automatic message expiration

- **Database**
  - PostgreSQL with PostGIS extension
  - Drizzle ORM for type-safe queries
  - Migration system
  - Spatial indexing for performance

### Documentation
- README with setup instructions
- PROJECT_STRUCTURE.md for mobile app
- CONTRIBUTING.md with contribution guidelines
- LICENSE (MIT)
- Environment variable documentation

### Development Tools
- TypeScript configuration
- ESLint and Prettier (via editor)
- Git ignore patterns
- Node version management (.nvmrc)
- pnpm workspace configuration

## [1.0.0] - Initial Release

First release of Crowd - Location-based ephemeral messaging platform.
