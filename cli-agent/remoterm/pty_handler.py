import os
import sys
import asyncio
import threading

IS_WINDOWS = sys.platform == 'win32'

if not IS_WINDOWS:
    import ptyprocess
    import termios
    import tty
    import fcntl
    import struct

class PTYHandler:
    def __init__(self, on_output):
        self.on_output = on_output
        self.pty = None
        self._loop = None
        self._old_settings = None

    def _get_terminal_size(self):
        try:
            size = os.get_terminal_size()
            return size.rows, size.columns
        except:
            return 24, 80

    def start(self, loop):
        self._loop = loop
        shell = os.environ.get('SHELL', '/bin/bash')
        rows, cols = self._get_terminal_size()

        self.pty = ptyprocess.PtyProcess.spawn(
            [shell],
            dimensions=(rows, cols)
        )
        print(f"[remoterm] Streaming started. Press Ctrl+C to stop.\n", flush=True)

    def read_loop(self):
        """Read PTY output, write to real stdout AND send to browser."""
        while True:
            try:
                data = self.pty.read(1024)
                if data:
                    # Write to real terminal so user sees output locally
                    sys.stdout.buffer.write(data)
                    sys.stdout.buffer.flush()

                    # Also stream to browser via WebSocket
                    asyncio.run_coroutine_threadsafe(
                        self.on_output(data), self._loop
                    )
            except EOFError:
                asyncio.run_coroutine_threadsafe(
                    self.on_output(None), self._loop
                )
                break
            except Exception as e:
                break

    def stdin_loop(self):
        """Read from real stdin and forward to PTY."""
        # Set terminal to raw mode so keypresses go straight through
        fd = sys.stdin.fileno()
        try:
            self._old_settings = termios.tcgetattr(fd)
            tty.setraw(fd)
        except:
            pass

        try:
            while self.pty.isalive():
                try:
                    data = os.read(fd, 1024)
                    if data:
                        self.pty.write(data)
                except:
                    break
        finally:
            self._restore_terminal()

    def _restore_terminal(self):
        if self._old_settings:
            try:
                termios.tcsetattr(
                    sys.stdin.fileno(),
                    termios.TCSADRAIN,
                    self._old_settings
                )
            except:
                pass

    def write(self, data: bytes):
        """Forward browser keyboard input to PTY."""
        if self.pty and self.pty.isalive():
            self.pty.write(data)

    def is_alive(self):
        return self.pty is not None and self.pty.isalive()

    def terminate(self):
        self._restore_terminal()
        if self.pty and self.pty.isalive():
            self.pty.terminate()