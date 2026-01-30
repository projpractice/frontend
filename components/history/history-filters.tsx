import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DateRangeFilter } from '@/components/filters/date-range-filter';
import type { HistoryFilters, RequestStatus, SourceType } from '@/types/history';

type HistoryFiltersProps = {
  filters: HistoryFilters;
  onChange: (filters: HistoryFilters) => void;
  onApply: () => void;
  onReset: () => void;
  limitOptions: number[];
};

const statusOptions: { label: string; value: HistoryFilters['status'] }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Успешно', value: 'success' },
  { label: 'Ошибка', value: 'error' },
];

const sourceOptions: { label: string; value: HistoryFilters['source_type'] }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Изображение', value: 'image' },
  { label: 'Видео', value: 'video' },
  { label: 'Webcam', value: 'webcam' },
];

export function HistoryFiltersPanel({
  filters,
  onChange,
  onApply,
  onReset,
  limitOptions,
}: HistoryFiltersProps) {
  const handleLimitChange = (limit: number) => {
    onChange({ ...filters, limit, offset: 0 });
  };

  return (
    <View style={styles.container}>
      <DateRangeFilter
        label="Диапазон дат"
        value={{ from: filters.from ?? '', to: filters.to ?? '' }}
        onChange={next => onChange({ ...filters, from: next.from, to: next.to })}
      />

      <View style={styles.row}>
        <FilterSelect
          label="Статус"
          value={filters.status ?? 'all'}
          options={statusOptions}
          onChange={value => onChange({ ...filters, status: value as RequestStatus | 'all' })}
        />
        <FilterSelect
          label="Источник"
          value={filters.source_type ?? 'all'}
          options={sourceOptions}
          onChange={value => onChange({ ...filters, source_type: value as SourceType | 'all' })}
        />
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.secondary]} onPress={onReset}>
          <Text style={styles.secondaryText}>Сбросить</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.primary]} onPress={onApply}>
          <Text style={styles.primaryText}>Применить</Text>
        </Pressable>
      </View>

      <View style={styles.limitRow}>
        <Text style={styles.limitLabel}>Записей на странице:</Text>
        <View style={styles.limitOptions}>
          {limitOptions.map(option => {
            const isActive = option === (filters.limit ?? limitOptions[0]);
            return (
              <Pressable
                key={option}
                onPress={() => handleLimitChange(option)}
                style={[styles.limitBadge, isActive && styles.limitBadgeActive]}>
                <Text style={[styles.limitBadgeText, isActive && styles.limitBadgeTextActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

type FilterSelectProps = {
  label: string;
  value: HistoryFilters['status'] | HistoryFilters['source_type'];
  options: { label: string; value: string | undefined }[];
  onChange: (value: string) => void;
};

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <View style={styles.filterSelect}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectRow}>
        {options.map(option => {
          const isActive = option.value === value;
          return (
            <Pressable
              key={option.label}
              onPress={() => onChange(option.value ?? 'all')}
              style={[styles.selectButton, isActive && styles.selectButtonActive]}>
              <Text style={[styles.selectText, isActive && styles.selectTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  filterSelect: {
    flex: 1,
    minWidth: 160,
    gap: 8,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#475569',
  },
  selectRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  selectText: {
    color: '#0F172A',
  },
  selectTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primary: {
    backgroundColor: '#0F172A',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#0F172A',
  },
  secondaryText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  limitLabel: {
    fontWeight: '600',
  },
  limitOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  limitBadge: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  limitBadgeActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  limitBadgeText: {
    color: '#0F172A',
  },
  limitBadgeTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
