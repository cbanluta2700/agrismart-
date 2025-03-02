const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Initialize Vercel SDK optimizations on app startup
  if (!dev) {
    // Only initialize in production to avoid rate limiting during development
    import('./lib/init-vercel-optimizations').then(({ initializeVercelOptimizations }) => {
      console.log('🚀 Initializing Vercel SDK optimizations...');
      initializeVercelOptimizations()
        .then((result) => {
          if (result.success) {
            console.log('✅ Vercel SDK optimizations initialized successfully!');
          } else {
            console.error('❌ Failed to initialize Vercel SDK optimizations:', result.error);
          }
        })
        .catch((error) => {
          console.error('❌ Error initializing Vercel SDK optimizations:', error);
        });
    });
  }

  // Create HTTP server
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(process.env.PORT || 3000, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${process.env.PORT || 3000}`);
  });
});
