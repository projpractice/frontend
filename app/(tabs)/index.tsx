import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { DetectionPreview, DetectionSummary } from '@/components/detector';
import {
  API_BASE_URL,
  DETECT_IMAGE_ENDPOINT,
  DETECT_VIDEO_ENDPOINT,
  USE_MOCK_RESPONSES,
} from '@/constants/config';
import { Colors } from '@/constants/theme';
import { detectDogMuzzle } from '@/lib/api';
import { dataUriToBlob, releaseMediaAttachment, resolveImageDimensions } from '@/lib/media';
import type { DetectionResponse, MediaAttachment, MediaType } from '@/types/detection';

type RequestStatus = 'idle' | 'loading' | 'error' | 'success';
type CameraFacing = 'front' | 'back';

const mediaOptions: { label: string; type: MediaType; hint: string }[] = [
  { type: 'image', label: 'Изображение', hint: 'PNG, JPG' },
  { type: 'video', label: 'Видео', hint: 'MP4, MOV' },
  { type: 'stream', label: 'Стрим с камеры', hint: 'Прямой эфир' },
];

export default function HomeScreen() {
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const [cameraFrame, setCameraFrame] = useState<MediaAttachment | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>('back');
  const [isCameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const annotatedResultRef = useRef<MediaAttachment | null>(null);

  const apiLabel = USE_MOCK_RESPONSES ? 'Демо режим · мок данные' : API_BASE_URL;
  const endpointHint = USE_MOCK_RESPONSES
    ? 'Клиент использует встроенные демонстрационные данные.'
    : `POST ${shortenEndpoint(DETECT_IMAGE_ENDPOINT, API_BASE_URL)} · POST ${shortenEndpoint(
        DETECT_VIDEO_ENDPOINT,
        API_BASE_URL
      )}`;

  const hasCameraPermission = Boolean(cameraPermission?.granted);

  useEffect(() => {
    return () => {
      void releaseMediaAttachment(annotatedResultRef.current);
    };
  }, []);

  useEffect(() => {
    if (annotatedResultRef.current?.uri !== result?.annotatedMedia?.uri) {
      void releaseMediaAttachment(annotatedResultRef.current);
    }
    annotatedResultRef.current = result?.annotatedMedia ?? null;
  }, [result?.annotatedMedia]);

  useEffect(() => {
    if (mediaType !== 'stream') {
      setCameraFrame(null);
    }
  }, [mediaType]);

  const clearMedia = useCallback(() => {
    setAttachment(null);
    setResult(null);
  }, []);

  const clearCameraFrame = useCallback(() => {
    setCameraFrame(null);
    setResult(null);
  }, []);

  const handlePick = useCallback(async () => {
    try {
      const typeFilter = mediaType === 'video' ? ['video/*'] : ['image/*'];
      const picked = await DocumentPicker.getDocumentAsync({
        type: typeFilter,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) {
        return;
      }
      const asset = picked.assets[0];
      const nextAttachment: MediaAttachment = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size ?? null,
        asset,
        file: (asset as any).file,
      };
      if (mediaType === 'image') {
        try {
          const dimensions = await resolveImageDimensions(asset.uri);
          nextAttachment.width = dimensions.width;
          nextAttachment.height = dimensions.height;
        } catch (dimensionError) {
          console.warn('Не удалось прочитать размеры изображения', dimensionError);
        }
      }
      setAttachment(nextAttachment);
      setResult(null);
      setError(null);
    } catch (err) {
      console.log(err);
      Alert.alert('Не удалось открыть файловый диалог');
    }
  }, [mediaType]);

  const handleRequestCameraPermission = useCallback(async () => {
    if (!requestCameraPermission) {
      return;
    }
    const response = await requestCameraPermission();
    if (!response.granted) {
      Alert.alert('Нужен доступ к камере');
    }
  }, [requestCameraPermission]);

  const handleToggleFacing = useCallback(() => {
    setCameraFacing(prev => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const handleCaptureFrame = useCallback(async () => {
    if (!cameraRef.current) {
      return;
    }
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      const cameraCapture: MediaAttachment = {
        uri: photo.uri,
        name: `camera-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        capturedAt: Date.now(),
        width: photo.width,
        height: photo.height,
      };
      if (Platform.OS === 'web' && photo.uri?.startsWith('data:')) {
        const blob = dataUriToBlob(photo.uri, 'image/jpeg');
        if (blob) {
          cameraCapture.file = blob;
        }
      }
      setCameraFrame(cameraCapture);
      setResult(null);
      setError(null);
    } catch (err) {
      console.log(err);
      Alert.alert('Не удалось получить кадр с камеры');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const handleDetect = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (mediaType === 'stream') {
        if (!hasCameraPermission) {
          await handleRequestCameraPermission();
          if (!cameraPermission?.granted) {
            throw new Error('Нужно разрешить доступ к камере.');
          }
        }
        if (!cameraFrame) {
          throw new Error('Сделайте кадр с камеры, чтобы отправить его в потоковую модель.');
        }
      }

      const response = await detectDogMuzzle({
        mediaType,
        attachment:
          mediaType === 'stream'
            ? cameraFrame ?? undefined
            : attachment ?? undefined,
      });
      setResult(response);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setResult(null);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Неизвестная ошибка');
      }
    }
  }, [attachment, cameraFrame, cameraPermission?.granted, handleRequestCameraPermission, hasCameraPermission, mediaType]);

  const isDetectDisabled = useMemo(() => {
    if (status === 'loading') {
      return true;
    }
    if (mediaType === 'stream') {
      return !cameraFrame;
    }
    return !attachment;
  }, [attachment, cameraFrame, mediaType, status]);

  const helperText = useMemo(() => {
    if (status === 'error' && error) {
      return error;
    }
    if (status === 'success' && result?.message) {
      return result.message;
    }
    if (mediaType === 'stream') {
      if (!hasCameraPermission) {
        return 'Выдайте доступ к камере, чтобы включить прямой эфир.';
      }
      if (!cameraFrame) {
        return 'Нажмите «Сделать кадр», мы отправим снимок как часть стрима.';
      }
      return cameraFrame.capturedAt
        ? `Кадр записан ${new Date(cameraFrame.capturedAt).toLocaleTimeString()}`
        : 'Кадр записан, можно запускать инференс.';
    }
    if (!attachment) {
      return 'Прикрепите файл, который уйдёт в инференс на бэкенд.';
    }
    return `${attachment.name ?? 'Файл'} (${formatFileSize(attachment.size)})`;
  }, [attachment, cameraFrame, error, hasCameraPermission, mediaType, result?.message, status]);

  const previewAttachment =
    result?.annotatedMedia ??
    (mediaType === 'stream' ? cameraFrame ?? undefined : attachment ?? undefined);

  const summaryHint = useMemo(() => {
    if (result?.mediaType === 'video') {
      return 'Бэкенд наносит подписи прямо в mp4, ниже отображаются только JSON-ответы.';
    }
    return 'После запроса отобразятся bounding boxes и confidence score по каждому объекту.';
  }, [result?.mediaType]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>DogMuzzle</Text>
        <Text style={styles.subtitle}>
          Проверка наличия намордника на изображениях, видео и прямом эфире с камеры.
        </Text>
        <View style={styles.apiBadge}>
          <Text style={styles.apiBadgeLabel}>Backend</Text>
          <Text style={styles.apiBadgeValue} numberOfLines={1}>
            {apiLabel}
          </Text>
          <Text style={styles.apiBadgeHint}>{endpointHint}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>1. Загрузите файл или включите камеру</Text>
      <View style={styles.mediaOptions}>
        {mediaOptions.map(option => {
          const isActive = option.type === mediaType;
          return (
            <Pressable
              key={option.type}
              onPress={() => {
                setMediaType(option.type);
                setError(null);
                if (option.type === 'stream') {
                  setAttachment(null);
                } else {
                  setCameraFrame(null);
                }
              }}
              style={[styles.mediaOption, isActive && styles.mediaOptionActive]}>
              <Text style={[styles.mediaOptionText, isActive && styles.mediaOptionTextActive]}>
                {option.label}
              </Text>
              <Text style={[styles.mediaOptionHint, isActive && styles.mediaOptionHintActive]}>
                {option.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mediaType === 'stream' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Поток с камеры устройства</Text>
          <View style={styles.cameraShell}>
            {hasCameraPermission ? (
              <CameraView
                style={styles.camera}
                ref={cameraRef}
                facing={cameraFacing}
                onCameraReady={() => setCameraReady(true)}
              />
            ) : (
              <View style={[styles.camera, styles.cameraPlaceholder]}>
                <Text style={styles.cameraPlaceholderText}>
                  Нужен доступ к камере, чтобы транслировать поток.
                </Text>
                <Pressable style={styles.secondaryButton} onPress={handleRequestCameraPermission}>
                  <Text style={styles.secondaryButtonText}>Выдать доступ</Text>
                </Pressable>
              </View>
            )}
          </View>
          {hasCameraPermission ? (
            <View style={styles.cameraActions}>
              <Pressable style={styles.secondaryButton} onPress={handleToggleFacing}>
                <Text style={styles.secondaryButtonText}>Поменять камеру</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, styles.captureButton]}
                onPress={handleCaptureFrame}
                disabled={!isCameraReady || isCapturing}>
                <Text style={styles.secondaryButtonText}>
                  {isCapturing ? 'Снимаем…' : 'Сделать кадр'}
                </Text>
              </Pressable>
            </View>
          ) : null}
          {cameraFrame ? (
            <View style={styles.fileRow}>
              <Text style={styles.fileName}>Кадр сохранён</Text>
              <Pressable style={styles.clearBtn} onPress={clearCameraFrame}>
                <Text style={styles.clearBtnText}>Сбросить</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.cardHint}>
              Сделайте кадр и отправьте его на сервер — он будет обработан как текущий поток.
            </Text>
          )}
          <Text style={[styles.cardHint, status === 'error' && styles.errorText]}>{helperText}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Прикрепление файла</Text>
          {attachment ? (
            <View style={styles.fileRow}>
              <View>
                <Text style={styles.fileName}>{attachment.name ?? 'Без имени'}</Text>
                <Text style={styles.fileMeta}>
                  {attachment.mimeType ?? 'unknown'} · {formatFileSize(attachment.size)}
                </Text>
              </View>
              <View style={styles.fileActions}>
                <Pressable style={styles.clearBtn} onPress={clearMedia}>
                  <Text style={styles.clearBtnText}>Очистить</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.uploadArea} onPress={handlePick}>
              <Text style={styles.uploadText}>Выбрать {mediaType === 'video' ? 'видео' : 'фото'}</Text>
              <Text style={styles.uploadHint}>
                {mediaType === 'video'
                  ? 'Поддерживаются mp4/mov до 150 МБ'
                  : 'JPG/PNG до 25 МБ'}
              </Text>
            </Pressable>
          )}
          <Text style={[styles.cardHint, status === 'error' && styles.errorText]}>{helperText}</Text>
        </View>
      )}

      <Pressable
        style={[styles.detectButton, isDetectDisabled && styles.detectButtonDisabled]}
        disabled={isDetectDisabled}
        onPress={handleDetect}>
        <Text style={styles.detectButtonText}>
          {status === 'loading' ? 'Запрашиваем модель…' : 'Запустить инференс'}
        </Text>
      </Pressable>

      <Text style={styles.sectionTitle}>2. Bounding box и confidence</Text>
      <DetectionPreview
        mediaType={mediaType}
        attachment={previewAttachment}
        boxes={result?.boxes}
        fallbackMessage="Здесь появится предпросмотр и прямоугольники после запроса к модели."
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Детализация</Text>
        <DetectionSummary
          boxes={result?.boxes ?? []}
          inferenceTimeMs={result?.inferenceTimeMs}
          hint={summaryHint}
        />
      </View>
    </ScrollView>
  );
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) {
    return '—';
  }
  if (size < 1024) {
    return `${size} Б`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} КБ`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

function shortenEndpoint(endpoint: string, baseUrl: string) {
  if (endpoint.startsWith(baseUrl)) {
    const sliced = endpoint.slice(baseUrl.length);
    return sliced.length ? sliced : '/';
  }
  return endpoint;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 24,
    gap: 24,
    paddingBottom: 64,
  },
  header: {
    gap: 12,
  },
  logo: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 22,
  },
  apiBadge: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#F8FAFC',
  },
  apiBadgeLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  apiBadgeValue: {
    marginTop: 6,
    fontWeight: '600',
  },
  apiBadgeHint: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  mediaOptions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  mediaOption: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#fff',
  },
  mediaOptionActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  mediaOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mediaOptionTextActive: {
    color: '#fff',
  },
  mediaOptionHint: {
    marginTop: 4,
    color: '#475569',
    fontSize: 12,
  },
  mediaOptionHintActive: {
    color: '#CBD5F5',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    borderWidth: 1,
    backgroundColor: '#fff',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardHint: {
    color: '#475569',
    fontSize: 13,
  },
  uploadArea: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5F5',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
  },
  uploadHint: {
    marginTop: 6,
    color: '#64748B',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileMeta: {
    color: '#64748B',
    marginTop: 4,
  },
  fileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  clearBtnText: {
    fontWeight: '600',
  },
  detectButton: {
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#2563EB',
  },
  detectButtonDisabled: {
    opacity: 0.6,
  },
  detectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#B91C1C',
  },
  cameraShell: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5F5',
  },
  camera: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  cameraPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  cameraPlaceholderText: {
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
  },
  cameraActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#0F172A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: '600',
  },
  captureButton: {
    backgroundColor: '#0F172A',
  },
});
