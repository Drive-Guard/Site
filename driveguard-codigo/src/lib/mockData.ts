// Mock data + simulação para o dashboard de sonolência
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface Driver {
  id: string;
  name: string;
  age: number;
  yearsDriving: number;
  vehicle: "Caminhão" | "Ônibus" | "Van" | "Carro App";
  region: string;
  shiftHours: number;
  fatigueScore: number; // 0-100
  blinkRate: number; // piscadas/min
  eyeClosureMs: number; // tempo médio fechamento
  headTilt: number; // graus
  risk: RiskLevel;
  lastUpdate: string;
}

export const regions = ["SP", "RJ", "MG", "PR", "RS", "BA", "PE", "GO"];
export const vehicleTypes = ["Caminhão", "Ônibus", "Van", "Carro App"] as const;

export const riskFromScore = (s: number): RiskLevel => {
  if (s < 35) return "low";
  if (s < 60) return "medium";
  if (s < 80) return "high";
  return "critical";
};

const names = [
  "Carlos Silva", "João Pereira", "Marcos Lima", "Roberto Souza",
  "Antonio Costa", "Paulo Mendes", "Ricardo Alves", "Eduardo Rocha",
  "Fernando Dias", "Sergio Ramos", "Luiz Gomes", "André Martins",
  "Bruno Cardoso", "Felipe Nunes", "Gustavo Reis", "Henrique Castro",
];

export function generateDrivers(n = 16): Driver[] {
  return Array.from({ length: n }).map((_, i) => {
    const score = Math.round(Math.random() * 100);
    return {
      id: `DRV-${1000 + i}`,
      name: names[i % names.length],
      age: 25 + Math.floor(Math.random() * 35),
      yearsDriving: 1 + Math.floor(Math.random() * 25),
      vehicle: vehicleTypes[i % vehicleTypes.length],
      region: regions[i % regions.length],
      shiftHours: Math.round((1 + Math.random() * 11) * 10) / 10,
      fatigueScore: score,
      blinkRate: 8 + Math.round(Math.random() * 25),
      eyeClosureMs: 100 + Math.round(Math.random() * 800),
      headTilt: Math.round(Math.random() * 35),
      risk: riskFromScore(score),
      lastUpdate: new Date(Date.now() - Math.random() * 1000 * 60 * 30).toISOString(),
    };
  });
}

// Timeline 12 meses
export const timelineData = Array.from({ length: 12 }).map((_, i) => {
  const month = new Date(2025, i, 1).toLocaleDateString("pt-BR", { month: "short" });
  const sleepy = 120 + Math.round(Math.random() * 180 + i * 8);
  const others = 600 + Math.round(Math.random() * 220);
  return { month, sonolencia: sleepy, outras: others };
});

// Faixa de horário
export const hourBuckets = [
  { faixa: "Madrugada\n0h–6h", acidentes: 412, color: "var(--risk-critical)" },
  { faixa: "Manhã\n6h–12h", acidentes: 178, color: "var(--risk-low)" },
  { faixa: "Tarde\n12h–18h", acidentes: 224, color: "var(--risk-medium)" },
  { faixa: "Noite\n18h–0h", acidentes: 356, color: "var(--risk-high)" },
];

// Heatmap: tempo de direção (h) x probabilidade de sonolência
export const heatmapData = Array.from({ length: 6 }).map((_, row) => ({
  hora: `${row * 2}–${row * 2 + 2}h`,
  values: Array.from({ length: 7 }).map((_, col) => {
    const base = row * 12 + col * 6;
    return Math.min(100, base + Math.round(Math.random() * 15));
  }),
}));

// Causas comparativas
export const causes = [
  { name: "Sonolência", value: 1170, color: "var(--risk-high)" },
  { name: "Velocidade", value: 980, color: "oklch(0.72 0.18 220)" },
  { name: "Álcool", value: 720, color: "oklch(0.6 0.22 280)" },
  { name: "Distração", value: 1340, color: "oklch(0.82 0.17 85)" },
  { name: "Climáticas", value: 410, color: "oklch(0.6 0.118 184)" },
];

// Cidades para "mapa"
export const cityHotspots = [
  { city: "São Paulo", uf: "SP", cases: 318, x: 56, y: 64, severity: "critical" as RiskLevel },
  { city: "Rio de Janeiro", uf: "RJ", cases: 214, x: 64, y: 62, severity: "high" as RiskLevel },
  { city: "Belo Horizonte", uf: "MG", cases: 162, x: 60, y: 56, severity: "high" as RiskLevel },
  { city: "Curitiba", uf: "PR", cases: 138, x: 52, y: 70, severity: "medium" as RiskLevel },
  { city: "Porto Alegre", uf: "RS", cases: 121, x: 48, y: 80, severity: "medium" as RiskLevel },
  { city: "Salvador", uf: "BA", cases: 98, x: 73, y: 42, severity: "medium" as RiskLevel },
  { city: "Recife", uf: "PE", cases: 87, x: 80, y: 32, severity: "low" as RiskLevel },
  { city: "Goiânia", uf: "GO", cases: 76, x: 50, y: 48, severity: "low" as RiskLevel },
  { city: "Manaus", uf: "AM", cases: 54, x: 30, y: 28, severity: "low" as RiskLevel },
  { city: "Fortaleza", uf: "CE", cases: 91, x: 76, y: 26, severity: "medium" as RiskLevel },
];

// Tendência sonolência durante turno (hora a hora)
export const shiftTrend = Array.from({ length: 12 }).map((_, i) => ({
  hora: `${i + 1}h`,
  fadiga: Math.min(100, Math.round(15 + i * 7 + Math.random() * 10)),
  alerta: 70,
}));

export const insights = [
  {
    title: "Pausa recomendada para 4 motoristas",
    desc: "Score de fadiga acima de 75 detectado em jornadas superiores a 6h.",
    severity: "high" as RiskLevel,
    action: "Agendar pausa de 20 min",
  },
  {
    title: "Padrão crítico na madrugada",
    desc: "63% dos eventos de sonolência ocorrem entre 2h e 5h. Considere reduzir turnos noturnos.",
    severity: "critical" as RiskLevel,
    action: "Revisar escala noturna",
  },
  {
    title: "Risco previsto nas próximas 2h",
    desc: "Modelo preditivo indica 78% de chance de fadiga severa em 3 motoristas da rota SP→RJ.",
    severity: "high" as RiskLevel,
    action: "Notificar central",
  },
  {
    title: "Redução potencial de 34% em acidentes",
    desc: "Implementação de pausas inteligentes pode evitar ~ 397 acidentes/ano.",
    severity: "low" as RiskLevel,
    action: "Aplicar política de pausas",
  },
];

export const kpis = {
  totalSleepy: 1170,
  totalAccidents: 4620,
  peakHour: "03:00 – 05:00",
  avgDriverAge: 42,
  avgYearsDriving: 11,
  topVehicle: "Caminhão",
  potentialReduction: 34,
  activeAlerts: 7,
};
