"""Combine the sock print files in socks/ into print-ready sheets in output/.

Adapted from python-functions/layout.py. The changes are all forced by the fact
that v2 renders every design onto one fixed 4800x2500 frame instead of cropping
to the artwork:

  * Same-sized inputs are cropped to ONE shared box (the union of every file's
    ink bounds, plus a margin) rather than scaled individually. The frames
    already share a scale, so per-image scaling would be a no-op, but the dead
    transparent margin around each frame has to go or the rows sit miles apart.
    Cropping every file to the same box removes the margin without changing
    relative size -- which matters, because a short name is deliberately
    narrower than a long one and must not be stretched to match.
  * Sheets are sized for the press: a full row is exactly PRESS_WIDTH_CM wide,
    and the pixel density is capped at MAX_DPI.
  * Files are processed in sorted order so a sheet is reproducible and can be
    checked against the packing list.

Differently-sized inputs (the older cropped exports) still take the original
scale-to-fit-the-largest-canvas path.
"""

import os
from datetime import datetime

from PIL import Image

# Printable width of the press. One full row of designs is scaled to exactly
# this, so a design's physical size is PRESS_WIDTH_CM / IMAGES_PER_ROW.
PRESS_WIDTH_CM = 40.0

# The designs render at roughly 900 DPI once laid out, which is far beyond what
# DTF film resolves and makes a sheet a 200-megapixel file that many RIPs will
# not open. 600 is still past the film's limit, so capping here costs nothing
# visible and cuts the sheet to a third of the pixels.
MAX_DPI = 600

# Kept around the shared crop box so neighbouring designs on a sheet never
# touch. Some designs' ink runs right to the edge of the box, so without this
# a right-flush design would butt straight into the next tile's artwork.
CROP_MARGIN = 90

CM_PER_INCH = 2.54


def _normalise(images):
    """Put every image on a common canvas, preserving relative scale."""
    sizes = {img.size for img in images}

    if len(sizes) == 1:
        # v2 path: identical frames, so crop them all to the same ink box.
        boxes = [b for b in (img.getbbox() for img in images) if b]
        if not boxes:
            return images
        width, height = images[0].size
        union = (
            max(0, min(b[0] for b in boxes) - CROP_MARGIN),
            max(0, min(b[1] for b in boxes) - CROP_MARGIN),
            min(width, max(b[2] for b in boxes) + CROP_MARGIN),
            min(height, max(b[3] for b in boxes) + CROP_MARGIN),
        )
        return [img.crop(union) for img in images]

    # Legacy path: scale each image to fit the largest canvas, keeping aspect.
    max_width = max(img.width for img in images)
    max_height = max(img.height for img in images)

    out = []
    for img in images:
        scale = min(max_width / img.width, max_height / img.height)
        resized = img.resize(
            (int(img.width * scale), int(img.height * scale)),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new("RGBA", (max_width, max_height), (255, 255, 255, 0))
        canvas.paste(
            resized,
            ((max_width - resized.width) // 2, (max_height - resized.height) // 2),
        )
        out.append(canvas)
    return out


def combine_images_in_rows(folder_path, output_file, images_per_row=3, spacing=10,
                           max_rows_per_file=6, press_width_cm=PRESS_WIDTH_CM,
                           max_dpi=MAX_DPI):
    png_files = sorted(f for f in os.listdir(folder_path) if f.lower().endswith(".png"))
    if not png_files:
        print(f"no PNGs in {folder_path}")
        return []

    images = _normalise([Image.open(os.path.join(folder_path, f)) for f in png_files])

    # Work the scale out from a FULL row, not from whatever this sheet holds,
    # so a part-full last sheet prints its designs at the same size as the rest.
    native_dpi = (images[0].width * images_per_row) / (press_width_cm / CM_PER_INCH)
    dpi = min(native_dpi, max_dpi)
    scale = dpi / native_dpi

    if scale < 1:
        images = [
            img.resize((round(img.width * scale), round(img.height * scale)),
                       Image.Resampling.LANCZOS)
            for img in images
        ]
        spacing = round(spacing * scale)

    tile_w, tile_h = images[0].size
    design_cm = press_width_cm / images_per_row
    print(f"{len(images)} design(s) at {dpi:.0f} DPI "
          f"(rendered {native_dpi:.0f}, scaled x{scale:.3f}) — "
          f"each {design_cm:.1f} cm wide, {tile_h / dpi * CM_PER_INCH:.1f} cm tall\n")

    num_rows = (len(images) + images_per_row - 1) // images_per_row
    num_files = (num_rows + max_rows_per_file - 1) // max_rows_per_file
    current_date = datetime.now().strftime("%d.%m.%y")

    written = []
    for file_index in range(num_files):
        start_index = file_index * max_rows_per_file * images_per_row
        end_index = min(start_index + max_rows_per_file * images_per_row, len(images))
        count = end_index - start_index
        current_num_rows = (count + images_per_row - 1) // images_per_row

        # A sheet holding less than one full row only needs that many columns,
        # which saves film. Wider sheets still need the full row width.
        cols_used = min(images_per_row, count)

        combined_width = tile_w * cols_used
        combined_height = tile_h * current_num_rows + spacing * (current_num_rows - 1)
        combined_image = Image.new("RGBA", (combined_width, combined_height), (255, 255, 255, 0))

        for index in range(start_index, end_index):
            row = (index - start_index) // images_per_row
            col = (index - start_index) % images_per_row
            combined_image.paste(images[index], (col * tile_w, row * (tile_h + spacing)))

        output_file_with_date = os.path.join(
            os.path.dirname(output_file),
            f"{current_date}-{file_index + 1}-{os.path.basename(output_file)}",
        )
        os.makedirs(os.path.dirname(output_file_with_date), exist_ok=True)
        # The DPI tag is what makes the press land this at the right physical
        # size instead of guessing from the pixel count.
        combined_image.save(output_file_with_date, dpi=(round(dpi), round(dpi)))
        written.append(output_file_with_date)

        sheet_files = png_files[start_index:end_index]
        print(f"sheet {file_index + 1}: {count} design(s), {combined_width}x{combined_height} px "
              f"= {combined_width / dpi * CM_PER_INCH:.1f} x {combined_height / dpi * CM_PER_INCH:.1f} cm "
              f"-> {os.path.basename(output_file_with_date)}")
        for i, f in enumerate(sheet_files, 1):
            print(f"    {i:2}. {f}")

    return written


script_dir = os.path.dirname(os.path.abspath(__file__))
combine_images_in_rows(
    os.path.join(script_dir, "socks"),
    os.path.join(script_dir, "output", "combined-image.png"),
    images_per_row=3,
    spacing=-50,
    max_rows_per_file=6,
)
