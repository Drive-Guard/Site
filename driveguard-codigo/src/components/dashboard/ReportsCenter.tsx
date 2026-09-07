import { useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Calendar,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  MapPin,
  Save,
  Sparkles,
  Truck,
  User,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "oklch(0.21 0.025 255)",
  border: "1px solid oklch(0.3 0.025 255)",
  borderRadius: 12,
  color: "oklch(0.97 0.01 250)",
  fontSize: 12,
};

const selectClass =
  "bg-secondary/60 border border-border text-sm rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none w-full";

interface SelectFieldProps {
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

function SelectField({ icon: Icon, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="relative">
      <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

const reportCards = [
  {
    title: "Relatório Executivo",
    desc: "Resumo para gestores.",
    icon: FileText,
    button: "Gerar PDF",
    accent: "from-primary/30 to-primary/5 text-primary",
    file: "relatorio-executivo.pdf",
  },
  {
    title: "Relatório Operacional",
    desc: "Dados detalhados da operação.",
    icon: FileSpreadsheet,
    button: "Exportar Excel",
    accent: "from-risk-low/30 to-risk-low/5 text-risk-low",
    file: "relatorio-operacional.xlsx",
  },
  {
    title: "Relatório de Motoristas",
    desc: "Indicadores individuais.",
    icon: Users,
    button: "Gerar PDF",
    accent: "from-risk-medium/30 to-risk-medium/5 text-risk-medium",
    file: "relatorio-motoristas.pdf",
  },
  {
    title: "Relatório da Frota",
    desc: "Indicadores dos veículos monitorados.",
    icon: Truck,
    button: "Gerar PDF",
    accent: "from-primary/30 to-primary/5 text-primary",
    file: "relatorio-frota.pdf",
  },
  {
    title: "Histórico de Alertas",
    desc: "Todos os eventos registrados.",
    icon: Activity,
    button: "Exportar CSV",
    accent: "from-risk-high/30 to-risk-high/5 text-risk-high",
    file: "historico-alertas.csv",
  },
];

export function ReportsCenter() {
  const [period, setPeriod] = useState("Últimos 30 dias");
  const [region, setRegion] = useState("Todas as regiões");
  const [driverF, setDriverF] = useState("Todos os motoristas");
  const [vehicle, setVehicle] = useState("Todos os veículos");
  const [category, setCategory] = useState("Todas as categorias");
  const [shift, setShift] = useState("Todos os turnos");

  const [frequency, setFrequency] = useState("Semanal");
  const [time, setTime] = useState("08:00");
  const [recipients, setRecipients] = useState("gestor@empresa.com");

  const fatigueSeries = useMemo(() => {
    let seed = 17;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const base = 58 - i * 0.25 + Math.sin(i / 3) * 6;
      const noise = (rand() - 0.5) * 8;
      return {
        day: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        fadiga: Math.max(25, Math.min(90, Math.round(base + noise))),
      };
    });
  }, [period, region, driverF, vehicle, category, shift]);

  const alertDistribution = useMemo(
    () =>
      [
        { tipo: "Piscadas excessivas", eventos: 412 },
        { tipo: "Fechamento ocular prolongado", eventos: 318 },
        { tipo: "Distração", eventos: 274 },
        { tipo: "Bocejos", eventos: 196 },
        { tipo: "Cabeça inclinada", eventos: 142 },
      ].sort((a, b) => b.eventos - a.eventos),
    [],
  );

  const handleGenerate = (filename: string) => {
    const content = `DriveGuard\nRelatório: ${filename}\nPeríodo: ${period}\nRegião: ${region}\nMotorista: ${driverF}\nVeículo: ${vehicle}\nCategoria: ${category}\nTurno: ${shift}\nGerado em: ${new Date().toLocaleString("pt-BR")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Filtros do relatório</h2>
          </div>
          <button
            onClick={() => handleGenerate("relatorio-driveguard.pdf")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition glow-primary"
          >
            <Sparkles className="h-4 w-4" /> Gerar relatório
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SelectField
            icon={Calendar}
            value={period}
            onChange={setPeriod}
            options={["Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias", "Este ano"]}
          />
          <SelectField
            icon={MapPin}
            value={region}
            onChange={setRegion}
            options={["Todas as regiões", "Sudeste", "Sul", "Nordeste", "Norte", "Centro-Oeste"]}
          />
          <SelectField
            icon={User}
            value={driverF}
            onChange={setDriverF}
            options={["Todos os motoristas", "Risco crítico", "Risco alto", "Risco médio", "Risco baixo"]}
          />
          <SelectField
            icon={Truck}
            value={vehicle}
            onChange={setVehicle}
            options={["Todos os veículos", "TRK-1045", "BUS-2210", "VAN-3304", "APP-4488"]}
          />
          <SelectField
            icon={Car}
            value={category}
            onChange={setCategory}
            options={["Todas as categorias", "Caminhão", "Ônibus", "Van", "Carro App"]}
          />
          <SelectField
            icon={Clock}
            value={shift}
            onChange={setShift}
            options={["Todos os turnos", "Madrugada", "Manhã", "Tarde", "Noite"]}
          />
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Eventos registrados" value="2.184" hint="no período" icon={Activity} variant="risk" />
        <KpiCard label="Motoristas analisados" value={142} hint="frota ativa" icon={Users} variant="default" />
        <KpiCard label="Veículos analisados" value={86} hint="monitorados" icon={Truck} variant="warning" />
        <KpiCard label="Economia estimada" value="R$ 1,82 mi" hint="potencial no período" icon={DollarSign} variant="safe" />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard
          title="Evolução da fadiga"
          subtitle="Score médio da frota ao longo do período"
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fatigueSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
              <XAxis dataKey="day" stroke="oklch(0.7 0.02 255)" fontSize={11} interval={3} />
              <YAxis stroke="oklch(0.7 0.02 255)" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine
                y={70}
                stroke="oklch(0.65 0.22 25)"
                strokeDasharray="4 4"
                label={{ value: "Limite", fill: "oklch(0.65 0.22 25)", fontSize: 11, position: "right" }}
              />
              <Line
                type="monotone"
                dataKey="fadiga"
                stroke="oklch(0.72 0.18 220)"
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribuição dos alertas" subtitle="Eventos por tipo de sinal detectado">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alertDistribution} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.025 255)" />
              <XAxis type="number" stroke="oklch(0.7 0.02 255)" fontSize={11} />
              <YAxis
                dataKey="tipo"
                type="category"
                stroke="oklch(0.7 0.02 255)"
                fontSize={11}
                width={140}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="eventos" radius={[0, 6, 6, 0]}>
                {alertDistribution.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      [
                        "oklch(0.65 0.22 25)",
                        "oklch(0.72 0.18 40)",
                        "oklch(0.72 0.18 220)",
                        "oklch(0.82 0.17 85)",
                        "oklch(0.6 0.118 184)",
                      ][i]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Resumo Inteligente */}
      <section className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary flex items-center justify-center">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Resumo Inteligente</h2>
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente pela IA com base nos filtros aplicados
              </p>
            </div>
          </div>
          <ul className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
            {[
              "A fadiga média reduziu 12% em relação ao período anterior.",
              "A maior concentração de eventos ocorreu entre 2h e 5h.",
              "Caminhões apresentaram maior score médio de fadiga.",
              "A rota São Paulo → Rio de Janeiro concentrou o maior número de eventos.",
              "A implementação das pausas preventivas pode reduzir significativamente os riscos operacionais.",
            ].map((t) => (
              <li
                key={t}
                className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3"
              >
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-risk-low shrink-0" />
                <span className="text-foreground/90">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Exportar relatórios */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Download className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">
            Exportar relatórios
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {reportCards.map((r) => (
            <div
              key={r.title}
              className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/40 transition relative overflow-hidden"
            >
              <div
                className={cn(
                  "absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br opacity-60 blur-2xl",
                  r.accent,
                )}
              />
              <div className={cn("relative p-2.5 rounded-xl bg-gradient-to-br w-fit", r.accent)}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="relative">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
              </div>
              <button
                onClick={() => handleGenerate(r.file)}
                className="relative mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary/60 transition"
              >
                <Download className="h-3.5 w-3.5" /> {r.button}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Agendamento */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold tracking-tight">Agendamento de envio</h2>
            <p className="text-xs text-muted-foreground">
              Configure o envio automático dos relatórios para os destinatários
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Frequência</label>
            <SelectField
              icon={Calendar}
              value={frequency}
              onChange={setFrequency}
              options={["Diária", "Semanal", "Mensal"]}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
            <div className="relative">
              <Clock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={selectClass}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Destinatários</label>
            <div className="relative">
              <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@empresa.com, email2@empresa.com"
                className={selectClass}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition glow-primary">
            <Save className="h-4 w-4" /> Salvar agendamento
          </button>
        </div>
      </section>
    </div>
  );
}