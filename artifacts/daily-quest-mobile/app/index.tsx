import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import {
  Activity,
  ArrowUpRight,
  BedDouble,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Coins,
  Compass,
  Clock3,
  Dumbbell,
  Flame,
  Gamepad2,
  Goal,
  HeartPulse,
  Home,
  LockKeyhole,
  MessageCircle,
  Moon,
  Plus,
  RotateCcw,
  Send,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Swords,
  Trash2,
  Users,
  Waves,
  X,
  Zap,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '@/constants/colors';
import {
  HealthAdapter,
  MockHealthAdapter,
} from '../../../lib/health/HealthAdapter';
import { BreakdownQuest } from '../../../lib/scheduler';
import {
  addDaysToDateString,
  formatDateInSeoul,
  now,
  setDemoNow,
  weekdayForDateString,
} from '../../../lib/clock';
import {
  buildPatternSnapshot,
  getPatternCell,
  getPatternTimeBand,
  patternTimeBandLabels,
  type PatternTimeBand,
} from '../../../lib/ai/index';
import { QuickCapture } from '@/components/QuickCapture';
import {
  AutoClearMetric,
  Goal as GoalModel,
  Quest,
  QuestCategory,
  useDailyQuestStore,
} from '@/store/useDailyQuestStore';

const palette = colors.dark;
const RING_SIZE = 84;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type TabKey = 'home' | 'calendar' | 'dungeon' | 'party' | 'shop';

function useAnimatedNumber(value: number, duration = 520) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value: nextValue }) => {
      setDisplayValue(Math.round(nextValue));
    });
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();
    return () => animatedValue.removeListener(listener);
  }, [animatedValue, duration, value]);

  return { animatedValue, displayValue };
}

function StatusHeader({ onProfilePress }: { onProfilePress: () => void }) {
  const { level, exp, expMax, streak, coins } = useDailyQuestStore();
  const profile = useDailyQuestStore((state) => state.profile);
  const animatedExp = useAnimatedNumber(exp);
  const expProgress = animatedExp.animatedValue.interpolate({
    inputRange: [0, expMax],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.header}>
      <Pressable
        testID="status-profile-avatar"
        accessibilityRole="button"
        onPress={onProfilePress}
        style={styles.avatar}
      >
        {profile.photoBase64 ? (
          <Image source={{ uri: profile.photoBase64 }} style={styles.headerProfileImage} />
        ) : (
          <Text style={styles.avatarEmoji}>{profile.character}</Text>
        )}
        <View style={styles.onlineDot} />
      </Pressable>
      <View style={styles.playerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.playerName}>{profile.nickname}</Text>
          <View style={styles.levelPill}>
            <Text style={styles.levelText}>Lv. {level}</Text>
          </View>
        </View>
        <View style={styles.expRow}>
          <View style={styles.expTrack}>
            <Animated.View style={[styles.expFill, { width: expProgress }]} />
          </View>
          <Text style={styles.expText}>
            {animatedExp.displayValue}/{expMax} EXP
          </Text>
        </View>
      </View>
      <View style={styles.headerStats}>
        <View style={styles.miniStat}>
          <Flame size={15} color={palette.accent} fill={palette.accent} />
          <Text style={styles.miniStatText}>{streak}</Text>
        </View>
        <View style={styles.miniStat}>
          <Coins size={15} color={palette.accent} fill={palette.accent} />
          <Text style={styles.miniStatText}>{coins}</Text>
        </View>
      </View>
    </View>
  );
}

function RevivalCard({
  currentSteps,
  onRevive,
}: {
  currentSteps: number;
  onRevive: () => void;
}) {
  const animatedSteps = useAnimatedNumber(currentSteps, 500);
  const ready = currentSteps >= 5000;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = Math.min(currentSteps / 5000, 1);

  useEffect(() => {
    if (!ready) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.035,
          duration: 720,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulse, ready]);

  return (
    <View style={styles.revivalCard}>
      <View style={styles.revivalHeader}>
        <View style={styles.revivalIcon}>
          <Flame size={20} color={palette.accent} fill={palette.accent} />
        </View>
        <View style={styles.revivalCopy}>
          <Text style={styles.revivalTitle}>🔥 12일의 불꽃을 다시 켤 수 있어요</Text>
          <Text style={styles.revivalBody}>작은 한 걸음으로 다시 이어갈 수 있어요</Text>
        </View>
      </View>
      <View style={styles.revivalMission}>
        <View style={styles.revivalRing}>
          <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#684B1A"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={palette.accent}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
              fill="none"
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.revivalRingLabel}>
            <Text style={styles.revivalRingValue}>
              {animatedSteps.displayValue.toLocaleString()}
            </Text>
            <Text style={styles.revivalRingUnit}>/ 5,000</Text>
          </View>
        </View>
        <View style={styles.revivalMissionCopy}>
          <Text style={styles.revivalMissionKicker}>REVIVAL MISSION</Text>
          <Text style={styles.revivalMissionTitle}>오늘 5,000보 걷기</Text>
          <Text style={styles.revivalMissionBody}>
            {ready
              ? '미션 달성! 다시 모험을 이어갈 수 있어요.'
              : `${(5000 - currentSteps).toLocaleString()}보만 더 걸으면 돼요`}
          </Text>
        </View>
      </View>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          testID="revive-streak"
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={onRevive}
          style={({ pressed }) => [
            styles.reviveButton,
            !ready && styles.reviveButtonDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Flame
            size={16}
            color={ready ? palette.accentForeground : palette.mutedForeground}
            fill={ready ? palette.accentForeground : 'transparent'}
          />
          <Text
            style={[styles.reviveButtonText, !ready && styles.reviveButtonTextDisabled]}
          >
            부활하기
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function RevivalSuccessModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const flameScale = useRef(new Animated.Value(0.4)).current;
  const flameOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    flameScale.setValue(0.4);
    flameOpacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(flameOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(flameScale, {
          toValue: 1,
          friction: 4,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(flameOpacity, {
        toValue: 1,
        duration: 560,
        useNativeDriver: true,
      }),
    ]).start();
  }, [flameOpacity, flameScale, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.levelModalRoot}>
        <View style={styles.revivalSuccessCard}>
          <Animated.View
            style={[
              styles.revivalSuccessFlame,
              {
                opacity: flameOpacity,
                transform: [{ scale: flameScale }],
              },
            ]}
          >
            <Flame size={38} color={palette.accent} fill={palette.accent} />
          </Animated.View>
          <Text style={styles.levelKicker}>STREAK REVIVED</Text>
          <Text style={styles.levelUpTitle}>불꽃이 다시 타올랐어요</Text>
          <Text style={styles.levelUpBody}>12일 연속 기록이 복구되었습니다</Text>
          <Pressable
            testID="revival-success-close"
            onPress={onClose}
            style={({ pressed }) => [
              styles.levelUpButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.levelUpButtonText}>계속하기</Text>
            <ArrowUpRight size={17} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StreakRescueBanner({ streak }: { streak: number }) {
  return (
    <View style={styles.streakRescueBanner}>
      <Flame size={16} color={palette.accent} fill={palette.accent} />
      <Text style={styles.streakRescueText}>
        이 퀘스트 하나면 <Text style={styles.streakRescueStrong}>🔥{streak}일</Text>이 돌아와요
      </Text>
    </View>
  );
}

function HomeDatePager({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const relativeLabel =
    date === today
      ? '오늘'
      : date === addDaysToDateString(today, -1)
        ? '어제'
        : date === addDaysToDateString(today, 1)
          ? '내일'
          : date > today
            ? '예정'
            : '지난 기록';
  const [, month, day] = date.split('-').map(Number);
  const weekday = weekdayLabels[weekdayForDateString(date)];

  return (
    <View style={styles.homeDatePager}>
      <Pressable
        testID="home-date-previous"
        accessibilityLabel="이전 날짜"
        onPress={() => onChange(addDaysToDateString(date, -1))}
        style={styles.homeDateArrow}
      >
        <ChevronLeft size={17} color={palette.mutedForeground} />
      </Pressable>
      <View style={styles.homeDateCopy}>
        <Text style={styles.homeDateRelative}>{relativeLabel}</Text>
        <Text style={styles.homeDateValue}>
          {month}월 {day}일 ({weekday})
        </Text>
        {date !== today ? (
          <Text style={styles.homeDateHint}>다른 날짜는 확인·삭제만 할 수 있어요</Text>
        ) : null}
      </View>
      <Pressable
        testID="home-date-next"
        accessibilityLabel="다음 날짜"
        onPress={() => onChange(addDaysToDateString(date, 1))}
        style={styles.homeDateArrow}
      >
        <ChevronRight size={17} color={palette.mutedForeground} />
      </Pressable>
    </View>
  );
}

function HeroSlot({
  quests,
  rescueForced,
  onComplete,
}: {
  quests: Quest[];
  rescueForced: boolean;
  onComplete: (quest: Quest, multiplier?: number) => void;
}) {
  const [current, setCurrent] = useState(now);
  const opacity = useRef(new Animated.Value(1)).current;
  const heroKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrent(now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const today = formatDateInSeoul(current);
  const events = quests
    .filter(
      (quest) =>
        quest.scheduledDate <= today &&
        (quest.status === 'done' || quest.status === 'failed' || quest.status === 'revived'),
    )
    .map((quest) => ({
      date: quest.scheduledDate,
      startTime: quest.startTime,
      status: quest.status as 'done' | 'failed' | 'revived',
    }));
  const pattern = buildPatternSnapshot(events);
  const band = getPatternTimeBand(null, current);
  const cell = getPatternCell(pattern, weekdayForDateString(today), band);
  const candidates = quests.filter((quest) => {
    if (quest.scheduledDate > today || quest.completed || quest.status !== 'pending') return false;
    return (quest.dependsOn ?? []).every((dependency) =>
      quests.some(
        (candidate) =>
          candidate.id === dependency &&
          (candidate.completed || candidate.status === 'done' || candidate.status === 'revived'),
      ),
    );
  });
  const rescueScore = (quest: Quest) =>
    quest.reward / (Math.max(1, quest.difficulty ?? 1) * Math.sqrt(Math.max(1, quest.durationMin ?? 30)));
  const hero = rescueForced || cell.risky
    ? [...candidates].sort((a, b) => rescueScore(b) - rescueScore(a))[0]
    : cell.strong
      ? [...candidates].sort((a, b) => (b.difficulty ?? 1) - (a.difficulty ?? 1))[0]
      : candidates[0];
  const mode: 'rescue' | 'push' | 'normal' = rescueForced || cell.risky
    ? 'rescue'
    : cell.strong
      ? 'push'
      : 'normal';
  const heroKey = `${mode}:${hero?.id ?? 'empty'}:${Math.round(cell.failRate * 100)}`;

  useEffect(() => {
    if (heroKeyRef.current === null) {
      heroKeyRef.current = heroKey;
      return;
    }
    if (heroKeyRef.current === heroKey) return;
    heroKeyRef.current = heroKey;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [heroKey, opacity]);

  if (!hero) return null;

  const weekday = ['일', '월', '화', '수', '목', '금', '토'][current.getDay()];
  const rateText = `${weekday} ${patternTimeBandLabels[band]} 실패율 ${Math.round(cell.failRate * 100)}%`;
  const modeTitle = mode === 'rescue'
    ? '오늘은 가볍게 하나만'
    : mode === 'push'
      ? '지금이 제일 잘 되는 시간이에요'
      : '다음 퀘스트를 이어가요';
  const modeBody = mode === 'rescue'
    ? `${rateText}예요. 이거 하나만 가볍게 해볼까요?`
    : mode === 'push'
      ? '가장 어려운 퀘스트에 도전해 보세요.'
      : '지금 할 수 있는 다음 순서예요.';

  return (
    <Animated.View style={[styles.heroSlot, mode === 'rescue' && styles.heroSlotRescue, { opacity }]}>
      <View style={styles.heroHeader}>
        <View style={[styles.heroModePill, mode === 'rescue' && styles.heroModePillRescue]}>
          <Sparkles size={12} color={mode === 'rescue' ? palette.accent : palette.purpleBright} />
          <Text style={styles.heroModeText}>{mode === 'rescue' ? 'RESCUE' : mode === 'push' ? 'PUSH' : 'NEXT'}</Text>
        </View>
        {mode === 'rescue' ? (
          <View style={styles.heroMultiplierPill}>
            <Zap size={11} color={palette.accent} fill={palette.accent} />
            <Text style={styles.heroMultiplierText}>EXP ×1.5</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.heroTitle}>{modeTitle}</Text>
      <Text style={styles.heroBody}>{modeBody}</Text>
      <View style={styles.heroQuestRow}>
        <View style={styles.heroQuestIcon}>
          <Check size={17} color={palette.success} />
        </View>
        <View style={styles.heroQuestCopy}>
          <Text style={styles.heroQuestTitle}>{hero.title}</Text>
          <Text style={styles.heroQuestMeta}>+{hero.reward} EXP · {hero.durationMin ?? 30}분</Text>
        </View>
      </View>
      {hero.starterStep ? (
        <Text style={styles.heroStarterStep}>
          첫 동작  <Text style={styles.heroStarterStrong}>{hero.starterStep}</Text>
        </Text>
      ) : null}
      <Pressable
        testID="hero-quick-start"
        onPress={() => onComplete(hero, mode === 'rescue' ? 1.5 : 1)}
        style={({ pressed }) => [styles.heroAction, pressed && styles.pressed]}
      >
        <Text style={styles.heroActionText}>{mode === 'rescue' ? '2분만 시작하기' : '이 퀘스트 시작하기'}</Text>
        <ArrowUpRight size={15} color={palette.white} />
      </Pressable>
      <Text style={styles.heroReason}>{rateText} · 판단 근거</Text>
    </Animated.View>
  );
}

const categoryConfig: Record<
  QuestCategory,
  { icon: typeof Activity; color: string; label: string }
> = {
  health: { icon: HeartPulse, color: '#72E2AE', label: '건강' },
  mind: { icon: Sparkles, color: '#A58FFF', label: '집중' },
  life: { icon: Home, color: '#FFB020', label: '생활' },
  social: { icon: Users, color: '#70C9FF', label: '소셜' },
};

function QuestCard({
  quest,
  onComplete,
  highlighted = false,
  canComplete = true,
  onDelete,
}: {
  quest: Quest;
  onComplete: (quest: Quest) => void;
  highlighted?: boolean;
  canComplete?: boolean;
  onDelete?: (quest: Quest) => void;
}) {
  const config = categoryConfig[quest.category];
  const CategoryIcon = config.icon;
  const checkScale = useRef(new Animated.Value(1)).current;
  const wasCompleted = useRef(quest.completed);

  useEffect(() => {
    if (quest.completed && !wasCompleted.current) {
      checkScale.setValue(0.55);
      Animated.sequence([
        Animated.spring(checkScale, {
          toValue: 1.16,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
    wasCompleted.current = quest.completed;
  }, [checkScale, quest.completed]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: quest.completed, disabled: !canComplete }}
      testID={`quest-${quest.id}`}
      onPress={canComplete ? () => onComplete(quest) : undefined}
      style={({ pressed }) => [
        styles.questCard,
        quest.completed && styles.questCardDone,
        highlighted && styles.questCardHighlighted,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View
        style={[
          styles.questCheckbox,
          quest.completed && styles.questCheckboxDone,
          { transform: [{ scale: checkScale }] },
        ]}
      >
        {quest.completed ? (
          <Check size={16} color={palette.white} strokeWidth={3} />
        ) : null}
      </Animated.View>
      <View style={[styles.questIcon, { backgroundColor: `${config.color}18` }]}>
        <CategoryIcon size={19} color={config.color} />
      </View>
      <View style={styles.questCopy}>
        <View style={styles.questTitleRow}>
          <Text style={[styles.questTitle, quest.completed && styles.doneText]}>
            {quest.title}
          </Text>
          {quest.autoClear.enabled ? (
            <View style={styles.autoBadge}>
              <Zap size={10} color={palette.accent} fill={palette.accent} />
              <Text style={styles.autoBadgeText}>자동</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.questCategory}>{config.label} 퀘스트</Text>
      </View>
      <View style={styles.reward}>
        <View style={styles.rewardCopy}>
          {!canComplete ? <LockKeyhole size={11} color={palette.mutedForeground} /> : null}
          <Text style={styles.rewardPlus}>+</Text>
          <Text style={styles.rewardValue}>{quest.reward}</Text>
          <Text style={styles.rewardLabel}>EXP</Text>
        </View>
        {onDelete ? (
          <Pressable
            testID={`delete-quest-${quest.id}`}
            accessibilityLabel={`${quest.title} 삭제`}
            onPress={(event) => {
              event.stopPropagation();
              onDelete(quest);
            }}
            style={styles.questDeleteButton}
          >
            <Trash2 size={13} color={palette.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function FloatingReward({ reward, visible }: { reward: number; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    translateY.setValue(16);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateY, {
        toValue: -26,
        duration: 1080,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, visible, reward]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingReward,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Sparkles size={14} color={palette.accent} />
      <Text style={styles.floatingRewardText}>+{reward} EXP</Text>
    </Animated.View>
  );
}

type HealthMetricSnapshot = {
  steps: number;
  sleep: number;
  weight: number;
  medication: boolean;
};

function getMetricValue(
  snapshot: HealthMetricSnapshot,
  metric: AutoClearMetric,
): number | boolean | null {
  switch (metric) {
    case 'steps':
      return snapshot.steps;
    case 'sleep':
      return snapshot.sleep;
    case 'weight':
      return snapshot.weight;
    case 'medication':
      return snapshot.medication;
    case 'none':
      return null;
  }
}

function meetsAutoClearCondition(
  snapshot: HealthMetricSnapshot,
  quest: Quest,
) {
  const condition = quest.autoClear;
  if (!condition.enabled) return false;

  const current = getMetricValue(snapshot, condition.metric);
  if (current === null) return false;
  if (typeof current === 'boolean') {
    return condition.operator === '>='
      ? current === (condition.value >= 1)
      : current === (condition.value <= 0);
  }
  return condition.operator === '>='
    ? current >= condition.value
    : current <= condition.value;
}

function getAutoClearToast(quest: Quest) {
  switch (quest.autoClear.metric) {
    case 'steps':
      return '👟 걸음 수 데이터로 자동 완료!';
    case 'sleep':
      return '🌙 수면 데이터로 자동 완료!';
    case 'weight':
      return '⚖️ 체중 데이터로 자동 완료!';
    case 'medication':
      return '💊 복약 데이터로 자동 완료!';
    default:
      return '✨ 건강 데이터로 자동 완료!';
  }
}

function HealthToast({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, opacity, translateY, visible]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.healthToast,
        { opacity, transform: [{ translateY }] },
        !visible && styles.healthToastHidden,
      ]}
    >
      <ShieldCheck size={17} color={palette.success} />
      <Text style={styles.healthToastText}>{message}</Text>
    </Animated.View>
  );
}

function GoalInput() {
  const [goal, setGoal] = useState('');
  const [addedMessage, setAddedMessage] = useState('');
  const goals = useDailyQuestStore((state) => state.goals);
  const addScheduledGoal = useDailyQuestStore((state) => state.addScheduledGoal);

  const submitGoal = () => {
    const value = goal.trim();
    if (!value) return;

    const isWeightGoal = value.includes('5kg') || value.includes('5킬로');
    const customGoalId = `custom-goal-${Date.now()}-${value.length}`;
    const goalData: GoalModel = {
      id: isWeightGoal
        ? 'weight-loss-demo'
        : goals.some((item) => item.id === customGoalId)
          ? `${customGoalId}-copy`
          : customGoalId,
      title: isWeightGoal ? '5kg 감량' : value,
      startDate: isWeightGoal ? '2026-09-01' : CALENDAR_TODAY,
      endDate: isWeightGoal ? '2026-09-30' : '2026-10-20',
      color: isWeightGoal ? '#FFB020' : '#49D8C0',
    };
    const breakdown: BreakdownQuest[] = [
      {
        id: isWeightGoal ? 'walk' : 'goal-action',
        title: isWeightGoal ? '7,000보 걷기' : `${value} 실천하기`,
        cycle: 'daily',
        category: isWeightGoal ? 'health' : 'life',
        exp: isWeightGoal ? 30 : 0,
        autoClear: isWeightGoal
          ? {
              enabled: true,
              metric: 'steps',
              operator: '>=',
              value: 7000,
              unit: '보',
            }
          : {
              enabled: false,
              metric: 'none',
              operator: '>=',
              value: 0,
              unit: '',
            },
      },
    ];
    addScheduledGoal(goalData, breakdown);
    setGoal('');
    setAddedMessage(`“${value}” 목표를 추가했어요`);
    setTimeout(() => setAddedMessage(''), 2200);
  };

  return (
    <View style={styles.goalSection}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>NEXT MISSION</Text>
          <Text style={styles.sectionTitle}>새로운 목표 추가</Text>
        </View>
        <Goal size={20} color={palette.purpleBright} />
      </View>
      <View style={styles.goalInputWrap}>
        <TextInput
          testID="goal-input"
          value={goal}
          onChangeText={setGoal}
          placeholder="오늘 꼭 하고 싶은 일은?"
          placeholderTextColor={palette.mutedForeground}
          style={styles.goalInput}
          returnKeyType="done"
          onSubmitEditing={submitGoal}
        />
        <Pressable
          testID="goal-submit"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.goalButton,
            !goal.trim() && styles.goalButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={submitGoal}
        >
          <Send
            size={17}
            color={goal.trim() ? palette.white : palette.mutedForeground}
          />
        </Pressable>
      </View>
      {addedMessage ? (
        <View style={styles.goalAddedMessage}>
          <Check size={14} color={palette.success} />
          <Text style={styles.goalAddedMessageText}>{addedMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

function QuickCaptureEntry({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.captureEntrySection}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>QUICK CAPTURE</Text>
          <Text style={styles.sectionTitle}>✨ 무엇을 할까요?</Text>
        </View>
        <Sparkles size={20} color={palette.accent} />
      </View>
      <Pressable
        testID="quick-capture-home"
        onPress={onPress}
        style={({ pressed }) => [styles.captureEntry, pressed && styles.pressed]}
      >
        <Text style={styles.captureEntryText}>말하듯 적어보세요. 날짜와 시간은 알아서 정리해요.</Text>
        <Send size={17} color={palette.purpleBright} />
      </Pressable>
    </View>
  );
}

const CALENDAR_TODAY = '2026-09-21';
const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
const monthLabels = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

const parseCalendarDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatCalendarDate = (value: Date) => value.toISOString().slice(0, 10);

const getCalendarDates = (year: number, month: number) => {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return formatCalendarDate(date);
  });
};

const getDday = (endDate: string) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil(
    (parseCalendarDate(endDate).getTime() -
      parseCalendarDate(CALENDAR_TODAY).getTime()) /
      millisecondsPerDay,
  );
  return days <= 0 ? 'D-DAY' : `D-${days}`;
};

function CalendarDayCell({
  date,
  quests,
  isToday,
  isCurrentMonth,
  index,
  animationKey,
  onPress,
}: {
  date: string;
  quests: Quest[];
  isToday: boolean;
  isCurrentMonth: boolean;
  index: number;
  animationKey: string;
  onPress: () => void;
}) {
  const entry = useRef(new Animated.Value(0)).current;
  const completed = quests.filter(
    (quest) => quest.status === 'done' || quest.status === 'revived' || quest.completed,
  ).length;
  const failed = quests.some((quest) => quest.status === 'failed');
  const revived = quests.some((quest) => quest.status === 'revived');
  const progress = quests.length ? completed / quests.length : 0;
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const ringColor = revived
    ? '#49D8C0'
    : failed
      ? '#596071'
      : progress === 1
        ? palette.purpleBright
        : palette.primary;

  useEffect(() => {
    entry.setValue(0);
    Animated.timing(entry, {
      toValue: 1,
      delay: index * 42,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [animationKey, entry, index]);

  return (
    <Animated.View
      style={[
        styles.calendarDayCell,
        !isCurrentMonth && styles.calendarDayOutside,
        isToday && styles.calendarDayToday,
        { opacity: entry, transform: [{ translateY: entry.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0],
        }) }] },
      ]}
    >
      <Pressable
        testID={`calendar-day-${date}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.calendarDayPressable, pressed && styles.pressed]}
      >
        <Text style={[styles.calendarDayNumber, isToday && styles.calendarDayNumberToday]}>
          {parseCalendarDate(date).getUTCDate()}
        </Text>
        <View style={styles.calendarRingWrap}>
          <Svg width={42} height={42} viewBox="0 0 42 42">
            <Circle
              cx="21"
              cy="21"
              r={radius}
              stroke={failed ? '#3E4452' : '#2C3040'}
              strokeWidth="3"
              fill="none"
            />
            {quests.length > 0 ? (
              <Circle
                cx="21"
                cy="21"
                r={radius}
                stroke={ringColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                fill="none"
                transform="rotate(-90 21 21)"
              />
            ) : null}
          </Svg>
          {failed && !revived ? (
            <View style={styles.calendarFailedDot} />
          ) : progress === 1 && quests.length > 0 ? (
            <Check size={12} color={palette.purpleBright} strokeWidth={3} />
          ) : null}
        </View>
        <View style={styles.calendarDayFooter}>
          <View style={styles.calendarGoalDots}>
            {Array.from(
              new Map(quests.map((quest) => [quest.goalId, quest])).values(),
            )
              .slice(0, 3)
              .map((quest) => (
                <View
                  key={quest.goalId}
                  style={[
                    styles.calendarGoalDot,
                    { backgroundColor: goalColorForQuest(quest) },
                  ]}
                />
              ))}
          </View>
          {completed > 0 && !failed ? (
            <Text style={styles.calendarFire}>🔥</Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function goalColorForQuest(quest: Quest) {
  if (quest.goalId === 'weight-loss-demo') return '#FFB020';
  return '#7C5CFF';
}

function PatternHeatmap({
  snapshot,
}: {
  snapshot: ReturnType<typeof buildPatternSnapshot>;
}) {
  const [selected, setSelected] = useState<{
    weekday: number;
    band: PatternTimeBand;
  } | null>(null);
  const selectedCell = selected
    ? getPatternCell(snapshot, selected.weekday, selected.band)
    : null;
  const bands: PatternTimeBand[] = ['morning', 'afternoon', 'evening', 'night'];

  return (
    <View style={styles.patternCard}>
      <View style={styles.patternColumnLabels}>
        <View style={styles.patternCorner} />
        {bands.map((band) => (
          <Text key={band} style={styles.patternColumnLabel}>
            {patternTimeBandLabels[band]}
          </Text>
        ))}
      </View>
      {['일', '월', '화', '수', '목', '금', '토'].map((weekday, weekdayIndex) => (
        <View key={weekday} style={styles.patternRow}>
          <Text style={styles.patternRowLabel}>{weekday}</Text>
          {bands.map((band) => {
            const cell = getPatternCell(snapshot, weekdayIndex, band);
            const alpha = Math.min(0.82, 0.12 + cell.failRate * 0.95);
            const active =
              selected?.weekday === weekdayIndex && selected.band === band;
            return (
              <Pressable
                key={band}
                onPress={() => setSelected({ weekday: weekdayIndex, band })}
                style={[
                  styles.patternCell,
                  { backgroundColor: `rgba(219, 76, 108, ${alpha})` },
                  cell.strong && styles.patternCellStrong,
                  active && styles.patternCellActive,
                ]}
              >
                <Text style={styles.patternCellText}>
                  {Math.round(cell.failRate * 100)}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Text style={styles.patternSummary}>
        {selectedCell
          ? `${['일', '월', '화', '수', '목', '금', '토'][selectedCell.weekday]} ${patternTimeBandLabels[selectedCell.timeBand]} · 실패율 ${Math.round(selectedCell.failRate * 100)}% · ${selectedCell.total}회 기록`
          : `전체 평균 실패율 ${Math.round(snapshot.overallFailRate * 100)}% · 칸을 눌러 자세히 보기`}
      </Text>
    </View>
  );
}

function CalendarDaySheet({
  date,
  quests,
  visible,
  onClose,
  onComplete,
  onAdd,
}: {
  date: string | null;
  quests: Quest[];
  visible: boolean;
  onClose: () => void;
  onComplete: (quest: Quest) => void;
  onAdd: () => void;
}) {
  if (!date) return null;
  const isFuture = date > CALENDAR_TODAY;
  const isPast = date < CALENDAR_TODAY;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.calendarSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.calendarSheetHeader}>
            <View>
              <Text style={styles.eyebrow}>
                {isFuture ? 'UPCOMING QUESTS' : isPast ? 'QUEST LOG' : 'TODAY'}
              </Text>
              <Text style={styles.sheetTitle}>
                {parseCalendarDate(date).getUTCMonth() + 1}월{' '}
                {parseCalendarDate(date).getUTCDate()}일의 퀘스트
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={palette.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.calendarSheetBody}>
            <Pressable
              testID="calendar-add-quest"
              onPress={onAdd}
              style={styles.calendarAddButton}
            >
              <Plus size={14} color={palette.purpleBright} />
              <Text style={styles.calendarAddButtonText}>추가</Text>
            </Pressable>
            {quests.length === 0 ? (
              <View style={styles.calendarEmpty}>
                <CalendarDays size={22} color={palette.mutedForeground} />
                <Text style={styles.calendarEmptyText}>이 날에는 배치된 퀘스트가 없어요.</Text>
              </View>
            ) : (
              quests.map((quest) => (
                <Pressable
                  key={quest.id}
                  disabled={isPast || isFuture || quest.completed}
                  onPress={() => onComplete(quest)}
                  style={({ pressed }) => [
                    styles.calendarQuestRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.calendarQuestIcon}>
                    {quest.completed ? (
                      <Check size={16} color={palette.success} strokeWidth={3} />
                    ) : (
                      <CircleDot size={16} color={palette.mutedForeground} />
                    )}
                  </View>
                  <View style={styles.calendarQuestCopy}>
                    <Text
                      style={[
                        styles.calendarQuestTitle,
                        quest.completed && styles.calendarQuestDone,
                      ]}
                    >
                      {quest.title}
                    </Text>
                    <Text style={styles.calendarQuestMeta}>+{quest.reward} EXP</Text>
                  </View>
                  {isFuture ? (
                    <View style={styles.scheduledBadge}>
                      <Text style={styles.scheduledBadgeText}>예정</Text>
                    </View>
                  ) : isPast ? (
                    <Text style={styles.readOnlyText}>기록 보기</Text>
                  ) : quest.completed ? (
                    <Text style={styles.doneBadgeText}>완료</Text>
                  ) : (
                    <Text style={styles.todayActionText}>체크</Text>
                  )}
                </Pressable>
              ))
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CalendarScreen({
  quests,
  goals,
  onComplete,
  onAddForDate,
}: {
  quests: Quest[];
  goals: GoalModel[];
  onComplete: (quest: Quest) => void;
  onAddForDate: (date: string) => void;
}) {
  const [monthDate, setMonthDate] = useState(parseCalendarDate('2026-09-01'));
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPattern, setShowPattern] = useState(false);
  const [animationKey, setAnimationKey] = useState('initial');
  const patternSnapshot = useMemo(
    () =>
      buildPatternSnapshot(
        quests
          .filter(
            (quest) =>
              quest.status === 'done' ||
              quest.status === 'failed' ||
              quest.status === 'revived',
          )
          .map((quest) => ({
            date: quest.scheduledDate,
            startTime: quest.startTime,
            status: quest.status as 'done' | 'failed' | 'revived',
          })),
      ),
    [quests],
  );
  const visibleQuests = selectedGoalId
    ? quests.filter((quest) => quest.goalId === selectedGoalId)
    : quests;
  const calendarDates = getCalendarDates(
    monthDate.getUTCFullYear(),
    monthDate.getUTCMonth(),
  );
  const currentMonth = monthDate.getUTCMonth();
  const selectedDateQuests = selectedDate
    ? visibleQuests.filter((quest) => quest.scheduledDate === selectedDate)
    : [];

  const changeMonth = (direction: number) => {
    const next = new Date(monthDate);
    next.setUTCMonth(next.getUTCMonth() + direction);
    setMonthDate(next);
    setAnimationKey(`${next.toISOString()}-${direction}`);
  };

  return (
    <View style={styles.calendarScreen}>
      <ScrollView
        contentContainerStyle={styles.calendarScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.calendarTopRow}>
          <View>
            <Text style={styles.eyebrow}>QUEST CALENDAR</Text>
            <Text style={styles.calendarTitle}>목표가 일정이 됐어요</Text>
          </View>
          <View style={styles.calendarAiBadge}>
            <Sparkles size={13} color={palette.accent} />
            <Text style={styles.calendarAiBadgeText}>AI 배치</Text>
          </View>
        </View>
        <View style={styles.monthNav}>
          <Pressable
            testID="calendar-prev-month"
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <ChevronRight size={17} color={palette.foreground} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {monthDate.getUTCFullYear()}년 {monthLabels[currentMonth]}
          </Text>
          <Pressable
            testID="calendar-next-month"
            onPress={() => changeMonth(1)}
            style={({ pressed }) => [styles.monthArrow, pressed && styles.pressed]}
          >
            <ChevronRight size={17} color={palette.foreground} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.goalChipRow}
        >
          <Pressable
            onPress={() => setSelectedGoalId(null)}
            style={[
              styles.goalChip,
              selectedGoalId === null && styles.goalChipSelected,
            ]}
          >
            <View style={[styles.goalChipDot, { backgroundColor: palette.purpleBright }]} />
            <Text style={styles.goalChipText}>전체 목표</Text>
          </Pressable>
          {goals.map((goal) => (
            <Pressable
              key={goal.id}
              testID={`goal-chip-${goal.id}`}
              onPress={() =>
                setSelectedGoalId((current) => (current === goal.id ? null : goal.id))
              }
              style={[
                styles.goalChip,
                selectedGoalId === goal.id && styles.goalChipSelected,
                selectedGoalId === goal.id && { borderColor: goal.color },
              ]}
            >
              <View style={[styles.goalChipDot, { backgroundColor: goal.color }]} />
              <Text style={styles.goalChipText}>{goal.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.activeGoalSummaryRow}
        >
          {goals.map((goal) => {
            const goalQuests = quests.filter((quest) => quest.goalId === goal.id);
            const completed = goalQuests.filter(
              (quest) => quest.status === 'done' || quest.status === 'revived',
            ).length;
            const progress = goalQuests.length
              ? Math.round((completed / goalQuests.length) * 100)
              : 0;
            return (
              <View key={`summary-${goal.id}`} style={styles.activeGoalSummaryCard}>
                <View style={styles.activeGoalSummaryTop}>
                  <View style={[styles.goalChipDot, { backgroundColor: goal.color }]} />
                  <Text style={styles.activeGoalSummaryTitle} numberOfLines={1}>
                    {goal.title}
                  </Text>
                  <Text style={[styles.activeGoalSummaryDday, { color: goal.color }]}>
                    {getDday(goal.endDate)}
                  </Text>
                </View>
                <View style={styles.activeGoalSummaryBottom}>
                  <View style={styles.activeGoalSummaryTrack}>
                    <View
                      style={[
                        styles.activeGoalSummaryFill,
                        { width: `${progress}%`, backgroundColor: goal.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.activeGoalSummaryProgress}>{progress}%</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.patternToggleRow}>
          <View>
            <Text style={styles.patternToggleTitle}>내 패턴 보기</Text>
            <Text style={styles.patternToggleBody}>요일과 시간대별 실패율을 확인해요</Text>
          </View>
          <Pressable
            testID="calendar-pattern-toggle"
            onPress={() => setShowPattern((visible) => !visible)}
            style={[styles.patternToggle, showPattern && styles.patternToggleOn]}
          >
            <Text style={[styles.patternToggleText, showPattern && styles.patternToggleTextOn]}>
              {showPattern ? '닫기' : '보기'}
            </Text>
          </Pressable>
        </View>
        {showPattern ? <PatternHeatmap snapshot={patternSnapshot} /> : null}
        <View style={styles.calendarLegend}>
          <Text style={styles.calendarLegendText}>달성률</Text>
          <View style={styles.calendarLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: palette.purpleBright }]} />
            <Text style={styles.calendarLegendText}>완료</Text>
          </View>
          <View style={styles.calendarLegendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#49D8C0' }]} />
            <Text style={styles.calendarLegendText}>부활</Text>
          </View>
        </View>
        <View style={styles.calendarGrid}>
          {weekdayLabels.map((label, index) => (
            <Text
              key={label}
              style={[
                styles.weekdayLabel,
                index === 0 && styles.sundayLabel,
                index === 6 && styles.saturdayLabel,
              ]}
            >
              {label}
            </Text>
          ))}
          {calendarDates.map((date, index) => {
            const dateObject = parseCalendarDate(date);
            return (
              <CalendarDayCell
                key={`${date}-${animationKey}`}
                date={date}
                quests={visibleQuests.filter((quest) => quest.scheduledDate === date)}
                isToday={date === CALENDAR_TODAY}
                isCurrentMonth={dateObject.getUTCMonth() === currentMonth}
                index={index}
                animationKey={animationKey}
                onPress={() => setSelectedDate(date)}
              />
            );
          })}
        </View>
        <View style={styles.goalCardsSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.eyebrow}>ACTIVE GOALS</Text>
              <Text style={styles.sectionTitle}>진행 중인 목표</Text>
            </View>
            <Text style={styles.goalCardsHint}>날짜에 꽂힌 퀘스트</Text>
          </View>
          {goals.map((goal) => {
            const goalQuests = quests.filter((quest) => quest.goalId === goal.id);
            const done = goalQuests.filter(
              (quest) => quest.status === 'done' || quest.status === 'revived',
            ).length;
            const percentage = goalQuests.length
              ? Math.round((done / goalQuests.length) * 100)
              : 0;
            return (
              <View key={goal.id} style={styles.ddayCard}>
                <View style={[styles.ddayAccent, { backgroundColor: goal.color }]} />
                <View style={styles.ddayCopy}>
                  <View style={styles.ddayTitleRow}>
                    <Text style={styles.ddayTitle}>{goal.title}</Text>
                    <Text style={styles.ddayDate}>{getDday(goal.endDate)}</Text>
                  </View>
                  <View style={styles.ddayProgressTrack}>
                    <View
                      style={[
                        styles.ddayProgressFill,
                        { width: `${percentage}%`, backgroundColor: goal.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.ddayProgressText}>진행률 {percentage}%</Text>
                </View>
                <Text style={styles.ddayPercent}>{percentage}%</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <CalendarDaySheet
        date={selectedDate}
        quests={selectedDateQuests}
        visible={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        onAdd={() => {
          if (selectedDate) onAddForDate(selectedDate);
          setSelectedDate(null);
        }}
        onComplete={(quest) => {
          onComplete(quest);
          setSelectedDate(null);
        }}
      />
    </View>
  );
}

function PartySettingsModal({
  visible,
  settings,
  onToggle,
  onClose,
}: {
  visible: boolean;
  settings: ReturnType<typeof useDailyQuestStore.getState>['partyShareSettings'];
  onToggle: (key: keyof typeof settings) => void;
  onClose: () => void;
}) {
  const items: Array<{
    key: keyof typeof settings;
    label: string;
    description: string;
  }> = [
    {
      key: 'medication',
      label: '복약 퀘스트 달성 여부',
      description: '복용 완료·미완료 상태만 공유',
    },
    {
      key: 'exercise',
      label: '운동 퀘스트 달성 여부',
      description: '운동 퀘스트 완료 상태만 공유',
    },
    {
      key: 'sleep',
      label: '수면 퀘스트 달성 여부',
      description: '수면 목표 달성 여부만 공유',
    },
    {
      key: 'routine',
      label: '일상 퀘스트 달성 여부',
      description: '물·정리·공부 등 완료 상태만 공유',
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.partySettingsSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTitleRow}>
            <View>
              <Text style={styles.eyebrow}>PARTY PRIVACY</Text>
              <Text style={styles.sheetTitle}>공유 설정</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={palette.mutedForeground} />
            </Pressable>
          </View>
          <View style={styles.privacyCallout}>
            <LockKeyhole size={17} color={palette.success} />
            <View style={styles.privacyCalloutCopy}>
              <Text style={styles.privacyCalloutTitle}>수치는 항상 비공개</Text>
              <Text style={styles.privacyCalloutBody}>
                혈압값·체중·진료 내역은 파티에 공유되지 않아요.
              </Text>
            </View>
          </View>
          <View style={styles.partySettingsList}>
            {items.map((item) => {
              const enabled = settings[item.key];
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onToggle(item.key)}
                  style={({ pressed }) => [
                    styles.partySettingRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.partySettingCopy}>
                    <Text style={styles.partySettingLabel}>{item.label}</Text>
                    <Text style={styles.partySettingDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.toggleTrack,
                      enabled && styles.toggleTrackOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        enabled && styles.toggleThumbOn,
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.settingsFooter}>
            달성 여부만 공유됩니다 · 수치는 비공개
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function PartyScreen() {
  const members = useDailyQuestStore((state) => state.partyMembers);
  const profile = useDailyQuestStore((state) => state.profile);
  const activities = useDailyQuestStore((state) => state.partyActivities);
  const settings = useDailyQuestStore((state) => state.partyShareSettings);
  const partyExpGoal = useDailyQuestStore((state) => state.partyExpGoal);
  const rewardClaimed = useDailyQuestStore((state) => state.partyRewardClaimed);
  const togglePartyShareSetting = useDailyQuestStore(
    (state) => state.togglePartyShareSetting,
  );
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const partyExp = members.reduce((total, member) => total + member.weeklyExp, 0);
  const partyProgress = Math.min(partyExp / partyExpGoal, 1);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const nudge = (memberName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToast(`${memberName}님에게 콕 찌르기를 보냈어요`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  };

  return (
    <View style={styles.partyScreen}>
      <ScrollView
        contentContainerStyle={styles.partyScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.partyTopRow}>
          <View>
            <Text style={styles.eyebrow}>FAMILY PARTY</Text>
            <Text style={styles.partyTitle}>우리집 길드</Text>
          </View>
          <Pressable
            testID="party-settings"
            accessibilityRole="button"
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [
              styles.partySettingsButton,
              pressed && styles.pressed,
            ]}
          >
            <SlidersHorizontal size={18} color={palette.foreground} />
          </Pressable>
        </View>
        <Text style={styles.partySubtitle}>
          함께 달성하고, 서로의 수치는 지켜줘요
        </Text>

        <View style={styles.partyExpCard}>
          <View style={styles.partyExpHeader}>
            <View>
              <Text style={styles.partyExpKicker}>WEEKLY GUILD EXP</Text>
              <Text style={styles.partyExpTitle}>이번 주 공동 EXP</Text>
            </View>
            <View style={styles.partyExpValueWrap}>
              <Text style={styles.partyExpValue}>{partyExp.toLocaleString()}</Text>
              <Text style={styles.partyExpGoal}>/ {partyExpGoal.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.partyExpTrack}>
            <Animated.View
              style={[
                styles.partyExpFill,
                { width: `${partyProgress * 100}%` },
              ]}
            />
          </View>
          <View style={styles.partyExpFooter}>
            <View style={styles.partyExpMembers}>
              {members.map((member) => (
                <Text key={member.id} style={styles.partyExpMember}>
                  {member.avatar}
                </Text>
              ))}
              <Text style={styles.partyExpHint}>4명 합산</Text>
            </View>
            <Text style={styles.partyRewardText}>
              {rewardClaimed
                ? '보상 획득 · 코인 +200'
                : '달성 시 코인 +200 · 스트릭 프리즈 1개'}
            </Text>
          </View>
        </View>

        <View style={styles.partyPrivacyBanner}>
          <ShieldCheck size={15} color={palette.success} />
          <Text style={styles.partyPrivacyText}>
            달성 여부만 공유됩니다 · 수치는 비공개
          </Text>
        </View>

        <View style={styles.partySectionHeading}>
          <View>
            <Text style={styles.eyebrow}>GUILD MEMBERS</Text>
            <Text style={styles.sectionTitle}>우리집 길드원</Text>
          </View>
          <Text style={styles.partyMemberCount}>4명</Text>
        </View>
        <View style={styles.partyMemberList}>
          {members.map((member) => {
            const medicationVisible = settings.medication;
            const medicationDone = member.medicationQuest.status === 'done';
            const memberName = member.id === 'self' ? profile.nickname : member.name;
            return (
              <View key={member.id} style={styles.partyMemberCard}>
                <View style={styles.partyMemberHeader}>
                  <View style={styles.partyAvatar}>
                    {member.id === 'self' && profile.photoBase64 ? (
                      <Image source={{ uri: profile.photoBase64 }} style={styles.partyAvatarImage} />
                    ) : (
                      <Text style={styles.partyAvatarEmoji}>
                        {member.id === 'self' ? profile.character : member.avatar}
                      </Text>
                    )}
                    <View style={styles.partyOnlineDot} />
                  </View>
                  <View style={styles.partyMemberCopy}>
                    <View style={styles.partyMemberNameRow}>
                      <Text style={styles.partyMemberName}>{memberName}</Text>
                      <View style={styles.partyLevelPill}>
                        <Text style={styles.partyLevelText}>Lv. {member.level}</Text>
                      </View>
                    </View>
                    <Text style={styles.partyMemberFocus}>{member.focus}</Text>
                  </View>
                  <View style={styles.partyCompletion}>
                    <Text style={styles.partyCompletionValue}>
                      {member.completedCount}/{member.totalCount}
                    </Text>
                    <Text style={styles.partyCompletionLabel}>오늘 달성</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.medicationRow,
                    medicationDone && styles.medicationRowDone,
                  ]}
                >
                  <View
                    style={[
                      styles.medicationIcon,
                      medicationDone && styles.medicationIconDone,
                    ]}
                  >
                    <Text style={styles.medicationEmoji}>💊</Text>
                  </View>
                  {medicationVisible ? (
                    <View style={styles.medicationCopy}>
                      <Text style={styles.medicationTitle}>
                        {member.medicationQuest.title}{' '}
                        <Text style={styles.medicationTime}>
                          {member.medicationQuest.time}
                        </Text>
                      </Text>
                      <Text
                        style={[
                          styles.medicationStatus,
                          medicationDone && styles.medicationStatusDone,
                        ]}
                      >
                        {medicationDone ? '복용 완료 · 자동 체크됨' : '복용 예정'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.medicationHidden}>
                      복약 달성 여부를 공유하지 않음
                    </Text>
                  )}
                  {medicationVisible && medicationDone ? (
                    <Check size={17} color={palette.success} strokeWidth={3} />
                  ) : null}
                </View>
                {member.pendingQuest ? (
                  <View style={styles.partyMemberFooter}>
                    <Text style={styles.pendingQuestText}>
                      미완료 · {member.pendingQuest}
                    </Text>
                    <Pressable
                      testID={`nudge-${member.id}`}
                      onPress={() => nudge(member.name)}
                      style={({ pressed }) => [
                        styles.nudgeButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Bell size={13} color={palette.accent} />
                      <Text style={styles.nudgeButtonText}>콕 찌르기</Text>
                    </Pressable>
                  </View>
                ) : null}
                <Text style={styles.memberPrivacyText}>
                  달성 여부만 공유됩니다 · 수치는 비공개
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.partySectionHeading}>
          <View>
            <Text style={styles.eyebrow}>PARTY ACTIVITY</Text>
            <Text style={styles.sectionTitle}>파티 활동 로그</Text>
          </View>
          <MessageCircle size={18} color={palette.purpleBright} />
        </View>
        <View style={styles.activityTimeline}>
          {activities.map((activity, index) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityRail}>
                <View style={styles.activityDot} />
                {index < activities.length - 1 ? (
                  <View style={styles.activityLine} />
                ) : null}
              </View>
              <View style={styles.activityBody}>
                <View style={styles.activityMetaRow}>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                  <Text style={styles.activityRelative}>{activity.relative}</Text>
                </View>
                <Text style={styles.activityText}>
                  {activity.memberName}가 {activity.icon}{' '}
                  {activity.questTitle}
                </Text>
                <Text style={styles.activityReward}>+{activity.reward} EXP</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
      {toast ? (
        <View style={styles.partyToast}>
          <Bell size={15} color={palette.accent} />
          <Text style={styles.partyToastText}>{toast}</Text>
        </View>
      ) : null}
      <PartySettingsModal
        visible={settingsVisible}
        settings={settings}
        onToggle={togglePartyShareSetting}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const DUNGEON_WEEK_KEY = '2026-09-21';

type DungeonReward = {
  coins: number;
  multiplier: number;
  pet: string;
  rarity: string;
  fragments: number;
  item: string;
};

const calculateDungeonMultiplier = (streak: number) =>
  Math.min(3, 1 + streak * 0.1);

function DungeonScreen({ onGoShop }: { onGoShop: () => void }) {
  const streak = useDailyQuestStore((state) => state.streak);
  const coins = useDailyQuestStore((state) => state.coins);
  const ticketWeek = useDailyQuestStore((state) => state.dungeonTicketWeek);
  const useDungeonTicket = useDailyQuestStore(
    (state) => state.useDungeonTicket,
  );
  const claimDungeonReward = useDailyQuestStore(
    (state) => state.claimDungeonReward,
  );
  const [phase, setPhase] = useState<'entrance' | 'battle' | 'result'>(
    'entrance',
  );
  const [battleLogs, setBattleLogs] = useState<string[]>([]);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [lastReward, setLastReward] = useState<DungeonReward | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const enemyHealth = useAnimatedNumber(enemyHp, 420).animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
  const playerHealth = useAnimatedNumber(playerHp, 420).animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
  const rewardCount = useAnimatedNumber(lastReward?.coins ?? 0, 900);
  const multiplier = calculateDungeonMultiplier(streak);
  const nextMultiplier = calculateDungeonMultiplier(streak + 1);
  const floor = Math.floor(streak / 3) + 1;
  const ticketUsed = ticketWeek === DUNGEON_WEEK_KEY;
  const canEnter = !ticketUsed && phase === 'entrance';

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const hitShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 5, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 2, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const appendLog = (message: string) => {
    setBattleLogs((logs) => [...logs, message]);
  };

  const startBattle = () => {
    if (!canEnter) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    useDungeonTicket(DUNGEON_WEEK_KEY);
    setPhase('battle');
    setPlayerHp(100);
    setEnemyHp(100);
    setBattleLogs(['자동 전투가 시작됩니다...']);

    timers.current.push(
      setTimeout(() => {
        appendLog('⚔️ 루미가 검격을 날렸습니다 · 몬스터 -36 HP');
        setEnemyHp(64);
        hitShake();
      }, 600),
    );
    timers.current.push(
      setTimeout(() => {
        appendLog('🗡️ 몬스터가 반격했습니다 · 루미 -18 HP');
        setPlayerHp(82);
        hitShake();
      }, 1550),
    );
    timers.current.push(
      setTimeout(() => {
        appendLog('✨ 피니시! 던전 보스가 쓰러졌습니다');
        setEnemyHp(0);
        hitShake();
      }, 2500),
    );
    timers.current.push(
      setTimeout(() => {
        const reward: DungeonReward = {
          coins: Math.round(100 * multiplier),
          multiplier,
          pet: floor >= 5 ? '루나 폭스' : '별빛 슬라임',
          rarity: floor >= 5 ? '희귀' : '일반',
          fragments: floor >= 5 ? 3 : 1,
          item: '스트릭 프리즈 1개',
        };
        claimDungeonReward(reward.coins);
        setLastReward(reward);
        setPhase('result');
      }, 3300),
    );
  };

  const closeResult = () => {
    setPhase('entrance');
    setLastReward(null);
    setBattleLogs([]);
  };

  return (
    <View style={styles.dungeonScreen}>
      <ScrollView
        contentContainerStyle={styles.dungeonScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dungeonTopRow}>
          <View>
            <Text style={styles.eyebrow}>WEEKLY DUNGEON</Text>
            <Text style={styles.dungeonTitle}>주간 던전</Text>
          </View>
          <View style={styles.dungeonCoinPill}>
            <Coins size={14} color={palette.accent} fill={palette.accent} />
            <Text style={styles.dungeonCoinText}>{coins.toLocaleString()}</Text>
          </View>
        </View>
        {phase === 'battle' ? (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <View style={styles.battleArena}>
              <View style={styles.battleBadge}>
                <Swords size={14} color={palette.purpleBright} />
                <Text style={styles.battleBadgeText}>자동 전투 · {floor}층</Text>
              </View>
              <View style={styles.battleCharacters}>
                <View style={styles.battleCharacter}>
                  <Text style={styles.battleEmoji}>🧙</Text>
                  <Text style={styles.battleName}>루미</Text>
                  <View style={styles.battleHpTrack}>
                    <Animated.View style={[styles.battleHpFillPlayer, { width: playerHealth }]} />
                  </View>
                  <Text style={styles.battleHpText}>{playerHp}/100 HP</Text>
                </View>
                <Text style={styles.battleVs}>VS</Text>
                <View style={styles.battleCharacter}>
                  <Text style={styles.battleEmoji}>👹</Text>
                  <Text style={styles.battleName}>주간 보스</Text>
                  <View style={styles.battleHpTrack}>
                    <Animated.View style={[styles.battleHpFillEnemy, { width: enemyHealth }]} />
                  </View>
                  <Text style={styles.battleHpText}>{enemyHp}/100 HP</Text>
                </View>
              </View>
              <View style={styles.battleLogBox}>
                {battleLogs.map((log, index) => (
                  <Animated.View key={`${log}-${index}`} style={styles.battleLogRow}>
                    <View style={styles.battleLogDot} />
                    <Text style={styles.battleLogText}>{log}</Text>
                  </Animated.View>
                ))}
              </View>
              <Text style={styles.battleHint}>전투가 끝나면 자동으로 보상 화면이 열립니다.</Text>
            </View>
          </Animated.View>
        ) : (
          <>
            <View style={styles.dungeonEntranceCard}>
              <View style={styles.dungeonRune}>
                <Swords size={38} color={palette.purpleBright} />
              </View>
              <Text style={styles.dungeonEntranceKicker}>FLOOR {floor} UNLOCKED</Text>
              <Text style={styles.dungeonEntranceTitle}>🔥 {streak}일 · 보상 x{multiplier.toFixed(1)}</Text>
              <Text style={styles.dungeonEntranceBody}>
                스트릭이 길수록 더 깊은 층과 큰 보상을 만나요.
              </Text>
              <View style={styles.dungeonPreview}>
                <ArrowUpRight size={15} color={palette.accent} />
                <Text style={styles.dungeonPreviewText}>
                  내일까지 유지하면 x{nextMultiplier.toFixed(1)}
                </Text>
              </View>
              {streak === 0 ? (
                <Text style={styles.dungeonResetWarning}>
                  오늘은 보상 배율이 기본으로 돌아왔어요.
                </Text>
              ) : (
                <Text style={styles.dungeonResetWarning}>
                  보상 배율은 다시 이어가며 올라가요.
                </Text>
              )}
              <Pressable
                testID="dungeon-enter"
                disabled={!canEnter}
                onPress={startBattle}
                style={({ pressed }) => [
                  styles.dungeonEnterButton,
                  !canEnter && styles.dungeonEnterDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Swords size={17} color={canEnter ? palette.white : palette.mutedForeground} />
                <Text style={[styles.dungeonEnterText, !canEnter && styles.dungeonEnterTextDisabled]}>
                  {ticketUsed ? '입장권 소진 · 다음 주 월요일 재충전' : '입장하기'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.dungeonRuleCard}>
              <View style={styles.dungeonRuleItem}>
                <Text style={styles.dungeonRuleValue}>{floor}층</Text>
                <Text style={styles.dungeonRuleLabel}>입장 가능 층수</Text>
              </View>
              <View style={styles.dungeonRuleDivider} />
              <View style={styles.dungeonRuleItem}>
                <Text style={styles.dungeonRuleValue}>주 1회</Text>
                <Text style={styles.dungeonRuleLabel}>입장권</Text>
              </View>
              <View style={styles.dungeonRuleDivider} />
              <View style={styles.dungeonRuleItem}>
                <Text style={styles.dungeonRuleValue}>x{multiplier.toFixed(1)}</Text>
                <Text style={styles.dungeonRuleLabel}>현재 배율</Text>
              </View>
            </View>
            <PetCollection />
          </>
        )}
      </ScrollView>
      <Modal
        visible={phase === 'result' && Boolean(lastReward)}
        transparent
        animationType="fade"
        onRequestClose={closeResult}
      >
        <View style={styles.levelModalRoot}>
          <View style={styles.dungeonResultCard}>
            <View style={styles.resultTrophy}>
              <Sparkles size={28} color={palette.accent} fill={palette.accent} />
            </View>
            <Text style={styles.levelKicker}>DUNGEON CLEAR</Text>
            <Text style={styles.dungeonResultTitle}>주간 던전 클리어!</Text>
            <Text style={styles.dungeonResultSub}>자동 전투 보상이 도착했어요</Text>
            {lastReward ? (
              <>
                <View style={styles.rewardFormula}>
                  <Text style={styles.rewardFormulaText}>
                    기본 100 × {lastReward.multiplier.toFixed(1)} =
                  </Text>
                  <Animated.Text style={styles.rewardFormulaValue}>
                    {rewardCount.displayValue} 🪙
                  </Animated.Text>
                </View>
                <View style={styles.resultLootRow}>
                  <View style={styles.resultLootItem}>
                    <Text style={styles.resultLootEmoji}>🧩</Text>
                    <Text style={styles.resultLootLabel}>펫 조각</Text>
                    <Text style={styles.resultLootValue}>
                      {lastReward.pet} · {lastReward.fragments}개
                    </Text>
                  </View>
                  <View style={styles.resultLootItem}>
                    <Text style={styles.resultLootEmoji}>🎁</Text>
                    <Text style={styles.resultLootLabel}>랜덤 아이템</Text>
                    <Text style={styles.resultLootValue}>{lastReward.item}</Text>
                  </View>
                </View>
              </>
            ) : null}
            <Pressable
              onPress={onGoShop}
              style={({ pressed }) => [
                styles.resultShopButton,
                pressed && styles.pressed,
              ]}
            >
              <ShoppingBag size={16} color={palette.white} />
              <Text style={styles.resultShopButtonText}>상점에서 교환하기</Text>
            </Pressable>
            <Pressable onPress={closeResult} style={styles.resultCloseButton}>
              <Text style={styles.resultCloseText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PetCollection() {
  const pets = [
    { emoji: '🦊', name: '루나 폭스', rarity: '희귀', chance: '15%', color: '#A58FFF' },
    { emoji: '🐉', name: '별빛 드래곤', rarity: '전설', chance: '3%', color: '#FFB020' },
    { emoji: '🟢', name: '별빛 슬라임', rarity: '일반', chance: '82%', color: '#72E2AE' },
  ];
  return (
    <View style={styles.petCollection}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>PET CODEX</Text>
          <Text style={styles.sectionTitle}>획득 가능한 펫</Text>
        </View>
        <Text style={styles.petCollectionHint}>보상 도감</Text>
      </View>
      <View style={styles.petGrid}>
        {pets.map((pet) => (
          <View key={pet.name} style={styles.petCard}>
            <View style={[styles.petIcon, { backgroundColor: `${pet.color}20` }]}>
              <Text style={styles.petEmoji}>{pet.emoji}</Text>
            </View>
            <Text style={styles.petName}>{pet.name}</Text>
            <Text style={[styles.petRarity, { color: pet.color }]}>{pet.rarity}</Text>
            <Text style={styles.petChance}>{pet.chance}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ShopScreen() {
  const coins = useDailyQuestStore((state) => state.coins);
  const spendCoins = useDailyQuestStore((state) => state.spendCoins);
  const [partnerModal, setPartnerModal] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const buy = (label: string, amount: number) => {
    const success = spendCoins(amount);
    setNotice(success ? `${label}을(를) 교환했어요` : '코인이 부족해요');
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2200);
  };

  return (
    <View style={styles.shopScreen}>
      <ScrollView
        contentContainerStyle={styles.shopScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shopTopRow}>
          <View>
            <Text style={styles.eyebrow}>REWARD SHOP</Text>
            <Text style={styles.shopTitle}>상점</Text>
          </View>
          <View style={styles.shopCoinPill}>
            <Coins size={14} color={palette.accent} fill={palette.accent} />
            <Text style={styles.shopCoinText}>{coins.toLocaleString()}</Text>
          </View>
        </View>
        <Text style={styles.shopSubtitle}>모험에서 얻은 코인을 보상으로 바꿔요.</Text>
        <Text style={styles.shopSectionTitle}>게임 아이템</Text>
        <View style={styles.shopItemCard}>
          <View style={[styles.shopItemIcon, { backgroundColor: palette.amberSoft }]}>
            <Text style={styles.shopItemEmoji}>❄️</Text>
          </View>
          <View style={styles.shopItemCopy}>
            <Text style={styles.shopItemName}>스트릭 프리즈</Text>
            <Text style={styles.shopItemDescription}>하루의 스트릭을 안전하게 보존해요.</Text>
          </View>
          <Pressable
            onPress={() => buy('스트릭 프리즈', 300)}
            style={({ pressed }) => [styles.shopBuyButton, pressed && styles.pressed]}
          >
            <Coins size={11} color={palette.accentForeground} />
            <Text style={styles.shopBuyText}>300</Text>
          </Pressable>
        </View>
        <View style={styles.shopItemCard}>
          <View style={[styles.shopItemIcon, { backgroundColor: palette.purpleSoft }]}>
            <Text style={styles.shopItemEmoji}>🦊</Text>
          </View>
          <View style={styles.shopItemCopy}>
            <Text style={styles.shopItemName}>펫 스킨</Text>
            <Text style={styles.shopItemDescription}>획득한 펫을 새로운 모습으로 꾸며요.</Text>
          </View>
          <Pressable
            onPress={() => buy('펫 스킨', 500)}
            style={({ pressed }) => [styles.shopBuyButton, pressed && styles.pressed]}
          >
            <Coins size={11} color={palette.accentForeground} />
            <Text style={styles.shopBuyText}>500</Text>
          </Pressable>
        </View>
        <Text style={[styles.shopSectionTitle, styles.shopSectionSecond]}>리워드 교환</Text>
        <View style={styles.partnerCard}>
          <View style={[styles.shopItemIcon, { backgroundColor: '#173027' }]}>
            <Text style={styles.shopItemEmoji}>🛡️</Text>
          </View>
          <View style={styles.shopItemCopy}>
            <Text style={styles.shopItemName}>건강증진형 보험 할인 쿠폰</Text>
            <Text style={styles.shopItemDescription}>파트너 혜택으로 교환할 수 있어요.</Text>
          </View>
          <Pressable
            onPress={() => setPartnerModal('건강증진형 보험 할인 쿠폰')}
            style={({ pressed }) => [styles.partnerButton, pressed && styles.pressed]}
          >
            <Text style={styles.partnerButtonText}>교환</Text>
          </Pressable>
        </View>
        <View style={styles.partnerCard}>
          <View style={[styles.shopItemIcon, { backgroundColor: '#252838' }]}>
            <Text style={styles.shopItemEmoji}>🏦</Text>
          </View>
          <View style={styles.shopItemCopy}>
            <Text style={styles.shopItemName}>제휴 적금 우대금리 0.2%p</Text>
            <Text style={styles.shopItemDescription}>건강 습관을 금융 혜택으로 연결해요.</Text>
          </View>
          <Pressable
            onPress={() => setPartnerModal('제휴 적금 우대금리 0.2%p')}
            style={({ pressed }) => [styles.partnerButton, pressed && styles.pressed]}
          >
            <Text style={styles.partnerButtonText}>교환</Text>
          </Pressable>
        </View>
      </ScrollView>
      {notice ? (
        <View style={styles.shopToast}>
          <Check size={15} color={palette.success} />
          <Text style={styles.shopToastText}>{notice}</Text>
        </View>
      ) : null}
      <Modal
        visible={Boolean(partnerModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setPartnerModal(null)}
      >
        <View style={styles.levelModalRoot}>
          <View style={styles.partnerModalCard}>
            <View style={styles.partnerModalIcon}>
              <LockKeyhole size={25} color={palette.purpleBright} />
            </View>
            <Text style={styles.dungeonResultTitle}>제휴사 연동 예정</Text>
            <Text style={styles.partnerModalBody}>
              {partnerModal} 혜택은 제휴사 연동 후 교환할 수 있어요.
            </Text>
            <Pressable
              onPress={() => setPartnerModal(null)}
              style={({ pressed }) => [styles.levelUpButton, pressed && styles.pressed]}
            >
              <Text style={styles.levelUpButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: typeof Home;
  }> = [
    { key: 'home', label: '홈', icon: Home },
    { key: 'calendar', label: '캘린더', icon: CalendarDays },
    { key: 'dungeon', label: '던전', icon: Swords },
    { key: 'party', label: '파티', icon: Users },
    { key: 'shop', label: '상점', icon: ShoppingBag },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key;
        return (
          <Pressable
            key={key}
            testID={`tab-${key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(key)}
            style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
          >
            <View style={[styles.navIconWrap, active && styles.navIconActive]}>
              <Icon
                size={19}
                color={active ? palette.white : palette.mutedForeground}
                strokeWidth={active ? 2.4 : 1.8}
              />
            </View>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DeveloperSheet({
  visible,
  onClose,
  onTimeTravel,
}: {
  visible: boolean;
  onClose: () => void;
  onTimeTravel: (value: Date | null) => void;
}) {
  const addSteps = useDailyQuestStore((state) => state.addSteps);
  const breakStreak = useDailyQuestStore((state) => state.breakStreak);
  const reset = useDailyQuestStore((state) => state.reset);
  const generateDemoHistory = useDailyQuestStore(
    (state) => state.generateDemoHistory,
  );
  const seedBehaviorLogs = useDailyQuestStore((state) => state.seedBehaviorLogs);
  const completeMotherMedication = useDailyQuestStore(
    (state) => state.completeMotherMedication,
  );

  const runAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.devSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetTitleRow}>
            <View>
              <Text style={styles.eyebrow}>DEVELOPER TOOLS</Text>
              <Text style={styles.sheetTitle}>시연용 상태 패널</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={18} color={palette.mutedForeground} />
            </Pressable>
          </View>
          <Text style={styles.sheetDescription}>
            데이터 연결 전, 건강 이벤트와 상태 변화를 빠르게 확인합니다.
          </Text>
          <View style={styles.devActions}>
            <Pressable
              testID="dev-add-steps"
              onPress={() => runAction(addSteps)}
              style={({ pressed }) => [
                styles.devAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.devActionIcon}>
                <Activity size={18} color={palette.success} />
              </View>
              <Text style={styles.devActionText}>걸음 수 +1,000</Text>
              <ChevronRight size={17} color={palette.mutedForeground} />
            </Pressable>
            <Pressable
              testID="dev-break-streak"
              onPress={() => runAction(breakStreak)}
              style={({ pressed }) => [
                styles.devAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.devActionIcon, styles.devActionAmber]}>
                <Flame size={18} color={palette.accent} />
              </View>
              <Text style={styles.devActionText}>스트릭 끊기</Text>
              <ChevronRight size={17} color={palette.mutedForeground} />
            </Pressable>
            <Pressable
              testID="dev-generate-history"
              onPress={() => runAction(generateDemoHistory)}
              style={({ pressed }) => [
                styles.devAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.devActionIcon, styles.devActionPurple]}>
                <CalendarDays size={18} color={palette.purpleBright} />
              </View>
              <Text style={styles.devActionText}>
                지난 2주 랜덤 달성 기록 생성
              </Text>
              <ChevronRight size={17} color={palette.mutedForeground} />
            </Pressable>
            <Pressable
              testID="dev-seed-pattern"
              onPress={() => runAction(seedBehaviorLogs)}
              style={({ pressed }) => [
                styles.devAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.devActionIcon, styles.devActionPurple]}>
                <SlidersHorizontal size={18} color={palette.purpleBright} />
              </View>
              <Text style={styles.devActionText}>행동 로그 시드</Text>
              <ChevronRight size={17} color={palette.mutedForeground} />
            </Pressable>
            <View style={styles.devTimeTravel}>
              <Text style={styles.devTimeTravelLabel}>시간 여행</Text>
              <View style={styles.devTimeTravelButtons}>
                <Pressable
                  testID="dev-time-wed-night"
                  onPress={() => onTimeTravel(new Date('2026-09-23T12:00:00.000Z'))}
                  style={styles.devTimeButton}
                >
                  <Text style={styles.devTimeButtonText}>수 21시</Text>
                </Pressable>
                <Pressable
                  testID="dev-time-tue-morning"
                  onPress={() => onTimeTravel(new Date('2026-09-22T01:00:00.000Z'))}
                  style={styles.devTimeButton}
                >
                  <Text style={styles.devTimeButtonText}>화 10시</Text>
                </Pressable>
                <Pressable
                  testID="dev-time-reset"
                  onPress={() => onTimeTravel(null)}
                  style={styles.devTimeButton}
                >
                  <Text style={styles.devTimeButtonText}>현재</Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              testID="dev-mother-medication"
              onPress={() => runAction(completeMotherMedication)}
              style={({ pressed }) => [
                styles.devAction,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.devActionIcon, styles.devActionGreen]}>
                <HeartPulse size={18} color={palette.success} />
              </View>
              <Text style={styles.devActionText}>어머니 복약 완료 처리</Text>
              <ChevronRight size={17} color={palette.mutedForeground} />
            </Pressable>
            <Pressable
              testID="dev-reset"
              onPress={() => runAction(reset)}
              style={({ pressed }) => [
                styles.devAction,
                styles.devActionDanger,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.devActionIcon, styles.devActionDangerIcon]}>
                <RotateCcw size={18} color={palette.destructive} />
              </View>
              <Text style={[styles.devActionText, styles.devActionDangerText]}>
                전체 초기화
              </Text>
              <ChevronRight size={17} color={palette.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LevelUpModal({
  visible,
  level,
  onClose,
}: {
  visible: boolean;
  level: number;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.levelModalRoot}>
        <View style={styles.levelModalCard}>
          <View style={styles.levelSpark}>
            <Sparkles size={27} color={palette.accent} fill={palette.accent} />
          </View>
          <Text style={styles.levelKicker}>QUEST COMPLETE</Text>
          <Text style={styles.levelUpTitle}>레벨 업!</Text>
          <Text style={styles.levelUpBody}>
            새로운 모험의 장이 열렸습니다.
          </Text>
          <View style={styles.newLevelPill}>
            <Text style={styles.newLevelLabel}>LEVEL</Text>
            <Text style={styles.newLevelValue}>{level}</Text>
          </View>
          <Pressable
            testID="level-up-close"
            onPress={onClose}
            style={({ pressed }) => [
              styles.levelUpButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.levelUpButtonText}>계속하기</Text>
            <ArrowUpRight size={17} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ComingSoon({ tab }: { tab: TabKey }) {
  const labels: Record<TabKey, string> = {
    home: '홈',
    calendar: '캘린더',
    dungeon: '던전',
    party: '파티',
    shop: '상점',
  };
  return (
    <View style={styles.comingSoon}>
      <View style={styles.comingSoonIcon}>
        <Compass size={26} color={palette.purpleBright} />
      </View>
      <Text style={styles.comingSoonTitle}>{labels[tab]} 준비 중</Text>
      <Text style={styles.comingSoonBody}>
        더 나은 모험을 위해 다음 업데이트에서 만나요.
      </Text>
    </View>
  );
}

export default function DailyQuestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const quests = useDailyQuestStore((state) => state.quests);
  const goals = useDailyQuestStore((state) => state.goals);
  const steps = useDailyQuestStore((state) => state.steps);
  const streak = useDailyQuestStore((state) => state.streak);
  const streakBroken = useDailyQuestStore((state) => state.streakBroken);
  const completeQuest = useDailyQuestStore((state) => state.completeQuest);
  const evaluateStreak = useDailyQuestStore((state) => state.evaluateStreak);
  const reviveStreak = useDailyQuestStore((state) => state.reviveStreak);
  const removeQuests = useDailyQuestStore((state) => state.removeQuests);
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [homeDate, setHomeDate] = useState(formatDateInSeoul(now()));
  const [devSheetVisible, setDevSheetVisible] = useState(false);
  const [clockVersion, setClockVersion] = useState(0);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [revivalSuccessVisible, setRevivalSuccessVisible] = useState(false);
  const [level, setLevel] = useState(7);
  const [reward, setReward] = useState(0);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [captureVisible, setCaptureVisible] = useState(false);
  const [captureFullVisible, setCaptureFullVisible] = useState(false);
  const [captureInitialText, setCaptureInitialText] = useState('');
  const [captureNotice, setCaptureNotice] = useState<{
    questIds: string[];
    count: number;
  } | null>(null);
  const [highlightedQuestIds, setHighlightedQuestIds] = useState<string[]>([]);
  const animatedSteps = useAnimatedNumber(steps, 700);
  const autoCompletionInFlight = useRef(new Set<string>());
  const captureNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthAdapter = useMemo<HealthAdapter>(
    () => new MockHealthAdapter(() => useDailyQuestStore.getState().steps),
    [],
  );
  const todayDate = formatDateInSeoul(now());

  useEffect(() => {
    evaluateStreak();
  }, [evaluateStreak]);

  useEffect(() => {
    setHomeDate(todayDate);
  }, [clockVersion, todayDate]);

  useEffect(() => {
    const timeout = rewardVisible
      ? setTimeout(() => setRewardVisible(false), 1150)
      : undefined;
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [rewardVisible]);

  useEffect(() => {
    let cancelled = false;

    const pollHealthData = async () => {
      const [stepsValue, sleep, weight, medication] = await Promise.all([
        healthAdapter.getSteps(),
        healthAdapter.getSleepHours(),
        healthAdapter.getWeight(),
        healthAdapter.getMedicationTaken(),
      ]);
      if (cancelled) return;

      const snapshot: HealthMetricSnapshot = {
        steps: stepsValue,
        sleep,
        weight,
        medication,
      };
      const liveQuests = useDailyQuestStore.getState().quests;
      liveQuests
        .filter(
          (quest) =>
            !quest.completed &&
            quest.scheduledDate === CALENDAR_TODAY &&
            meetsAutoClearCondition(snapshot, quest) &&
            !autoCompletionInFlight.current.has(quest.id),
        )
        .forEach((quest, index) => {
          autoCompletionInFlight.current.add(quest.id);
          setTimeout(() => {
            if (cancelled) return;
            const result = completeQuest(quest.id);
            autoCompletionInFlight.current.delete(quest.id);
            if (!result) return;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (result.revived) setRevivalSuccessVisible(true);
            setTimeout(() => {
              if (cancelled) return;
              setToastMessage(getAutoClearToast(quest));
              setToastVisible(true);
            }, 260);
            setTimeout(() => {
              if (cancelled) return;
              setReward(result.reward);
              setRewardVisible(false);
              requestAnimationFrame(() => setRewardVisible(true));
              if (result.leveledUp) {
                setLevel(result.nextLevel);
                setLevelUpVisible(true);
              }
            }, 620);
            setTimeout(() => setToastVisible(false), 2100);
          }, index * 900);
        });
    };

    pollHealthData();
    const pollId = setInterval(pollHealthData, 5000);
    return () => {
      cancelled = true;
      clearInterval(pollId);
    };
  }, [completeQuest, healthAdapter]);

  useEffect(
    () => () => {
      if (captureNoticeTimer.current) clearTimeout(captureNoticeTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  const handleCaptureSaved = (questIds: string[], count: number) => {
    setCaptureNotice({ questIds, count });
    setHighlightedQuestIds(questIds);
    if (captureNoticeTimer.current) clearTimeout(captureNoticeTimer.current);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    captureNoticeTimer.current = setTimeout(() => setCaptureNotice(null), 5000);
    highlightTimer.current = setTimeout(() => setHighlightedQuestIds([]), 2500);
  };

  const homeQuests = useMemo(
    () =>
      quests.filter(
        (quest) =>
          quest.scheduledDate === homeDate && quest.goalId !== 'pattern-history',
      ),
    [homeDate, quests],
  );
  const completedCount = useMemo(
    () => homeQuests.filter((quest) => quest.completed).length,
    [homeQuests],
  );

  const handleComplete = (quest: Quest, multiplier = 1) => {
    if (quest.scheduledDate !== formatDateInSeoul(now())) return;
    const result = completeQuest(quest.id, multiplier);
    if (!result) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (result.revived) setRevivalSuccessVisible(true);
    setReward(result.reward);
    setRewardVisible(false);
    requestAnimationFrame(() => setRewardVisible(true));
    if (result.leveledUp) {
      setLevel(result.nextLevel);
      setLevelUpVisible(true);
    }
  };

  const handleRevive = () => {
    if (steps < 5000) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reviveStreak();
    setRevivalSuccessVisible(true);
  };

  const handleTimeTravel = (value: Date | null) => {
    setDemoNow(value);
    setClockVersion((version) => version + 1);
  };

  return (
    <View
      style={[
        styles.appBackground,
        Platform.OS === 'web' && styles.webBackground,
      ]}
    >
      <StatusBar style="light" />
      <View
        style={[
          styles.phoneShell,
          {
            paddingTop: Platform.OS === 'web' ? 67 : insets.top,
            paddingBottom: Platform.OS === 'web' ? 34 : 0,
          },
        ]}
      >
        <StatusHeader onProfilePress={() => router.push('/profile')} />
        {activeTab === 'home' ? (
          <>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <HomeDatePager
                date={homeDate}
                today={todayDate}
                onChange={setHomeDate}
              />
              <View style={styles.greetingRow}>
                <View>
                  <Text style={styles.eyebrow}>
                    {homeDate === todayDate ? 'TODAY' : homeDate > todayDate ? 'UPCOMING' : 'QUEST LOG'}
                  </Text>
                  <Text style={styles.greeting}>
                    {homeDate === todayDate ? '오늘의 모험' : `${homeDate.slice(5).replace('-', '월 ')}일의 모험`}
                  </Text>
                </View>
                <View style={styles.questProgress}>
                  <Text style={styles.questProgressNumber}>{completedCount}</Text>
                  <Text style={styles.questProgressSlash}>/</Text>
                   <Text style={styles.questProgressTotal}>{homeQuests.length}</Text>
                </View>
              </View>
              {homeDate === todayDate && streakBroken ? (
                <StreakRescueBanner streak={streak} />
              ) : null}
              {homeDate === todayDate ? (
                <HeroSlot
                  key={clockVersion}
                  quests={quests}
                  rescueForced={streakBroken}
                  onComplete={handleComplete}
                />
              ) : (
                <View style={styles.readOnlyDayCard}>
                  <LockKeyhole size={16} color={palette.mutedForeground} />
                  <Text style={styles.readOnlyDayText}>
                    다른 날짜의 퀘스트는 확인하거나 삭제할 수 있어요.
                  </Text>
                </View>
              )}
              <View style={styles.questSection}>
                <View style={styles.sectionHeading}>
                  <View>
                    <Text style={styles.eyebrow}>DAILY QUESTS</Text>
                    <Text style={styles.sectionTitle}>
                      {homeDate === todayDate ? '오늘의 퀘스트' : `${homeDate.slice(5).replace('-', '월 ')}일의 퀘스트`}
                    </Text>
                  </View>
                  <View style={styles.questStatus}>
                    <CircleDot size={13} color={palette.success} />
                    <Text style={styles.questStatusText}>
                      {homeDate === todayDate ? '진행 중' : '기록 보기'}
                    </Text>
                  </View>
                </View>
                <View style={styles.questList}>
                  {homeQuests.length > 0 ? (
                    homeQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        onComplete={handleComplete}
                        canComplete={homeDate === todayDate}
                        onDelete={(item) => removeQuests([item.id])}
                        highlighted={highlightedQuestIds.includes(quest.id)}
                      />
                    ))
                  ) : (
                    <View style={styles.emptyHomeDay}>
                      <CalendarDays size={18} color={palette.mutedForeground} />
                      <Text style={styles.emptyHomeDayText}>이 날짜에는 등록된 퀘스트가 없어요.</Text>
                    </View>
                  )}
                </View>
                {homeDate === todayDate ? (
                  <View style={styles.stepsHint}>
                    <Activity size={15} color={palette.success} />
                    <Text style={styles.stepsHintText}>
                      오늘 걸음 수 <Text style={styles.stepsHintValue}>{animatedSteps.displayValue.toLocaleString()}보</Text>
                    </Text>
                    <Text style={styles.stepsHintGoal}>/ 7,000보</Text>
                  </View>
                ) : null}
              </View>
              <QuickCaptureEntry
                onPress={() => {
                  setCaptureInitialText('');
                  setCaptureVisible(true);
                }}
              />
              {captureNotice ? (
                <View style={styles.captureNotice}>
                  <View style={styles.captureNoticeCopy}>
                    <Check size={14} color={palette.success} />
                    <Text style={styles.captureNoticeText}>
                      {captureNotice.count}개 등록됨
                    </Text>
                  </View>
                  <Pressable
                    testID="quick-capture-undo"
                    onPress={() => {
                      removeQuests(captureNotice.questIds);
                      setCaptureNotice(null);
                    }}
                    style={styles.captureUndoButton}
                  >
                    <RotateCcw size={12} color={palette.accent} />
                    <Text style={styles.captureUndoText}>되돌리기</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.bottomSpacer} />
            </ScrollView>
            <FloatingReward reward={reward} visible={rewardVisible} />
          </>
        ) : activeTab === 'calendar' ? (
          <CalendarScreen
            quests={quests}
            goals={goals}
            onComplete={handleComplete}
            onAddForDate={(date) => {
              const [, month, day] = date.split('-');
              setCaptureInitialText(`${Number(month)}/${Number(day)} `);
              setCaptureVisible(true);
            }}
          />
        ) : activeTab === 'party' ? (
          <PartyScreen />
        ) : activeTab === 'dungeon' ? (
          <DungeonScreen onGoShop={() => setActiveTab('shop')} />
        ) : activeTab === 'shop' ? (
          <ShopScreen />
        ) : (
          <ComingSoon tab={activeTab} />
        )}
        <BottomNav activeTab={activeTab} onChange={setActiveTab} />
        <Pressable
          testID="tab-capture"
          accessibilityRole="button"
          accessibilityLabel="퀵 캡처"
          onPress={() => setCaptureFullVisible(true)}
          style={({ pressed }) => [
            styles.captureFab,
            { bottom: Platform.OS === 'web' ? 67 : 42 + insets.bottom },
            pressed && styles.fabPressed,
          ]}
        >
          <Sparkles size={22} color={palette.white} />
        </Pressable>
        <HealthToast message={toastMessage} visible={toastVisible} />
        <Pressable
          testID="developer-settings"
          accessibilityRole="button"
          onPress={() => setDevSheetVisible(true)}
          style={({ pressed }) => [
            styles.fab,
            { bottom: Platform.OS === 'web' ? 101 : 77 + insets.bottom },
            pressed && styles.fabPressed,
          ]}
        >
          <Settings size={19} color={palette.white} />
        </Pressable>
      </View>
      <DeveloperSheet
        visible={devSheetVisible}
        onClose={() => setDevSheetVisible(false)}
        onTimeTravel={handleTimeTravel}
      />
      <LevelUpModal
        visible={levelUpVisible}
        level={level}
        onClose={() => setLevelUpVisible(false)}
      />
      <RevivalSuccessModal
        visible={revivalSuccessVisible}
        onClose={() => setRevivalSuccessVisible(false)}
      />
      {captureVisible ? (
        <QuickCapture
          mode="sheet"
          initialText={captureInitialText}
          onClose={() => setCaptureVisible(false)}
          onSaved={handleCaptureSaved}
        />
      ) : null}
      <Modal
        visible={captureFullVisible}
        animationType="slide"
        onRequestClose={() => setCaptureFullVisible(false)}
      >
        <View style={styles.fullCaptureModal}>
          <QuickCapture
            mode="full"
            onClose={() => setCaptureFullVisible(false)}
            onSaved={handleCaptureSaved}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  appBackground: {
    flex: 1,
    backgroundColor: palette.background,
  },
  webBackground: {
    alignItems: 'center',
  },
  phoneShell: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    backgroundColor: palette.background,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.background,
    zIndex: 3,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: palette.purpleSoft,
    borderWidth: 1,
    borderColor: '#52429B',
  },
  avatarEmoji: {
    fontSize: 23,
  },
  headerProfileImage: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  onlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.success,
    borderWidth: 2,
    borderColor: palette.background,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 11,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  playerName: {
    color: palette.foreground,
    fontSize: 15,
    fontWeight: '700',
  },
  levelPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: palette.purpleSoft,
  },
  levelText: {
    color: palette.purpleBright,
    fontSize: 10,
    fontWeight: '700',
  },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 7,
  },
  expTrack: {
    flex: 1,
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: palette.secondary,
  },
  expFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  expText: {
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '600',
    minWidth: 58,
  },
  headerStats: {
    gap: 9,
    marginLeft: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minWidth: 42,
  },
  miniStatText: {
    color: palette.foreground,
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 23,
  },
  homeDatePager: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  homeDateArrow: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: palette.secondary,
  },
  homeDateCopy: {
    flex: 1,
    alignItems: 'center',
  },
  homeDateRelative: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  homeDateValue: {
    color: palette.foreground,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  homeDateHint: {
    color: palette.mutedForeground,
    fontSize: 8,
    marginTop: 3,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  eyebrow: {
    color: palette.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.25,
  },
  greeting: {
    color: palette.foreground,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 6,
  },
  questProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingBottom: 3,
  },
  questProgressNumber: {
    color: palette.purpleBright,
    fontSize: 24,
    fontWeight: '700',
  },
  questProgressSlash: {
    color: palette.mutedForeground,
    fontSize: 15,
    marginHorizontal: 2,
  },
  questProgressTotal: {
    color: palette.mutedForeground,
    fontSize: 15,
    fontWeight: '600',
  },
  revivalCard: {
    padding: 13,
    marginBottom: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#594515',
    backgroundColor: palette.amberSoft,
  },
  revivalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revivalIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#634813',
  },
  revivalCopy: {
    flex: 1,
    marginLeft: 10,
  },
  revivalTitle: {
    color: '#FFE4A0',
    fontSize: 13,
    fontWeight: '700',
  },
  revivalBody: {
    color: '#C9A95E',
    fontSize: 10,
    marginTop: 3,
  },
  revivalMission: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    borderRadius: 13,
    backgroundColor: '#3A2A11',
  },
  revivalRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revivalRingLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revivalRingValue: {
    color: '#FFE4A0',
    fontSize: 12,
    fontWeight: '800',
  },
  revivalRingUnit: {
    color: '#C9A95E',
    fontSize: 8,
    marginTop: 1,
  },
  revivalMissionCopy: {
    flex: 1,
    marginLeft: 12,
  },
  revivalMissionKicker: {
    color: '#C9A95E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  revivalMissionTitle: {
    color: '#FFE4A0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
  },
  revivalMissionBody: {
    color: '#C9A95E',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  reviveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: palette.accent,
  },
  reviveButtonDisabled: {
    backgroundColor: '#493B21',
  },
  reviveButtonText: {
    color: palette.accentForeground,
    fontSize: 11,
    fontWeight: '800',
  },
  reviveButtonTextDisabled: {
    color: palette.mutedForeground,
  },
  revivalSuccessCard: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 29,
    paddingBottom: 23,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#7C5CFF',
    backgroundColor: palette.card,
  },
  revivalSuccessFlame: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: palette.amberSoft,
  },
  streakRescueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#594515',
    backgroundColor: palette.amberSoft,
  },
  streakRescueText: {
    color: '#C9A95E',
    fontSize: 10,
    fontWeight: '700',
  },
  streakRescueStrong: {
    color: '#FFE4A0',
    fontWeight: '900',
  },
  heroSlot: {
    marginBottom: 19,
    padding: 14,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  heroSlotRescue: {
    borderColor: '#8A641D',
    backgroundColor: '#282116',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: palette.purpleSoft,
  },
  heroModePillRescue: {
    backgroundColor: '#493B21',
  },
  heroModeText: {
    color: palette.purpleBright,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  heroMultiplierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#493B21',
  },
  heroMultiplierText: {
    color: palette.accent,
    fontSize: 8,
    fontWeight: '900',
  },
  heroTitle: {
    color: palette.foreground,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },
  heroBody: {
    color: palette.mutedForeground,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  heroQuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    padding: 10,
    borderRadius: 11,
    backgroundColor: palette.background,
  },
  heroQuestIcon: {
    width: 29,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#173027',
  },
  heroQuestCopy: {
    flex: 1,
    marginLeft: 9,
  },
  heroQuestTitle: {
    color: palette.foreground,
    fontSize: 12,
    fontWeight: '800',
  },
  heroQuestMeta: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 3,
  },
  heroStarterStep: {
    color: palette.mutedForeground,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 9,
  },
  heroStarterStrong: {
    color: '#FFE4A0',
    fontWeight: '800',
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 38,
    marginTop: 11,
    borderRadius: 10,
    backgroundColor: palette.primary,
  },
  heroActionText: {
    color: palette.white,
    fontSize: 10,
    fontWeight: '900',
  },
  heroReason: {
    color: palette.mutedForeground,
    fontSize: 8,
    textAlign: 'right',
    marginTop: 7,
  },
  questSection: {
    marginBottom: 27,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: palette.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 5,
  },
  questStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#173027',
  },
  questStatusText: {
    color: palette.success,
    fontSize: 10,
    fontWeight: '700',
  },
  questList: {
    gap: 9,
  },
  questCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  questCardDone: {
    opacity: 0.62,
    borderColor: '#34384A',
  },
  questCardHighlighted: {
    borderColor: palette.accent,
    shadowColor: palette.accent,
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  questDeleteButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: palette.secondary,
  },
  readOnlyDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 19,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: palette.secondary,
  },
  readOnlyDayText: {
    flex: 1,
    color: palette.mutedForeground,
    fontSize: 10,
    lineHeight: 15,
  },
  emptyHomeDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  emptyHomeDayText: {
    color: palette.mutedForeground,
    fontSize: 10,
  },
  questCheckbox: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4C5166',
  },
  questCheckboxDone: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  questIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    marginLeft: 10,
  },
  questCopy: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questTitle: {
    flexShrink: 1,
    color: palette.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  doneText: {
    color: palette.mutedForeground,
    textDecorationLine: 'line-through',
  },
  questCategory: {
    color: palette.mutedForeground,
    fontSize: 10,
    marginTop: 4,
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: palette.amberSoft,
  },
  autoBadgeText: {
    color: palette.accent,
    fontSize: 8,
    fontWeight: '800',
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 6,
  },
  rewardCopy: {
    alignItems: 'flex-end',
  },
  rewardPlus: {
    color: palette.purpleBright,
    fontSize: 10,
    fontWeight: '700',
  },
  rewardValue: {
    color: palette.purpleBright,
    fontSize: 16,
    lineHeight: 17,
    fontWeight: '800',
  },
  rewardLabel: {
    color: palette.mutedForeground,
    fontSize: 8,
    fontWeight: '700',
  },
  stepsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 11,
    paddingLeft: 3,
  },
  stepsHintText: {
    color: palette.mutedForeground,
    fontSize: 11,
  },
  stepsHintValue: {
    color: palette.success,
    fontWeight: '700',
  },
  stepsHintGoal: {
    color: palette.mutedForeground,
    fontSize: 10,
  },
  floatingReward: {
    position: 'absolute',
    top: 115,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: palette.purpleSoft,
    zIndex: 10,
  },
  floatingRewardText: {
    color: palette.purpleBright,
    fontSize: 13,
    fontWeight: '800',
  },
  healthToast: {
    position: 'absolute',
    top: 86,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#347457',
    backgroundColor: '#1A3429',
    zIndex: 12,
  },
  healthToastHidden: {
    opacity: 0,
  },
  healthToastText: {
    color: '#B9F2D4',
    fontSize: 12,
    fontWeight: '700',
  },
  goalSection: {
    marginTop: 2,
  },
  captureEntrySection: {
    marginTop: 21,
  },
  captureEntry: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.purpleBright,
    backgroundColor: palette.card,
  },
  captureEntryText: {
    flex: 1,
    color: palette.mutedForeground,
    fontSize: 11,
  },
  captureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#347457',
    backgroundColor: '#1A3429',
  },
  captureNoticeCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captureNoticeText: {
    color: '#B9F2D4',
    fontSize: 10,
    fontWeight: '700',
  },
  captureUndoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  captureUndoText: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: '800',
  },
  goalInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingLeft: 15,
    paddingRight: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  goalInput: {
    flex: 1,
    color: palette.foreground,
    fontSize: 13,
  },
  goalButton: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: palette.primary,
  },
  goalButtonDisabled: {
    backgroundColor: palette.secondary,
  },
  goalAddedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#193328',
  },
  goalAddedMessageText: {
    color: '#B9F2D4',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 26,
  },
  calendarScreen: {
    flex: 1,
  },
  calendarScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
  },
  calendarTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarTitle: {
    color: palette.foreground,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
  calendarAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: palette.amberSoft,
  },
  calendarAiBadgeText: {
    color: palette.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 13,
  },
  monthArrow: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: palette.secondary,
  },
  monthLabel: {
    color: palette.foreground,
    fontSize: 17,
    fontWeight: '800',
  },
  goalChipRow: {
    gap: 8,
    paddingBottom: 17,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  goalChipSelected: {
    borderColor: palette.purpleBright,
    backgroundColor: palette.purpleSoft,
  },
  goalChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  goalChipText: {
    color: palette.foreground,
    fontSize: 11,
    fontWeight: '700',
  },
  activeGoalSummaryRow: {
    gap: 8,
    paddingBottom: 14,
  },
  activeGoalSummaryCard: {
    width: 148,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  activeGoalSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeGoalSummaryTitle: {
    flex: 1,
    color: palette.secondaryForeground,
    fontSize: 9,
    fontWeight: '800',
  },
  activeGoalSummaryDday: {
    fontSize: 9,
    fontWeight: '900',
  },
  activeGoalSummaryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  activeGoalSummaryTrack: {
    flex: 1,
    height: 4,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: palette.secondary,
  },
  activeGoalSummaryFill: {
    height: 4,
    borderRadius: 2,
  },
  activeGoalSummaryProgress: {
    color: palette.mutedForeground,
    fontSize: 8,
    fontWeight: '800',
  },
  patternToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
    paddingHorizontal: 3,
  },
  patternToggleTitle: {
    color: palette.foreground,
    fontSize: 12,
    fontWeight: '800',
  },
  patternToggleBody: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 3,
  },
  patternToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: palette.secondary,
  },
  patternToggleOn: {
    backgroundColor: palette.purpleSoft,
  },
  patternToggleText: {
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '800',
  },
  patternToggleTextOn: {
    color: palette.purpleBright,
  },
  patternCard: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  patternColumnLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  patternCorner: {
    width: 21,
  },
  patternColumnLabel: {
    flex: 1,
    color: palette.mutedForeground,
    fontSize: 8,
    textAlign: 'center',
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  patternRowLabel: {
    width: 16,
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  patternCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    borderRadius: 6,
  },
  patternCellStrong: {
    borderWidth: 1,
    borderColor: palette.success,
  },
  patternCellActive: {
    borderWidth: 2,
    borderColor: palette.white,
  },
  patternCellText: {
    color: palette.white,
    fontSize: 8,
    fontWeight: '800',
  },
  patternSummary: {
    color: palette.mutedForeground,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 9,
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 8,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calendarLegendText: {
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '600',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 17,
    paddingHorizontal: 5,
    paddingTop: 9,
    paddingBottom: 6,
    backgroundColor: palette.card,
  },
  weekdayLabel: {
    width: '14.285%',
    color: palette.mutedForeground,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  sundayLabel: {
    color: '#FF7F91',
  },
  saturdayLabel: {
    color: '#82A8FF',
  },
  calendarDayCell: {
    width: '14.285%',
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  calendarDayOutside: {
    opacity: 0.35,
  },
  calendarDayToday: {
    borderColor: palette.purpleBright,
    backgroundColor: '#252044',
  },
  calendarDayPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  calendarDayNumber: {
    color: palette.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
  },
  calendarDayNumberToday: {
    color: palette.white,
  },
  calendarRingWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -1,
  },
  calendarFailedDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#707789',
  },
  calendarDayFooter: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarGoalDots: {
    flexDirection: 'row',
    gap: 2,
  },
  calendarGoalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  calendarFire: {
    fontSize: 8,
  },
  calendarSheet: {
    maxHeight: '76%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: palette.card,
  },
  calendarSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  calendarSheetBody: {
    gap: 8,
  },
  calendarAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginBottom: 2,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: palette.purpleSoft,
  },
  calendarAddButtonText: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
  },
  calendarEmpty: {
    alignItems: 'center',
    gap: 9,
    paddingVertical: 35,
  },
  calendarEmptyText: {
    color: palette.mutedForeground,
    fontSize: 12,
  },
  partyScreen: {
    flex: 1,
  },
  partyScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  partyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  partyTitle: {
    color: palette.foreground,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 6,
  },
  partySubtitle: {
    color: palette.mutedForeground,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  partySettingsButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: palette.secondary,
  },
  partyExpCard: {
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#51449B',
    backgroundColor: '#211D3C',
  },
  partyExpHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  partyExpKicker: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  partyExpTitle: {
    color: palette.foreground,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  partyExpValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  partyExpValue: {
    color: palette.white,
    fontSize: 20,
    fontWeight: '800',
  },
  partyExpGoal: {
    color: palette.mutedForeground,
    fontSize: 10,
    marginLeft: 3,
  },
  partyExpTrack: {
    height: 9,
    overflow: 'hidden',
    marginTop: 17,
    borderRadius: 5,
    backgroundColor: '#34304F',
  },
  partyExpFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: palette.purpleBright,
  },
  partyExpFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  partyExpMembers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  partyExpMember: {
    fontSize: 14,
  },
  partyExpHint: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginLeft: 5,
  },
  partyRewardText: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: 142,
  },
  partyPrivacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 11,
    borderRadius: 11,
    backgroundColor: '#173027',
  },
  partyPrivacyText: {
    color: '#B9F2D4',
    fontSize: 10,
    fontWeight: '700',
  },
  partySectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 25,
    marginBottom: 12,
  },
  partyMemberCount: {
    color: palette.mutedForeground,
    fontSize: 11,
    fontWeight: '700',
  },
  partyMemberList: {
    gap: 10,
  },
  partyMemberCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  partyMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyAvatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: palette.purpleSoft,
    borderWidth: 1,
    borderColor: '#52429B',
  },
  partyAvatarEmoji: {
    fontSize: 24,
  },
  partyAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  partyOnlineDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.success,
    borderWidth: 2,
    borderColor: palette.card,
  },
  partyMemberCopy: {
    flex: 1,
    marginLeft: 11,
  },
  partyMemberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  partyMemberName: {
    color: palette.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  partyLevelPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: palette.purpleSoft,
  },
  partyLevelText: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
  },
  partyMemberFocus: {
    color: palette.mutedForeground,
    fontSize: 10,
    marginTop: 5,
  },
  partyCompletion: {
    alignItems: 'flex-end',
  },
  partyCompletionValue: {
    color: palette.purpleBright,
    fontSize: 16,
    fontWeight: '800',
  },
  partyCompletionLabel: {
    color: palette.mutedForeground,
    fontSize: 8,
    marginTop: 2,
  },
  medicationRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#2B2617',
  },
  medicationRowDone: {
    backgroundColor: '#193328',
  },
  medicationIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#493B21',
  },
  medicationIconDone: {
    backgroundColor: '#24533B',
  },
  medicationEmoji: {
    fontSize: 16,
  },
  medicationCopy: {
    flex: 1,
    marginLeft: 9,
  },
  medicationTitle: {
    color: '#FFE4A0',
    fontSize: 11,
    fontWeight: '800',
  },
  medicationTime: {
    color: '#C9A95E',
    fontWeight: '600',
  },
  medicationStatus: {
    color: '#C9A95E',
    fontSize: 9,
    marginTop: 4,
  },
  medicationStatusDone: {
    color: palette.success,
    fontWeight: '700',
  },
  medicationHidden: {
    flex: 1,
    color: palette.mutedForeground,
    fontSize: 10,
    marginLeft: 9,
  },
  partyMemberFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  pendingQuestText: {
    flex: 1,
    color: palette.mutedForeground,
    fontSize: 9,
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: palette.amberSoft,
  },
  nudgeButtonText: {
    color: palette.accent,
    fontSize: 9,
    fontWeight: '800',
  },
  memberPrivacyText: {
    color: '#747A8B',
    fontSize: 8,
    marginTop: 10,
  },
  activityTimeline: {
    paddingLeft: 2,
  },
  activityItem: {
    minHeight: 68,
    flexDirection: 'row',
  },
  activityRail: {
    width: 20,
    alignItems: 'center',
  },
  activityDot: {
    width: 9,
    height: 9,
    marginTop: 5,
    borderRadius: 5,
    backgroundColor: palette.purpleBright,
    borderWidth: 2,
    borderColor: palette.purpleSoft,
  },
  activityLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
    backgroundColor: palette.border,
  },
  activityBody: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 15,
  },
  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  activityTime: {
    color: palette.foreground,
    fontSize: 10,
    fontWeight: '800',
  },
  activityRelative: {
    color: palette.mutedForeground,
    fontSize: 9,
  },
  activityText: {
    color: palette.foreground,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  activityReward: {
    color: palette.success,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },
  partyToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 79,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#3A2A11',
    borderWidth: 1,
    borderColor: '#71581F',
    zIndex: 10,
  },
  partyToastText: {
    color: '#FFE4A0',
    fontSize: 11,
    fontWeight: '700',
  },
  partySettingsSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: palette.card,
  },
  privacyCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    marginTop: 18,
    borderRadius: 12,
    backgroundColor: '#173027',
  },
  privacyCalloutCopy: {
    flex: 1,
  },
  privacyCalloutTitle: {
    color: '#B9F2D4',
    fontSize: 11,
    fontWeight: '800',
  },
  privacyCalloutBody: {
    color: '#86CBA6',
    fontSize: 9,
    marginTop: 4,
  },
  partySettingsList: {
    gap: 8,
    marginTop: 14,
  },
  partySettingRow: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: palette.secondary,
  },
  partySettingCopy: {
    flex: 1,
  },
  partySettingLabel: {
    color: palette.foreground,
    fontSize: 11,
    fontWeight: '700',
  },
  partySettingDescription: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 4,
  },
  toggleTrack: {
    width: 40,
    height: 23,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 12,
    backgroundColor: '#424758',
  },
  toggleTrackOn: {
    backgroundColor: palette.primary,
  },
  toggleThumb: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#A9ADBA',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: palette.white,
  },
  settingsFooter: {
    color: palette.mutedForeground,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 14,
  },
  dungeonScreen: {
    flex: 1,
  },
  dungeonScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  dungeonTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  dungeonTitle: {
    color: palette.foreground,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 6,
  },
  dungeonCoinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: palette.amberSoft,
  },
  dungeonCoinText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  dungeonEntranceCard: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#52429B',
    backgroundColor: '#211D3C',
  },
  dungeonRune: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: palette.purpleSoft,
    borderWidth: 1,
    borderColor: '#6251B7',
    marginBottom: 14,
  },
  dungeonEntranceKicker: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  dungeonEntranceTitle: {
    color: palette.white,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 9,
  },
  dungeonEntranceBody: {
    color: palette.mutedForeground,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  dungeonPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 15,
    borderRadius: 9,
    backgroundColor: palette.amberSoft,
  },
  dungeonPreviewText: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  dungeonResetWarning: {
    color: '#B6A9D8',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 11,
  },
  dungeonEnterButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    marginTop: 17,
    borderRadius: 12,
    backgroundColor: palette.primary,
  },
  dungeonEnterDisabled: {
    backgroundColor: palette.secondary,
  },
  dungeonEnterText: {
    color: palette.white,
    fontSize: 12,
    fontWeight: '800',
  },
  dungeonEnterTextDisabled: {
    color: palette.mutedForeground,
    fontSize: 10,
  },
  dungeonRuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 14,
    marginTop: 11,
    borderRadius: 15,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dungeonRuleItem: {
    flex: 1,
    alignItems: 'center',
  },
  dungeonRuleValue: {
    color: palette.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  dungeonRuleLabel: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 4,
  },
  dungeonRuleDivider: {
    width: 1,
    height: 27,
    backgroundColor: palette.border,
  },
  petCollection: {
    marginTop: 25,
  },
  petCollectionHint: {
    color: palette.mutedForeground,
    fontSize: 9,
  },
  petGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  petCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 3,
    borderRadius: 14,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  petIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  petEmoji: {
    fontSize: 24,
  },
  petName: {
    color: palette.foreground,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  petRarity: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
  petChance: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 3,
  },
  battleArena: {
    padding: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#52429B',
    backgroundColor: '#211D3C',
  },
  battleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: palette.purpleSoft,
  },
  battleBadgeText: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
  },
  battleCharacters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  battleCharacter: {
    width: '38%',
    alignItems: 'center',
  },
  battleEmoji: {
    fontSize: 42,
  },
  battleName: {
    color: palette.foreground,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
  },
  battleVs: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  battleHpTrack: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
    marginTop: 9,
    borderRadius: 4,
    backgroundColor: '#3B3E4B',
  },
  battleHpFillPlayer: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  battleHpFillEnemy: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.destructive,
  },
  battleHpText: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 4,
  },
  battleLogBox: {
    gap: 9,
    padding: 11,
    marginTop: 25,
    borderRadius: 12,
    backgroundColor: '#171825',
  },
  battleLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  battleLogDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  battleLogText: {
    flex: 1,
    color: palette.secondaryForeground,
    fontSize: 10,
  },
  battleHint: {
    color: palette.mutedForeground,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 13,
  },
  dungeonResultCard: {
    width: '88%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#6251B7',
    backgroundColor: palette.card,
  },
  resultTrophy: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: palette.amberSoft,
    marginBottom: 12,
  },
  dungeonResultTitle: {
    color: palette.foreground,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 7,
  },
  dungeonResultSub: {
    color: palette.mutedForeground,
    fontSize: 10,
    marginTop: 5,
  },
  rewardFormula: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 17,
    borderRadius: 13,
    backgroundColor: '#302668',
  },
  rewardFormulaText: {
    color: palette.secondaryForeground,
    fontSize: 11,
    fontWeight: '700',
  },
  rewardFormulaValue: {
    color: palette.accent,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },
  resultLootRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  resultLootItem: {
    flex: 1,
    alignItems: 'center',
    padding: 9,
    borderRadius: 11,
    backgroundColor: palette.secondary,
  },
  resultLootEmoji: {
    fontSize: 20,
  },
  resultLootLabel: {
    color: palette.mutedForeground,
    fontSize: 8,
    marginTop: 5,
  },
  resultLootValue: {
    color: palette.foreground,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 3,
  },
  resultShopButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 11,
    backgroundColor: palette.primary,
  },
  resultShopButtonText: {
    color: palette.white,
    fontSize: 11,
    fontWeight: '800',
  },
  resultCloseButton: {
    padding: 9,
    marginTop: 3,
  },
  resultCloseText: {
    color: palette.mutedForeground,
    fontSize: 10,
    fontWeight: '700',
  },
  shopScreen: {
    flex: 1,
  },
  shopScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  shopTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  shopTitle: {
    color: palette.foreground,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 6,
  },
  shopSubtitle: {
    color: palette.mutedForeground,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  shopCoinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: palette.amberSoft,
  },
  shopCoinText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  shopSectionTitle: {
    color: palette.foreground,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 11,
  },
  shopSectionSecond: {
    marginTop: 26,
  },
  shopItemCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    marginBottom: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  shopItemIcon: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  shopItemEmoji: {
    fontSize: 23,
  },
  shopItemCopy: {
    flex: 1,
    marginLeft: 10,
  },
  shopItemName: {
    color: palette.foreground,
    fontSize: 11,
    fontWeight: '800',
  },
  shopItemDescription: {
    color: palette.mutedForeground,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
  shopBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: palette.amberSoft,
  },
  shopBuyText: {
    color: palette.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  partnerCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    marginBottom: 9,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#315441',
    backgroundColor: '#192A23',
  },
  partnerButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#24533B',
  },
  partnerButtonText: {
    color: palette.success,
    fontSize: 10,
    fontWeight: '800',
  },
  shopToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 79,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#193328',
    borderWidth: 1,
    borderColor: '#315441',
  },
  shopToastText: {
    color: '#B9F2D4',
    fontSize: 11,
    fontWeight: '700',
  },
  partnerModalCard: {
    width: '84%',
    alignItems: 'center',
    padding: 22,
    borderRadius: 22,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  partnerModalIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: palette.purpleSoft,
  },
  partnerModalBody: {
    color: palette.mutedForeground,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 9,
    marginBottom: 18,
  },
  calendarQuestRow: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: palette.secondary,
  },
  calendarQuestIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: palette.card,
  },
  calendarQuestCopy: {
    flex: 1,
    marginLeft: 10,
  },
  calendarQuestTitle: {
    color: palette.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarQuestDone: {
    color: palette.mutedForeground,
    textDecorationLine: 'line-through',
  },
  calendarQuestMeta: {
    color: palette.mutedForeground,
    fontSize: 10,
    marginTop: 4,
  },
  scheduledBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: palette.purpleSoft,
  },
  scheduledBadgeText: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
  },
  readOnlyText: {
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '700',
  },
  doneBadgeText: {
    color: palette.success,
    fontSize: 9,
    fontWeight: '800',
  },
  todayActionText: {
    color: palette.purpleBright,
    fontSize: 9,
    fontWeight: '800',
  },
  goalCardsSection: {
    marginTop: 24,
  },
  goalCardsHint: {
    color: palette.mutedForeground,
    fontSize: 9,
    paddingTop: 5,
  },
  ddayCard: {
    minHeight: 83,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: palette.card,
  },
  ddayAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  ddayCopy: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  ddayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ddayTitle: {
    color: palette.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  ddayDate: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  ddayProgressTrack: {
    height: 5,
    overflow: 'hidden',
    marginTop: 12,
    borderRadius: 3,
    backgroundColor: palette.secondary,
  },
  ddayProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  ddayProgressText: {
    color: palette.mutedForeground,
    fontSize: 9,
    marginTop: 6,
  },
  ddayPercent: {
    color: palette.foreground,
    fontSize: 15,
    fontWeight: '800',
    paddingRight: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 69,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.background,
    zIndex: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 53,
    gap: 3,
  },
  navIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 31,
    height: 27,
    borderRadius: 9,
  },
  navIconActive: {
    backgroundColor: palette.purpleSoft,
  },
  navLabel: {
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '600',
  },
  navLabelActive: {
    color: palette.purpleBright,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: palette.primary,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
    zIndex: 8,
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  captureFab: {
    position: 'absolute',
    left: '50%',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -28,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: palette.background,
    backgroundColor: palette.primary,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    zIndex: 10,
  },
  fullCaptureModal: {
    flex: 1,
    backgroundColor: palette.background,
  },
  pressed: {
    opacity: 0.78,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(5, 6, 12, 0.72)',
  },
  devSheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 33,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: palette.card,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 37,
    height: 4,
    marginBottom: 22,
    borderRadius: 2,
    backgroundColor: '#51566B',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: palette.foreground,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: palette.secondary,
  },
  sheetDescription: {
    color: palette.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
    marginBottom: 16,
  },
  devActions: {
    gap: 8,
  },
  devTimeTravel: {
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  devTimeTravelLabel: {
    color: palette.mutedForeground,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 7,
  },
  devTimeTravelButtons: {
    flexDirection: 'row',
    gap: 7,
  },
  devTimeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: palette.secondary,
  },
  devTimeButtonText: {
    color: palette.secondaryForeground,
    fontSize: 9,
    fontWeight: '800',
  },
  devAction: {
    minHeight: 57,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: palette.secondary,
  },
  devActionIcon: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#173027',
  },
  devActionAmber: {
    backgroundColor: palette.amberSoft,
  },
  devActionGreen: {
    backgroundColor: '#173027',
  },
  devActionPurple: {
    backgroundColor: palette.purpleSoft,
  },
  devActionDanger: {
    backgroundColor: '#302127',
  },
  devActionDangerIcon: {
    backgroundColor: '#4A2933',
  },
  devActionText: {
    flex: 1,
    color: palette.foreground,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 11,
  },
  devActionDangerText: {
    color: '#FF9BA4',
  },
  levelModalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    backgroundColor: 'rgba(7, 7, 14, 0.8)',
  },
  levelModalCard: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 29,
    paddingBottom: 23,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#51449B',
    backgroundColor: palette.card,
  },
  levelSpark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: palette.purpleSoft,
  },
  levelKicker: {
    color: palette.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 19,
  },
  levelUpTitle: {
    color: palette.foreground,
    fontSize: 33,
    fontWeight: '800',
    marginTop: 7,
  },
  levelUpBody: {
    color: palette.mutedForeground,
    fontSize: 12,
    marginTop: 7,
  },
  newLevelPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 9,
    marginTop: 21,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.purpleSoft,
  },
  newLevelLabel: {
    color: palette.purpleBright,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  newLevelValue: {
    color: palette.white,
    fontSize: 27,
    fontWeight: '800',
  },
  levelUpButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 47,
    marginTop: 22,
    borderRadius: 13,
    backgroundColor: palette.primary,
  },
  levelUpButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: '800',
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 45,
    paddingBottom: 80,
  },
  comingSoonIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 23,
    backgroundColor: palette.purpleSoft,
  },
  comingSoonTitle: {
    color: palette.foreground,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 19,
  },
  comingSoonBody: {
    color: palette.mutedForeground,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});