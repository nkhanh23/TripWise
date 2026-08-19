import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { useAuth } from '../auth/AuthProvider';
import { colors, radius, spacing } from '../../theme/tokens';

export function ProfileScreen() {
  const { profile, signOut, user } = useAuth();
  const displayName = profile?.display_name ?? (typeof user?.user_metadata.display_name === 'string' ? user.user_metadata.display_name : 'Traveler');
  const email = user?.email ?? 'Chưa có email';

  return (
    <Screen>
      <View style={styles.card}>
        <AppText variant="title">Profile</AppText>
        <AppText>{displayName}</AppText>
        <AppText>{email}</AppText>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOutButton}>
          <AppText>Đăng xuất</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.background.surface, borderColor: colors.border, borderRadius: radius.card, borderWidth: 2, gap: spacing.sm, padding: spacing.lg },
  signOutButton: { alignItems: 'center', backgroundColor: colors.brand.yellow, borderColor: colors.border, borderRadius: radius.control, borderWidth: 1, marginTop: spacing.md, padding: spacing.md },
});
