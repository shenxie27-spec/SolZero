import paramiko, secrets, time, sys
import os

HOST = "43.103.5.123"
USER = "root"
PASSWORD = os.environ.get("SOLZERO_SSH_PASSWORD", "")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASSWORD, timeout=20, look_for_keys=False, allow_agent=False)
sftp = cli.open_sftp()

def exec_cmd(cmd, timeout=300):
    print(">>>", cmd[:90])
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    rc = stdout.channel.recv_exit_status()
    if out.strip(): print(out.strip()[-800:])
    if err.strip(): print("[err]", err.strip()[-300:])
    if rc != 0: raise RuntimeError("command failed rc=%d: %s" % (rc, cmd[:120]))
    return out

def put_bytes(remote, data):
    with sftp.open(remote, "w") as f:
        f.write(data)

# 1) upload code tarball
print("== upload ==")
sftp.put("D:/sol/solzero/deploy/solzero-app.tar.gz", "/opt/solzero-app.tar.gz")
exec_cmd("mkdir -p /opt/solzero && tar -xzf /opt/solzero-app.tar.gz -C /opt/solzero && ls /opt/solzero")

# 2) env file
jwt = secrets.token_hex(32)
env = f"""JWT_SECRET={jwt}
SOLZERO_CLUSTER=mainnet-beta
SOLZERO_MAINNET_RPC=https://api.mainnet-beta.solana.com
SOLZERO_PROXY_UPSTREAM=https://api.mainnet-beta.solana.com
SOLZERO_TREASURY=B5FhC46zHEcurfhy7mn88jyq7GvTS73qpZ2R9aUVcKJe
PORT=8787
"""
put_bytes("/opt/solzero/.env", env)
exec_cmd("chmod 600 /opt/solzero/.env && echo env-ok")

# 3) dedicated user
exec_cmd("id solzero >/dev/null 2>&1 || useradd -r -s /usr/sbin/nologin solzero; chown -R solzero:solzero /opt/solzero; echo user-ok")

# 4) npm install
print("== npm install (may take minutes) ==")
exec_cmd("cd /opt/solzero && npm install --omit=dev --no-audit --no-fund", timeout=900)
exec_cmd("chown -R solzero:solzero /opt/solzero && echo install-ok")

# 5) systemd unit
unit = """[Unit]
Description=SolZero API
After=network.target

[Service]
Type=simple
User=solzero
Group=solzero
WorkingDirectory=/opt/solzero/server
EnvironmentFile=/opt/solzero/.env
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=256
ExecStart=/usr/local/bin/node src/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
"""
put_bytes("/etc/systemd/system/solzero.service", unit)
exec_cmd("systemctl daemon-reload && systemctl enable solzero >/dev/null && systemctl restart solzero && sleep 2 && systemctl is-active solzero")

# 6) health check
exec_cmd("curl -s http://127.0.0.1:8787/api/health")

# 7) caddy
print("== caddy ==")
exec_cmd("apt-get update -qq", timeout=300)
exec_cmd("apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl gnupg >/dev/null", timeout=300)
exec_cmd("curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg", timeout=120)
exec_cmd("curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null", timeout=120)
exec_cmd("apt-get update -qq", timeout=300)
exec_cmd("DEBIAN_FRONTEND=noninteractive apt-get install -y -qq caddy >/dev/null", timeout=600)

caddy = """{
    acme_ca https://acme-v02.api.letsencrypt.org/directory
}

api.solzero.top {
    encode gzip
    reverse_proxy 127.0.0.1:8787
}
"""
put_bytes("/etc/caddy/Caddyfile", caddy)
exec_cmd("systemctl enable caddy >/dev/null && systemctl restart caddy && sleep 3 && systemctl is-active caddy")

# 8) final status
print("== status ==")
exec_cmd("systemctl is-active solzero caddy; ss -tlnp | grep -E ':8787|:80 |:443'; free -h | grep -E 'Mem|Swap'; df -h / | tail -1")
print("== DONE ==")
cli.close()
