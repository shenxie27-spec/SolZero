import sys, paramiko
import os

HOST = "43.103.5.123"
USER = "root"
PASSWORD = os.environ.get("SOLZERO_SSH_PASSWORD", "")

def run(cmd, timeout=60):
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, password=PASSWORD, timeout=15, look_for_keys=False, allow_agent=False)
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    cli.close()
    return out, err

if __name__ == "__main__":
    cmd = " ".join(sys.argv[1:])
    out, err = run(cmd)
    if out: print(out.rstrip())
    if err: print("[stderr]", err.rstrip())
