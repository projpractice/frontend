import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { DetectionPreview, DetectionSummary } from '@/components/detector';
import {
  API_BASE_URL,
  DETECT_IMAGE_ENDPOINT,
  DETECT_VIDEO_ENDPOINT,
  USE_MOCK_RESPONSES,
} from '@/constants/config';
import { Colors } from '@/constants/theme';
import { detectDogMuzzle } from '@/lib/api';
import { releaseMediaAttachment, resolveImageDimensions } from '@/lib/media';
import type { DetectionResponse, MediaAttachment, MediaType } from '@/types/detection';

type RequestStatus = 'idle' | 'loading' | 'error' | 'success';

const mediaOptions: { label: string; type: MediaType; hint: string }[] = [
  { type: 'image', label: 'Изображение', hint: 'PNG, JPG' },
  { type: 'video', label: 'Видео', hint: 'MP4, MOV' },
];

export default function HomeScreen() {
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const annotatedResultRef = useRef<MediaAttachment | null>(null);

  const apiLabel = USE_MOCK_RESPONSES ? 'Демо режим · мок данные' : API_BASE_URL;
  const endpointHint = USE_MOCK_RESPONSES
    ? 'Клиент использует встроенные демонстрационные данные.'
    : `POST ${shortenEndpoint(DETECT_IMAGE_ENDPOINT, API_BASE_URL)} · POST ${shortenEndpoint(
        DETECT_VIDEO_ENDPOINT,
        API_BASE_URL
      )}`;

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

  const clearMedia = useCallback(() => {
    setAttachment(null);
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

  const handleDetect = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (!attachment) {
        throw new Error('Прикрепите файл для анализа.');
      }
      const response = await detectDogMuzzle({
        mediaType,
        attachment,
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
  }, [attachment, mediaType]);

  const isDetectDisabled = useMemo(() => {
    if (status === 'loading') {
      return true;
    }
    return !attachment;
  }, [attachment, status]);

  const helperText = useMemo(() => {
    if (status === 'error' && error) {
      return error;
    }
    if (status === 'success' && result?.message) {
      return result.message;
    }
    if (!attachment) {
      return 'Прикрепите файл, который уйдёт в инференс на бэкенд.';
    }
    return `${attachment.name ?? 'Файл'} (${formatFileSize(attachment.size)})`;
  }, [attachment, error, result?.message, status]);

  const previewAttachment = result?.annotatedMedia ?? attachment ?? undefined;

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
          Проверка наличия намордника на изображениях и видео.
        </Text>
        <View style={styles.apiBadge}>
          <Text style={styles.apiBadgeLabel}>Backend</Text>
          <Text style={styles.apiBadgeValue} numberOfLines={1}>
            {apiLabel}
          </Text>
          <Text style={styles.apiBadgeHint}>{endpointHint}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>1. Загрузите файл</Text>
      <View style={styles.mediaOptions}>
        {mediaOptions.map(option => {
          const isActive = option.type === mediaType;
          return (
            <Pressable
              key={option.type}
              onPress={() => {
                if (mediaType !== option.type) {
                  setAttachment(null);
                  setResult(null);
                }
                setMediaType(option.type);
                setError(null);
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
              {mediaType === 'video' ? 'Поддерживаются mp4/mov до 150 МБ' : 'JPG/PNG до 25 МБ'}
            </Text>
          </Pressable>
        )}
        <Text style={[styles.cardHint, status === 'error' && styles.errorText]}>{helperText}</Text>
      </View>

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
});
