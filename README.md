# DSA Platform

## Environment setup

Copy `server/.env.example` to `server/.env` and replace placeholders locally. Never commit `.env` or `.env.*` files.

The server requires `MONGO_URI` in production. It starts with fallback problems in local development if MongoDB is unavailable.
