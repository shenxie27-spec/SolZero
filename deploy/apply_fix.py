import paramiko
import os
HOST="43.103.5.123"; USER="root"; PASSWORD=os.environ.get("SOLZERO_SSH_PASSWORD","")
cli=paramiko.SSHClient(); cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST,username=USER,password=PASSWORD,timeout=20,look_for_keys=False,allow_agent=False)
sftp=cli.open_sftp()
sftp.put("D:/sol/solzero/server/src/index.js","/opt/solzero/server/src/index.js")
def ex(cmd,timeout=120):
    stdin,stdout,stderr=cli.exec_command(cmd,timeout=timeout)
    out=stdout.read().decode(); err=stderr.read().decode()
    rc=stdout.channel.recv_exit_status()
    if out.strip(): print(out.strip()[-600:])
    if err.strip(): print("[err]",err.strip()[-200:])
    if rc!=0: raise RuntimeError(cmd)
    return out
ex("chown solzero:solzero /opt/solzero/server/src/index.js && systemctl restart solzero && sleep 2 && systemctl is-active solzero")
ex("curl -s http://127.0.0.1:8787/api/health")
ex("echo eyJqc29ucnBjIjoiMi4wIiwiaWQiOjEsIm1ldGhvZCI6ImdldEhlYWx0aCJ9 | base64 -d > /tmp/req.json && curl -m 15 -s -X POST http://127.0.0.1:8787/rpc -H 'Content-Type: application/json' --data-binary @/tmp/req.json")
ex("ss -tlnp | grep 8787")
cli.close()
print("DONE")
