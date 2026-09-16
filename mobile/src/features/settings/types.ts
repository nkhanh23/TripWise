import type { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type CurrencyCode =
  | 'USD'
  | 'VND'
  | 'THB'
  | 'JPY'
  | 'EUR'
  | 'GBP'
  | 'SGD'
  | 'KRW';

export type CurrencyOption = {
  code: CurrencyCode;
  nameKey: string;
  defaultName: string;
  countryKey: string;
  defaultCountry: string;
  symbol: string;
  isSuggested?: boolean;
};

export type DistanceUnit = 'km' | 'mi';

export type AppSettings = {
  currency: CurrencyCode;
  distanceUnit: DistanceUnit;
};

export type SettingsRowItem = {
  id: string;
  title: string;
  iconName: MaterialIconName;
  subtitle?: string;
  value?: string;
  isDestructive?: boolean;
  onPress?: () => void;
};

export type SettingsSectionData = {
  title: string;
  items: SettingsRowItem[];
};
