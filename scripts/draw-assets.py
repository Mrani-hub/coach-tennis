# Dessine l'icône et l'écran de démarrage de Coach USCM (sources pour @capacitor/assets).
import math, sys
from PIL import Image, ImageDraw, ImageFont

GREEN, GREEN_D, BALL, WHITE = (29, 92, 69), (14, 22, 18), (214, 234, 58), (255, 255, 255)
FONT_D = sys.argv[1] if len(sys.argv) > 1 else 'Saira.ttf'
FONT_B = sys.argv[2] if len(sys.argv) > 2 else 'Sans.ttf'
SS = 4  # suréchantillonnage pour des bords lisses

def court(d, s, alpha=255, scale=1.0):
    """Lignes de court vues de dessus, discrètes."""
    base = GREEN
    mix = lambda a: tuple(int(b + (255 - b) * a / 255) for b in base) + (255,)
    c = mix(alpha); w = max(2, int(s * 0.012))
    m = s * (1 - scale) / 2
    x0, x1, y0, y1 = m + s * .17, s - m - s * .17, m + s * .08, s - m - s * .08
    d.rectangle([x0, y0, x1, y1], outline=c, width=w)
    d.line([x0 + s * .06, y0, x0 + s * .06, y1], fill=c, width=w)
    d.line([x1 - s * .06, y0, x1 - s * .06, y1], fill=c, width=w)
    ym = (y0 + y1) / 2
    d.line([x0 - s * .03, ym, x1 + s * .03, ym], fill=mix(min(255, alpha + 40)), width=int(w * 1.8))
    d.line([x0 + s * .06, ym - s * .2, x1 - s * .06, ym - s * .2], fill=c, width=w)
    d.line([x0 + s * .06, ym + s * .2, x1 - s * .06, ym + s * .2], fill=c, width=w)
    d.line([s / 2, ym - s * .2, s / 2, ym + s * .2], fill=c, width=w)

def ball(img, cx, cy, r, shadow=True):
    S = img.size[0]
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    if shadow:
        d.ellipse([cx - r * .92, cy + r * .78, cx + r * .92, cy + r * 1.08], fill=(0, 0, 0, 70))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BALL + (255,))
    # coutures : deux arcs de cercles décalés, découpés par la balle
    seam = Image.new('L', img.size, 0); sd = ImageDraw.Draw(seam)
    w = int(r * .085)
    for sx in (-1, 1):
        ox = cx + sx * r * 1.32
        rr = r * 1.0
        sd.ellipse([ox - rr, cy - rr, ox + rr, cy + rr], outline=255, width=w)
    mask = Image.new('L', img.size, 0); ImageDraw.Draw(mask).ellipse([cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1], fill=255)
    from PIL import ImageChops
    seam = ImageChops.multiply(seam, mask)
    lay.paste(Image.new('RGBA', img.size, WHITE + (255,)), (0, 0), seam)
    img.alpha_composite(lay)

def icon_bg(size, base=GREEN):
    s = size * SS
    im = Image.new('RGBA', (s, s), base + (255,)); d = ImageDraw.Draw(im, 'RGBA')
    court(d, s, alpha=60)
    return im

def finish(im, size): return im.resize((size, size), Image.LANCZOS)

# Icône complète (iOS / Android hérité)
im = icon_bg(1024); s = im.size[0]
ball(im, s / 2, s / 2, s * .27)
finish(im, 1024).convert('RGB').save('assets/icon-only.png')
# Icône adaptative Android : fond + premier plan (zone sûre = 66 % centraux)
finish(icon_bg(1024), 1024).convert('RGB').save('assets/icon-background.png')
fg = Image.new('RGBA', (1024 * SS, 1024 * SS), (0, 0, 0, 0)); s = fg.size[0]
ball(fg, s / 2, s / 2, s * .2)
finish(fg, 1024).save('assets/icon-foreground.png')

# Écrans de démarrage clair et sombre
def splash(base, path, ink):
    W = 2732; s = W * 2
    im = Image.new('RGBA', (s, s), base + (255,)); d = ImageDraw.Draw(im, 'RGBA')
    ball(im, s / 2, s * .455, s * .055)
    f1 = ImageFont.truetype(FONT_D, int(s * .052)); f2 = ImageFont.truetype(FONT_B, int(s * .0165))
    t1, t2 = 'COACH USCM', 'Entraînements tennis jeunes'
    d.text((s / 2, s * .545), t1, font=f1, fill=ink, anchor='mm')
    d.text((s / 2, s * .59), t2, font=f2, fill=ink + (200,) if len(ink) == 3 else ink, anchor='mm')
    im.resize((W, W), Image.LANCZOS).convert('RGB').save(path)
splash(GREEN, 'assets/splash.png', WHITE)
splash(GREEN_D, 'assets/splash-dark.png', (230, 238, 232))

# Petite icône de notification Android (blanc sur transparent)
import os
for dens, px in {'mdpi': 24, 'hdpi': 36, 'xhdpi': 48, 'xxhdpi': 72, 'xxxhdpi': 96}.items():
    n = Image.new('RGBA', (px * 8, px * 8), (0, 0, 0, 0)); s = n.size[0]
    lay = Image.new('L', n.size, 0); d = ImageDraw.Draw(lay)
    r = s * .42; cx = cy = s / 2; w = int(s * .075)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    cut = Image.new('L', n.size, 0); cd = ImageDraw.Draw(cut)
    for sx in (-1, 1):
        ox = cx + sx * r * 1.32; cd.ellipse([ox - r, cy - r, ox + r, cy + r], outline=255, width=w)
    from PIL import ImageChops
    lay = ImageChops.subtract(lay, cut)
    n.paste(Image.new('RGBA', n.size, (255, 255, 255, 255)), (0, 0), lay)
    os.makedirs(f'assets/notif/drawable-{dens}', exist_ok=True)
    n.resize((px, px), Image.LANCZOS).save(f'assets/notif/drawable-{dens}/ic_stat_uscm.png')
print('assets ok')
