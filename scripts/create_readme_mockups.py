from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "docs" / "images"
DESKTOP_SOURCE = Path("/home/ubuntu/screenshots/webdev-preview-root-1786724133909462503-4542.png")
MOBILE_SOURCE = Path("/home/ubuntu/screenshots/webdev-preview-root-1786724146283389812-4575.png")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def shadowed_card(canvas: Image.Image, box: tuple[int, int, int, int], radius: int, fill: str) -> None:
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    x0, y0, x1, y1 = box
    shadow_draw.rounded_rectangle((x0, y0 + 20, x1, y1 + 20), radius=radius, fill=(0, 0, 0, 62))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(20)))
    ImageDraw.Draw(canvas).rounded_rectangle(box, radius=radius, fill=fill)


def fit(image: Image.Image, target_size: tuple[int, int]) -> Image.Image:
    image = image.convert("RGB")
    ratio = min(target_size[0] / image.width, target_size[1] / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


def desktop_safari_mockup() -> None:
    source = Image.open(DESKTOP_SOURCE)
    canvas = Image.new("RGBA", (1920, 1390), "#f2f2f5")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1920, 12), fill="#e32718")

    frame = (48, 48, 1872, 1335)
    shadowed_card(canvas, frame, radius=26, fill="#ffffff")
    x0, y0, x1, _ = frame
    header_bottom = y0 + 88
    draw.rounded_rectangle((x0, y0, x1, header_bottom), radius=26, fill="#f7f7f8")
    draw.rectangle((x0, header_bottom - 26, x1, header_bottom), fill="#f7f7f8")
    draw.line((x0, header_bottom, x1, header_bottom), fill="#d9d9dd", width=2)

    for offset, color in ((0, "#ff5f57"), (28, "#febc2e"), (56, "#28c840")):
        draw.ellipse((x0 + 30 + offset, y0 + 31, x0 + 48 + offset, y0 + 49), fill=color)
    address = (x0 + 380, y0 + 22, x1 - 380, y0 + 64)
    draw.rounded_rectangle(address, radius=20, fill="#ececef")
    title = "PrintKori  —  Cloud print operations"
    title_box = draw.textbbox((0, 0), title, font=font(18, bold=True))
    draw.text(((1920 - (title_box[2] - title_box[0])) / 2, y0 + 35), title, font=font(18, bold=True), fill="#4a4a4e")

    image = fit(source, (1788, 1190))
    content_x = (1920 - image.width) // 2
    content_y = header_bottom + 24
    canvas.paste(image, (content_x, content_y))
    canvas.convert("RGB").save(OUTPUT_DIR / "printkori-desktop-safari.png", optimize=True)


def mobile_safari_mockup() -> None:
    source = Image.open(MOBILE_SOURCE)
    canvas = Image.new("RGBA", (1200, 1120), "#f2f2f5")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1200, 12), fill="#e32718")
    draw.text((74, 78), "PRINTKORI", font=font(28, bold=True), fill="#111111")
    draw.text((74, 120), "Customer QR ordering", font=font(20), fill="#64646a")

    frame = (365, 180, 835, 1040)
    shadowed_card(canvas, frame, radius=42, fill="#161616")
    x0, y0, x1, y1 = frame
    inner = (x0 + 14, y0 + 14, x1 - 14, y1 - 14)
    draw.rounded_rectangle(inner, radius=31, fill="#ffffff")
    notch = (x0 + 145, y0 + 26, x1 - 145, y0 + 52)
    draw.rounded_rectangle(notch, radius=14, fill="#161616")
    screen_top = y0 + 64
    screen_bottom = y1 - 54
    image = fit(source, (inner[2] - inner[0], screen_bottom - screen_top))
    image_x = (1200 - image.width) // 2
    canvas.paste(image, (image_x, screen_top))
    draw.rounded_rectangle((x0 + 120, y1 - 34, x1 - 120, y1 - 27), radius=4, fill="#a7a7ac")

    draw.text((885, 418), "SCAN", font=font(17, bold=True), fill="#e32718")
    draw.multiline_text((885, 454), "A focused mobile\norder path for\nlocal print shops.", font=font(26, bold=True), fill="#111111", spacing=9)
    draw.multiline_text((885, 588), "Upload a file, choose\nprint options, see the\nprice, then submit.", font=font(18), fill="#5e5e64", spacing=7)
    canvas.convert("RGB").save(OUTPUT_DIR / "printkori-mobile-safari.png", optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    desktop_safari_mockup()
    mobile_safari_mockup()
    print(f"Created README mockups in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
