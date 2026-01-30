import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/components/common/api-error';
import { LoadingState } from '@/components/common/loading-state';
import { formatDateTime } from '@/lib/dayjs';
import { useRequestDetails } from '@/hooks/use-history';

type RequestDetailsModalProps = {
  requestId?: string;
  visible: boolean;
  onClose: () => void;
};

export function RequestDetailsModal({ requestId, visible, onClose }: RequestDetailsModalProps) {
  const [showRaw, setShowRaw] = useState(false);
  const { data, isLoading, error, refetch } = useRequestDetails(requestId, showRaw);

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Запрос {requestId}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Закрыть</Text>
          </Pressable>
        </View>

        {isLoading ? <LoadingState label="Загружаем детали…" /> : null}
        {error ? <ApiError message={error.message} onRetry={refetch} /> : null}

        {data ? (
          <View style={styles.details}>
            <DetailRow label="Создано" value={formatDateTime(data.created_at)} />
            <DetailRow label="Источник" value={data.source_type ?? '—'} />
            <DetailRow label="Файл" value={data.filename ?? '—'} />
            <DetailRow label="Статус" value={data.status ?? '—'} />
            <DetailRow label="Dogs total" value={String(data.dogs_total ?? 0)} />
            <DetailRow label="Без намордника" value={String(data.dogs_nomuzzle ?? 0)} />
            <DetailRow
              label="Доля нарушений"
              value={`${((data.nomuzzle_rate ?? 0) * 100).toFixed(1)}%`}
            />
            <DetailRow label="Инференс" value={`${data.inference_time_ms ?? 0} мс`} />

            {data.parameters ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Параметры</Text>
                {Object.entries(data.parameters).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={String(value)} />
                ))}
              </View>
            ) : null}

            <Pressable style={styles.rawButton} onPress={() => setShowRaw(prev => !prev)}>
              <Text style={styles.rawButtonText}>
                {showRaw ? 'Скрыть raw JSON' : 'Показать raw JSON'}
              </Text>
            </Pressable>
            {showRaw && data.raw_result_json ? (
              <View style={styles.rawBlock}>
                <Text style={styles.rawText}>
                  {JSON.stringify(data.raw_result_json, null, 2)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  closeText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.4)',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#475569',
  },
  detailValue: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  section: {
    marginTop: 12,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rawButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  rawButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  rawBlock: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
  },
  rawText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: '#F8FAFC',
    fontSize: 12,
  },
});
