import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Goal as GoalIcon,
  MapPin,
  Mic,
  Plus,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react-native';
import colors from '@/constants/colors';
import {
  ParseItem,
  ParseResult,
  expandParseResult,
  normalizeBreakdownResult,
  normalizeNestedBreakdown,
  ProcessedBreakdownResult,
  ProcessedBreakdownSubtask,
  mockAIProvider,
} from '../../../lib/ai/index';
import { addDaysToDateString, formatDateInSeoul, now } from '../../../lib/clock';
import { calcExp } from '../../../lib/game';
import {
  AutoClearCondition,
  Goal as GoalModel,
  Quest,
  RecentCapture,
  useDailyQuestStore,
} from '@/store/useDailyQuestStore';

const palette = colors.dark;

type CaptureMode = 'sheet' | 'full';
type EditableField = 'date' | 'startTime' | 'durationMin' | 'location';

const goalColors = ['#FFB020', '#49D8C0', '#70C9FF', '#A58FFF'];

interface QuickCaptureProps {
  mode: CaptureMode;
  initialText?: string;
  visible?: boolean;
  onClose?: () => void;
  onSaved?: (questIds: string[], count: number) => void;
}

function getParseEndpoint() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api/parse` : '/api/parse';
}

async function requestParse(text: string): Promise<ParseResult> {
  try {
    const response = await fetch(getParseEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, now: now().toISOString() }),
    });
    if (!response.ok) throw new Error(`Parse request failed: ${response.status}`);
    return (await response.json()) as ParseResult;
  } catch {
    return mockAIProvider.parse(text, now());
  }
}

function inferCategory(title: string): Quest['category'] {
  if (/공부|토익|회의|읽|집중/.test(title)) return 'mind';
  if (/가족|친구|조별|전화|연락/.test(title)) return 'social';
  if (/정리|청소|빨래|일/.test(title)) return 'life';
  return 'health';
}

function toStoredQuests(items: ParseItem[], current: Date): Quest[] {
  const emptyAutoClear: AutoClearCondition = {
    enabled: false,
    metric: 'none',
    operator: '>=',
    value: 0,
    unit: '',
  };
  return expandParseResult({ items }, current).map((item, index) => ({
    id: `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    title: item.title,
    category: inferCategory(item.title),
    reward: item.exp,
    autoClear: emptyAutoClear,
    scheduledDate: item.scheduledDate,
    goalId: 'daily-routine',
    status: 'pending',
    completed: false,
    startTime: item.startTime,
    durationMin: item.durationMin,
    location: item.location,
    note: item.note,
    difficulty: item.difficulty,
    recurrenceId: item.recurrenceId,
    uncertain: item.uncertain,
  }));
}

function dateLabel(date: string | null) {
  if (!date) return '날짜 미정';
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function recurrenceLabel(item: ParseItem) {
  if (item.recurrence.freq === 'daily') return '매일';
  if (item.recurrence.freq === 'weekly') {
    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    return `매주 ${item.recurrence.byWeekday.map((day) => labels[day]).join('·')}`;
  }
  return null;
}

function EditChip({
  icon,
  label,
  uncertain,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  uncertain: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, uncertain && styles.chipUncertain]}
    >
      {icon}
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

function ResultCard({
  item,
  index,
  onEdit,
  onBreakdown,
  isBreakingDown,
  hasBreakdown,
}: {
  item: ParseItem;
  index: number;
  onEdit: (field: EditableField) => void;
  onBreakdown?: () => void;
  isBreakingDown?: boolean;
  hasBreakdown?: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, delay: index * 80, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [index, opacity, translateY]);

  const recurrence = recurrenceLabel(item);
  if (item.kind === 'bigGoal') {
    return (
      <Animated.View style={[styles.bigGoalCard, { opacity, transform: [{ translateY }] }]}>
        <View style={styles.bigGoalIcon}>
          <Sparkles size={19} color={palette.accent} />
        </View>
        <View style={styles.resultCopy}>
          <Text style={styles.resultKicker}>BIG GOAL</Text>
          <Text style={styles.resultTitle}>{item.title}</Text>
          <Text style={styles.bigGoalText}>이건 쪼개야 할 크기예요.</Text>
        </View>
        <Pressable
          testID={`breakdown-${index}`}
          onPress={onBreakdown}
          disabled={isBreakingDown || hasBreakdown}
          style={[styles.breakdownButton, (isBreakingDown || hasBreakdown) && styles.breakdownButtonDisabled]}
        >
          <Sparkles size={12} color={palette.accent} />
          <Text style={styles.breakdownButtonText}>
            {isBreakingDown ? '나누는 중' : hasBreakdown ? '분할 완료' : '나눠보기'}
          </Text>
          <ChevronRight size={14} color={palette.accent} />
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.resultCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.resultCardTop}>
        <View style={styles.taskIcon}>
          <Check size={16} color={palette.success} strokeWidth={3} />
        </View>
        <View style={styles.resultCopy}>
          <Text style={styles.resultKicker}>NEW QUEST</Text>
          <Text style={styles.resultTitle}>{item.title}</Text>
        </View>
        <View style={styles.expPill}>
          <Zap size={12} color={palette.accent} fill={palette.accent} />
          <Text style={styles.expPillText}>+{calcExp(item.difficulty, item.durationMin)}</Text>
        </View>
      </View>
      <View style={styles.chipRow}>
        <EditChip
          icon={<CalendarDays size={12} color={palette.purpleBright} />}
          label={dateLabel(item.date)}
          uncertain={item.uncertain.includes('date')}
          onPress={() => onEdit('date')}
        />
        {item.startTime ? (
          <EditChip
            icon={<Clock3 size={12} color={palette.purpleBright} />}
            label={item.startTime}
            uncertain={item.uncertain.includes('startTime')}
            onPress={() => onEdit('startTime')}
          />
        ) : null}
        <EditChip
          icon={<Clock3 size={12} color={palette.purpleBright} />}
          label={`${item.durationMin}분`}
          uncertain={item.uncertain.includes('durationMin')}
          onPress={() => onEdit('durationMin')}
        />
        {item.location ? (
          <EditChip
            icon={<MapPin size={12} color={palette.purpleBright} />}
            label={item.location}
            uncertain={item.uncertain.includes('location')}
            onPress={() => onEdit('location')}
          />
        ) : null}
        {recurrence ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{recurrence} · 4회+</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function BreakdownSubtaskCard({
  item,
  index,
  hasChildren,
  isEditing,
  onEditToggle,
  onChange,
  onDelete,
  onResplit,
  isResplitting,
}: {
  item: ProcessedBreakdownSubtask;
  index: number;
  hasChildren: boolean;
  isEditing: boolean;
  onEditToggle: () => void;
  onChange: (changes: Partial<ProcessedBreakdownSubtask>) => void;
  onDelete: () => void;
  onResplit: () => void;
  isResplitting: boolean;
}) {
  return (
    <View style={[styles.breakdownTaskCard, { marginLeft: Math.min(item.depth, 2) * 14 }]}>
      <View style={styles.breakdownTaskHeader}>
        <View style={styles.breakdownIndex}>
          <Text style={styles.breakdownIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.breakdownTaskCopy}>
          {isEditing ? (
            <TextInput
              value={item.title}
              onChangeText={(value) => onChange({ title: value })}
              style={styles.breakdownEditTitle}
              placeholder="구체적인 행동"
              placeholderTextColor={palette.mutedForeground}
            />
          ) : (
            <Text style={styles.breakdownTaskTitle}>{item.title}</Text>
          )}
          <View style={styles.breakdownMetaRow}>
            <View style={styles.breakdownMetaPill}>
              <Clock3 size={11} color={palette.purpleBright} />
              <Text style={styles.breakdownMetaText}>{item.durationMin}분</Text>
            </View>
            <View style={styles.breakdownMetaPill}>
              <Zap size={11} color={palette.accent} fill={palette.accent} />
              <Text style={styles.breakdownMetaText}>+{item.exp} EXP</Text>
            </View>
            <Text style={styles.breakdownDayText}>D+{item.dayOffset}</Text>
          </View>
        </View>
        <View style={styles.breakdownActionRow}>
          <Pressable
            testID={`breakdown-edit-${item.id}`}
            onPress={onEditToggle}
            style={styles.iconAction}
          >
            <Text style={styles.iconActionText}>{isEditing ? '완료' : '수정'}</Text>
          </Pressable>
          <Pressable
            testID={`breakdown-delete-${item.id}`}
            onPress={onDelete}
            style={styles.iconAction}
          >
            <X size={13} color={palette.mutedForeground} />
          </Pressable>
        </View>
      </View>
      {isEditing ? (
        <View style={styles.breakdownEditFields}>
          <TextInput
            value={item.doneWhen}
            onChangeText={(value) => onChange({ doneWhen: value })}
            style={styles.breakdownEditInput}
            placeholder="완료를 확인할 수 있는 결과"
            placeholderTextColor={palette.mutedForeground}
          />
          <TextInput
            value={item.starterStep}
            onChangeText={(value) => onChange({ starterStep: value })}
            style={styles.breakdownEditInput}
            placeholder="2분 안에 할 첫 동작"
            placeholderTextColor={palette.mutedForeground}
          />
        </View>
      ) : (
        <View style={styles.breakdownDetailList}>
          <Text style={styles.breakdownDetail}>
            <Text style={styles.breakdownDetailLabel}>완료 기준  </Text>
            {item.doneWhen}
          </Text>
          <Text style={styles.breakdownDetail}>
            <Text style={styles.breakdownDetailLabel}>첫 동작  </Text>
            {item.starterStep}
          </Text>
        </View>
      )}
      {item.dependsOn.length > 0 ? (
        <Text style={styles.breakdownDepends}>앞 단계 완료 후 진행</Text>
      ) : null}
      {item.depth < 2 ? (
        <Pressable
          testID={`breakdown-resplit-${item.id}`}
          onPress={onResplit}
          disabled={isResplitting || hasChildren}
          style={[styles.resplitButton, (isResplitting || hasChildren) && styles.resplitButtonDisabled]}
        >
          <Sparkles size={12} color={palette.purpleBright} />
          <Text style={styles.resplitButtonText}>
            {isResplitting ? '다시 나누는 중' : hasChildren ? '분할됨' : '✨ 한 단계 더 쪼개기'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BreakdownPreview({
  result,
  resplittingId,
  registered,
  onChange,
  onDelete,
  onResplit,
  onRegister,
}: {
  result: ProcessedBreakdownResult;
  resplittingId: string | null;
  registered: boolean;
  onChange: (id: string, changes: Partial<ProcessedBreakdownSubtask>) => void;
  onDelete: (id: string) => void;
  onResplit: (item: ProcessedBreakdownSubtask) => void;
  onRegister: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <View style={styles.breakdownPreview}>
      {result.assumption ? (
        <View style={styles.assumptionBanner}>
          <Sparkles size={14} color={palette.accent} />
          <Text style={styles.assumptionText}>이렇게 이해했어요: {result.assumption}</Text>
        </View>
      ) : null}
      <View style={styles.breakdownHeading}>
        <View style={styles.breakdownHeadingIcon}>
          <GoalIcon size={17} color={palette.purpleBright} />
        </View>
        <View style={styles.breakdownHeadingCopy}>
          <Text style={styles.resultKicker}>GOAL BREAKDOWN</Text>
          <Text style={styles.breakdownGoalTitle}>{result.goalTitle}</Text>
          <Text style={styles.breakdownDeadline}>마감 {result.deadline}</Text>
        </View>
        <Text style={styles.breakdownCount}>{result.subtasks.length}단계</Text>
      </View>
      <View style={styles.breakdownTaskList}>
        {result.subtasks.map((item, index) => (
          <BreakdownSubtaskCard
            key={item.id}
            item={item}
            index={index}
            hasChildren={result.subtasks.some((child) => child.parentId === item.id)}
            isEditing={editingId === item.id}
            onEditToggle={() => setEditingId((current) => current === item.id ? null : item.id)}
            onChange={(changes) => onChange(item.id, changes)}
            onDelete={() => {
              setEditingId(null);
              onDelete(item.id);
            }}
            onResplit={() => onResplit(item)}
            isResplitting={resplittingId === item.id}
          />
        ))}
      </View>
      <Pressable
        testID="register-breakdown-goal"
        onPress={onRegister}
        disabled={registered || result.subtasks.length === 0}
        style={[styles.registerGoalButton, registered && styles.registerGoalButtonDone]}
      >
        <Check size={16} color={registered ? palette.success : palette.white} strokeWidth={3} />
        <Text style={[styles.registerGoalText, registered && styles.registerGoalTextDone]}>
          {registered ? '목표로 등록했어요' : '목표로 등록'}
        </Text>
      </Pressable>
    </View>
  );
}

export function QuickCapture({ mode, initialText = '', visible = true, onClose, onSaved }: QuickCaptureProps) {
  const [text, setText] = useState(initialText);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [breakdowns, setBreakdowns] = useState<Record<number, ProcessedBreakdownResult>>({});
  const [breakdownLoading, setBreakdownLoading] = useState<number | null>(null);
  const [resplittingId, setResplittingId] = useState<string | null>(null);
  const [registeredBreakdowns, setRegisteredBreakdowns] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<{ index: number; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recentCaptures = useDailyQuestStore((state) => state.recentCaptures);
  const goals = useDailyQuestStore((state) => state.goals);
  const addAiQuests = useDailyQuestStore((state) => state.addAiQuests);
  const addAiGoal = useDailyQuestStore((state) => state.addAiGoal);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechAvailable(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    return () => recognitionRef.current?.stop?.();
  }, []);

  const examples = [
    '내일 아침 9시 도서관에서 토익 LC 1시간',
    '내일 오전엔 토익, 오후 3시에 조별과제 회의, 저녁엔 헬스',
    '매주 화목 저녁 7시 헬스 1시간',
  ];

  const updateItem = (index: number, field: EditableField, value: string) => {
    if (!result) return;
    const nextItems = result.items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const uncertain = item.uncertain.filter((key) => key !== field);
      if (field === 'durationMin') {
        return { ...item, durationMin: Math.max(1, Number(value) || 30), uncertain };
      }
      return { ...item, [field]: value || null, uncertain };
    });
    setResult({ items: nextItems });
  };

  const beginEdit = (index: number, field: EditableField) => {
    const item = result?.items[index];
    if (!item) return;
    const value = field === 'durationMin'
      ? String(item.durationMin)
      : String(item[field] ?? '');
    setEditing({ index, field });
    setEditValue(value);
  };

  const submit = async () => {
    const value = text.trim();
    if (!value || isParsing) return;
    Keyboard.dismiss();
    setIsParsing(true);
    setResult(null);
    setBreakdowns({});
    setRegisteredBreakdowns({});
    setEditing(null);
    try {
      const parsed = await requestParse(value);
      setResult(parsed);
      const current = now();
      const quests = toStoredQuests(parsed.items, current);
      const ids = quests.map((quest) => quest.id);
      if (quests.length > 0) {
        addAiQuests(quests, {
          id: `capture-${Date.now()}`,
          input: value,
          questCount: quests.length,
          dates: [...new Set(quests.map((quest) => quest.scheduledDate))],
          createdAt: current.toISOString(),
        });
        onSaved?.(ids, quests.length);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleBreakdown = async (index: number, item: ParseItem) => {
    if (breakdownLoading !== null) return;
    setBreakdownLoading(index);
    try {
      const raw = await mockAIProvider.breakdown(item.title, item.date, now());
      setBreakdowns((current) => ({
        ...current,
        [index]: normalizeBreakdownResult(raw, now()),
      }));
    } finally {
      setBreakdownLoading(null);
    }
  };

  const updateBreakdown = (
    index: number,
    id: string,
    changes: Partial<ProcessedBreakdownSubtask>,
  ) => {
    setBreakdowns((current) => {
      const breakdown = current[index];
      if (!breakdown) return current;
      return {
        ...current,
        [index]: {
          ...breakdown,
          subtasks: breakdown.subtasks.map((item) =>
            item.id === id ? { ...item, ...changes } : item,
          ),
        },
      };
    });
  };

  const deleteBreakdownTask = (index: number, id: string) => {
    setBreakdowns((current) => {
      const breakdown = current[index];
      if (!breakdown) return current;
      return {
        ...current,
        [index]: {
          ...breakdown,
          subtasks: breakdown.subtasks.filter(
            (item) => item.id !== id && !item.id.startsWith(`${id}-`),
          ),
        },
      };
    });
  };

  const resplitBreakdownTask = async (
    index: number,
    item: ProcessedBreakdownSubtask,
  ) => {
    const currentBreakdown = breakdowns[index];
    if (!currentBreakdown || item.depth >= 2) return;
    if (currentBreakdown.subtasks.some((child) => child.parentId === item.id)) return;
    setResplittingId(item.id);
    try {
      const raw = await mockAIProvider.resplit(item.title, now());
      const nested = normalizeNestedBreakdown(raw, now(), item);
      setBreakdowns((current) => {
        const breakdown = current[index];
        if (!breakdown) return current;
        const itemIndex = breakdown.subtasks.findIndex((candidate) => candidate.id === item.id);
        if (itemIndex < 0) return current;
        return {
          ...current,
          [index]: {
            ...breakdown,
            subtasks: [
              ...breakdown.subtasks.slice(0, itemIndex + 1),
              ...nested,
              ...breakdown.subtasks.slice(itemIndex + 1),
            ],
          },
        };
      });
    } finally {
      setResplittingId(null);
    }
  };

  const registerBreakdown = (index: number) => {
    const breakdown = breakdowns[index];
    if (!breakdown || registeredBreakdowns[index]) return;
    const current = now();
    const startDate = formatDateInSeoul(current);
    const goalId = `ai-goal-${Date.now()}-${index}`;
    const goal: GoalModel = {
      id: goalId,
      title: breakdown.goalTitle,
      startDate,
      endDate: breakdown.deadline,
      color: goalColors[goals.length % goalColors.length],
    };
    const emptyAutoClear: AutoClearCondition = {
      enabled: false,
      metric: 'none',
      operator: '>=',
      value: 0,
      unit: '',
    };
    const visibleChildren = breakdown.subtasks.filter(
      (item) => !breakdown.subtasks.some((child) => child.parentId === item.id),
    );
    const quests: Quest[] = visibleChildren.map((item, itemIndex) => ({
      id: `${goalId}-quest-${itemIndex + 1}`,
      title: item.title,
      category: inferCategory(item.title),
      reward: item.exp,
      autoClear: emptyAutoClear,
      scheduledDate: addDaysToDateString(startDate, item.dayOffset),
      goalId,
      status: 'pending',
      completed: false,
      durationMin: item.durationMin,
      difficulty: item.difficulty,
      dependsOn: item.dependsOn,
      starterStep: item.starterStep,
      note: `${item.doneWhen} · 첫 동작: ${item.starterStep}`,
    }));
    const capture: RecentCapture = {
      id: `capture-${Date.now()}`,
      input: text.trim(),
      questCount: quests.length,
      dates: [...new Set(quests.map((quest) => quest.scheduledDate))],
      createdAt: current.toISOString(),
    };
    addAiGoal(goal, quests, capture);
    setRegisteredBreakdowns((currentRegistered) => ({
      ...currentRegistered,
      [index]: true,
    }));
    onSaved?.(quests.map((quest) => quest.id), quests.length);
  };

  const toggleSpeech = () => {
    if (Platform.OS !== 'web') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      setText(event.results?.[0]?.[0]?.transcript ?? '');
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const headerTitle = mode === 'full' ? '✨ 무엇을 할까요?' : '새 퀘스트 만들기';
  const body = (
    <KeyboardAvoidingView
      style={styles.captureBody}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.captureHeader}>
        <View>
          <Text style={styles.eyebrow}>QUICK CAPTURE</Text>
          <Text style={styles.captureTitle}>{headerTitle}</Text>
        </View>
        {onClose ? (
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={18} color={palette.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.captureSubtitle}>
        말하듯 적으면 날짜와 시간까지 퀘스트로 정리해요.
      </Text>
      <View style={styles.inputWrap}>
        <TextInput
          testID="quick-capture-input"
          value={text}
          onChangeText={setText}
          multiline
          autoFocus={mode === 'full'}
          placeholder="예: 내일 저녁 7시 친구와 산책 30분"
          placeholderTextColor={palette.mutedForeground}
          style={styles.captureInput}
          returnKeyType="send"
          onSubmitEditing={submit}
          blurOnSubmit
        />
        {speechAvailable ? (
          <Pressable
            testID="quick-capture-speech"
            onPress={toggleSpeech}
            style={[styles.micButton, isListening && styles.micButtonOn]}
          >
            <Mic size={17} color={isListening ? palette.white : palette.purpleBright} />
          </Pressable>
        ) : null}
        <Pressable
          testID="quick-capture-submit"
          onPress={submit}
          disabled={!text.trim() || isParsing}
          style={[styles.sendButton, (!text.trim() || isParsing) && styles.sendButtonDisabled]}
        >
          <Send size={17} color={text.trim() && !isParsing ? palette.white : palette.mutedForeground} />
        </Pressable>
      </View>

      {mode === 'full' && !result && !isParsing ? (
        <View style={styles.exampleSection}>
          <Text style={styles.exampleTitle}>이렇게 말해보세요</Text>
          <View style={styles.exampleList}>
            {examples.map((example) => (
              <Pressable key={example} onPress={() => setText(example)} style={styles.exampleChip}>
                <Sparkles size={13} color={palette.purpleBright} />
                <Text style={styles.exampleText}>{example}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {isParsing ? (
        <View style={styles.skeletonList}>
          <View style={styles.skeletonCard}><View style={styles.skeletonIcon} /><View style={styles.skeletonLines}><View style={styles.skeletonLineWide} /><View style={styles.skeletonLineShort} /></View></View>
          <View style={styles.skeletonCard}><View style={styles.skeletonIcon} /><View style={styles.skeletonLines}><View style={styles.skeletonLineWide} /><View style={styles.skeletonLineShort} /></View></View>
        </View>
      ) : null}

      {result ? (
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultSummary}>
            <Text style={styles.resultSummaryText}>
              {result.items.filter((item) => item.kind === 'task').length}개 퀘스트로 정리했어요
            </Text>
            <Pressable onPress={() => setResult(null)} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>다시 입력</Text>
            </Pressable>
          </View>
          {result.items.map((item, index) => (
            <View key={`${item.title}-${index}`}>
              <ResultCard
                item={item}
                index={index}
                onEdit={(field) => beginEdit(index, field)}
                onBreakdown={
                  item.kind === 'bigGoal'
                    ? () => handleBreakdown(index, item)
                    : undefined
                }
                isBreakingDown={breakdownLoading === index}
                hasBreakdown={Boolean(breakdowns[index])}
              />
              {editing?.index === index ? (
                <View style={styles.inlineEditor}>
                  <TextInput
                    autoFocus
                    value={editValue}
                    onChangeText={setEditValue}
                    onSubmitEditing={() => {
                      updateItem(index, editing.field, editValue);
                      setEditing(null);
                    }}
                    placeholder={editing.field === 'date' ? 'YYYY-MM-DD' : editing.field === 'startTime' ? 'HH:mm' : ''}
                    placeholderTextColor={palette.mutedForeground}
                    keyboardType={editing.field === 'durationMin' ? 'number-pad' : 'default'}
                    style={styles.inlineEditorInput}
                  />
                  <Pressable
                    onPress={() => {
                      updateItem(index, editing.field, editValue);
                      setEditing(null);
                    }}
                    style={styles.inlineEditorSave}
                  >
                    <Check size={15} color={palette.white} />
                  </Pressable>
                </View>
              ) : null}
              {breakdowns[index] ? (
                <BreakdownPreview
                  result={breakdowns[index]}
                  resplittingId={resplittingId}
                  registered={Boolean(registeredBreakdowns[index])}
                  onChange={(id, changes) => updateBreakdown(index, id, changes)}
                  onDelete={(id) => deleteBreakdownTask(index, id)}
                  onResplit={(task) => resplitBreakdownTask(index, task)}
                  onRegister={() => registerBreakdown(index)}
                />
              ) : null}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {mode === 'full' ? (
        <View style={styles.recentSection}>
          <View style={styles.recentHeading}>
            <Text style={styles.exampleTitle}>최근 입력</Text>
            <Text style={styles.recentCount}>{recentCaptures.length}개</Text>
          </View>
          {recentCaptures.length === 0 ? (
            <Text style={styles.emptyRecent}>아직 입력한 문장이 없어요. 위 예시를 눌러 시작해 보세요.</Text>
          ) : (
            recentCaptures.slice(0, 3).map((capture) => (
              <Pressable key={capture.id} onPress={() => setText(capture.input)} style={styles.recentRow}>
                <View style={styles.recentIcon}><Clock3 size={14} color={palette.purpleBright} /></View>
                <View style={styles.recentCopy}>
                  <Text style={styles.recentInput} numberOfLines={1}>{capture.input}</Text>
                  <Text style={styles.recentMeta}>{capture.questCount}개 퀘스트 · {capture.dates[0] ?? '날짜 미정'}</Text>
                </View>
                <ChevronRight size={15} color={palette.mutedForeground} />
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );

  if (mode === 'full') return <View style={styles.fullScreen}>{body}</View>;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalScrim} onPress={onClose} />
        <View style={styles.sheet}>{body}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: palette.background },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.64)' },
  sheet: { maxHeight: '91%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 27, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: palette.card },
  captureBody: { flex: 1 },
  captureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eyebrow: { color: palette.mutedForeground, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  captureTitle: { color: palette.foreground, fontSize: 21, fontWeight: '900', marginTop: 6 },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.secondary },
  captureSubtitle: { color: palette.mutedForeground, fontSize: 11, lineHeight: 17, marginBottom: 14 },
  inputWrap: { minHeight: 104, flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: palette.purpleBright, backgroundColor: palette.background },
  captureInput: { flex: 1, minHeight: 75, maxHeight: 120, color: palette.foreground, fontSize: 14, lineHeight: 21, padding: 5, textAlignVertical: 'top' },
  micButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 6, borderRadius: 10, backgroundColor: palette.purpleSoft },
  micButtonOn: { backgroundColor: palette.primary },
  sendButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: palette.primary },
  sendButtonDisabled: { backgroundColor: palette.secondary },
  exampleSection: { marginTop: 20 },
  exampleTitle: { color: palette.foreground, fontSize: 12, fontWeight: '800' },
  exampleList: { gap: 8, marginTop: 9 },
  exampleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 10, borderRadius: 10, backgroundColor: palette.secondary },
  exampleText: { flex: 1, color: palette.secondaryForeground, fontSize: 10, lineHeight: 15 },
  skeletonList: { gap: 9, marginTop: 16 },
  skeletonCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: palette.secondary },
  skeletonIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#3A3D49' },
  skeletonLines: { flex: 1, gap: 8, marginLeft: 11 },
  skeletonLineWide: { width: '68%', height: 10, borderRadius: 5, backgroundColor: '#3A3D49' },
  skeletonLineShort: { width: '38%', height: 7, borderRadius: 4, backgroundColor: '#31343F' },
  resultScroll: { flexGrow: 0, marginTop: 14 },
  resultList: { gap: 9, paddingBottom: 10 },
  resultSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  resultSummaryText: { color: palette.success, fontSize: 11, fontWeight: '800' },
  retryButton: { paddingHorizontal: 8, paddingVertical: 5 },
  retryButtonText: { color: palette.mutedForeground, fontSize: 9 },
  resultCard: { padding: 13, borderRadius: 15, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.secondary },
  resultCardTop: { flexDirection: 'row', alignItems: 'center' },
  taskIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#173027' },
  resultCopy: { flex: 1, marginLeft: 10 },
  resultKicker: { color: palette.mutedForeground, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  resultTitle: { color: palette.foreground, fontSize: 13, fontWeight: '800', marginTop: 4 },
  expPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7, backgroundColor: palette.amberSoft },
  expPillText: { color: palette.accent, fontSize: 9, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6, backgroundColor: palette.background },
  chipUncertain: { borderWidth: 1, borderColor: palette.accent, paddingVertical: 4 },
  chipText: { color: palette.secondaryForeground, fontSize: 8, fontWeight: '700' },
  bigGoalCard: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 15, borderWidth: 1, borderColor: palette.accent, backgroundColor: palette.amberSoft },
  bigGoalIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#5A4615' },
  bigGoalText: { color: palette.accent, fontSize: 9, marginTop: 4 },
  breakdownButton: { flexDirection: 'row', alignItems: 'center', gap: 1, paddingHorizontal: 6, paddingVertical: 6 },
  breakdownButtonDisabled: { opacity: 0.55 },
  breakdownButtonText: { color: palette.accent, fontSize: 9, fontWeight: '800' },
  breakdownPreview: { marginTop: 8, padding: 11, borderRadius: 15, borderWidth: 1, borderColor: palette.purpleBright, backgroundColor: palette.background },
  assumptionBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, padding: 9, borderRadius: 10, backgroundColor: palette.amberSoft },
  assumptionText: { flex: 1, color: palette.accent, fontSize: 9, lineHeight: 14, fontWeight: '700' },
  breakdownHeading: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  breakdownHeadingIcon: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: palette.purpleSoft },
  breakdownHeadingCopy: { flex: 1, marginLeft: 9 },
  breakdownGoalTitle: { color: palette.foreground, fontSize: 13, fontWeight: '900', marginTop: 3 },
  breakdownDeadline: { color: palette.mutedForeground, fontSize: 9, marginTop: 3 },
  breakdownCount: { color: palette.purpleBright, fontSize: 10, fontWeight: '800' },
  breakdownTaskList: { gap: 7 },
  breakdownTaskCard: { padding: 10, borderRadius: 11, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card },
  breakdownTaskHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  breakdownIndex: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: palette.purpleSoft },
  breakdownIndexText: { color: palette.purpleBright, fontSize: 10, fontWeight: '900' },
  breakdownTaskCopy: { flex: 1, marginLeft: 8, minWidth: 0 },
  breakdownTaskTitle: { color: palette.foreground, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  breakdownMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  breakdownMetaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, backgroundColor: palette.secondary },
  breakdownMetaText: { color: palette.secondaryForeground, fontSize: 8, fontWeight: '700' },
  breakdownDayText: { color: palette.mutedForeground, fontSize: 8 },
  breakdownActionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconAction: { minWidth: 24, minHeight: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  iconActionText: { color: palette.purpleBright, fontSize: 8, fontWeight: '800' },
  breakdownDetailList: { gap: 3, marginLeft: 31, marginTop: 8 },
  breakdownDetail: { color: palette.mutedForeground, fontSize: 9, lineHeight: 14 },
  breakdownDetailLabel: { color: palette.purpleBright, fontWeight: '800' },
  breakdownDepends: { color: palette.mutedForeground, fontSize: 8, fontStyle: 'italic', marginLeft: 31, marginTop: 6 },
  breakdownEditFields: { gap: 5, marginLeft: 31, marginTop: 8 },
  breakdownEditTitle: { minHeight: 32, color: palette.foreground, fontSize: 11, paddingHorizontal: 7, borderRadius: 7, backgroundColor: palette.background },
  breakdownEditInput: { minHeight: 31, color: palette.secondaryForeground, fontSize: 9, paddingHorizontal: 7, borderRadius: 7, backgroundColor: palette.background },
  resplitButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginLeft: 31, marginTop: 8, paddingVertical: 3 },
  resplitButtonDisabled: { opacity: 0.45 },
  resplitButtonText: { color: palette.purpleBright, fontSize: 8, fontWeight: '800' },
  registerGoalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, marginTop: 11, borderRadius: 11, backgroundColor: palette.primary },
  registerGoalButtonDone: { borderWidth: 1, borderColor: '#347457', backgroundColor: '#1A3429' },
  registerGoalText: { color: palette.white, fontSize: 11, fontWeight: '900' },
  registerGoalTextDone: { color: palette.success },
  inlineEditor: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, paddingLeft: 42 },
  inlineEditorInput: { flex: 1, minHeight: 33, color: palette.foreground, fontSize: 11, paddingHorizontal: 9, borderRadius: 8, backgroundColor: palette.background },
  inlineEditorSave: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.primary },
  recentSection: { marginTop: 21 },
  recentHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  recentCount: { color: palette.mutedForeground, fontSize: 9 },
  emptyRecent: { color: palette.mutedForeground, fontSize: 10, lineHeight: 16, paddingVertical: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  recentIcon: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: palette.purpleSoft },
  recentCopy: { flex: 1, marginLeft: 9 },
  recentInput: { color: palette.secondaryForeground, fontSize: 10 },
  recentMeta: { color: palette.mutedForeground, fontSize: 8, marginTop: 3 },
});