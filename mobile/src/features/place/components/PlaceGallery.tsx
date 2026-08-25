import { memo, useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../../../theme/tokens";

type Props = {
  heroImageUrl: string;
  galleryUrls: string[];
  placeName: string;
};

export const PlaceGallery = memo(function PlaceGallery({
  heroImageUrl,
  galleryUrls,
  placeName,
}: Props) {
  const allImages = galleryUrls.length > 0 ? galleryUrls : [heroImageUrl];
  const [selectedImage, setSelectedImage] = useState<string>(heroImageUrl);

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const isSelected = item === selectedImage;

      return (
        <Pressable
          accessibilityHint={`Xem ảnh ${index + 1} của ${placeName}`}
          accessibilityLabel={`Ảnh ${index + 1}`}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => setSelectedImage(item)}
          style={[styles.thumbnailWrap, isSelected && styles.thumbnailSelected]}
        >
          <Image
            accessibilityLabel={`${placeName} thumbnail ${index + 1}`}
            accessibilityRole="image"
            source={{ uri: item }}
            style={styles.thumbnailImage}
          />
        </Pressable>
      );
    },
    [selectedImage, placeName],
  );

  return (
    <View style={styles.container}>
      {/* Main Hero Image */}
      <View style={styles.heroWrap}>
        <Image
          accessibilityHint={`Ảnh đại diện lớn của ${placeName}`}
          accessibilityLabel={placeName}
          accessibilityRole="image"
          source={{ uri: selectedImage }}
          style={styles.heroImage}
        />
        <View style={styles.gradientOverlay} />
      </View>

      {/* Horizontal Gallery Thumbnails if multiple images exist */}
      {allImages.length > 1 ? (
        <FlatList
          contentContainerStyle={styles.galleryList}
          data={allImages}
          horizontal
          keyExtractor={(item, index) => `${item}_${index}`}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  heroWrap: {
    height: 320,
    position: "relative",
    width: "100%",
  },
  heroImage: {
    backgroundColor: colors.background.surfaceVariant,
    height: "100%",
    width: "100%",
  },
  gradientOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  galleryList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  thumbnailWrap: {
    borderColor: "transparent",
    borderRadius: radius.input,
    borderWidth: 2,
    overflow: "hidden",
  },
  thumbnailSelected: {
    borderColor: colors.brand.primary,
  },
  thumbnailImage: {
    borderRadius: radius.input - 2,
    height: 52,
    width: 68,
  },
});
