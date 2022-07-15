import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const firestore = getFirestore();

function escapedModelNumber(modelNumber: string) {
  return modelNumber.replace(/\//g, '_FS_SLASH_');
}

export async function saveImagePaths(modelNumber: string, imagePaths: string[]) {
  const imagePathsRef = firestore.collection('images');
  const escaped = escapedModelNumber(modelNumber);
  const imagePathsDoc = imagePathsRef.doc(escaped);
  await imagePathsDoc.set({
    modelNumber,
    imagePaths,
    updatedAt: new Date(),
  });
}

export async function getImagePaths(modelNumber: string): Promise<string[] | null> {
  const imagePathsRef = firestore.collection('images');
  const escaped = escapedModelNumber(modelNumber);
  const imagePathsDoc = imagePathsRef.doc(escaped);
  const imagePaths = await imagePathsDoc.get();
  if (!imagePaths.exists) {
    return null;
  }
  return imagePaths.data()?.imagePaths;
}
