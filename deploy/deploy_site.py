import paramiko
import os

HOST = "43.103.5.123"
USER = "root"
PASSWORD = os.environ.get("SOLZERO_SSH_PASSWORD", "")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASSWORD, timeout=15, look_for_keys=False, allow_agent=False)
sftp = cli.open_sftp()

def mkdirs(remote_dir):
    parts = remote_dir.strip("/").split("/")
    cur = ""
    for p in parts:
        cur += "/" + p
        try:
            sftp.stat(cur)
        except IOError:
            sftp.mkdir(cur)

mkdirs("/var/www/solzero/privacy")
mkdirs("/var/www/solzero/terms")
uploads = [
    ("D:/sol/solzero/deploy/site/index.html", "/var/www/solzero/index.html"),
    ("D:/sol/solzero/deploy/site/privacy/index.html", "/var/www/solzero/privacy/index.html"),
    ("D:/sol/solzero/deploy/site/terms/index.html", "/var/www/solzero/terms/index.html"),
    ("D:/sol/solzero/release/store/icon-512.png", "/var/www/solzero/icon.png"),
    ("D:/sol/solzero/deploy/Caddyfile-live", "/etc/caddy/Caddyfile"),
]
for local, remote in uploads:
    sftp.put(local, remote)
    print("uploaded", remote)
sftp.close()

cmd = "caddy validate --config /etc/caddy/Caddyfile 2>&1; systemctl reload caddy && sleep 3 && systemctl is-active caddy"
stdin, stdout, stderr = cli.exec_command(cmd, timeout=60)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
cli.close()
