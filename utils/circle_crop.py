import argparse
from PIL import Image, ImageDraw

def crop_to_circle(input_path, output_path):
    # Open the input image
    img = Image.open(input_path).convert("RGBA")

    # Create a circular mask
    size = min(img.size)
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)

    # Apply the mask to the image
    img_circular = Image.new("RGBA", img.size)
    img_circular.paste(img, mask=mask)

    # Crop the square area
    cropped_img = img_circular.crop((0, 0, size, size))

    # Save the result as PNG
    cropped_img.save(output_path, format="PNG")
    print(f"Circular cropped image saved as {output_path}")

def main():
    # Create argument parser
    parser = argparse.ArgumentParser(description="Crop an image to a circle and save as PNG.")
    parser.add_argument("input", type=str, help="Path to the input image")
    parser.add_argument("output", type=str, help="Path to save the circular cropped image")
    
    # Parse arguments
    args = parser.parse_args()

    # Call the crop function with the provided arguments
    crop_to_circle(args.input, args.output)

if __name__ == "__main__":
    main()
