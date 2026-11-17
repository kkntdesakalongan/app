# Server deployment

A push starts the Deploy workflow on the `kknkalongan` self-hosted runner. The workflow builds the pushed commit, applies database migrations, and restarts the API. It seeds the database only on the first deployment. Pushes to any branch can deploy that branch.

PM2 runs the API as the `ubuntu` user and restores it at boot. Use `ssh kknkalongan 'pm2 status'` to check it and `ssh kknkalongan 'pm2 logs kknkalongan-api'` to read its logs. PostgreSQL, MinIO, and nginx use systemd.

The temporary app URL is `http://10.8.69.69:8080` over the `kknkalongan` VPN. The browser also needs access to MinIO on port 9000 for uploads. The server stores configuration and the initial administrator credentials in `/opt/kknkalongan/app.env`. Keep this file private.

Releases are in `/opt/kknkalongan/releases`, and `/opt/kknkalongan/current` points to the active release. PostgreSQL and MinIO data stay outside release directories. Monitor disk use and maintain database and object-storage backups separately.

The runner executes repository code with the `ubuntu` account. Only trusted users should have push access. The app uses HTTP until domains and TLS are configured.
