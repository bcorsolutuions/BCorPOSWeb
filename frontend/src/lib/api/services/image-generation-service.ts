import { apiClient } from "../axios-client";

// BCorDFWebApi's new ImageGenerationController — entity-agnostic, only
// generates and returns image bytes (doesn't touch the database). Callers
// convert the base64 into a File/Blob and save it through whichever
// entity's existing image-upload endpoint applies (see image-upload-service.ts).
export const imageGenerationService = {
  generateImage: async (prompt: string): Promise<{ imageBase64: string; contentType: string }> => {
    const { data } = await apiClient.post<{ imageBase64: string; contentType: string }>(
      "/ImageGeneration/generate",
      { prompt },
    );
    return data;
  },
};
