import ImageKit from "imagekit";
import dotenv from "dotenv";
dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

export async function uploadToImageKit(fileInput) {
  const fileContent = fileInput.buffer ? fileInput.buffer : fileInput;
  const fileName = fileInput.originalname
    ? `${Date.now()}_${fileInput.originalname}`
    : `${Date.now()}_upload.png`;

  const result = await imagekit.upload({
    file: fileContent,
    fileName: fileName,
    folder: "/echat_media",
  });

  return result.url;
}
