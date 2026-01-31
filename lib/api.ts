import { Platform } from 'react-native';

import {
  DETECT_IMAGE_ENDPOINT,
  DETECT_VIDEO_ENDPOINT,
  USE_MOCK_RESPONSES,
} from '@/constants/config';
import { dataUriToBlob, persistMediaBuffer, resolveImageDimensions } from '@/lib/media';
import type {
  BoundingBox,
  DetectionPayload,
  DetectionResponse,
  MediaAttachment,
  MediaType,
} from '@/types/detection';

type RawBoundingBox = {
  label: string;
  confidence: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
};

type ImageDetectionsResponse = {
  detections: RawBoundingBox[];
};

const jsonHeaders: Record<string, string> = {
  Accept: 'application/json',
};

export async function detectDogMuzzle(
  payload: DetectionPayload,
  signal?: AbortSignal
): Promise<DetectionResponse> {
  if (USE_MOCK_RESPONSES) {
    return mockDetection(payload.mediaType);
  }

  if (payload.mediaType === 'video') {
    return detectVideo(payload, signal);
  }

  return detectImageLike(payload, signal);
}

async function detectImageLike(
  payload: DetectionPayload,
  signal?: AbortSignal
): Promise<DetectionResponse> {
  const attachment = ensureAttachment(payload);
  const formData = new FormData();
  appendFileToForm(formData, attachment, payload.mediaType, 'image');

  const response = await fetch(DETECT_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: jsonHeaders,
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(
      `Ошибка запроса (${response.status}). ${errorMessage || 'Проверьте доступность бэкенда.'}`
    );
  }

  const parsed = (await response.json()) as ImageDetectionsResponse;
  const { width, height } = await ensureImageDimensions(attachment);
  const boxes = parsed.detections.map((rawBox, index) =>
    normalizeBoundingBox(rawBox, width, height, index)
  );

  return {
    requestId: `${payload.mediaType}-${Date.now()}`,
    mediaType: payload.mediaType,
    boxes,
    sourceUri: attachment.uri,
    message: boxes.length
      ? undefined
      : 'Модель не вернула детекций. Попробуйте другой кадр или освещение.',
  };
}

async function detectVideo(
  payload: DetectionPayload,
  signal?: AbortSignal
): Promise<DetectionResponse> {
  const attachment = ensureAttachment(payload);
  const formData = new FormData();
  appendFileToForm(formData, attachment, 'video', 'video');

  const response = await fetch(DETECT_VIDEO_ENDPOINT, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorMessage = await readErrorMessage(response);
    throw new Error(
      `Видео не обработано (${response.status}). ${
        errorMessage || 'Проверьте логи сервера.'
      }`
    );
  }

  const buffer = await response.arrayBuffer();
  if (!buffer.byteLength) {
    throw new Error('Сервер вернул пустой mp4 файл.');
  }

  const contentDisposition = response.headers.get('content-disposition');
  const defaultName =
    attachment.name && attachment.name.length > 0
      ? `annotated_${attachment.name}`
      : `annotated-${Date.now()}.mp4`;
  const fileName = extractFileName(contentDisposition) ?? defaultName;
  const mimeType = response.headers.get('content-type') ?? 'video/mp4';
  const annotatedMedia = await persistMediaBuffer(buffer, {
    fileName,
    mimeType,
  });

  return {
    requestId: `video-${Date.now()}`,
    mediaType: 'video',
    boxes: [],
    sourceUri: attachment.uri,
    annotatedMedia,
    message:
      'Видео размечено на сервере. Нажмите play в предпросмотре, чтобы увидеть результат.',
  };
}

function ensureAttachment(payload: DetectionPayload): MediaAttachment {
  if (!payload.attachment) {
    throw new Error('Прикрепите файл для анализа.');
  }
  return payload.attachment;
}

function appendFileToForm(
  formData: FormData,
  attachment: MediaAttachment,
  mediaType: MediaType,
  fieldName: string
) {
  const fileName =
    attachment.name ?? `upload-${Date.now()}.${attachment.mimeType?.split('/').pop() ?? mediaType}`;
  const mimeType = attachment.mimeType ?? guessMimeType(mediaType);

  if (Platform.OS === 'web') {
    const directFile = attachment.file;
    if (directFile) {
      formData.append(fieldName, directFile, fileName);
      return;
    }
    const assetBlob = (attachment.asset as unknown as { file?: Blob } | undefined)?.file;
    if (assetBlob) {
      formData.append(fieldName, assetBlob, fileName);
      return;
    }
    if (attachment.uri?.startsWith('data:')) {
      const inlineBlob = dataUriToBlob(attachment.uri, mimeType);
      if (inlineBlob) {
        formData.append(fieldName, inlineBlob, fileName);
        return;
      }
    }
  }

  formData.append(fieldName, {
    uri: attachment.uri,
    name: fileName,
    type: mimeType,
  } as any);
}

async function readErrorMessage(response: Response) {
  try {
    const text = await response.text();
    return text?.slice(0, 280);
  } catch (error) {
    return null;
  }
}

function guessMimeType(mediaType: MediaType) {
  switch (mediaType) {
    case 'video':
      return 'video/mp4';
    default:
      return 'image/jpeg';
  }
}

async function ensureImageDimensions(attachment: MediaAttachment) {
  if (attachment.width && attachment.height) {
    return { width: attachment.width, height: attachment.height };
  }
  return resolveImageDimensions(attachment.uri);
}

function normalizeBoundingBox(
  box: RawBoundingBox,
  width: number,
  height: number,
  index: number
): BoundingBox {
  const safeWidth = width > 0 ? width : 1;
  const safeHeight = height > 0 ? height : 1;
  const xMinRaw = box.x_min / safeWidth;
  const xMaxRaw = box.x_max / safeWidth;
  const yMinRaw = box.y_min / safeHeight;
  const yMaxRaw = box.y_max / safeHeight;

  const x1 = clamp01(Math.min(xMinRaw, xMaxRaw));
  const x2 = clamp01(Math.max(xMinRaw, xMaxRaw));
  const y1 = clamp01(Math.min(yMinRaw, yMaxRaw));
  const y2 = clamp01(Math.max(yMinRaw, yMaxRaw));

  const x = x1;
  const y = y1;
  const normalizedWidth = Math.max(0, x2 - x1);
  const normalizedHeight = Math.max(0, y2 - y1);

  return {
    id: `${box.label}-${index}`,
    label: box.label,
    confidence: box.confidence,
    box: {
      x,
      y,
      width: normalizedWidth,
      height: normalizedHeight,
    },
  };
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function extractFileName(headerValue?: string | null) {
  if (!headerValue) {
    return null;
  }
  const match = headerValue.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? match[1] : null;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function mockDetection(mediaType: MediaType): Promise<DetectionResponse> {
  await delay(600);
  const boxes = buildDemoBoxes(mediaType);
  return {
    requestId: `mock-${Date.now()}`,
    mediaType,
    inferenceTimeMs: 32,
    boxes,
    sourceUri: 'mock://demo',
    message: 'Возвращены демонстрационные данные. Укажите EXPO_PUBLIC_API_URL для реального запроса.',
  };
}

function buildDemoBoxes(mediaType: MediaType): BoundingBox[] {
  if (mediaType === 'video') {
    return [
      {
        id: 'frame-01',
        label: 'Dog',
        confidence: 0.88,
        box: {
          x: 0.25,
          y: 0.2,
          width: 0.4,
          height: 0.6,
        },
        frame: 12,
      },
      {
        id: 'frame-42',
        label: 'Muzzle',
        confidence: 0.91,
        box: {
          x: 0.32,
          y: 0.55,
          width: 0.2,
          height: 0.18,
        },
        frame: 42,
      },
    ];
  }

  return [
    {
      id: 'dog-1',
      label: 'Dog w/ muzzle',
      confidence: 0.94,
      box: {
        x: 0.08,
        y: 0.12,
        width: 0.55,
        height: 0.68,
      },
    },
  ];
}
