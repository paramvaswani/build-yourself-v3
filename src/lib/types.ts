export type Dimension =
  | "body"
  | "mind"
  | "skills"
  | "habits"
  | "social"
  | "spirit";

export interface DimensionScore {
  dimension: Dimension;
  score: number | null;
  source: string | null;
  updatedAt: string;
}

export interface DailySnapshot {
  date: string;
  scores: Record<Dimension, DimensionScore>;
  overall: number | null;
}

export interface TodoistTask {
  id: string;
  content: string;
  description: string;
  due: {
    date: string;
    is_recurring: boolean;
    datetime: string | null;
    string: string;
    timezone: string | null;
  } | null;
  is_completed: boolean;
  priority: number;
  project_id: string;
  labels: string[];
  created_at: string;
  completed_at?: string | null;
}

export interface WhoopCycle {
  id: number;
  user_id: number;
  start: string;
  end: string | null;
  score: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  } | null;
}

export interface WhoopSleep {
  id: number;
  user_id: number;
  start: string;
  end: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
    };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  } | null;
}

export interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  score: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage: number;
    skin_temp_celsius: number;
  } | null;
}

export interface WhoopWorkout {
  id: number;
  user_id: number;
  start: string;
  end: string;
  sport_id: number;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    zone_duration: Record<string, number>;
  } | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees: number;
  status: string;
}

export interface MorningBrief {
  date: string;
  summary: string;
  focus: string[];
  bodyStatus: string | null;
  habitReminders: string[];
}

export interface DashboardData {
  snapshot: DailySnapshot;
  habits: {
    tasks: TodoistTask[];
    completionRate: number;
  };
  stats: {
    streakDays: number;
    todayCompletion: number;
    weekTrend: number[];
  };
  heatmap: { date: string; value: number }[];
}
