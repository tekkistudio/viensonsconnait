// src/features/media/types.ts
export interface MediaFile {
    url: string;
    path: string;
    name: string;
    publicId: string;
    format?: string;
    width?: number;
    height?: number;
    size?: number;
    created_at?: string;
  }