import type { ImageSourcePropType } from "react-native";

import type { ResolvedImage } from "../../integration/contracts";

const wikimediaImageHeaders = {
  "User-Agent": "TripWise/1.0 (https://github.com/nkhanh23/TripWise)",
} as const;

export function getResolvedImageSource(
  uri: string,
  resolvedImage?: ResolvedImage,
): ImageSourcePropType {
  return resolvedImage?.source === "WIKIMEDIA_PLACE"
    ? [{ uri, headers: wikimediaImageHeaders }]
    : { uri };
}
