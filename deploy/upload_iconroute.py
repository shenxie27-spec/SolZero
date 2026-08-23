import paramiko
import os

HOST = "43.103.5.123"
USER = "root"
PASSWORD = os.environ.get("SOLZERO_SSH_PASSWORD", "")

FILES = [
    ("D:/sol/solzero/server/src/routes/token.js", "/opt/solzero/server/src/routes/token.js"),
    ("D:/sol/solzero/server/src/index.js", "/opt/solzero/server/src/index.js"),
]

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASSWORD, timeout=15, look_for_keys=False, allow_agent=False)
sftp = cli.open_sftp()
for local, remote in FILES:
    sftp.put(local, remote)
    print("uploaded", remote)
sftp.close()
cmd = "chown -R solzero:solzero /opt/solzero && systemctl restart solzero && sleep 3 && systemctl is-active solzero && curl -s http://127.0.0.1:8787/api/health"
stdin, stdout, stderr = cli.exec_command(cmd, timeout=60)
print(stdout.read().decode("utf-8", "replace"))
print(stderr.read().decode("utf-8", "replace"))
cli.close()
