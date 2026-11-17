module.exports = {
  apps: [{
    name: 'kknkalongan-api',
    cwd: '/opt/kknkalongan/current/apps/api',
    script: '/opt/kknkalongan/current/apps/api/dist/server.mjs',
    interpreter: '/usr/local/bin/node',
    node_args: ['--env-file=/opt/kknkalongan/app.env'],
  }],
}
