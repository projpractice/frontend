import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  API_BASE_URL,
  DETECT_IMAGE_ENDPOINT,
  DETECT_VIDEO_ENDPOINT,
  STREAM_WS_ENDPOINT,
  USE_MOCK_RESPONSES,
} from '@/constants/config';
import { Colors, Fonts } from '@/constants/theme';

export default function DocsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Как подключиться к бэкенду</Text>
      <Text style={styles.paragraph}>
        Клиент отправляет фотографии и отдельные кадры на{' '}
        <Text style={styles.bold}>{DETECT_IMAGE_ENDPOINT}</Text>, а видео — на{' '}
        <Text style={styles.bold}>{DETECT_VIDEO_ENDPOINT}</Text>. Для реального прямого эфира FastAPI также поднимает
        WebSocket <Text style={styles.bold}>{STREAM_WS_ENDPOINT}</Text>. Интерфейс сейчас снимает кадр с камеры и шлёт его
        как обычное изображение, чтобы сразу нарисовать bounding boxes в предпросмотре.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Примеры запросов</Text>
        <Text style={styles.paragraph}>Фото или кадр из камеры:</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>
            {`curl -X POST ${DETECT_IMAGE_ENDPOINT} \\
  -H "Accept: application/json" \\
  -F "image=@dog.jpg"`}
          </Text>
        </View>
        <Text style={styles.paragraph}>Видео (в ответе размеченный mp4):</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>
            {`curl -X POST ${DETECT_VIDEO_ENDPOINT} \\
  -F "video=@clip.mp4" \\
  --output annotated_clip.mp4`}
          </Text>
        </View>
        <Text style={styles.paragraph}>
          Для постоянного стрима подключитесь к <Text style={styles.bold}>{STREAM_WS_ENDPOINT}</Text> и отправляйте
          бинарные JPEG-кадры. Клиент берёт отдельный кадр и отправляет его в REST endpoint — так результат сразу
          отображается на экране.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ответ сервера</Text>
        <Text style={styles.paragraph}>
          /detect/image возвращает JSON с абсолютными координатами (в пикселях):
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>
            {`{
  "detections": [
    { "label": "muzzle", "confidence": 0.91,
      "x_min": 123, "y_min": 77, "x_max": 344, "y_max": 280 }
  ]
}`}
          </Text>
        </View>
        <Text style={styles.paragraph}>
          UI определяет размер исходного изображения и нормализует координаты (0..1), после чего рисует bounding boxes
          поверх предпросмотра.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Переменные окружения</Text>
        <Text style={styles.listItem}>
          • <Text style={styles.bold}>EXPO_PUBLIC_API_URL</Text> — базовый URL вашего сервиса (сейчас:
          {` ${API_BASE_URL} `})
        </Text>
        <Text style={styles.listItem}>
          • <Text style={styles.bold}>EXPO_PUBLIC_USE_MOCK</Text> — установите в <Text style={styles.bold}>true</Text>,
          чтобы работать с заготовленными данными без бэкенда (текущее состояние:
          {USE_MOCK_RESPONSES ? ' включено' : ' выключено'})
        </Text>
        <Text style={styles.paragraph}>
          Измените значения в <Text style={styles.bold}>app.json</Text> или в переменных среды, после чего
          перезапустите Expo.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Визуализация</Text>
        <Text style={styles.paragraph}>
          Bounding boxes рисуются поверх изображения, цвета генерируются автоматически. Для видео отображается mp4,
          который уже размечен на сервере, поэтому список детекций может оставаться пустым.
        </Text>
        <Text style={styles.paragraph}>
          Если модель вернула сообщение в поле <Text style={styles.bold}>message</Text>, его увидит пользователь под
          формой. Так можно подсказать, что анализ идёт на демо стенде или, например, что кадр слишком тёмный.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 24,
    gap: 24,
    paddingBottom: 96,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    padding: 20,
    backgroundColor: '#fff',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  paragraph: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  codeBlock: {
    borderRadius: 16,
    backgroundColor: '#0F172A',
    padding: 16,
  },
  code: {
    color: '#F8FAFC',
    fontFamily: Fonts.mono,
    fontSize: 13,
  },
  listItem: {
    color: '#475569',
    fontSize: 15,
  },
});
