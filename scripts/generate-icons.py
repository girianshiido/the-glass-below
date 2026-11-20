"""Original architectural app icon. Standard-library-only, reproducible PNG output."""
from pathlib import Path
import math, struct, zlib

root = Path(__file__).resolve().parents[1] / 'public'

def png(size, mask=False):
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = (x+.5)/size*100, (y+.5)/size*100
            inset = 8 if mask else 0
            px, py = (px-50)/(1-inset/50)+50, (py-50)/(1-inset/50)+50
            light = max(0, 1-math.hypot(px-40, py-25)/90)
            color = (int(8+9*light), int(21+18*light), int(25+18*light))
            arch = (abs(math.hypot(px-50, py-42)-26)<2.4 and py<=42) or (abs(px-24)<2.4 and 42<=py<=80) or (abs(px-76)<2.4 and 42<=py<=80)
            inner = (abs(math.hypot(px-50, py-43)-15)<1.1 and py<=43) or (abs(px-35)<1.1 and 43<=py<=80) or (abs(px-65)<1.1 and 43<=py<=80)
            if arch: color = (202, 169, 116)
            if inner: color = (115, 136, 127)
            if abs(px-50)/9+abs(py-55)/17<1: color = (141, 210, 202)
            if 79<py<81 and 21<px<79: color=(202,169,116)
            row.extend((*color,255))
        rows.append(b'\x00'+row)
    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')

for name,size,mask in [('icon-192.png',192,False),('icon-512.png',512,False),('icon-mask.png',512,True)]:
    (root/name).write_bytes(png(size,mask))
