import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { dayjs } from '@/lib/dayjs';

type DateRange = {
  from: string;
  to: string;
};

type DateRangeFilterProps = {
  value: DateRange;
  onChange: (next: DateRange) => void;
  label?: string;
};

export function DateRangeFilter({ value, onChange, label }: DateRangeFilterProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <DateField
          label="C"
          value={value.from}
          onChange={date => onChange({ ...value, from: date })}
        />
        <DateField
          label="По"
          value={value.to}
          onChange={date => onChange({ ...value, to: date })}
        />
      </View>
    </View>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

function DateField({ label, value, onChange }: DateFieldProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Text style={styles.caption}>{label}</Text>
        <TextInput
          value={value}
          placeholder="YYYY-MM-DD"
          onChangeText={text => onChange(text)}
          style={styles.input}
        />
      </View>
    );
  }

  return <NativeDateField label={label} value={value} onChange={onChange} />;
}

function NativeDateField({ label, value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'set' && selected) {
      onChange(dayjs(selected).format('YYYY-MM-DD'));
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.caption}>{label}</Text>
      <Pressable style={styles.pickerButton} onPress={() => setOpen(true)}>
        <Text style={styles.pickerValue}>
          {value ? dayjs(value).format('DD.MM.YYYY') : 'Выбрать'}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker value={value ? new Date(value) : new Date()} mode="date" onChange={handleChange} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  caption: {
    fontSize: 12,
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
  },
  pickerValue: {
    fontSize: 14,
  },
});
