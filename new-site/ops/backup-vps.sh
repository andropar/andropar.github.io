#!/bin/bash
set -euo pipefail
umask 077
install -d -m 700 /var/backups/personal-site
archive=/var/backups/personal-site/$(date -u +%Y%m%dT%H%M%SZ).tar.gz
tar -czf "$archive" -C / srv/jroth-editor etc/nginx etc/personal-editor-auth.env etc/ssh/sshd_config.d etc/systemd/system/cms-editor.service etc/systemd/system/website-deploy.service etc/systemd/system/website-deploy.timer etc/systemd/system/website-content.path
chmod 600 "$archive"

# Retain thirty daily snapshots.
python3 - <<'PYTHON'
from pathlib import Path
backups=sorted(Path('/var/backups/personal-site').glob('*.tar.gz'), reverse=True)
for old in backups[30:]: old.unlink()
PYTHON
