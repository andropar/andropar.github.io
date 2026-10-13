# Personal VPS

`ssh personal_vps` connects as `johannes` to `178.104.48.146`. Admin commands use `sudo`.
The local SSH config lives at `~/.ssh/config`.

## Website and writing

nginx serves `/srv/jroth.space/current` over HTTPS. The dedicated `website` user builds
public GitHub `main` in a temporary directory. A timer checks code every two minutes.
Saving a post or media in the editor triggers a build immediately through systemd's
path watcher. Successful builds switch the release symlink atomically; the five most
recent releases are retained.

The writing editor at `https://jroth.space/blog/admin/` uses its own username/password.
Login details are stored locally in `~/.ssh/personal-vps-editor-login.txt` (mode 600).
The server stores a salted scrypt password hash in `/etc/personal-editor-auth.env`
(root-only). The login creates a secure, HttpOnly session cookie lasting twelve hours;
logging out invalidates the session.

The editor's content is the source of truth for online posts and uploads:
`/srv/jroth-editor/new-site/src/content/blog` and
`/srv/jroth-editor/new-site/public/blog/uploads`.
Deployments copy this content into the site build. Edit writing through the editor;
website code remains in GitHub. Initial content was imported from the repository.
The site keeps serving the preceding release if a build fails.

The pinned Decap file service listens on loopback only. nginx protects both the editor
and API with the same session login. The API accepts requests from `https://jroth.space`.
Its endpoint stays under `/blog/admin/` to share the browser login scope. Its service
user can write only under `/srv/jroth-editor` and runs with a filesystem sandbox and
resource limits. Uploaded files and saved posts are never executed by the API.

## Operations

- Deploy now: `sudo systemctl start website-deploy.service`
- Build log: `sudo journalctl -u website-deploy.service -n 100 --no-pager`
- Timer: `systemctl status website-deploy.timer`
- Content watcher: `systemctl status website-content.path`
- Roll back: `sudo ln -sfn /srv/jroth.space/releases/<release> /srv/jroth.space/current`
- Firewall: `sudo ufw status verbose`
- SSH protection: `sudo fail2ban-client status sshd`
- HTTPS renewal: `sudo certbot renew --dry-run`
- Backup now: `sudo systemctl start website-backup.service`

Daily root-only backups include all posts, drafts, uploads and nginx/SSH/service
configuration in `/var/backups/personal-site`. The most recent thirty backups are kept.
Download a backup over SSH before server maintenance or deletion; a backup on the Mac
is saved under `new-site/.local/vps-setup-2026-10-13/` during initial setup.

Only TCP 22, 80 and 443 are opened, with SSH connection throttling. SSH uses keys,
root and password login are disabled, and Fail2ban blocks repeated failed SSH logins. The editor limits login attempts to five per minute.
Security updates run daily; required automatic reboots are scheduled for 04:00 server time when no users are logged in. nginx applies request/connection limits, TLS, HTTPS redirects,
and security headers. Deployment and editing run without root privileges.

DNS apex A → `178.104.48.146`; www CNAME → `jroth.space`. TLS certificates renew
through certbot's timer. Templates under this directory describe the service setup;
the installed nginx vhost additionally contains certbot's certificate paths.
