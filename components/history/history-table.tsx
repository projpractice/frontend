import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDateTime } from '@/lib/dayjs';
import type { HistoryItem } from '@/types/history';

type HistoryTableProps = {
  items: HistoryItem[];
  onSelect?: (item: HistoryItem) => void;
};

export const HistoryTable = memo(function HistoryTable({ items, onSelect }: HistoryTableProps) {
  if (!items.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Нет запросов</Text>
        <Text style={styles.emptyText}>Измените фильтры или диапазон дат.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.date]}>Время</Text>
        <Text style={[styles.cell, styles.source]}>Источник</Text>
        <Text style={[styles.cell, styles.filename]}>Файл</Text>
        <Text style={[styles.cell, styles.value]}>Dogs</Text>
        <Text style={[styles.cell, styles.value]}>Без намордника</Text>
        <Text style={[styles.cell, styles.value]}>Доля</Text>
        <Text style={[styles.cell, styles.value]}>Инференс</Text>
        <Text style={[styles.cell, styles.status]}>Статус</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, styles.bodyRow]}
            onPress={() => onSelect?.(item)}
            accessibilityRole="button">
            <Text style={[styles.cell, styles.date]}>{formatDateTime(item.created_at)}</Text>
            <Text style={[styles.cell, styles.source]}>{item.source_type ?? '—'}</Text>
            <Text style={[styles.cell, styles.filename]} numberOfLines={1}>
              {item.filename ?? '—'}
            </Text>
            <Text style={[styles.cell, styles.value]}>{item.dogs_total}</Text>
            <Text style={[styles.cell, styles.value]}>{item.dogs_nomuzzle}</Text>
            <Text style={[styles.cell, styles.value]}>
              {(item.nomuzzle_rate * 100).toFixed(1)}%
            </Text>
            <Text style={[styles.cell, styles.value]}>{item.inference_time_ms} мс</Text>
            <StatusBadge status={item.status} />
          </Pressable>
        )}
      />
    </View>
  );
});

function StatusBadge({ status }: { status: HistoryItem['status'] }) {
  const palette = getStatusPalette(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.statusText, { color: palette.color }]}>{palette.label}</Text>
    </View>
  );
}

function getStatusPalette(status: HistoryItem['status']) {
  switch (status) {
    case 'success':
      return { bg: 'rgba(34,197,94,0.15)', color: '#15803d', label: 'Успешно' };
    case 'error':
      return { bg: 'rgba(248,113,113,0.2)', color: '#b91c1c', label: 'Ошибка' };
    case 'processing':
      return { bg: 'rgba(14,165,233,0.2)', color: '#0369a1', label: 'Обработка' };
    default:
      return { bg: 'rgba(148,163,184,0.2)', color: '#334155', label: status ?? '—' };
  }
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: '#F8FAFC',
  },
  bodyRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148,163,184,0.3)',
  },
  cell: {
    fontSize: 13,
  },
  date: {
    flexBasis: 140,
    flexShrink: 0,
  },
  source: {
    flexBasis: 90,
    flexShrink: 0,
  },
  filename: {
    flex: 1,
    paddingRight: 8,
  },
  value: {
    width: 90,
    textAlign: 'right',
  },
  status: {
    width: 120,
    alignItems: 'flex-end',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#475569',
  },
});
