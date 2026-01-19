require('@dotenvx/dotenvx').config()

module.exports = {
  apps: [
    {
      name: 'face-match-api',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      env: {
        NODE_ENV: process.env.NODE_ENV,
      },
    },
  ],
}
