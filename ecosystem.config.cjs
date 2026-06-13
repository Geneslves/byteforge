module.exports = {
  apps: [
    {
      name: 'byteforge-dev',
      script: 'pnpm',
      args: 'dev',
      cwd: __dirname,
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'byteforge-preview',
      script: 'pnpm',
      args: 'preview',
      cwd: __dirname,
      interpreter: 'none',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
