/**
 * Escala de risco (mesma da API e das views Gold) e suas cores.
 *
 * Segue os estados do modelo: baixo < 40 (alerta), médio 40-70 (fadiga),
 * alto 70-90 (sonolento) e crítico >= 90. "Em risco" = sonolento (>= 70).
 */

export type NivelRisco = "low" | "medium" | "high" | "critical" | "sem_dados";

export const LIMITE_EM_RISCO = 70;

export const riscoDoScore = (s: number | null | undefined): NivelRisco =>
  s === null || s === undefined ? "sem_dados" : s < 40 ? "low" : s < LIMITE_EM_RISCO ? "medium" : s < 90 ? "high" : "critical";

/** Texto curto do critério, para as dicas dos indicadores. */
export const CRITERIO_EM_RISCO = `sonolento (score ≥ ${LIMITE_EM_RISCO})`;

export const ROTULO_RISCO: Record<NivelRisco, string> = { low: "baixo", medium: "médio", high: "alto", critical: "crítico", sem_dados: "sem dados" };

export const CHIP_RISCO: Record<NivelRisco, string> = {
  critical: "text-risk-critical bg-risk-critical/10 border-risk-critical/30",
  high: "text-risk-high bg-risk-high/10 border-risk-high/30",
  medium: "text-risk-medium bg-risk-medium/10 border-risk-medium/30",
  low: "text-risk-low bg-risk-low/10 border-risk-low/30",
  sem_dados: "text-muted-foreground bg-secondary/40 border-border",
};

export const ANEL_RISCO: Record<NivelRisco, string> = {
  critical: "border-risk-critical/60 bg-risk-critical/10 hover:bg-risk-critical/15",
  high: "border-risk-high/50 bg-risk-high/10 hover:bg-risk-high/15",
  medium: "border-risk-medium/50 bg-risk-medium/10 hover:bg-risk-medium/15",
  low: "border-risk-low/40 bg-risk-low/10 hover:bg-risk-low/15",
  sem_dados: "border-border bg-secondary/30 hover:bg-secondary/50",
};

export const PONTO_RISCO: Record<NivelRisco, string> = {
  critical: "bg-risk-critical",
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
  sem_dados: "bg-muted-foreground",
};

/** Severidade dos insights (baixa..crítica) já vem convertida para a escala acima. */
export const ROTULO_SEVERIDADE: Record<string, string> = { low: "baixo", medium: "médio", high: "alto", critical: "crítico" };

// Cores dos gráficos: variáveis CSS do tema (styles.css), então os gráficos
// acompanham o modo claro/escuro sem recarregar.
export const ESTILO_TOOLTIP = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  color: "var(--color-popover-foreground)",
  fontSize: 12,
  boxShadow: "var(--shadow-card)",
};

export const COR = {
  grade: "var(--chart-grid)",
  eixo: "var(--chart-axis)",
  neutro: "var(--chart-muted)",
  cursor: "var(--chart-cursor)",
  primaria: "var(--chart-1)",
  secundaria: "var(--chart-2)",
  risco: "var(--color-risk-high)",
  critico: "var(--color-risk-critical)",
  amarelo: "var(--color-risk-medium)",
  verde: "var(--color-risk-low)",
  // Nomes antigos, mantidos para os gráficos existentes.
  roxo: "var(--chart-2)",
  ciano: "var(--chart-1)",
};

/** Escala contínua baixo -> crítico (heatmap). */
export const ESCALA_RISCO = ["var(--color-risk-low)", "var(--color-risk-medium)", "var(--color-risk-high)", "var(--color-risk-critical)"];
