export type GetPlacePhotoRequest = {
  googlePlaceId: string;
  maxWidth?: number;
};

export type PlacePhotoResult = {
  googlePlaceId: string;
  photoUri: string | null;
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
};

export type GetPlacePhotoSuccessResponse = {
  data: PlacePhotoResult;
};

export type GetPlacePhotoErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
