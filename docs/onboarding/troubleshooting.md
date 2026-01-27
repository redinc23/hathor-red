# Troubleshooting

## Common Issues

### Server won't start
- Check `PORT` conflicts
- Verify `.env` values
- Run `npm run server` to isolate backend errors

### Client won't start
- Ensure Node.js 18+
- Run `npm run client` directly
- Delete `client/node_modules` and reinstall

### Database connection failures
- Confirm Postgres is running
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Ensure `database/schema.sql` exists

### Redis connection failures
- Confirm Redis is running
- Check `REDIS_HOST` and `REDIS_PORT`
