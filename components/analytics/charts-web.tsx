import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { dayjs } from '@/lib/dayjs';
import type { DailyMetrics } from '@/types/history';

type ChartsWebProps = {
  data: DailyMetrics[];
  truncated?: boolean;
};

function ChartsWeb({ data, truncated }: ChartsWebProps) {
  const chartData = useMemo(
    () =>
      data.map(point => {
        const rate = point.dogs_total > 0 ? (point.dogs_nomuzzle / point.dogs_total) * 100 : 0;
        return {
          date: dayjs(point.date).format('DD.MM'),
          requests: point.requests,
          violations: point.dogs_nomuzzle,
          nomuzzleRate: Number(rate.toFixed(1)),
          inference: Number(point.avg_inference_ms.toFixed(1)),
        };
      }),
    [data]
  );

  if (!chartData.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Нет данных за выбранный период</Text>
        <Text style={styles.emptyText}>Попробуйте изменить диапазон и фильтры.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {truncated ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Графики построены по первым {chartData.length} записям. Уточните диапазон дат для точной
            статистики.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.chartTitle}>Запросы по дням</Text>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="requests" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </View>

      <View style={styles.card}>
        <Text style={styles.chartTitle}>Нарушения по дням</Text>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="violations" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </View>

      <View style={styles.card}>
        <Text style={styles.chartTitle}>Доля нарушений</Text>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis unit="%" />
            <Tooltip />
            <Line type="monotone" dataKey="nomuzzleRate" stroke="#f97316" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </View>

      <View style={styles.card}>
        <Text style={styles.chartTitle}>Среднее время инференса</Text>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis unit="мс" />
            <Tooltip />
            <Line type="monotone" dataKey="inference" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </View>
    </View>
  );
}

export default memo(ChartsWeb);

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#475569',
  },
  notice: {
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 12,
  },
  noticeText: {
    color: '#854d0e',
  },
});
