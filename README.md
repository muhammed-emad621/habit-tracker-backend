# Habit Tracker Backend

A Node.js backend for a habit tracking application using Supabase.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env` and fill in your Supabase credentials and JWT secret.
3. Run the schema in `supabase-schema.sql` in your Supabase project.
4. Start the server: `npm start`

## API

- POST /auth/register
- POST /auth/login
- POST /habits/add (auth required)
- GET /habits/mine (auth required)
- POST /habits/fail (auth required)
- POST /habits/urge (auth required)
- DELETE /habits/:habitId (auth required)
- POST /habits/share (auth required)
- GET /habits/shared (auth required)