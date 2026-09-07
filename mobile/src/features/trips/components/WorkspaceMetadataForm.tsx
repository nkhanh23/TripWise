import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '../../../components/AppText';
import type { WorkspaceItemKind, WorkspaceSourceLink } from '../../../integration/contracts';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../theme';
import { radius, spacing, typography } from '../../../theme/tokens';
import type {
  WorkspaceAccommodationDraft, WorkspaceContactDraft, WorkspaceSourceLinkDraft, WorkspaceTransportDraft,
} from '../useActivityEditorController';

const transportModes: WorkspaceTransportDraft['mode'][] = ['walk', 'drive', 'transit', 'bus', 'train', 'flight', 'motorbike', 'ferry', 'other'];
const sourceLinkTypes: WorkspaceSourceLink['type'][] = ['google_maps', 'facebook', 'instagram', 'tiktok', 'website', 'booking', 'other'];

type Props = {
  itemKind: WorkspaceItemKind;
  contact: WorkspaceContactDraft;
  transport: WorkspaceTransportDraft;
  accommodation: WorkspaceAccommodationDraft;
  sourceLinks: WorkspaceSourceLinkDraft[];
  saving: boolean;
  mutationReady: boolean;
  errorKey: string | null;
  setContactField: (field: keyof WorkspaceContactDraft, value: string) => void;
  setTransportField: (field: keyof WorkspaceTransportDraft, value: string) => void;
  setAccommodationField: (field: keyof WorkspaceAccommodationDraft, value: string) => void;
  addSourceLink: () => void;
  updateSourceLink: (index: number, patch: Partial<WorkspaceSourceLinkDraft>) => void;
  removeSourceLink: (index: number) => void;
  saveSourceLinks: () => Promise<void>;
};

export function WorkspaceMetadataForm(props: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const disabled = props.saving || !props.mutationReady;
  return <View style={styles.root}>
    <Section title={t('workspaceEditor.contact')} icon="contact-phone">
      <MetadataField label={t('workspaceEditor.contactName')} value={props.contact.name} onChangeText={(value) => props.setContactField('name', value)} maxLength={120}/>
      <MetadataField label={t('workspaceEditor.contactPhone')} value={props.contact.phone} onChangeText={(value) => props.setContactField('phone', value)} maxLength={64} keyboardType="phone-pad"/>
      <MetadataField label={t('workspaceEditor.contactAddress')} value={props.contact.address} onChangeText={(value) => props.setContactField('address', value)} maxLength={500}/>
      <MetadataField label={t('workspaceEditor.websiteUrl')} value={props.contact.websiteUrl} onChangeText={(value) => props.setContactField('websiteUrl', value)} maxLength={2048} keyboardType="url" autoCapitalize="none"/>
      <MetadataField label={t('workspaceEditor.bookingUrl')} value={props.contact.bookingUrl} onChangeText={(value) => props.setContactField('bookingUrl', value)} maxLength={2048} keyboardType="url" autoCapitalize="none"/>
      <MetadataField label={t('workspaceEditor.reservationCode')} value={props.contact.reservationCode} onChangeText={(value) => props.setContactField('reservationCode', value)} maxLength={128}/>
      {props.errorKey === 'workspaceEditor.contactInvalid' ? <ErrorText text={t(props.errorKey)}/> : null}
    </Section>

    {props.itemKind === 'transport' ? <Section title={t('workspaceEditor.transport')} icon="directions-transit">
      <AppText style={styles.label}>{t('workspaceEditor.transportMode')}</AppText>
      <View style={styles.chips}>{transportModes.map((mode) => <Choice key={mode} label={t(`workspaceEditor.transportMode.${mode}`)} selected={props.transport.mode === mode} onPress={() => props.setTransportField('mode', mode)}/>)}</View>
      <MetadataField label={t('workspaceEditor.originLabel')} value={props.transport.originLabel} onChangeText={(value) => props.setTransportField('originLabel', value)} maxLength={160}/>
      <MetadataField label={t('workspaceEditor.destinationLabel')} value={props.transport.destinationLabel} onChangeText={(value) => props.setTransportField('destinationLabel', value)} maxLength={160}/>
      <MetadataField label={t('workspaceEditor.operatorName')} value={props.transport.operatorName} onChangeText={(value) => props.setTransportField('operatorName', value)} maxLength={160}/>
      <MetadataField label={t('workspaceEditor.departureAt')} value={props.transport.departureAt} onChangeText={(value) => props.setTransportField('departureAt', value)} placeholder="2028-01-01T10:00:00Z" autoCapitalize="none"/>
      <MetadataField label={t('workspaceEditor.arrivalAt')} value={props.transport.arrivalAt} onChangeText={(value) => props.setTransportField('arrivalAt', value)} placeholder="2028-01-01T12:00:00Z" autoCapitalize="none"/>
      <View style={styles.row}><MetadataField label={t('workspaceEditor.plannedCost')} value={props.transport.plannedCostAmount} onChangeText={(value) => props.setTransportField('plannedCostAmount', value)} keyboardType="decimal-pad"/><MetadataField label={t('workspaceEditor.currency')} value={props.transport.plannedCostCurrency} onChangeText={(value) => props.setTransportField('plannedCostCurrency', value)} maxLength={3} autoCapitalize="characters"/></View>
      {props.errorKey === 'workspaceEditor.transportInvalid' ? <ErrorText text={t(props.errorKey)}/> : null}
    </Section> : null}

    {props.itemKind === 'accommodation' ? <Section title={t('workspaceEditor.accommodation')} icon="hotel">
      <MetadataField label={t('workspaceEditor.checkInAt')} value={props.accommodation.checkInAt} onChangeText={(value) => props.setAccommodationField('checkInAt', value)} placeholder="2028-01-01T15:00:00Z" autoCapitalize="none"/>
      <MetadataField label={t('workspaceEditor.checkOutAt')} value={props.accommodation.checkOutAt} onChangeText={(value) => props.setAccommodationField('checkOutAt', value)} placeholder="2028-01-03T11:00:00Z" autoCapitalize="none"/>
      <MetadataField label={t('workspaceEditor.nights')} value={props.accommodation.nights} onChangeText={(value) => props.setAccommodationField('nights', value)} keyboardType="number-pad"/>
      {props.errorKey === 'workspaceEditor.accommodationInvalid' ? <ErrorText text={t(props.errorKey)}/> : null}
    </Section> : null}

    <Section title={t('workspaceEditor.sourceLinks')} icon="link">
      {props.sourceLinks.map((link, index) => <View key={`${index}-${link.type}`} style={[styles.linkCard, { borderColor: colors.border.default }]}>
        <View style={styles.linkHeader}><AppText style={styles.label}>{t('workspaceEditor.sourceLink')} {index + 1}</AppText><Pressable accessibilityRole="button" accessibilityLabel={`${t('workspaceEditor.removeSourceLink')} ${index + 1}`} onPress={() => props.removeSourceLink(index)} style={styles.iconButton}><MaterialIcons color={colors.state.error} name="delete-outline" size={22}/></Pressable></View>
        <View style={styles.chips}>{sourceLinkTypes.map((type) => <Choice key={type} label={t(`workspaceEditor.sourceType.${type}`)} selected={link.type === type} onPress={() => props.updateSourceLink(index, { type })}/>)}</View>
        <MetadataField label={t('workspaceEditor.sourceUrl')} value={link.url} onChangeText={(value) => props.updateSourceLink(index, { url: value })} keyboardType="url" autoCapitalize="none" maxLength={2048}/>
        {link.type === 'other' ? <MetadataField label={t('workspaceEditor.sourceLabel')} value={link.label} onChangeText={(value) => props.updateSourceLink(index, { label: value })} maxLength={120}/> : null}
      </View>)}
      {props.errorKey === 'workspaceEditor.sourceLinksInvalid' ? <ErrorText text={t(props.errorKey)}/> : null}
      <View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('workspaceEditor.addSourceLink')} disabled={props.sourceLinks.length >= 12} onPress={props.addSourceLink} style={[styles.secondaryButton, {borderColor:colors.border.default,opacity:props.sourceLinks.length >= 12 ? .5 : 1}]}><MaterialIcons color={colors.brand.primary} name="add-link" size={20}/><AppText>{t('workspaceEditor.addSourceLink')}</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('workspaceEditor.saveSourceLinks')} accessibilityState={{disabled}} disabled={disabled} onPress={() => void props.saveSourceLinks()} style={[styles.primaryButton,{backgroundColor:colors.brand.primary,opacity:disabled ? .6 : 1}]}><AppText style={{color:colors.text.inverse,fontWeight:typography.fontWeight.semibold}}>{t('workspaceEditor.saveSourceLinks')}</AppText></Pressable></View>
    </Section>
  </View>;
}

function Section({ title, icon, children }: { title: string; icon: keyof typeof MaterialIcons.glyphMap; children: ReactNode }) { const { colors } = useTheme(); return <View style={[styles.section,{backgroundColor:colors.background.surface,borderColor:colors.border.default}]}><View style={styles.sectionHeader}><MaterialIcons color={colors.brand.primary} name={icon} size={20}/><AppText variant="title" style={styles.sectionTitle}>{title}</AppText></View>{children}</View>; }
function MetadataField({ label, ...props }: { label: string } & ComponentProps<typeof TextInput>) { const { colors }=useTheme(); return <View style={styles.field}><AppText style={styles.label}>{label}</AppText><TextInput accessibilityLabel={label} placeholderTextColor={colors.text.muted} {...props} style={[styles.input,{backgroundColor:colors.background.canvas,color:colors.text.primary,borderColor:colors.border.default},props.style]}/></View>; }
function Choice({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}) { const {colors}=useTheme(); return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={[styles.choice,{backgroundColor:selected?colors.brand.primary:colors.background.canvas,borderColor:selected?colors.brand.primary:colors.border.default}]}><AppText style={{color:selected?colors.text.inverse:colors.text.primary}}>{label}</AppText></Pressable>; }
function ErrorText({text}:{text:string}) { const {colors}=useTheme(); return <View accessibilityRole="alert"><AppText style={{color:colors.state.error}}>{text}</AppText></View>; }

const styles=StyleSheet.create({root:{gap:spacing.md},section:{borderWidth:1,borderRadius:radius.card,padding:spacing.md,gap:spacing.sm},sectionHeader:{flexDirection:'row',alignItems:'center',gap:spacing.sm},sectionTitle:{fontSize:typography.titleSmall},field:{flex:1,gap:spacing.xs},label:{fontWeight:typography.fontWeight.semibold},input:{minHeight:44,borderWidth:1,borderRadius:radius.input,paddingHorizontal:spacing.md,paddingVertical:spacing.sm},row:{flexDirection:'row',gap:spacing.sm},chips:{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs},choice:{minHeight:44,justifyContent:'center',paddingHorizontal:spacing.md,borderWidth:1,borderRadius:radius.pill},linkCard:{borderTopWidth:1,paddingTop:spacing.sm,gap:spacing.sm},linkHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},actions:{gap:spacing.sm},secondaryButton:{minHeight:44,borderWidth:1,borderRadius:radius.input,flexDirection:'row',gap:spacing.sm,alignItems:'center',justifyContent:'center'},primaryButton:{minHeight:44,borderRadius:radius.input,alignItems:'center',justifyContent:'center'}});
