import { Calendar, MapPin, Truck, User, Download } from "lucide-react";

interface Props {
  period: string;
  setPeriod: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  vehicle: string;
  setVehicle: (v: string) => void;
  onExport: () => void;
}

const select =
  "bg-secondary/60 border border-border text-sm rounded-lg pl-9 pr-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none";

export function Filters({ period, setPeriod, region, setRegion, vehicle, setVehicle, onExport }: Props) {
  return (
    <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option>Últimos 7 dias</option>
          <option>Últimos 30 dias</option>
          <option>Últimos 90 dias</option>
          <option>Este ano</option>
        </select>
      </div>
      <div className="relative">
        <MapPin className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option>Todas as regiões</option>
          <option>Sudeste</option>
          <option>Sul</option>
          <option>Nordeste</option>
          <option>Norte</option>
          <option>Centro-Oeste</option>
        </select>
      </div>
      <div className="relative">
        <Truck className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
          <option>Todos os veículos</option>
          <option>Caminhão</option>
          <option>Ônibus</option>
          <option>Van</option>
          <option>Carro App</option>
        </select>
      </div>
      <div className="relative">
        <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <select className={select} defaultValue="Todos os motoristas">
          <option>Todos os motoristas</option>
          <option>Risco crítico</option>
          <option>Risco alto</option>
        </select>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-risk-low font-medium px-3 py-2 rounded-lg bg-risk-low/10 border border-risk-low/30">
          <span className="h-2 w-2 rounded-full bg-risk-low pulse-dot" />
          Live • dados em tempo real
        </div>
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition glow-primary"
        >
          <Download className="h-4 w-4" /> Exportar
        </button>
      </div>
    </div>
  );
}