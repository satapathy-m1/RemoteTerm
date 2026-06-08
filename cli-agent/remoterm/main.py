import click
import httpx
import asyncio
from .ws_client import WSClient
from .config import SERVER_URL, WS_URL

@click.group()
def cli():
    """RemoteTerm — watch your terminal from anywhere."""
    pass

@cli.command()
def connect():
    """Connect this terminal to RemoteTerm and start streaming."""
    click.echo("=== RemoteTerm ===")
    click.echo("Go to the website, click 'New Session', and copy the code.\n")

    code = click.prompt("Enter your one-time code").strip().upper()

    click.echo(f"\nVerifying code {code}...")

    try:
        response = httpx.post(
            f"{SERVER_URL}/api/sessions/verify-code",
            json={"code": code, "machineName": _get_machine_name()},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            session_token = data["sessionToken"]
            session_id = data["sessionId"]
            click.echo(f"Code verified! Session ID: {session_id}")
            click.echo("Starting terminal stream... (Ctrl+C to stop)\n")

            # Start the WebSocket + PTY session
            client = WSClient(session_token, session_id, WS_URL)
            asyncio.run(client.run())

        elif response.status_code == 404:
            click.echo("Error: Invalid code. Please check and try again.")
        elif response.status_code == 400:
            data = response.json()
            click.echo(f"Error: {data.get('error', 'Bad request')}")
        else:
            click.echo(f"Error: Server returned {response.status_code}")

    except httpx.ConnectError:
        click.echo(f"Error: Cannot connect to server at {SERVER_URL}")
        click.echo("Make sure the backend is running.")
    except Exception as e:
        click.echo(f"Unexpected error: {e}")

def _get_machine_name():
    import socket
    try:
        return socket.gethostname()
    except:
        return "unknown"

if __name__ == '__main__':
    cli()