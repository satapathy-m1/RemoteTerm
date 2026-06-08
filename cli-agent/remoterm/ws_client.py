import asyncio
import json
import threading
import websockets
from .pty_handler import PTYHandler

class WSClient:
    def __init__(self, session_token, session_id, ws_url):
        self.session_token = session_token
        self.session_id = session_id
        self.ws_url = ws_url
        self.websocket = None
        self.pty = None
        self._stop = False

    async def on_pty_output(self, data):
        if data is None:
            if self.websocket:
                try:
                    await self.websocket.send(json.dumps({
                        "type": "session_end",
                        "sessionId": self.session_id
                    }))
                except:
                    pass
            self._stop = True
            return

        if self.websocket:
            try:
                await self.websocket.send(json.dumps({
                    "type": "terminal_output",
                    "sessionId": self.session_id,
                    "data": data.decode('utf-8', errors='replace')
                }))
            except Exception as e:
                pass

    async def ping_loop(self):
        while not self._stop:
            await asyncio.sleep(30)
            if self.websocket and not self._stop:
                try:
                    await self.websocket.send(json.dumps({"type": "ping"}))
                except:
                    break

    async def run(self):
        uri = f"{self.ws_url}/ws/agent?token={self.session_token}"
        print(f"[remoterm] Connecting to server...", flush=True)

        try:
            async with websockets.connect(uri) as ws:
                self.websocket = ws
                print("[remoterm] Connected! Starting terminal...\n", flush=True)

                loop = asyncio.get_event_loop()
                self.pty = PTYHandler(on_output=self.on_pty_output)
                self.pty.start(loop)

                # PTY output → browser
                pty_thread = threading.Thread(
                    target=self.pty.read_loop, daemon=True
                )
                pty_thread.start()

                # Real stdin → PTY (so typing in WSL works)
                stdin_thread = threading.Thread(
                    target=self.pty.stdin_loop, daemon=True
                )
                stdin_thread.start()

                asyncio.create_task(self.ping_loop())

                # Listen for browser keyboard input
                async for message in ws:
                    if self._stop:
                        break
                    try:
                        msg = json.loads(message)
                        if msg.get("type") == "input":
                            self.pty.write(msg["data"].encode())
                        elif msg.get("type") == "pong":
                            pass
                    except Exception as e:
                        pass

        except websockets.exceptions.ConnectionClosed:
            print("\n[remoterm] Connection closed.")
        except Exception as e:
            print(f"\n[remoterm] Connection error: {e}")
        finally:
            self._stop = True
            if self.pty:
                self.pty.terminate()