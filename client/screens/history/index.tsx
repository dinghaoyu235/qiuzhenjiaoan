import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Keyboard, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';

type LessonPlan = {
  id: number;
  teacher_name: string;
  grade: string;
  subject: string;
  knowledge_point: string;
  course_objective: string;
  lesson_date: string;
  created_at: string;
};

export default function HistoryScreen() {
  const router = useSafeRouter();
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');
  const [subjects, setSubjects] = useState<string[]>(['全部']);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renamingPlan, setRenamingPlan] = useState<LessonPlan | null>(null);
  const [newKnowledgePoint, setNewKnowledgePoint] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  // 保存 Swipeable 引用
  const swipeableRefs = useRef<Record<number, Swipeable>>({});
  // 记录当前打开的 Swipeable ID
  const [openedSwipeableId, setOpenedSwipeableId] = useState<number | null>(null);

  useEffect(() => {
    fetchLessonPlans();
  }, []);

  useEffect(() => {
    // Extract unique subjects from lesson plans
    if (lessonPlans.length > 0) {
      const uniqueSubjects = Array.from(new Set(lessonPlans.map(plan => plan.subject))).sort();
      setSubjects(['全部', ...uniqueSubjects]);
    }
  }, [lessonPlans]);

  const fetchLessonPlans = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch lesson plans');
      }

      setLessonPlans(result.data || []);
    } catch (err) {
      console.error('Error fetching lesson plans:', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLessonPlans(false);
    setRefreshing(false);
  };

  const filteredPlans = selectedSubject === '全部'
    ? lessonPlans
    : lessonPlans.filter(plan => plan.subject === selectedSubject);

  // 按年级分组
  const groupedPlans = filteredPlans.reduce((acc, plan) => {
    if (!acc[plan.grade]) {
      acc[plan.grade] = [];
    }
    acc[plan.grade].push(plan);
    return acc;
  }, {} as Record<string, LessonPlan[]>);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson plan');
      }

      // 直接从本地状态中删除，避免重新请求导致页面刷新
      setLessonPlans(prevPlans => prevPlans.filter(plan => plan.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleViewDetail = (plan: LessonPlan) => {
    router.push('/detail', {
      id: plan.id.toString(),
    });
  };

  const handleRename = (plan: LessonPlan) => {
    setRenamingPlan(plan);
    setNewKnowledgePoint(plan.knowledge_point);
    setRenameModalVisible(true);
  };

  const handleRenameSubmit = async () => {
    if (!renamingPlan || !newKnowledgePoint.trim()) {
      alert('请输入有效的知识点名称');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/${renamingPlan.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ knowledgePoint: newKnowledgePoint.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error('重命名失败');
      }

      setRenameModalVisible(false);
      setRenamingPlan(null);
      setNewKnowledgePoint('');

      // 直接更新本地状态，避免重新请求导致页面刷新
      setLessonPlans(prevPlans =>
        prevPlans.map(plan =>
          plan.id === renamingPlan.id
            ? { ...plan, knowledge_point: newKnowledgePoint.trim() }
            : plan
        )
      );
    } catch (err) {
      console.error('Error renaming lesson plan:', err);
      alert(err instanceof Error ? err.message : '重命名失败');
    }
  };

  // 关闭所有打开的 Swipeable（除指定的ID）
  const closeAllSwipeables = (exceptId?: number) => {
    Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
      if (exceptId && parseInt(id) === exceptId) return;
      ref.close();
    });
  };

  // 切换年级的展开/折叠状态
  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => ({
      ...prev,
      [grade]: !prev[grade]
    }));
  };

  // 当教案列表变化时，默认展开所有年级
  useEffect(() => {
    if (lessonPlans.length > 0) {
      const grades = Object.keys(groupedPlans);
      const initialExpanded: Record<string, boolean> = {};
      grades.forEach(grade => {
        initialExpanded[grade] = true;
      });
      setExpandedGrades(initialExpanded);
    }
  }, [lessonPlans, selectedSubject]);

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.backgroundTertiary}
          />
        }
      >
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            历史教案
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            共 {lessonPlans.length} 份教案
          </ThemedText>
        </ThemedView>

        {/* Subject Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject}
                style={[
                  styles.tabButton,
                  selectedSubject === subject && styles.tabButtonActive,
                ]}
                onPress={() => setSelectedSubject(subject)}
                activeOpacity={0.7}
              >
                <ThemedText
                  variant="caption"
                  color={selectedSubject === subject ? theme.buttonPrimaryText : theme.textSecondary}
                >
                  {subject}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lesson Plans List */}
        {filteredPlans.length === 0 ? (
          <ThemedView level="default" style={styles.emptyContainer}>
            <ThemedText variant="body" color={theme.textSecondary}>
              {lessonPlans.length === 0 ? '暂无历史教案' : '该科目暂无教案'}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.listContainer}>
            {Object.entries(groupedPlans).map(([grade, plans]) => {
              const isExpanded = expandedGrades[grade] ?? true;

              return (
                <View key={grade} style={styles.gradeGroup}>
                  {/* Grade Header */}
                  <TouchableOpacity
                    style={styles.gradeHeader}
                    onPress={() => toggleGrade(grade)}
                    activeOpacity={0.7}
                  >
                    <ThemedView level="tertiary" style={styles.gradeHeaderContent}>
                      <View style={styles.gradeHeaderLeft}>
                        <ThemedText variant="h4" color={theme.textPrimary}>
                          {grade}
                        </ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>
                          {plans.length} 份教案
                        </ThemedText>
                      </View>
                      <FontAwesome6
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={theme.textMuted}
                      />
                    </ThemedView>
                  </TouchableOpacity>

                  {/* Plans in this grade */}
                  {isExpanded && plans.map((plan) => {
                  const renderRightActions = () => (
                    <View style={styles.swipeActions}>
                      <TouchableOpacity
                        style={styles.swipeActionDetail}
                        onPress={() => {
                          swipeableRefs.current[plan.id]?.close();
                          setOpenedSwipeableId(null);
                          handleViewDetail(plan);
                        }}
                        activeOpacity={0.7}
                      >
                        <ThemedText variant="caption" color="#FFFFFF">
                          查看详情
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.swipeActionRename}
                        onPress={() => {
                          swipeableRefs.current[plan.id]?.close();
                          setOpenedSwipeableId(null);
                          handleRename(plan);
                        }}
                        activeOpacity={0.7}
                      >
                        <ThemedText variant="caption" color="#FFFFFF">
                          重命名
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.swipeActionDelete}
                        onPress={() => {
                          swipeableRefs.current[plan.id]?.close();
                          setOpenedSwipeableId(null);
                          handleDelete(plan.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <ThemedText variant="caption" color="#FFFFFF">
                          删除
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  );

                  return (
                    <Swipeable
                      key={plan.id}
                      ref={(ref) => {
                        if (ref) swipeableRefs.current[plan.id] = ref;
                      }}
                      renderRightActions={renderRightActions}
                      onSwipeableOpen={() => {
                        // 关闭其他Swipeable，但不关闭当前这个
                        closeAllSwipeables(plan.id);
                        setOpenedSwipeableId(plan.id);
                      }}
                      onSwipeableClose={() => {
                        setOpenedSwipeableId(null);
                      }}
                      friction={1.5}
                      rightThreshold={Platform.OS === 'web' ? 150 : 80}
                      enableTrackpadTwoFingerGesture={true}
                      overshootRight={false}
                      overshootLeft={false}
                      containerStyle={Platform.OS === 'web' ? { overflow: 'visible', position: 'relative' } : undefined}
                      hitSlop={{ top: 0, left: 0, bottom: 0, right: 20 }}
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          // 只在Swipeable未打开时才允许点击进入详情
                          if (openedSwipeableId && openedSwipeableId === plan.id) {
                            swipeableRefs.current[plan.id]?.close();
                            setOpenedSwipeableId(null);
                          } else if (!openedSwipeableId) {
                            handleViewDetail(plan);
                          }
                        }}
                        style={styles.planCardTouchable}
                      >
                        <ThemedView level="default" style={styles.planCard}>
                          <View style={styles.planHeader}>
                            <ThemedText variant="h4" color={theme.textPrimary}>
                              {plan.knowledge_point}
                            </ThemedText>
                            <ThemedText variant="caption" color={theme.textMuted}>
                              {new Date(plan.created_at).toLocaleDateString('zh-CN')}
                            </ThemedText>
                          </View>
                          <View style={styles.planInfo}>
                            <ThemedText variant="caption" color={theme.textSecondary}>
                              {plan.grade} · {plan.teacher_name}
                            </ThemedText>
                            <ThemedText variant="caption" color={theme.textSecondary}>
                              {plan.lesson_date}
                            </ThemedText>
                          </View>
                          <View style={styles.planHint}>
                            <ThemedText variant="caption" color={theme.textMuted}>
                              ← 左滑查看操作
                            </ThemedText>
                          </View>
                        </ThemedView>
                      </TouchableOpacity>
                    </Swipeable>
                  );
                })}
                </View>
              );
            })}
          </View>
        )}

        {/* Back Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
              返回首页
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rename Modal */}
      <Modal visible={renameModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setRenameModalVisible(false)}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.modalHeader}>
                  <ThemedText variant="h4" color={theme.textPrimary}>
                    重命名教案
                  </ThemedText>
                  <TouchableOpacity onPress={() => setRenameModalVisible(false)}>
                    <ThemedText variant="body" color={theme.textMuted}>
                      ✕
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.label}>
                    知识点名称
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    placeholder="请输入新的知识点名称"
                    placeholderTextColor={theme.textMuted}
                    value={newKnowledgePoint}
                    onChangeText={setNewKnowledgePoint}
                    autoFocus
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setRenameModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="smallMedium" color={theme.textSecondary}>
                      取消
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.submitButton]}
                    onPress={handleRenameSubmit}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                      确认
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}
