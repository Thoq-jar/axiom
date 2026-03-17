#!/usr/bin/env python3

import os
import sys
import pty
import select
import signal
import termios
import fcntl
import struct


def main():
    master_fd, slave_fd = pty.openpty()

    pid = os.fork()
    if pid == 0:
        os.setsid()
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        for fd in (0, 1, 2):
            os.dup2(slave_fd, fd)
        os.close(master_fd)
        os.close(slave_fd)
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        os.execvpe("bash", ["bash", "--login", "-i"], env)
        sys.exit(1)

    os.close(slave_fd)

    try:
        winsize = struct.pack("HHHH", 24, 220, 0, 0)
        fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
    except Exception:
        pass

    stdin_fd = sys.stdin.fileno()

    def cleanup(signum=None, frame=None):
        try:
            os.kill(pid, signal.SIGTERM)
        except Exception:
            pass
        os.close(master_fd)
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup)
    signal.signal(signal.SIGINT, cleanup)

    try:
        while True:
            rlist, _, _ = select.select([master_fd, stdin_fd], [], [], 0.05)
            for fd in rlist:
                if fd == master_fd:
                    try:
                        data = os.read(master_fd, 4096)
                    except OSError:
                        cleanup()
                        return
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()
                elif fd == stdin_fd:
                    data = sys.stdin.buffer.read1(4096)  # ty:ignore[possibly-missing-attribute]
                    if not data:
                        cleanup()
                        return
                    os.write(master_fd, data)
            result = os.waitpid(pid, os.WNOHANG)
            if result[0] != 0:
                break
    except Exception:
        pass
    finally:
        cleanup()


main()
