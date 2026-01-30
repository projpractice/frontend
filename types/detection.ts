import type { DocumentPickerAsset } from 'expo-document-picker';

export type MediaType = 'image' | 'video' | 'stream';

export type BoundingBox = {
  /**
   * Unique identifier for the detection returned by the backend.
   */
  id: string;
  label: string;
  confidence: number;
  /**
   * Normalized coordinates (0..1) relative to the original media dimensions.
   */
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /**
   * Optional fields that some models return.
   */
  color?: string;
  frame?: number;
};

export type DetectionResponse = {
  requestId: string;
  mediaType: MediaType;
  inferenceTimeMs?: number;
  sourceUri?: string;
  boxes: BoundingBox[];
  message?: string;
  annotatedMedia?: MediaAttachment;
};

export type MediaAttachment = {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number | null;
  asset?: DocumentPickerAsset;
  file?: Blob;
  capturedAt?: number;
  width?: number;
  height?: number;
  isTemporary?: boolean;
};

export type DetectionPayload = {
  mediaType: MediaType;
  attachment?: MediaAttachment;
  streamUrl?: string;
};
