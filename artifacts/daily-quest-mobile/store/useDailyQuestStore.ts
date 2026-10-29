import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  BreakdownQuest,
  scheduleBreakdownQuests,
} from '../../../lib/scheduler';
import {
  addDaysToDateString,
  formatDateInSeoul,
  now,
} from '../../../lib/clock';

export type QuestCategory = 'health' | 'mind' | 'life' | 'social';
export type AutoClearMetric =
  | 'steps'
  | 'sleep'
  | 'weight'
  | 'medication'
  | 'none';

export interface AutoClearCondition {
  enabled: boolean;
  metric: AutoClearMetric;
  operator: '>=' | '<=';
  value: number;
  unit: string;
}

export interface Quest {
  id: string;
  title: string;
  category: QuestCategory;
  reward: number;
  autoClear: AutoClearCondition;
  scheduledDate: string;
  goalId: string;
  status: 'pending' | 'done' | 'failed' | 'revived';
  completed: boolean;
  startTime?: string | null;
  durationMin?: number;
  location?: string | null;
  note?: string | null;
  difficulty?: number;
  dependsOn?: string[];
  starterStep?: string;
  recurrenceId?: string | null;
  uncertain?: string[];
}

export interface Goal {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
}

export type PartyMedicationStatus = 'pending' | 'done';

export interface PartyMember {
  id: string;
  name: string;
  level: number;
  avatar: string;
  completedCount: number;
  totalCount: number;
  weeklyExp: number;
  focus: string;
  medicationQuest: {
    title: string;
    time: string;
    status: PartyMedicationStatus;
  };
  pendingQuest?: string;
}

export interface PartyActivity {
  id: string;
  time: string;
  relative: string;
  memberName: string;
  icon: string;
  questTitle: string;
  reward: number;
}

export interface PartyShareSettings {
  medication: boolean;
  exercise: boolean;
  sleep: boolean;
  routine: boolean;
}

export type HealthDataKey = 'steps' | 'sleep' | 'weight' | 'medication';

export interface ProfileData {
  nickname: string;
  photoBase64: string | null;
  character: string;
  title: string;
}

export interface HealthDataSettings {
  steps: boolean;
  sleep: boolean;
  weight: boolean;
  medication: boolean;
}

export interface NotificationSettings {
  questReminder: boolean;
  streakRisk: boolean;
  partyNudge: boolean;
  reminderTime: string;
}

export interface RecentCapture {
  id: string;
  input: string;
  questCount: number;
  dates: string[];
  createdAt: string;
}

interface UserStats {
  level: number;
  exp: number;
  expMax: number;
  streak: number;
  coins: number;
  steps: number;
  streakBroken: boolean;
  longestStreak: number;
  completedQuestCount: number;
  totalExpEarned: number;
  lastStreakDate: string | null;
  revivedWeek: string | null;
}

export interface CompletionResult {
  reward: number;
  coins: number;
  leveledUp: boolean;
  nextLevel: number;
  revived: boolean;
}

interface DailyQuestState extends UserStats {
  quests: Quest[];
  goals: Goal[];
  partyMembers: PartyMember[];
  partyActivities: PartyActivity[];
  partyShareSettings: PartyShareSettings;
  partyExpGoal: number;
  partyRewardClaimed: boolean;
  dungeonTicketWeek: string | null;
  streakFreezeCount: number;
  ownedPetSkins: string[];
  ownedPets: string[];
  selectedPet: string;
  profile: ProfileData;
  healthDataSettings: HealthDataSettings;
  notificationSettings: NotificationSettings;
  recentCaptures: RecentCapture[];
  completeQuest: (questId: string, multiplier?: number) => CompletionResult | null;
  addSteps: () => void;
  breakStreak: () => void;
  reset: () => void;
  reviveStreak: () => boolean;
  evaluateStreak: () => void;
  addScheduledGoal: (goal: Goal, breakdown: BreakdownQuest[]) => void;
  addAiGoal: (goal: Goal, quests: Quest[], capture?: RecentCapture) => void;
  generateDemoHistory: () => void;
  seedBehaviorLogs: () => void;
  completeMotherMedication: () => void;
  togglePartyShareSetting: (key: keyof PartyShareSettings) => void;
  updateProfile: (changes: Partial<ProfileData>) => void;
  toggleHealthData: (key: HealthDataKey) => void;
  toggleNotification: (
    key: Exclude<keyof NotificationSettings, 'reminderTime'>,
  ) => void;
  setReminderTime: (time: string) => void;
  setSelectedPet: (pet: string) => void;
  deleteGoal: (goalId: string) => void;
  addAiQuests: (quests: Quest[], capture: RecentCapture) => string[];
  removeQuests: (questIds: string[]) => void;
  useDungeonTicket: (weekKey: string) => void;
  claimDungeonReward: (coins: number) => void;
  spendCoins: (amount: number) => boolean;
}

const TODAY = '2026-09-21';
const dailyGoal: Goal = {
  id: 'daily-routine',
  title: '오늘의 루틴',
  startDate: TODAY,
  endDate: TODAY,
  color: '#7C5CFF',
};
const weightGoal: Goal = {
  id: 'weight-loss-demo',
  title: '5kg 감량',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  color: '#FFB020',
};

const createPartyMembers = (): PartyMember[] => [
  {
    id: 'self',
    name: '나',
    level: 7,
    avatar: '🧙',
    completedCount: 3,
    totalCount: 4,
    weeklyExp: 420,
    focus: '오늘의 루틴',
    medicationQuest: {
      title: '비타민 챙기기',
      time: '09:00',
      status: 'done',
    },
  },
  {
    id: 'mother',
    name: '어머니',
    level: 4,
    avatar: '👩‍🌾',
    completedCount: 3,
    totalCount: 4,
    weeklyExp: 280,
    focus: '복약 · 혈압 관리',
    medicationQuest: {
      title: '혈압약',
      time: '08:00',
      status: 'done',
    },
    pendingQuest: '저녁 복약 알림 확인',
  },
  {
    id: 'father',
    name: '아버지',
    level: 5,
    avatar: '🧔',
    completedCount: 2,
    totalCount: 4,
    weeklyExp: 360,
    focus: '복약 · 혈압 관리',
    medicationQuest: {
      title: '혈압약',
      time: '20:00',
      status: 'pending',
    },
    pendingQuest: '저녁 혈압약 복용',
  },
  {
    id: 'sibling',
    name: '동생',
    level: 9,
    avatar: '🧑‍🎓',
    completedCount: 4,
    totalCount: 5,
    weeklyExp: 510,
    focus: '공부 · 운동',
    medicationQuest: {
      title: '영양제 챙기기',
      time: '22:00',
      status: 'pending',
    },
    pendingQuest: '집중 공부 30분',
  },
];

const createPartyActivities = (): PartyActivity[] => [
  {
    id: 'activity-mother-medicine',
    time: '08:12',
    relative: '18분 전',
    memberName: '어머니',
    icon: '💊',
    questTitle: '혈압약 퀘스트를 완료했습니다',
    reward: 15,
  },
  {
    id: 'activity-sibling-steps',
    time: '09:30',
    relative: '1시간 전',
    memberName: '동생',
    icon: '👟',
    questTitle: '7,000보를 달성했습니다',
    reward: 30,
  },
  {
    id: 'activity-father-medicine',
    time: '07:45',
    relative: '2시간 전',
    memberName: '아버지',
    icon: '💊',
    questTitle: '아침 복약 퀘스트를 완료했습니다',
    reward: 15,
  },
];

const createPartyShareSettings = (): PartyShareSettings => ({
  medication: true,
  exercise: true,
  sleep: true,
  routine: true,
});

const emptyAutoClear: AutoClearCondition = {
  enabled: false,
  metric: 'none',
  operator: '>=',
  value: 0,
  unit: '',
};

const seedQuests: Quest[] = [
  {
    id: 'steps',
    title: '7,000보 걷기',
    category: 'health',
    reward: 20,
    autoClear: {
      enabled: true,
      metric: 'steps',
      operator: '>=',
      value: 7000,
      unit: '보',
    },
    scheduledDate: TODAY,
    goalId: dailyGoal.id,
    status: 'pending',
    completed: false,
  },
  {
    id: 'sleep',
    title: '7시간 수면하기',
    category: 'health',
    reward: 30,
    autoClear: {
      enabled: true,
      metric: 'sleep',
      operator: '>=',
      value: 7,
      unit: '시간',
    },
    scheduledDate: TODAY,
    goalId: dailyGoal.id,
    status: 'pending',
    completed: false,
  },
  {
    id: 'water',
    title: '물 6잔 마시기',
    category: 'health',
    reward: 20,
    autoClear: emptyAutoClear,
    scheduledDate: TODAY,
    goalId: dailyGoal.id,
    status: 'pending',
    completed: false,
  },
  {
    id: 'focus',
    title: '집중 시간 25분 채우기',
    category: 'mind',
    reward: 40,
    autoClear: emptyAutoClear,
    scheduledDate: TODAY,
    goalId: dailyGoal.id,
    status: 'pending',
    completed: false,
  },
  {
    id: 'tidy',
    title: '내일을 위해 공간 정리하기',
    category: 'life',
    reward: 20,
    autoClear: emptyAutoClear,
    scheduledDate: TODAY,
    goalId: dailyGoal.id,
    status: 'pending',
    completed: false,
  },
];

const weightGoalBreakdown: BreakdownQuest[] = [
  {
    id: 'walk',
    title: '7,000보 걷기',
    cycle: 'daily',
    category: 'health',
    exp: 30,
    autoClear: {
      enabled: true,
      metric: 'steps',
      operator: '>=',
      value: 7000,
      unit: '보',
    },
  },
];

const scheduledWeightQuests = scheduleBreakdownQuests(
  weightGoal,
  weightGoalBreakdown,
).map((quest) => ({
  ...quest,
  category: 'health' as QuestCategory,
  autoClear: quest.autoClear as AutoClearCondition,
}));

const createSeedQuests = () => [
  ...seedQuests.map((quest) => ({ ...quest, autoClear: { ...quest.autoClear } })),
  ...scheduledWeightQuests.map((quest) => ({ ...quest })),
];

const initialState: UserStats = {
  level: 7,
  exp: 340,
  expMax: 500,
  streak: 12,
  coins: 1250,
  steps: 3200,
  streakBroken: false,
  longestStreak: 12,
  completedQuestCount: 48,
  totalExpEarned: 2860,
  lastStreakDate: '2026-09-20',
  revivedWeek: null,
};

function weekKey(date: Date): string {
  const value = formatDateInSeoul(date);
  const weekday = new Date(`${value}T00:00:00Z`).getUTCDay();
  return addDaysToDateString(value, -weekday);
}

const createInitialProfile = (): ProfileData => ({
  nickname: '루미',
  photoBase64: null,
  character: '🧙',
  title: '🔥 12일의 불꽃',
});

const createHealthDataSettings = (): HealthDataSettings => ({
  steps: true,
  sleep: true,
  weight: true,
  medication: true,
});

const createNotificationSettings = (): NotificationSettings => ({
  questReminder: true,
  streakRisk: true,
  partyNudge: true,
  reminderTime: '20:00',
});

const appStorage = createJSONStorage<DailyQuestState>(() => {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return AsyncStorage;
});

export const useDailyQuestStore = create<DailyQuestState>()(
  persist(
    (set) => ({
  ...initialState,
  quests: createSeedQuests(),
  goals: [dailyGoal, weightGoal],
  partyMembers: createPartyMembers(),
  partyActivities: createPartyActivities(),
  partyShareSettings: createPartyShareSettings(),
  partyExpGoal: 1600,
  partyRewardClaimed: false,
  dungeonTicketWeek: null,
  streakFreezeCount: 0,
  ownedPetSkins: [],
  ownedPets: ['별빛 슬라임'],
  selectedPet: '별빛 슬라임',
  profile: createInitialProfile(),
  healthDataSettings: createHealthDataSettings(),
  notificationSettings: createNotificationSettings(),
  recentCaptures: [],
  completeQuest: (questId, multiplier = 1) => {
    let result: CompletionResult | null = null;
    set((state) => {
      const quest = state.quests.find((item) => item.id === questId);
      if (!quest || quest.completed) return state;

      const currentDate = formatDateInSeoul(now());
      const currentWeek = weekKey(now());
      const wasBroken = state.streakBroken;
      const canRevive = wasBroken && state.revivedWeek !== currentWeek;
      const reward = Math.round(quest.reward * multiplier);
      const totalExp = state.exp + reward;
      const leveledUp = totalExp >= state.expMax;
      const nextLevel = leveledUp ? state.level + 1 : state.level;
      const firstCompletionToday = state.lastStreakDate !== currentDate;
      const nextStreak = canRevive
        ? Math.max(1, state.streak)
        : firstCompletionToday && !wasBroken
          ? state.streak + 1
          : state.streak;
      const coins = Math.round(reward * 0.1);
      result = {
        reward,
        coins,
        leveledUp,
        nextLevel,
        revived: canRevive,
      };

      return {
        exp: leveledUp ? totalExp - state.expMax : totalExp,
        level: nextLevel,
        coins: state.coins + coins,
        streak: nextStreak,
        longestStreak: Math.max(state.longestStreak, nextStreak),
        streakBroken: wasBroken && !canRevive,
        lastStreakDate: firstCompletionToday ? currentDate : state.lastStreakDate,
        revivedWeek: canRevive ? currentWeek : state.revivedWeek,
        completedQuestCount: state.completedQuestCount + 1,
        totalExpEarned: state.totalExpEarned + reward,
        quests: state.quests.map((item) =>
          item.id === questId
            ? { ...item, completed: true, status: 'done' as const }
            : item,
        ),
      };
    });
    return result;
  },
  addSteps: () => set((state) => ({ steps: state.steps + 1000 })),
  breakStreak: () => set({ streakBroken: true }),
  reviveStreak: () => {
    const state = useDailyQuestStore.getState();
    const currentWeek = weekKey(now());
    if (!state.streakBroken || state.revivedWeek === currentWeek) return false;
    set({
      streakBroken: false,
      revivedWeek: currentWeek,
      streak: Math.max(1, state.streak),
      lastStreakDate: formatDateInSeoul(now()),
    });
    return true;
  },
  evaluateStreak: () =>
    set((state) => {
      const today = formatDateInSeoul(now());
      const yesterday = addDaysToDateString(today, -1);
      const completedYesterday = state.quests.some(
        (quest) =>
          quest.scheduledDate === yesterday &&
          (quest.completed || quest.status === 'done' || quest.status === 'revived'),
      );
      if (completedYesterday || state.lastStreakDate === yesterday) return state;
      return { ...state, streakBroken: true };
    }),
  reset: () => {
    set({
      ...initialState,
      quests: createSeedQuests(),
      goals: [dailyGoal, weightGoal],
      partyMembers: createPartyMembers(),
      partyActivities: createPartyActivities(),
      partyShareSettings: createPartyShareSettings(),
      partyExpGoal: 1600,
      partyRewardClaimed: false,
      dungeonTicketWeek: null,
      streakFreezeCount: 0,
      ownedPetSkins: [],
      ownedPets: ['별빛 슬라임'],
      selectedPet: '별빛 슬라임',
      profile: createInitialProfile(),
      healthDataSettings: createHealthDataSettings(),
      notificationSettings: createNotificationSettings(),
      recentCaptures: [],
       lastStreakDate: initialState.lastStreakDate,
       revivedWeek: null,
    });
    useDailyQuestStore.persist.clearStorage();
  },
  addScheduledGoal: (goal, breakdown) =>
    set((state) => ({
      goals: [...state.goals.filter((item) => item.id !== goal.id), goal],
      quests: [
        ...state.quests.filter((item) => item.goalId !== goal.id),
        ...scheduleBreakdownQuests(goal, breakdown).map(
          (quest): Quest => ({
            ...quest,
            category: quest.category === 'study' ? 'mind' : quest.category,
            autoClear: quest.autoClear as AutoClearCondition,
          }),
        ),
      ],
    })),
  addAiGoal: (goal, quests, capture) =>
    set((state) => ({
      goals: [...state.goals.filter((item) => item.id !== goal.id), goal],
      quests: [
        ...state.quests.filter((quest) => quest.goalId !== goal.id),
        ...quests,
      ],
      recentCaptures: capture
        ? [capture, ...state.recentCaptures].slice(0, 10)
        : state.recentCaptures,
    })),
  generateDemoHistory: () =>
    set((state) => ({
      quests: state.quests.map((quest) => {
        if (
          quest.goalId !== weightGoal.id ||
          quest.scheduledDate < '2026-09-07' ||
          quest.scheduledDate > '2026-09-20'
        ) {
          return quest;
        }
        if (quest.scheduledDate === '2026-09-13') {
          return { ...quest, status: 'revived' as const, completed: true };
        }
        if (
          quest.scheduledDate === '2026-09-10' ||
          quest.scheduledDate === '2026-09-16'
        ) {
          return { ...quest, status: 'failed' as const, completed: false };
        }
        return {
          ...quest,
          status: 'done' as const,
          completed: true,
        };
      }),
    })),
  seedBehaviorLogs: () =>
    set((state) => {
      const today = formatDateInSeoul(now());
      const bands = [
        { startTime: '08:00', suffix: '아침' },
        { startTime: '14:00', suffix: '오후' },
        { startTime: '19:00', suffix: '저녁' },
        { startTime: '22:00', suffix: '밤' },
      ];
      const history: Quest[] = [];
      for (let dayOffset = 28; dayOffset >= 1; dayOffset -= 1) {
        const date = addDaysToDateString(today, -dayOffset);
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        bands.forEach((band, bandIndex) => {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            const failurePercent =
              weekday === 3 && (bandIndex === 2 || bandIndex === 3)
                ? 70
                : (weekday === 2 || weekday === 4) && bandIndex === 0
                  ? 10
                  : 30;
            const marker = (dayOffset * 17 + bandIndex * 13 + attempt * 7) % 10;
            const failed = marker < failurePercent / 10;
            history.push({
              id: `pattern-history-${date}-${bandIndex}-${attempt}`,
              title: `${band.suffix} 행동 기록 ${attempt + 1}`,
              category: 'mind',
              reward: 25,
              autoClear: { ...emptyAutoClear },
              scheduledDate: date,
              goalId: 'pattern-history',
              status: failed ? 'failed' : 'done',
              completed: !failed,
              startTime: band.startTime,
              durationMin: 25,
              difficulty: 2,
            });
          }
        });
      }
      return {
        quests: [
          ...state.quests.filter((quest) => !quest.id.startsWith('pattern-history-')),
          ...history,
        ],
      };
    }),
  completeMotherMedication: () =>
    set((state) => {
      const nextActivity: PartyActivity = {
        id: `activity-mother-medication-${state.partyActivities.length}`,
        time: '방금',
        relative: '방금 전',
        memberName: '어머니',
        icon: '💊',
        questTitle: '혈압약 퀘스트를 완료했습니다',
        reward: 15,
      };
      const nextExp = state.partyMembers.reduce(
        (total, member) => total + member.weeklyExp,
        0,
      ) + 15;
      return {
        partyMembers: state.partyMembers.map((member) =>
          member.id === 'mother'
            ? {
                ...member,
                weeklyExp: member.weeklyExp + 15,
                completedCount: Math.max(member.completedCount, 3),
                medicationQuest: {
                  ...member.medicationQuest,
                  status: 'done' as const,
                },
              }
            : member,
        ),
        partyActivities: [nextActivity, ...state.partyActivities],
        partyRewardClaimed:
          state.partyRewardClaimed || nextExp >= state.partyExpGoal,
      };
    }),
  togglePartyShareSetting: (key) =>
    set((state) => ({
      partyShareSettings: {
        ...state.partyShareSettings,
        [key]: !state.partyShareSettings[key],
      },
    })),
  updateProfile: (changes) =>
    set((state) => ({
      profile: {
        ...state.profile,
        ...changes,
      },
    })),
  toggleHealthData: (key) =>
    set((state) => ({
      healthDataSettings: {
        ...state.healthDataSettings,
        [key]: !state.healthDataSettings[key],
      },
      quests: state.quests.map((quest) =>
        quest.autoClear.metric === key && state.healthDataSettings[key]
          ? {
              ...quest,
              autoClear: {
                ...quest.autoClear,
                enabled: false,
              },
            }
          : quest,
      ),
    })),
  toggleNotification: (key) =>
    set((state) => ({
      notificationSettings: {
        ...state.notificationSettings,
        [key]: !state.notificationSettings[key],
      },
    })),
  setReminderTime: (time) =>
    set((state) => ({
      notificationSettings: {
        ...state.notificationSettings,
        reminderTime: time,
      },
    })),
  setSelectedPet: (pet) => set({ selectedPet: pet }),
  deleteGoal: (goalId) =>
    set((state) => ({
      goals: state.goals.filter((goal) => goal.id !== goalId),
      quests: state.quests.filter((quest) => quest.goalId !== goalId),
    })),
  addAiQuests: (quests, capture) => {
    const ids = quests.map((quest) => quest.id);
    set((state) => ({
      quests: [...state.quests, ...quests],
      recentCaptures: [capture, ...state.recentCaptures].slice(0, 10),
    }));
    return ids;
  },
  removeQuests: (questIds) =>
    set((state) => ({
      quests: state.quests.filter((quest) => !questIds.includes(quest.id)),
    })),
  useDungeonTicket: (weekKey) => set({ dungeonTicketWeek: weekKey }),
  claimDungeonReward: (coins) =>
    set((state) => ({
      coins: state.coins + coins,
      streakFreezeCount: state.streakFreezeCount + 1,
    })),
  spendCoins: (amount) => {
    let purchased = false;
    set((state) => {
      if (state.coins < amount) return state;
      purchased = true;
      return { coins: state.coins - amount };
    });
    return purchased;
  },
    }),
    {
      name: 'daily-quest-state',
      storage: appStorage,
      version: 1,
    },
  ),
);