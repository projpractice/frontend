import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';

import { Colors } from '@/constants/theme';
import type { BoundingBox, MediaAttachment, MediaType } from '@/types/detection';

type DetectionPreviewProps = {
  mediaType: MediaType;
  attachment?: MediaAttachment | null;
  boxes?: BoundingBox[];
  fallbackMessage?: string;
};

type ContainerSize = {
  width: number;
  height: number;
};

export function DetectionPreview({
  mediaType,
  attachment,
  boxes,
  fallbackMessage,
}: DetectionPreviewProps) {
  const [container, setContainer] = useState<ContainerSize>({ width: 0, height: 0 });

  const orderedBoxes = useMemo(() => boxes ?? [], [boxes]);
  const aspectRatio = useMemo(() => {
    if (attachment?.width && attachment?.height) {
      const ratio = attachment.width / attachment.height;
      if (Number.isFinite(ratio) && ratio > 0) {
        return ratio;
      }
    }
    return mediaType === 'video' ? 16 / 9 : 4 / 3;
  }, [attachment?.height, attachment?.width, mediaType]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainer({ width, height });
  };

  const renderMedia = () => {
    if (mediaType === 'image' && attachment?.uri) {
      return <Image source={{ uri: attachment.uri }} contentFit="contain" style={styles.media} />;
    }

    if (mediaType === 'video' && attachment?.uri) {
      return (
        <Video
          source={{ uri: attachment.uri }}
          style={styles.media}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay={Platform.OS !== 'web'}
          isLooping
          isMuted
        />
      );
    }

    return (
      <View style={[styles.media, styles.placeholder]}>
        <Text style={styles.placeholderText}>
          {fallbackMessage ?? 'Загрузите файл для визуализации'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.preview, { aspectRatio }]} onLayout={handleLayout}>
        {renderMedia()}
        {container.width > 0 &&
          container.height > 0 &&
          orderedBoxes.map((box, index) => (
            <BoundingBoxView
              key={`${box.id}-${index}`}
              box={box}
              container={container}
              index={index}
            />
          ))}
      </View>
    </View>
  );
}

type BoundingBoxViewProps = {
  box: BoundingBox;
  index: number;
  container: ContainerSize;
};

const accentPalette = ['#F97316', '#22C55E', '#06B6D4', '#A855F7', '#E11D48'];

function BoundingBoxView({ box, container, index }: BoundingBoxViewProps) {
  const { width, height } = container;
  const { x, y, width: w, height: h } = box.box;
  const top = y * height;
  const left = x * width;
  const boxWidth = w * width;
  const boxHeight = h * height;
  const color = box.color ?? accentPalette[index % accentPalette.length];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.boundingBox,
        {
          top,
          left,
          width: boxWidth,
          height: boxHeight,
          borderColor: color,
        },
      ]}>
      <Text style={[styles.boxLabel, { backgroundColor: `${color}cc` }]}>
        {box.label} · {(box.confidence * 100).toFixed(1)}%
      </Text>
      {typeof box.frame === 'number' ? (
        <Text style={[styles.boxMeta, { color }]}>{`frame ${box.frame}`}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    borderColor: '#F0F0F0',
    borderWidth: 1,
    backgroundColor: Colors.light.background,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  preview: {
    width: '100%',
    backgroundColor: '#111',
    maxHeight: 420,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172Aa0',
  },
  placeholderText: {
    color: '#F8FAFC',
    textAlign: 'center',
    fontSize: 16,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
  },
  boxLabel: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  boxMeta: {
    marginTop: 'auto',
    position: 'absolute',
    bottom: 4,
    right: 6,
    fontSize: 11,
    fontWeight: '500',
  },
});
