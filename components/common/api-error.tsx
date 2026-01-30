import { Pressable, StyleSheet, Text, View } from 'react-native';

type ApiErrorProps = {
  message: string;
  onRetry?: () => void;
};

export function ApiError({ message, onRetry }: ApiErrorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryText}>Повторить</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  text: {
    color: '#991b1b',
    fontSize: 14,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
