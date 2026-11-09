import { apiClient } from "../axios-client";

// Uploads for Item Master (BCorDFWebApi's InventoryMasterController — Item
// Master's actual backing store, see item-master-service.ts's header comment;
// its image field is named ImageUrl, unlike ItemsController's ImagePath,
// hence the union return type below) and Restaurant Menu Items
// (MenuMasterController) — POST/DELETE .../image actions added alongside
// each entity's existing generic CRUD. axios sets the multipart/form-data
// boundary automatically for a FormData body, no manual Content-Type header
// needed.
async function uploadImage(path: string, file: File): Promise<{ imagePath?: string; imageUrl?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ imagePath?: string; imageUrl?: string }>(path, formData);
  return data;
}

export const imageUploadService = {
  uploadItemImage: (compId: string, code: string, file: File) =>
    uploadImage(`/InventoryMaster/${compId}/${encodeURIComponent(code)}/image`, file),

  deleteItemImage: async (compId: string, code: string): Promise<void> => {
    await apiClient.delete(`/InventoryMaster/${compId}/${encodeURIComponent(code)}/image`);
  },

  uploadMenuItemImage: (compId: string, code: string, file: File) =>
    uploadImage(`/MenuMaster/${compId}/${encodeURIComponent(code)}/image`, file),

  deleteMenuItemImage: async (compId: string, code: string): Promise<void> => {
    await apiClient.delete(`/MenuMaster/${compId}/${encodeURIComponent(code)}/image`);
  },

  uploadServiceImage: (compId: string, code: string, file: File) =>
    uploadImage(`/ServiceMaster/${compId}/${encodeURIComponent(code)}/image`, file),

  deleteServiceImage: async (compId: string, code: string): Promise<void> => {
    await apiClient.delete(`/ServiceMaster/${compId}/${encodeURIComponent(code)}/image`);
  },
};
