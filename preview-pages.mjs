process.env.STATIC_DIRECTORY='site';
process.env.PORT=process.env.PORT||'4174';
await import('./server.mjs');
