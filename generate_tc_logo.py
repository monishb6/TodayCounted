import numpy as np
from PIL import Image, ImageDraw, ImageFont

def generate_tc_logo(SIZE, out_path):
    RADIUS = int(SIZE * 0.176)  # proportional rounding
    TEXT = "TC"
    FONT_PATH = None  # Use default font

    # Neutral, modern dark background gradient
    BG_TOP = (38, 38, 38)
    BG_BOTTOM = (12, 12, 14)

    # Text: vertical gradient, dark purple (top) to vibrant orange (bottom)
    TEXT_GRAD_TOP = (80, 30, 120)   # dark, rich purple
    TEXT_GRAD_BOTTOM = (255, 100, 0) # vibrant orange

    # Prefer a bold, slightly rounded sans-serif font
    BOLD_ROUNDED_FONT_PATHS = [
        "DejaVuSans-Bold.ttf",  # Bold, slightly rounded
        "Arial Rounded MT Bold.ttf",  # Windows, if available
        "arialbd.ttf",  # Arial Bold
        "Arial Bold.ttf",
        "DejaVuSans.ttf",  # fallback regular
        "arial.ttf"
    ]
    # Make text larger by reducing margin
    MARGIN_RATIO = 0.14

    def vertical_gradient(size, top_color, bottom_color):
        arr = np.zeros((size, size, 3), dtype=np.uint8)
        for y in range(size):
            frac = y / (size - 1)
            c = tuple(int(top_color[i]*(1-frac) + bottom_color[i]*frac) for i in range(3))
            arr[y, :] = c
        return arr

    def draw_rounded_rect_mask(size, radius):
        mask = Image.new('L', (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
        return mask

    def find_max_fontsize(text, font_path, max_width, max_height, start=10, end=1000):
        while start < end:
            mid = (start + end) // 2
            try:
                font = ImageFont.truetype(font_path, mid)
            except:
                font = ImageFont.truetype("arial.ttf", mid)
            bbox = font.getbbox(text)
            w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            if w <= max_width and h <= max_height:
                start = mid + 1
            else:
                end = mid
        return end - 1

    # 1. Create neutral, modern vertical background gradient
    bg_arr = vertical_gradient(SIZE, BG_TOP, BG_BOTTOM)
    bg_img = Image.fromarray(bg_arr, 'RGB')
    mask = draw_rounded_rect_mask(SIZE, RADIUS)
    bg_img.putalpha(mask)

    # 2. Find a bold, slightly rounded font
    font_path = None
    for path in BOLD_ROUNDED_FONT_PATHS:
        try:
            font = ImageFont.truetype(path, 40)
            font_path = path
            break
        except:
            continue
    if font_path is None:
        font_path = None  # fallback to default

    # 3. Find max font size for 'TC' to fit nicely
    margin = int(SIZE * MARGIN_RATIO)
    max_w = max_h = SIZE - 2 * margin
    font_size = find_max_fontsize(TEXT, font_path, max_w, max_h)
    try:
        font = ImageFont.truetype(font_path, font_size) if font_path else ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    bbox = font.getbbox(TEXT)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (SIZE - w) // 2 - bbox[0]
    y = (SIZE - h) // 2 - bbox[1]

    # 4. Create vertical gradient for text (dark purple to vibrant orange)
    grad_text_arr = vertical_gradient(SIZE, TEXT_GRAD_TOP, TEXT_GRAD_BOTTOM)
    grad_text_img = Image.fromarray(grad_text_arr, 'RGB')
    # Create text mask
    text_mask = Image.new('L', (SIZE, SIZE), 0)
    draw_mask = ImageDraw.Draw(text_mask)
    draw_mask.text((x, y), TEXT, font=font, fill=255)
    grad_text_img.putalpha(text_mask)
    txt_img = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
    txt_img = Image.alpha_composite(txt_img, grad_text_img)

    # 5. Composite text on background
    out = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
    out = Image.alpha_composite(out, bg_img)
    out = Image.alpha_composite(out, txt_img)
    out.save(out_path)
    print(f'Saved {out_path}')

if __name__ == '__main__':
    generate_tc_logo(192, 'tc_logo_192.png')
    generate_tc_logo(512, 'tc_logo_512.png') 