import http.server
import socketserver
import socket

# Get local IP address
def get_local_ip():
    try:
        # Create a socket to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # Doesn't actually connect
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "0.0.0.0"

PORT = 8000
HOST = "0.0.0.0"  # Listen on all available interfaces

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
    local_ip = get_local_ip()
    print(f"Server running!")
    print(f"Access locally at: http://localhost:{PORT}")
    print(f"Access on your network at: http://{local_ip}:{PORT}")
    print("(Press CTRL+C to stop the server)")
    httpd.serve_forever() 