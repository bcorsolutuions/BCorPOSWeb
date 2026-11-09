import { apiClient } from "../axios-client";
import { useAuthStore } from "@/stores/auth-store";
import type { GLGroupMasterDto, GLMasterDto } from "@/types/gl-master";
import type { GLGroupFormValues, GLMasterFormValues } from "@/schemas/gl-master.schema";

// Real BCorDFWebApi GLGroupMasterController/GLMasterController — thin
// MasterController<TDto,...> subclasses (generic master CRUD, keyed by
// CompID+Code), same pattern as FloorMasterController/RestaurantTableMasterController.

export interface GLGroupMaster extends GLGroupMasterDto {
  id: string;
}

export interface GLMaster extends GLMasterDto {
  id: string;
}

function toGLGroup(dto: GLGroupMasterDto): GLGroupMaster {
  return { ...dto, id: dto.code };
}

function toGLMaster(dto: GLMasterDto): GLMaster {
  return { ...dto, id: dto.code };
}

export const glGroupMasterService = {
  list: async (): Promise<{ items: GLGroupMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<GLGroupMasterDto[]>(`/GLGroupMaster/${compId}`);
    const items = data.map(toGLGroup);
    return { items, total: items.length };
  },

  create: async (payload: GLGroupFormValues): Promise<GLGroupMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<GLGroupMasterDto>(
      "/GLGroupMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        glGroupName: payload.glGroupName,
        accountType: Number(payload.accountType),
        glCtrlTypeCode: payload.glCtrlTypeCode || null,
        parentCode: payload.parentCode || null,
      },
      { headers: { CompID: compId } },
    );
    return toGLGroup(data);
  },

  update: async (code: string, payload: GLGroupFormValues): Promise<GLGroupMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<GLGroupMasterDto>(
      `/GLGroupMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        glGroupName: payload.glGroupName,
        accountType: Number(payload.accountType),
        glCtrlTypeCode: payload.glCtrlTypeCode || null,
        parentCode: payload.parentCode || null,
      },
      { headers: { CompID: compId } },
    );
    return toGLGroup(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/GLGroupMaster/${compId}/${code}`, { params: { user: userName } });
  },
};

export const glMasterService = {
  list: async (): Promise<{ items: GLMaster[]; total: number }> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const { data } = await apiClient.get<GLMasterDto[]>(`/GLMaster/${compId}`);
    const items = data.map(toGLMaster);
    return { items, total: items.length };
  },

  create: async (payload: GLMasterFormValues): Promise<GLMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.post<GLMasterDto>(
      "/GLMaster",
      {
        code: payload.code,
        compID: compId,
        siteID: payload.siteId,
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        glName: payload.glName,
        glGroupCode: payload.glGroupCode,
        glCtrlTypeCode: payload.glCtrlTypeCode,
        accountType: Number(payload.accountType),
        drCrType: payload.drCrType || null,
        allowedLimit: payload.allowedLimit ?? null,
        glRemarks: payload.glRemarks || null,
        interCoGLCode: payload.interCoGLCode,
      },
      { headers: { CompID: compId } },
    );
    return toGLMaster(data);
  },

  update: async (code: string, payload: GLMasterFormValues): Promise<GLMaster> => {
    const user = useAuthStore.getState().user;
    const compId = user?.compId ?? "";
    const { data } = await apiClient.put<GLMasterDto>(
      `/GLMaster/${code}`,
      {
        active: payload.active,
        lastModifiedBy: user?.userName ?? "",
        glName: payload.glName,
        glGroupCode: payload.glGroupCode,
        glCtrlTypeCode: payload.glCtrlTypeCode,
        accountType: Number(payload.accountType),
        drCrType: payload.drCrType || null,
        allowedLimit: payload.allowedLimit ?? null,
        glRemarks: payload.glRemarks || null,
        interCoGLCode: payload.interCoGLCode,
      },
      { headers: { CompID: compId } },
    );
    return toGLMaster(data);
  },

  remove: async (code: string): Promise<void> => {
    const compId = useAuthStore.getState().user?.compId ?? "";
    const userName = useAuthStore.getState().user?.userName ?? "";
    await apiClient.delete(`/GLMaster/${compId}/${code}`, { params: { user: userName } });
  },
};
