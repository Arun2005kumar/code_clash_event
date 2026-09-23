// types/index.ts
// ============================================================
// TypeScript interfaces for all Coding Club Challenge entities
// ============================================================

// ============================================================
// DATABASE ENTITIES
// ============================================================

export interface Team {
  id: string;
  team_name: string;
  leader_name: string;
  leader_reg_no: string;
  login_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface Round1Question {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Round1QuestionAdmin extends Round1Question {
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface Round1Attempt {
  id: string;
  team_id: string;
  started_at: string;
  submitted_at?: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_used_seconds?: number;
  status: 'in_progress' | 'submitted' | 'auto_submitted';
  created_at: string;
}

export interface Round1Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: Option | null;
  is_correct: boolean;
  answered_at: string;
}

export interface Round2Question {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  status: Round2QuestionStatus;
  created_at: string;
  updated_at: string;
}

export interface Round2QuestionAdmin extends Round2Question {
  correct_option: 'A' | 'B' | 'C' | 'D';
  resolved_team_id?: string;
}

export type Round2QuestionStatus =
  | 'waiting'
  | 'live'
  | 'bidding_open'
  | 'bidding_closed'
  | 'resolved';

export interface Round2TeamState {
  id: string;
  team_id: string;
  score: number;
  coins: number;
  current_question: number;
  status: 'waiting' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Round2Bid {
  id: string;
  team_id: string;
  question_id: string;
  selected_option: Option;
  bid_amount: BidAmount;
  bid_timestamp: string;
  status: 'placed' | 'won' | 'lost';
  is_winner: boolean;
  is_correct?: boolean;
  created_at: string;
  // joined
  team_name?: string;
}

export interface Round2Result {
  id: string;
  team_id: string;
  question_id: string;
  bid_amount: number;
  result: 'won_correct' | 'won_incorrect' | 'lost' | 'not_winner';
  score_change: number;
  coin_change: number;
  resolved_at: string;
  // joined
  team_name?: string;
  question_number?: number;
}

export interface CompetitionSettings {
  id: string;
  current_round: number;
  round1_active: boolean;
  round2_active: boolean;
  round3_active: boolean;
  current_round2_question: number;
  show_round1_explanations: boolean;
  updated_at: string;
}

export interface AntiCheatViolation {
  id: string;
  team_id: string;
  violation_type: ViolationType;
  details?: string;
  created_at: string;
  // joined
  team_name?: string;
}

export interface AdminUser {
  id: string;
  auth_user_id: string;
  role: 'admin' | 'superadmin';
  created_at: string;
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type Option = 'A' | 'B' | 'C' | 'D';
export type BidAmount = 1 | 2 | 4;

export type ViolationType =
  | 'fullscreen_exit'
  | 'tab_switch'
  | 'window_blur'
  | 'devtools_detected'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'print_attempt'
  | 'keyboard_shortcut';

// ============================================================
// UI STATE TYPES
// ============================================================

export interface TeamSession {
  teamId: string;
  teamName: string;
  leaderName: string;
  leaderRegNo: string;
}

export interface QuizState {
  currentQuestion: number;
  answers: Record<string, Option>; // question_id -> selected option
  timeRemaining: number; // seconds
  attemptId: string | null;
  isSubmitted: boolean;
}

export interface AuctionState {
  coins: number;
  score: number;
  currentQuestion: Round2Question | null;
  myBid: { option: Option; amount: BidAmount } | null;
  bidStatus: 'idle' | 'placing' | 'placed' | 'resolved';
  lastResult: Round2Result | null;
}

export interface ViolationState {
  count: number;
  lastViolationType: ViolationType | null;
  showOverlay: boolean;
  fullscreenCountdown: number | null;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface LoginResponse {
  success: boolean;
  message: string;
  team?: {
    team_id: string;
    team_name: string;
    leader_name: string;
    leader_reg_no: string;
  };
}

export interface BidResponse {
  success: boolean;
  message: string;
}

export interface HammerResponse {
  success: boolean;
  message: string;
  winner_correct: boolean;
  score_change: number;
  coin_change: number;
}

export interface SubmitRound1Response {
  score: number;
  correct_count: number;
  total_questions: number;
  time_used_seconds: number;
}

export interface ViolationCount {
  team_id: string;
  team_name: string;
  total_violations: number;
  fullscreen_exits: number;
  tab_switches: number;
  devtools_detections: number;
  is_flagged: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  r1_score: number;
  r2_score: number;
  r2_coins: number;
  total_violations: number;
}

// ============================================================
// ADMIN DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  totalTeams: number;
  round1Completed: number;
  round2Active: number;
  currentQuestion: number;
  flaggedTeams: number;
}

export interface TeamAdminView extends Team {
  r1_status?: string;
  r1_score?: number;
  r2_status?: string;
  r2_score?: number;
  r2_coins?: number;
  r3_status?: string;
  r3_vault_unlocked?: boolean;
  total_violations: number;
  is_flagged: boolean;
}

// ============================================================
// ROUND 3 TYPES
// ============================================================

export interface Round3Mission {
  id: string;
  mission_number: number;
  title: string;
  difficulty: string;
  time_estimate: string;
  handout_content: Round3HandoutContent;
  clue_piece?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Round3HandoutContent {
  briefing: string;
  lines?: string[];
  receipt?: {
    shop: string;
    items: Array<{ name: string; price: number }>;
    total: number;
  };
  evidence?: string[];
  boxes?: Array<{ label: string; text: string }>;
  encoded?: string[];
  hint_text?: string;
  strips?: string[];
  question: string;
  options?: string[];
  instruction?: string;
  final_hint?: string;
  hints: string[];
}

export type Round3TeamStatus = 'not_started' | 'in_progress' | 'vault_open' | 'completed';

export interface Round3TeamState {
  id: string;
  team_id: string;
  started_at?: string;
  completed_at?: string;
  status: Round3TeamStatus;
  hints_used: number;
  finish_time_seconds?: number;
  vault_attempts: number;
  vault_unlocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Round3MissionAttempt {
  id: string;
  team_id: string;
  mission_number: number;
  submitted_answer?: string;
  is_correct: boolean;
  clue_piece_revealed?: string;
  hint_count: number;
  attempted_at?: string;
  completed_at?: string;
}

export interface Round3VaultAttempt {
  id: string;
  team_id: string;
  entered_password: string;
  is_correct: boolean;
  attempted_at?: string;
}

export interface Round3BonusAttempt {
  id: string;
  team_id: string;
  submitted_answer?: string;
  is_correct: boolean;
  attempted_at?: string;
}

export interface Round3LeaderboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  r1_score: number;
  r2_score: number;
  r3_status: Round3TeamStatus;
  r3_vault_unlocked: boolean;
  finish_time_seconds?: number;
  hints_used: number;
  total_score: number;
}

