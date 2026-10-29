import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Cropper from 'react-easy-crop';
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ImagePlus,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';
import colors from '@/constants/colors';
import {
  HealthDataKey,
  ProfileData,
  useDailyQuestStore,
} from '@/store/useDailyQuestStore';

const palette = colors.dark;

const characters = ['🧙', '🧝', '🧑‍🚀', '🧛', '🧚', '🥷', '🤖', '🦸'];

const titleOptions = [
  { title: '🔥 12일의 불꽃', requirement: '12일 스트릭 달성', unlocked: (streak: number) => streak >= 12 },
  { title: '🌱 루틴의 시작', requirement: '1일 스트릭 달성', unlocked: (streak: number) => streak >= 1 },
  { title: '✨ 레벨 10 모험가', requirement: 'Lv.10 달성', unlocked: (_streak: number, level: number) => level >= 10 },
  { title: '🏆 30일의 전설', requirement: '30일 스트릭 달성', unlocked: (streak: number) => streak >= 30 },
];

const healthItems: Array<{
  key: HealthDataKey;
  label: string;
  icon: string;
}> = [
  { key: 'steps', label: '걸음 수', icon: '👟' },
  { key: 'sleep', label: '수면', icon: '🌙' },
  { key: 'weight', label: '체중', icon: '⚖️' },
  { key: 'medication', label: '복약 기록', icon: '💊' },
];

const badgeOptions = [
  { icon: '🔥', title: '불꽃의 시작', condition: '7일 연속 스트릭', unlocked: (streak: number) => streak >= 7 },
  { icon: '⚔️', title: '첫 던전', condition: '던전 1회 클리어', unlocked: (_streak: number, _level: number, completed: number) => completed >= 1 },
  { icon: '💧', title: '꾸준한 하루', condition: '퀘스트 10개 완료', unlocked: (_streak: number, _level: number, completed: number) => completed >= 10 },
  { icon: '🌟', title: '레벨 10', condition: '레벨 10 달성', unlocked: (_streak: number, level: number) => level >= 10 },
  { icon: '👨‍👩‍👧‍👦', title: '길드 개척자', condition: '파티에 참여', unlocked: (_streak: number, _level: number, _completed: number, party: boolean) => party },
  { icon: '🏆', title: '전설의 루틴', condition: '30일 연속 스트릭', unlocked: (streak: number) => streak >= 30 },
];

function Toggle({
  enabled,
  onPress,
  testID,
}: {
  enabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      onPress={onPress}
      style={[styles.toggleTrack, enabled && styles.toggleTrackOn]}
    >
      <View style={[styles.toggleThumb, enabled && styles.toggleThumbOn]} />
    </Pressable>
  );
}

function ProfileAvatar({
  profile,
  size = 92,
}: {
  profile: ProfileData;
  size?: number;
}) {
  return profile.photoBase64 ? (
    <Image
      source={{ uri: profile.photoBase64 }}
      style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
    />
  ) : (
    <View
      style={[
        styles.profileCharacter,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ fontSize: size * 0.48 }}>{profile.character}</Text>
    </View>
  );
}

function CropEditor({
  image,
  onApply,
  onClose,
}: {
  image: string;
  onApply: (pixels: { x: number; y: number; width: number; height: number }) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState({ x: 0, y: 0, width: 0, height: 0 });
  return (
    <View style={styles.cropEditor}>
      <View style={styles.cropHeader}>
        <Text style={styles.sheetTitle}>사진 영역 조정</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={18} color={palette.mutedForeground} />
        </Pressable>
      </View>
      {Platform.OS === 'web' ? (
        <View style={styles.cropperWrap}>
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setPixels(areaPixels)}
            style={{
              containerStyle: { position: 'relative', width: '100%', height: 270 },
              cropAreaStyle: { color: 'rgba(18,19,26,0.68)', border: '2px solid #A58FFF' },
            }}
          />
        </View>
      ) : (
        <View style={styles.nativeCropPreview}>
          <Image source={{ uri: image }} style={styles.nativeCropImage} />
          <Text style={styles.nativeCropHint}>사진 선택기에서 원형 영역을 조정했어요.</Text>
        </View>
      )}
      {Platform.OS === 'web' ? (
        <View style={styles.zoomRow}>
          <Text style={styles.zoomLabel}>확대</Text>
          <View style={styles.zoomTrack}>
            <View style={[styles.zoomFill, { width: `${((zoom - 1) / 2) * 100}%` }]} />
          </View>
          <Text style={styles.zoomLabel}>{zoom.toFixed(1)}x</Text>
        </View>
      ) : null}
      <Pressable
        testID="profile-crop-apply"
        onPress={() => onApply(pixels)}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Check size={17} color={palette.white} strokeWidth={3} />
        <Text style={styles.primaryButtonText}>적용</Text>
      </Pressable>
    </View>
  );
}

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const profile = useDailyQuestStore((state) => state.profile);
  const level = useDailyQuestStore((state) => state.level);
  const streak = useDailyQuestStore((state) => state.streak);
  const longestStreak = useDailyQuestStore((state) => state.longestStreak);
  const completedQuestCount = useDailyQuestStore((state) => state.completedQuestCount);
  const totalExpEarned = useDailyQuestStore((state) => state.totalExpEarned);
  const freezeCount = useDailyQuestStore((state) => state.streakFreezeCount);
  const ownedPets = useDailyQuestStore((state) => state.ownedPets);
  const selectedPet = useDailyQuestStore((state) => state.selectedPet);
  const healthDataSettings = useDailyQuestStore((state) => state.healthDataSettings);
  const notificationSettings = useDailyQuestStore((state) => state.notificationSettings);
  const partyShareSettings = useDailyQuestStore((state) => state.partyShareSettings);
  const goals = useDailyQuestStore((state) => state.goals);
  const partyMembers = useDailyQuestStore((state) => state.partyMembers);
  const updateProfile = useDailyQuestStore((state) => state.updateProfile);
  const toggleHealthData = useDailyQuestStore((state) => state.toggleHealthData);
  const toggleNotification = useDailyQuestStore((state) => state.toggleNotification);
  const setReminderTime = useDailyQuestStore((state) => state.setReminderTime);
  const setSelectedPet = useDailyQuestStore((state) => state.setSelectedPet);
  const togglePartyShareSetting = useDailyQuestStore(
    (state) => state.togglePartyShareSetting,
  );
  const deleteGoal = useDailyQuestStore((state) => state.deleteGoal);
  const reset = useDailyQuestStore((state) => state.reset);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(profile.nickname);
  const [titleSheet, setTitleSheet] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [partyShareOpen, setPartyShareOpen] = useState(false);
  const [pendingDeleteGoal, setPendingDeleteGoal] = useState<string | null>(null);
  const [resetStep, setResetStep] = useState(0);
  const fileInputRef = useRef<any>(null);

  const nicknameError = useMemo(() => {
    if (!nicknameDraft) return '닉네임을 입력해 주세요.';
    if (nicknameDraft.length < 2) return '2자 이상 입력해 주세요.';
    if (nicknameDraft.length > 10) return '10자 이하로 입력해 주세요.';
    if (!/^[A-Za-z0-9가-힣]+$/.test(nicknameDraft)) {
      return '한글, 영문, 숫자만 사용할 수 있어요.';
    }
    return '';
  }, [nicknameDraft]);

  useEffect(() => {
    setNicknameDraft(profile.nickname);
  }, [profile.nickname]);

  const activeGoals = goals.filter((goal) => goal.id !== 'daily-routine');

  const saveNickname = () => {
    if (nicknameError) return;
    updateProfile({ nickname: nicknameDraft });
    setNicknameEditing(false);
  };

  const saveCroppedWebImage = (pixels: { x: number; y: number; width: number; height: number }) => {
    if (Platform.OS !== 'web' || !cropImage) return;
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(
        image,
        pixels.x,
        pixels.y,
        pixels.width,
        pixels.height,
        0,
        0,
        256,
        256,
      );
      updateProfile({ photoBase64: canvas.toDataURL('image/jpeg', 0.78) });
      setCropImage(null);
      setAvatarSheet(false);
    };
    image.src = cropImage;
  };

  const prepareNativeImage = async (uri: string) => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 256, height: 256 } }],
      {
        compress: 0.78,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      },
    );
    if (result.base64) {
      updateProfile({ photoBase64: `data:image/jpeg;base64,${result.base64}` });
      setAvatarSheet(false);
    }
  };

  const pickNativeImage = async (camera: boolean) => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
    if (!result.canceled && result.assets[0]?.uri) {
      await prepareNativeImage(result.assets[0].uri);
    }
  };

  const handleWebFile = (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(String(reader.result));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const displayPet = selectedPet || ownedPets[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            testID="profile-back"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
          <Text style={styles.pageTitle}>프로필</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <View style={styles.profileHero}>
          <View>
            <ProfileAvatar profile={profile} size={104} />
            <Pressable
              testID="profile-avatar-edit"
              onPress={() => setAvatarSheet(true)}
              style={({ pressed }) => [styles.avatarEditButton, pressed && styles.pressed]}
            >
              <Pencil size={14} color={palette.white} />
            </Pressable>
          </View>
          <View style={styles.profileIdentity}>
            <View style={styles.nicknameRow}>
              {nicknameEditing ? (
                <View style={styles.nicknameEditWrap}>
                  <TextInput
                    testID="profile-nickname-input"
                    autoFocus
                    value={nicknameDraft}
                    onChangeText={setNicknameDraft}
                    maxLength={10}
                    style={styles.nicknameInput}
                    placeholder="닉네임"
                    placeholderTextColor={palette.mutedForeground}
                  />
                  <Pressable
                    testID="profile-nickname-save"
                    disabled={Boolean(nicknameError)}
                    onPress={saveNickname}
                    style={[styles.inlineSaveButton, nicknameError && styles.disabledButton]}
                  >
                    <Check size={14} color={nicknameError ? palette.mutedForeground : palette.white} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.profileNickname}>{profile.nickname}</Text>
                  <Pressable onPress={() => setNicknameEditing(true)} style={styles.inlineIconButton}>
                    <Pencil size={14} color={palette.purpleBright} />
                  </Pressable>
                </>
              )}
            </View>
            {nicknameEditing && nicknameError ? (
              <Text style={styles.inputError}>{nicknameError}</Text>
            ) : null}
            <View style={styles.profileLevelRow}>
              <View style={styles.profileLevelPill}>
                <Text style={styles.profileLevelText}>Lv. {level}</Text>
              </View>
              <Pressable onPress={() => setTitleSheet(true)} style={styles.titleButton}>
                <Text style={styles.profileTitle}>{profile.title}</Text>
                <ChevronRight size={13} color={palette.mutedForeground} />
              </Pressable>
            </View>
            <Text style={styles.profilePetLine}>대표 펫 · {displayPet || '없음'}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>나의 기록 요약</Text>
        <View style={styles.statsRow}>
          <StatCard label="최장 스트릭" value={`${longestStreak}일`} icon="🔥" />
          <StatCard label="완료 퀘스트" value={`${completedQuestCount}`} icon="✅" />
          <StatCard label="누적 EXP" value={`${totalExpEarned}`} icon="✨" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>획득 뱃지</Text>
          <Text style={styles.sectionHint}>탭하면 조건 보기</Text>
        </View>
        <View style={styles.badgeGrid}>
          {badgeOptions.map((badge) => {
            const unlocked = badge.unlocked(streak, level, completedQuestCount, partyMembers.length > 0);
            return (
              <Pressable
                key={badge.title}
                onPress={() => !unlocked && setTooltip(`${badge.title} · ${badge.condition}`)}
                style={({ pressed }) => [
                  styles.badgeCard,
                  !unlocked && styles.badgeLocked,
                  pressed && styles.pressed,
                ]}
              >
                {unlocked ? (
                  <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                ) : (
                  <LockKeyhole size={19} color={palette.mutedForeground} />
                )}
                <Text style={[styles.badgeTitle, !unlocked && styles.lockedText]}>
                  {badge.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>인벤토리</Text>
        <View style={styles.inventoryCard}>
          <View style={styles.inventoryRow}>
            <View style={[styles.inventoryIcon, styles.inventoryIconAmber]}>
              <Text style={styles.inventoryEmoji}>❄️</Text>
            </View>
            <View style={styles.inventoryCopy}>
              <Text style={styles.inventoryTitle}>스트릭 프리즈</Text>
              <Text style={styles.inventoryDescription}>스트릭을 하루 보존하는 아이템</Text>
            </View>
            <Text style={styles.inventoryCount}>× {freezeCount}</Text>
          </View>
          <View style={styles.inventoryDivider} />
          <View style={styles.inventoryRow}>
            <View style={[styles.inventoryIcon, styles.inventoryIconPurple]}>
              <Text style={styles.inventoryEmoji}>🐾</Text>
            </View>
            <View style={styles.inventoryCopy}>
              <Text style={styles.inventoryTitle}>보유 펫</Text>
              <Text style={styles.inventoryDescription}>
                {ownedPets.length ? ownedPets.join(' · ') : '아직 획득한 펫이 없어요'}
              </Text>
            </View>
            {ownedPets.length ? (
              <Pressable
                testID="profile-pet-select"
                onPress={() => setSelectedPet(displayPet === ownedPets[0] ? ownedPets[ownedPets.length - 1] : ownedPets[0])}
                style={styles.petSelectButton}
              >
                <Text style={styles.petSelectText}>대표 지정</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionLabel}>설정</Text>
        <SettingsGroup title="건강 데이터 연동">
          {healthItems.map((item) => (
            <View key={item.key} style={styles.settingRow}>
              <Text style={styles.settingEmoji}>{item.icon}</Text>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>{item.label}</Text>
                <View style={styles.settingMetaRow}>
                  <Text style={styles.demoBadge}>시연용 데이터</Text>
                  {!healthDataSettings[item.key] ? (
                    <Text style={styles.manualText}>수동 체크</Text>
                  ) : null}
                </View>
              </View>
              <Toggle
                testID={`health-toggle-${item.key}`}
                enabled={healthDataSettings[item.key]}
                onPress={() => toggleHealthData(item.key)}
              />
            </View>
          ))}
        </SettingsGroup>

        <SettingsGroup title="알림">
          <View style={styles.settingRow}>
            <Clock3 size={17} color={palette.purpleBright} />
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>퀘스트 리마인더</Text>
              <Text style={styles.settingDescription}>매일 {notificationSettings.reminderTime}에 알려드려요</Text>
            </View>
            <Pressable
              onPress={() => setReminderTime(notificationSettings.reminderTime === '20:00' ? '21:00' : notificationSettings.reminderTime === '21:00' ? '22:00' : '20:00')}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>{notificationSettings.reminderTime}</Text>
            </Pressable>
            <Toggle enabled={notificationSettings.questReminder} onPress={() => toggleNotification('questReminder')} />
          </View>
          <SettingToggleRow
            icon={<Bell size={17} color={palette.accent} />}
            title="스트릭 위험 알림"
            description="밤 9시까지 미완료 시 알려드려요"
            enabled={notificationSettings.streakRisk}
            onPress={() => toggleNotification('streakRisk')}
          />
          <SettingToggleRow
            icon={<UserRound size={17} color={palette.success} />}
            title="파티 콕 찌르기 수신"
            description="가족의 응원 알림을 받아요"
            enabled={notificationSettings.partyNudge}
            onPress={() => toggleNotification('partyNudge')}
          />
        </SettingsGroup>

        <SettingsGroup title="파티 공유 범위">
          <Pressable
            testID="profile-party-share"
            onPress={() => setPartyShareOpen((value) => !value)}
            style={styles.settingRow}
          >
            <LockKeyhole size={17} color={palette.success} />
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>달성 여부 공유 설정</Text>
              <Text style={styles.settingDescription}>수치는 항상 비공개예요.</Text>
            </View>
            <ChevronRight
              size={17}
              color={palette.mutedForeground}
              style={partyShareOpen ? styles.chevronDown : undefined}
            />
          </Pressable>
          {partyShareOpen ? (
            <View style={styles.inlineShareList}>
              {([
                ['medication', '복약'],
                ['exercise', '운동'],
                ['sleep', '수면'],
                ['routine', '일상'],
              ] as const).map(([key, label]) => (
                <View key={key} style={styles.inlineShareRow}>
                  <Text style={styles.inlineShareLabel}>{label} 달성 여부</Text>
                  <Toggle enabled={partyShareSettings[key]} onPress={() => togglePartyShareSetting(key)} />
                </View>
              ))}
            </View>
          ) : null}
        </SettingsGroup>

        <SettingsGroup title="목표 관리">
          {activeGoals.length === 0 ? (
            <View style={styles.emptyGoals}>
              <Text style={styles.emptyGoalsText}>진행 중인 추가 목표가 없어요.</Text>
            </View>
          ) : (
            activeGoals.map((goal) => (
              <View key={goal.id} style={styles.settingRow}>
                <TargetDot color={goal.color} />
                <View style={styles.settingCopy}>
                  <Text style={styles.settingTitle}>{goal.title}</Text>
                  <Text style={styles.settingDescription}>{goal.startDate} — {goal.endDate}</Text>
                </View>
                <Pressable
                  testID={`delete-goal-${goal.id}`}
                  onPress={() => setPendingDeleteGoal(goal.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={16} color={palette.destructive} />
                </Pressable>
              </View>
            ))
          )}
        </SettingsGroup>

        <SettingsGroup title="계정">
          <SettingActionRow icon={<KeyRound size={17} color={palette.mutedForeground} />} title="로그아웃" onPress={() => Alert.alert('로그아웃', '계정 연동 후 사용할 수 있어요.')} />
          <SettingActionRow icon={<Trash2 size={17} color={palette.destructive} />} title="데이터 초기화" danger onPress={() => setResetStep(1)} />
          <View style={styles.settingRow}>
            <Text style={styles.settingEmoji}>ℹ️</Text>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>앱 버전</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </SettingsGroup>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {Platform.OS === 'web'
        ? React.createElement('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/*',
            capture: 'environment',
            onChange: handleWebFile,
            style: { display: 'none' },
          })
        : null}

      <Modal visible={avatarSheet} transparent animationType="slide" onRequestClose={() => setAvatarSheet(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalScrim} onPress={() => setAvatarSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View>
                <Text style={styles.eyebrow}>PROFILE AVATAR</Text>
                <Text style={styles.sheetTitle}>프로필 사진 변경</Text>
              </View>
              <Pressable onPress={() => setAvatarSheet(false)} style={styles.closeButton}>
                <X size={18} color={palette.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.avatarActions}>
              <Pressable onPress={() => pickNativeImage(false)} style={styles.avatarAction}>
                <ImagePlus size={20} color={palette.purpleBright} />
                <Text style={styles.avatarActionText}>사진 업로드</Text>
              </Pressable>
              {Platform.OS !== 'web' ? (
                <Pressable onPress={() => pickNativeImage(true)} style={styles.avatarAction}>
                  <Camera size={20} color={palette.success} />
                  <Text style={styles.avatarActionText}>카메라 촬영</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setAvatarSheet(false);
                  updateProfile({ photoBase64: null });
                }}
                style={styles.avatarAction}
              >
                <Trash2 size={20} color={palette.destructive} />
                <Text style={styles.avatarActionText}>사진 삭제</Text>
              </Pressable>
            </View>
            <Text style={styles.avatarOptionLabel}>기본 캐릭터 선택</Text>
            <View style={styles.characterGrid}>
              {characters.map((character) => (
                <Pressable
                  key={character}
                  onPress={() => {
                    updateProfile({ character, photoBase64: null });
                    setAvatarSheet(false);
                  }}
                  style={[
                    styles.characterOption,
                    profile.character === character && !profile.photoBase64 && styles.characterSelected,
                  ]}
                >
                  <Text style={styles.characterEmoji}>{character}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(cropImage)} transparent animationType="fade" onRequestClose={() => setCropImage(null)}>
        <View style={styles.levelModalRoot}>
          {cropImage ? (
            <CropEditor
              image={cropImage}
              onApply={saveCroppedWebImage}
              onClose={() => setCropImage(null)}
            />
          ) : null}
        </View>
      </Modal>

      <Modal visible={titleSheet} transparent animationType="slide" onRequestClose={() => setTitleSheet(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalScrim} onPress={() => setTitleSheet(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <View>
                <Text style={styles.eyebrow}>TITLE COLLECTION</Text>
                <Text style={styles.sheetTitle}>칭호 선택</Text>
              </View>
              <Pressable onPress={() => setTitleSheet(false)} style={styles.closeButton}>
                <X size={18} color={palette.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.titleOptionList}>
              {titleOptions.map((option) => {
                const unlocked = option.unlocked(streak, level);
                return (
                  <Pressable
                    key={option.title}
                    disabled={!unlocked}
                    onPress={() => {
                      updateProfile({ title: option.title });
                      setTitleSheet(false);
                    }}
                    style={[styles.titleOption, !unlocked && styles.titleOptionLocked]}
                  >
                    {unlocked ? <Check size={16} color={palette.success} /> : <LockKeyhole size={16} color={palette.mutedForeground} />}
                    <View style={styles.settingCopy}>
                      <Text style={[styles.settingTitle, !unlocked && styles.lockedText]}>{option.title}</Text>
                      <Text style={styles.settingDescription}>{unlocked ? '획득한 칭호' : option.requirement}</Text>
                    </View>
                    {profile.title === option.title ? <Text style={styles.selectedMark}>사용 중</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(tooltip)} transparent animationType="fade" onRequestClose={() => setTooltip(null)}>
        <View style={styles.levelModalRoot}>
          <View style={styles.tooltipCard}>
            <CircleHelp size={24} color={palette.accent} />
            <Text style={styles.tooltipText}>{tooltip}</Text>
            <Pressable onPress={() => setTooltip(null)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(pendingDeleteGoal)} transparent animationType="fade" onRequestClose={() => setPendingDeleteGoal(null)}>
        <View style={styles.levelModalRoot}>
          <View style={styles.confirmCard}>
            <Trash2 size={25} color={palette.destructive} />
            <Text style={styles.confirmTitle}>목표를 삭제할까요?</Text>
            <Text style={styles.confirmBody}>관련된 예약 퀘스트도 모두 삭제됩니다.</Text>
            <View style={styles.confirmButtons}>
              <Pressable onPress={() => setPendingDeleteGoal(null)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (pendingDeleteGoal) deleteGoal(pendingDeleteGoal);
                  setPendingDeleteGoal(null);
                }}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonText}>삭제</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={resetStep > 0} transparent animationType="fade" onRequestClose={() => setResetStep(0)}>
        <View style={styles.levelModalRoot}>
          <View style={styles.confirmCard}>
            <Trash2 size={25} color={palette.destructive} />
            <Text style={styles.confirmTitle}>{resetStep === 1 ? '데이터를 초기화할까요?' : '정말 모두 삭제할까요?'}</Text>
            <Text style={styles.confirmBody}>
              {resetStep === 1
                ? '닉네임, 사진, 퀘스트와 진행 상황이 기본값으로 돌아갑니다.'
                : '이 작업은 되돌릴 수 없으며 저장된 데이터도 삭제됩니다.'}
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable onPress={() => setResetStep(0)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>취소</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (resetStep === 1) setResetStep(2);
                  else {
                    reset();
                    setResetStep(0);
                  }
                }}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonText}>{resetStep === 1 ? '다음' : '초기화'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.settingsGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function SettingToggleRow({
  icon,
  title,
  description,
  enabled,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.settingRow}>
      {icon}
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Toggle enabled={enabled} onPress={onPress} />
    </View>
  );
}

function SettingActionRow({
  icon,
  title,
  onPress,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow}>
      {icon}
      <Text style={[styles.settingTitle, styles.settingCopy, danger && styles.dangerText]}>{title}</Text>
      <ChevronRight size={17} color={palette.mutedForeground} />
    </Pressable>
  );
}

function TargetDot({ color }: { color: string }) {
  return <View style={[styles.targetDot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: palette.secondary },
  backGlyph: { color: palette.foreground, fontSize: 28, lineHeight: 29, marginTop: -2 },
  pageTitle: { color: palette.foreground, fontSize: 18, fontWeight: '800' },
  topBarSpacer: { width: 36 },
  profileHero: { flexDirection: 'row', alignItems: 'center', paddingBottom: 23, borderBottomWidth: 1, borderColor: palette.border },
  profileImage: { backgroundColor: palette.secondary },
  profileCharacter: { alignItems: 'center', justifyContent: 'center', backgroundColor: palette.purpleSoft, borderWidth: 1, borderColor: '#6251B7' },
  avatarEditButton: { position: 'absolute', right: -2, bottom: -1, width: 29, height: 29, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: palette.primary, borderWidth: 3, borderColor: palette.background },
  profileIdentity: { flex: 1, marginLeft: 18 },
  nicknameRow: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  profileNickname: { color: palette.foreground, fontSize: 21, fontWeight: '900' },
  inlineIconButton: { padding: 8 },
  nicknameEditWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nicknameInput: { flex: 1, color: palette.foreground, fontSize: 18, fontWeight: '800', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: palette.purpleBright },
  inlineSaveButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginLeft: 7, borderRadius: 9, backgroundColor: palette.primary },
  disabledButton: { backgroundColor: palette.secondary },
  inputError: { color: palette.destructive, fontSize: 9, marginTop: 3 },
  profileLevelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  profileLevelPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: palette.purpleSoft },
  profileLevelText: { color: palette.purpleBright, fontSize: 10, fontWeight: '800' },
  titleButton: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 7 },
  profileTitle: { color: palette.accent, fontSize: 10, fontWeight: '700' },
  profilePetLine: { color: palette.mutedForeground, fontSize: 10, marginTop: 9 },
  sectionLabel: { color: palette.foreground, fontSize: 15, fontWeight: '800', marginTop: 23, marginBottom: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionHint: { color: palette.mutedForeground, fontSize: 9 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, minHeight: 98, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 14, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  statIcon: { fontSize: 17 },
  statValue: { color: palette.foreground, fontSize: 17, fontWeight: '900', marginTop: 5 },
  statLabel: { color: palette.mutedForeground, fontSize: 8, marginTop: 4, textAlign: 'center' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '31.8%', minHeight: 78, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderRadius: 13, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  badgeLocked: { backgroundColor: '#191A20', borderColor: '#252833' },
  badgeEmoji: { fontSize: 23 },
  badgeTitle: { color: palette.foreground, fontSize: 8, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  lockedText: { color: palette.mutedForeground },
  inventoryCard: { paddingHorizontal: 12, borderRadius: 16, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  inventoryRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center' },
  inventoryIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  inventoryIconAmber: { backgroundColor: palette.amberSoft },
  inventoryIconPurple: { backgroundColor: palette.purpleSoft },
  inventoryEmoji: { fontSize: 20 },
  inventoryCopy: { flex: 1, marginLeft: 10 },
  inventoryTitle: { color: palette.foreground, fontSize: 11, fontWeight: '800' },
  inventoryDescription: { color: palette.mutedForeground, fontSize: 9, marginTop: 4 },
  inventoryCount: { color: palette.accent, fontSize: 16, fontWeight: '900' },
  inventoryDivider: { height: 1, backgroundColor: palette.border },
  petSelectButton: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 8, backgroundColor: palette.purpleSoft },
  petSelectText: { color: palette.purpleBright, fontSize: 9, fontWeight: '800' },
  settingsGroup: { marginBottom: 14 },
  groupTitle: { color: palette.mutedForeground, fontSize: 10, fontWeight: '800', marginLeft: 5, marginBottom: 7 },
  groupCard: { overflow: 'hidden', borderRadius: 15, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  settingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  settingCopy: { flex: 1 },
  settingEmoji: { width: 18, fontSize: 16, textAlign: 'center' },
  settingTitle: { color: palette.foreground, fontSize: 11, fontWeight: '700' },
  settingDescription: { color: palette.mutedForeground, fontSize: 9, marginTop: 4 },
  settingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  demoBadge: { color: '#A3A7B4', fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: '#30333C' },
  manualText: { color: palette.accent, fontSize: 8 },
  toggleTrack: { width: 40, height: 23, justifyContent: 'center', paddingHorizontal: 3, borderRadius: 12, backgroundColor: '#424758' },
  toggleTrackOn: { backgroundColor: palette.primary },
  toggleThumb: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#A9ADBA' },
  toggleThumbOn: { alignSelf: 'flex-end', backgroundColor: palette.white },
  timeButton: { paddingHorizontal: 8, paddingVertical: 5, marginRight: 5, borderRadius: 7, backgroundColor: palette.secondary },
  timeButtonText: { color: palette.purpleBright, fontSize: 9, fontWeight: '800' },
  inlineShareList: { paddingHorizontal: 13, paddingBottom: 8, backgroundColor: palette.secondary },
  inlineShareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 41, borderBottomWidth: 1, borderBottomColor: palette.border },
  inlineShareLabel: { color: palette.secondaryForeground, fontSize: 10 },
  chevronDown: { transform: [{ rotate: '90deg' }] },
  emptyGoals: { minHeight: 55, alignItems: 'center', justifyContent: 'center' },
  emptyGoalsText: { color: palette.mutedForeground, fontSize: 10 },
  targetDot: { width: 11, height: 11, borderRadius: 6, marginLeft: 2 },
  deleteButton: { padding: 7 },
  versionText: { color: palette.mutedForeground, fontSize: 10 },
  dangerText: { color: palette.destructive },
  bottomSpacer: { height: 24 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.64)' },
  sheet: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: palette.card },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, backgroundColor: palette.border, marginBottom: 17 },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { color: palette.mutedForeground, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  sheetTitle: { color: palette.foreground, fontSize: 20, fontWeight: '900', marginTop: 6 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.secondary },
  avatarActions: { flexDirection: 'row', gap: 9, marginTop: 22 },
  avatarAction: { flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13, backgroundColor: palette.secondary },
  avatarActionText: { color: palette.foreground, fontSize: 9, fontWeight: '700' },
  avatarOptionLabel: { color: palette.mutedForeground, fontSize: 10, fontWeight: '800', marginTop: 20, marginBottom: 9 },
  characterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  characterOption: { width: '22.5%', height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.secondary, borderWidth: 1, borderColor: 'transparent' },
  characterSelected: { borderColor: palette.purpleBright, backgroundColor: palette.purpleSoft },
  characterEmoji: { fontSize: 27 },
  cropEditor: { width: '92%', maxWidth: 430, padding: 18, borderRadius: 22, backgroundColor: palette.card },
  cropHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cropperWrap: { height: 270, overflow: 'hidden', borderRadius: 15, backgroundColor: '#0C0D12' },
  nativeCropPreview: { height: 270, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#0C0D12' },
  nativeCropImage: { width: 220, height: 220, borderRadius: 110 },
  nativeCropHint: { color: palette.mutedForeground, fontSize: 9, marginTop: 10 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 14 },
  zoomLabel: { color: palette.mutedForeground, fontSize: 9 },
  zoomTrack: { flex: 1, height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: palette.secondary },
  zoomFill: { height: '100%', borderRadius: 3, backgroundColor: palette.purpleBright },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 11, backgroundColor: palette.primary },
  primaryButtonText: { color: palette.white, fontSize: 11, fontWeight: '800' },
  titleOptionList: { gap: 8, marginTop: 19 },
  titleOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10, borderRadius: 12, backgroundColor: palette.secondary },
  titleOptionLocked: { opacity: 0.58 },
  selectedMark: { color: palette.success, fontSize: 9, fontWeight: '800' },
  levelModalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)' },
  tooltipCard: { width: '76%', alignItems: 'center', padding: 22, borderRadius: 19, backgroundColor: palette.card },
  tooltipText: { color: palette.foreground, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 11 },
  secondaryButton: { minWidth: 84, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: palette.secondary },
  secondaryButtonText: { color: palette.secondaryForeground, fontSize: 10, fontWeight: '800' },
  confirmCard: { width: '82%', alignItems: 'center', padding: 22, borderRadius: 20, backgroundColor: palette.card },
  confirmTitle: { color: palette.foreground, fontSize: 17, fontWeight: '900', textAlign: 'center', marginTop: 11 },
  confirmBody: { color: palette.mutedForeground, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 8, marginBottom: 18 },
  confirmButtons: { width: '100%', flexDirection: 'row', gap: 8 },
  dangerButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#51242B' },
  dangerButtonText: { color: '#FFB8BF', fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.78 },
});