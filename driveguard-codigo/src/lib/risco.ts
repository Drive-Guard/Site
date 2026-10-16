/** Escala de risco (mesma da API e das views Gold) e suas cores. */

export type NivelRisco = "low" | "medium" | "high" | "critical" | "sem_dados";

export const riscoDoScore = (s: number | null | undefined): NivelRisco =>
  s === null || s === undefined ? "sem_dados" : s < 35 ? "low" : s < 60 ? "medium" : s < 80 ? "high" : "critical";

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

export const ESTILO_TOOLTIP = {
  background: "oklch(0.21 0.025 255)",
  border: "1px solid oklch(0.3 0.025 255)",
  borderRadius: 12,
  color: "oklch(0.97 0.01 250)",
  fontSize: 12,
};

export const COR = {
  grade: "oklch(0.3 0.025 255)",
  eixo: "oklch(0.7 0.02 255)",
  primaria: "oklch(0.72 0.18 220)",
  risco: "oklch(0.65 0.22 25)",
  roxo: "oklch(0.6 0.22 280)",
  amarelo: "oklch(0.82 0.17 85)",
  verde: "oklch(0.75 0.18 150)",
  ciano: "oklch(0.6 0.118 184)",
};
