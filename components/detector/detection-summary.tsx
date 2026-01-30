import { StyleSheet, Text, View } from 'react-native';

import type { BoundingBox } from '@/types/detection';

type DetectionSummaryProps = {
  boxes: BoundingBox[];
  inferenceTimeMs?: number;
  hint?: string;
};

export function DetectionSummary({ boxes, inferenceTimeMs, hint }: DetectionSummaryProps) {
  if (!boxes.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Нет объектов</Text>
        <Text style={styles.emptyText}>
          {hint ?? 'Запустите анализ, чтобы увидеть bounding boxes и уверенность модели.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {typeof inferenceTimeMs === 'number' ? (
        <Text style={styles.meta}>{`Inference: ${inferenceTimeMs.toFixed(0)} ms`}</Text>
      ) : null}
      {boxes.map(box => (
        <View style={styles.row} key={`${box.id}-${box.frame ?? 'base'}`}>
          <View>
            <Text style={styles.label}>{box.label}</Text>
            <Text style={styles.meta}>
              {(box.confidence * 100).toFixed(1)}% · x{Math.round(box.box.x * 100) / 100}, y
              {Math.round(box.box.y * 100) / 100}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{box.frame ? `Frame ${box.frame}` : box.id}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  row: {
    paddingVertical: 12,
    borderBottomColor: 'rgba(148, 163, 184, 0.4)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    color: '#475569',
    lineHeight: 20,
  },
});
