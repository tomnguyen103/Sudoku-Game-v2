import os, struct, zlib

def write_png(path, size):
    """Write a minimal valid PNG: blue background with white inset grid pattern."""
    w = h = size
    scale = max(1, size // 192)

    pixels = []
    for r in range(h):
        row = []
        for c in range(w):
            px = (37, 99, 235)  # blue-600

            margin = size // 8
            if margin <= r < h - margin and margin <= c < w - margin:
                px = (255, 255, 255)

            inner = size // 4
            cell = (size - inner * 2) // 9
            if inner <= r < h - inner and inner <= c < w - inner:
                ir = r - inner
                ic = c - inner
                if ir % cell < max(1, size // 96) or ic % cell < max(1, size // 96):
                    px = (37, 99, 235)
                else:
                    px = (219, 234, 254)  # blue-100

            row.append(px)
        pixels.append(row)

    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    raw = b''.join(
        b'\x00' + b''.join(struct.pack('BBB', *p) for p in row)
        for row in pixels
    )
    idat_data = zlib.compress(raw, 9)

    png = (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr_data)
        + chunk(b'IDAT', idat_data)
        + chunk(b'IEND', b'')
    )
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)
    print(f'Written {path} ({len(png)} bytes)')

write_png('icons/icon-192.png', 192)
write_png('icons/icon-512.png', 512)
print('Icons generated.')
