import { createCanvas, loadImage, registerFont } from "canvas";

import path from "path";

import fs from "fs";

// Define paths

const fontPath = path.resolve("./fonts/Roboto-Bold.ttf");

const backgroundsDir = path.resolve("./assets/backgrounds");

// Ensure the font file exists before registering

if (!fs.existsSync(fontPath)) {

  console.error(`Font file not found: ${fontPath}`);

} else {

  registerFont(fontPath, { family: "Roboto" });

}

// Get all background images from the directory

const backgroundImages = fs.readdirSync(backgroundsDir)

  .filter(file => file.endsWith(".png") || file.endsWith(".jpg"))

  .map(file => path.join(backgroundsDir, file));

// Function to select a random background

function getRandomBackground() {

  if (backgroundImages.length === 0) {

    console.error("No background images found in the directory.");

    return null;

  }

  const randomIndex = Math.floor(Math.random() * backgroundImages.length);

  return backgroundImages[randomIndex];

}

// Generate Music Card

async function generateMusicCard(title, username, thumbnailUrl) {

  const canvas = createCanvas(800, 300);

  const ctx = canvas.getContext("2d");

  try {

    // Load random background image

    const backgroundPath = getRandomBackground();

    if (!backgroundPath) return null;

    

    const background = await loadImage(backgroundPath);

    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Load song thumbnail

    const thumbnail = await loadImage(thumbnailUrl);

    ctx.drawImage(thumbnail, 30, 80, 150, 150);

    // Song Title

    ctx.fillStyle = "#ffffff";

    ctx.font = "30px Roboto";

    ctx.fillText(title, 200, 130);

    // Requested by

    ctx.font = "20px Roboto";

    ctx.fillText(`Requested by: ${username}`, 200, 180);

    // Save the image

    const filePath = path.resolve("./musiccard.png");

    const buffer = canvas.toBuffer("image/png");

    fs.writeFileSync(filePath, buffer);

    return filePath;

  } catch (error) {

    console.error("Error generating music card:", error);

    return null;

  }

}

export default generateMusicCard;