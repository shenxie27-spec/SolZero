import paramiko, sys
import os

HOST = "43.103.5.123"
USER = "root"
PASSWORD = os.environ.get("SOLZERO_SSH_PASSWORD", "")

FILES = [
    ("D:/sol/solzero/core/src/price.js", "/opt/solzero/core/src/price.js"),
    ("D:/sol/solzero/core/src/config.js", "/opt/solzero/core/src/config.js"),
    ("D:/sol/solzero/server/src/index.js", "/opt/solzero/server/src/index.js"),
]

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASSWORD, timeout=15, look_for_keys=False, allow_agent=False)
sftp = cli.open_sftp()
for local, remote in FILES:
    sftp.put(local, remote)
    print("uploaded", remote)
stdin, stdout, stderr = cli.exec_command("chown -R solzero:solzero /opt/solzero && systemctl restart solzero && sleep 2 && systemctl is-active solzero && curl -s http://127.0.0.1:8787/api/health", timeout=60)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
cli.close()
