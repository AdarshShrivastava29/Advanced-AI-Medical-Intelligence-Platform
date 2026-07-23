// Shared API response types mirroring the backend schemas (docs/18_API_Design.md).

export type Role = 'user' | 'doctor' | 'admin';
export type RiskLevel = 'low' | 'moderate' | 'high';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  checks: Record<string, boolean>;
}

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errors?: unknown[];
  request_id?: string;
}

export interface GradCamUrls {
  original: string;
  heatmap: string;
  overlay: string;
}

export interface ReportResponse {
  id: string;
  prediction_id: string;
  llm_provider: string;
  llm_model: string;
  risk_level: RiskLevel;
  content_markdown: string;
  created_at: string;
}

export interface PredictionResponse {
  id: string;
  predicted_class: string;
  confidence: number;
  probabilities: Record<string, number>;
  ood_flag: boolean;
  model_arch: string;
  model_version: string;
  image_url: string | null;
  gradcam: GradCamUrls;
  status: string;
  created_at: string;
  report: ReportResponse | null;
}

export interface PredictionListItem {
  id: string;
  predicted_class: string;
  confidence: number;
  model_arch: string;
  ood_flag: boolean;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  pages: number;
}

export interface AnalyticsOverview {
  total_predictions: number;
  pneumonia_count: number;
  normal_count: number;
  ood_count: number;
  average_confidence: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
}

export interface AnalyticsSummary {
  overview: AnalyticsOverview;
  trends: TrendPoint[];
  disease_distribution: DistributionBucket[];
  confidence_distribution: DistributionBucket[];
}

export interface DocumentResponse {
  id: string;
  filename: string;
  title: string;
  source: string;
  status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  pages: number;
  chunk_count: number;
  version: number;
  embedding_provider: string | null;
  vector_db: string | null;
  error: string | null;
  created_at: string;
}

export interface Citation {
  index: number;
  document_id: string;
  filename: string;
  chunk_id: string;
  page: number;
  score: number;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  grounded: boolean;
  citations: Citation[];
  message_id: string;
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  grounded: boolean;
  citations: Citation[];
  created_at: string;
}
