/** Formatos das respostas da API (Backend, src/servicos). */

import type { NivelRisco } from "./risco";

export interface Me {
  id: string;
  nome: string;
  email: string;
  papel: string;
  papeis: string[];
  empresa: { id: string; nome: string; frotaTotal: number | null };
}

export interface Kpis {
  aoVivo: { motoristasAtivos: number; motoristasEmRisco: number; motoristasMonitorados: number; fadigaMedia: number | null };
  alertas24h: { total: number; anterior: number; variacao: number | null };
  horarioCritico: {
    inicio: string;
    fim: string;
    alertasNaJanela: number;
    percentual: number;
    madrugadaPercentual: number;
    totalAlertas: number;
    porHora: number[];
  } | null;
  periodo: {
    de: string;
    ate: string;
    fadigaMedia: number | null;
    fadigaMediaAnterior: number | null;
    variacaoFadiga: number | null;
    alertas: number;
    alertasAnterior: number;
    variacaoAlertas: number | null;
    alertasGraves: number;
    turnos: number;
    horasDirigidas: number;
    kmRodados: number;
    leituras: number;
  };
}

export interface MotoristaTempoReal {
  motoristaId: string;
  codigo: string | null;
  nome: string;
  score: number;
  risco: NivelRisco;
  tendencia: "up" | "down" | "estavel";
  blinkRate: number | null;
  fechamentoOlhosMs: number | null;
  horasTurno: number | null;
  tipoVeiculo: string;
  regiao: string;
  placa: string | null;
  veiculoCodigo: string | null;
  alertasHoje: number;
  ultimaLeituraEm: string;
}

export interface EventoAlerta {
  id: string;
  disparadoEm: string;
  tipo: string;
  rotulo: string;
  gravidade: string;
  status: string;
  score: number | null;
  codigo: string | null;
  nome: string;
}

export interface TempoReal {
  motoristas: MotoristaTempoReal[];
  eventos: EventoAlerta[];
}

export interface TendenciaTurno {
  pontos: { hora: string; horaDirecao: number; fadiga: number | null; leituras: number; alertas: number }[];
  limiteAlerta: number;
  resumo: {
    pico: { hora: string; fadiga: number } | null;
    primeiraHoraAcimaDoLimite: string | null;
    sinais: { tipo: string; rotulo: string; total: number }[];
    eventosPorHora: number | null;
    scoreAtual: number | null;
    scoreOntem: number | null;
    variacaoVsOntem: number | null;
  };
}

export interface EvolucaoFadiga {
  serie: { dia: string; fadiga: number | null; alertas: number }[];
  fadigaMedia: number | null;
  fadigaMediaAnterior: number | null;
  variacao: number | null;
  limiteAlerta: number;
}

export interface RotaDesempenho {
  rotaId: string;
  nome: string | null;
  origem: string;
  destino: string;
  origemCidade: string;
  destinoCidade: string;
  brs: string[];
  distanciaKm: number | null;
  fadiga: number | null;
  eventos: number;
  alertasGraves: number;
  turnos: number;
  risco: NivelRisco;
  tendencia: number | null;
  prf: { acidentes: number; acidentesSono: number; acidentesPesadosSono: number; mortos: number } | null;
}

export interface Heatmap {
  de: string;
  ate: string;
  dias: string[];
  faixas: string[];
  valores: (number | null)[][];
  detalhes: ({ leituras: number; fadiga: number | null; alertas: number } | null)[][];
}

export interface PontoFadigaTempo {
  faixa: string;
  horas: number;
  fadiga: number | null;
  eventos: number;
  leituras: number;
}

interface BasePrf {
  carregada: boolean;
  fonte: string;
  url: string;
  janelaAte?: string;
  veiculosPesados?: boolean;
}

export interface PrfResumo extends BasePrf {
  janela?: { de: string; ate: string; carregadoEm: string | null };
  acidentes?: number;
  acidentesSono?: number;
  percentualSono?: number | null;
  mortos?: number;
}

export interface PrfFaixa extends BasePrf {
  faixas: { faixa: string; rotulo: string; acidentes: number; acidentesSono: number; mortos: number; percentualSono: number }[];
}

export interface PrfCausas extends BasePrf {
  causas: { causa: string; acidentes: number; mortos: number; ligadaASono: boolean }[];
}

export interface PrfMapa extends BasePrf {
  cidades: {
    cidade: string;
    uf: string;
    acidentesSono: number;
    acidentes: number;
    fatais: number;
    mortos: number;
    latitude: number;
    longitude: number;
    severidade: NivelRisco;
  }[];
}

export interface Insights {
  execucaoId: string | null;
  geradoEm: string;
  provedor: string;
  modelo: string | null;
  origem: "ia" | "regras";
  atualizando: boolean;
  recomendacoes: { id: string; titulo: string; descricao: string; severidade: NivelRisco; acao: string | null; origem: string }[];
  resumo: string[];
}

export interface ParametroRoi {
  chave: string;
  valor: number | null;
  valorPadrao: number | null;
  unidade: string;
  descricao: string;
  fonte: string | null;
  urlFonte: string | null;
  referencia: string | null;
  editavel: boolean;
  personalizado: boolean;
}

export interface CenarioRoi {
  fracaoSono: number;
  acidentesPorSono: number;
  acidentesEvitados: number;
  custoEvitado: number;
  vidasPreservadas: number;
  horasParadaEvitadas: number | null;
  custoAtrasoEvitado: number | null;
}

export interface Roi {
  disponivel: boolean;
  pendencias: string[];
  reducaoAcidentesSonoPercentual: number | null;
  cenarios: { conservador: CenarioRoi; realista: CenarioRoi };
  custoMedioPorAcidente: number;
  proporcoesGravidade: { fatal: number; feridos: number; semVitimas: number; fonte: string };
  mortosPorAcidente: number;
  cobertura: { veiculosComCamera: number; frotaTotal: number; frotaInformada: boolean; fracao: number };
  valorHoraViagens: number | null;
  alertasAtendidos30d: { graves: number; atendidos: number; percentual: number | null };
  parametros: ParametroRoi[];
  nota: string;
}

export interface MotoristaAoVivo {
  motoristaId: string;
  codigo: string | null;
  nome: string;
  idade: number | null;
  anosExperiencia: number | null;
  regiao: string;
  macroRegiao: string;
  tipoVeiculo: string;
  placa: string | null;
  veiculoCodigo: string | null;
  horasTurno: number | null;
  turnoStatus: string | null;
  score: number;
  risco: NivelRisco;
  tendencia: "up" | "down" | "estavel";
  blinkRate: number | null;
  fechamentoOlhosMs: number | null;
  inclinacaoCabeca: number | null;
  perclos: number | null;
  alertasHoje: number;
  ultimaLeituraEm: string;
  ativo: boolean;
  scoreMedio30d: number | null;
}

export interface MotoristaDetalhe {
  motoristaId: string;
  codigo: string | null;
  nome: string;
  idade: number | null;
  anosExperiencia: number | null;
  regiao: string;
  status: string;
  veiculo: { tipo: string; placa: string | null; codigo: string | null };
  agora: {
    score: number;
    risco: NivelRisco;
    tendencia: string;
    horasTurno: number | null;
    turnoStatus: string | null;
    alertasHoje: number;
    blinkRate: number | null;
    fechamentoOlhosMs: number | null;
    ultimaLeituraEm: string;
  } | null;
  ultimos30d: {
    scoreMedio: number | null;
    scoreMaximo: number | null;
    nivelRisco: NivelRisco;
    posicaoRisco: number;
    alertas: number;
    alertasGraves: number;
    alertasAbertos: number;
    turnos: number;
    horasDirigidas: number | null;
    duracaoMediaTurnoH: number | null;
    kmRodados: number | null;
    blinkRateMedio: number | null;
    fechamentoOlhosMedioMs: number | null;
    inclinacaoCabecaMedia: number | null;
    mediaDaFrota: number | null;
  };
}

export interface CurvaTurno {
  turno: { turnoId: string; iniciadoEm: string; finalizadoEm: string | null; status: string; origem: string | null; destino: string | null } | null;
  limiteAlerta: number;
  pontos: { hora: string; fadiga: number | null; maximo: number | null; mediaFrota: number | null }[];
}

export interface InsightMotorista {
  nivel: "low" | "medium" | "high" | "critical";
  icone: string;
  titulo: string;
  descricao: string;
  origem: "regra" | "modelo";
}

export interface Alerta {
  id: string;
  disparado_em: string;
  tipo: string;
  rotulo: string;
  gravidade: string;
  status: string;
  score_fadiga: number | null;
  mensagem: string | null;
  reconhecido_em: string | null;
  motorista_id?: string;
  codigo?: string | null;
  nome?: string;
  placa?: string | null;
  veiculo_codigo?: string | null;
  tem_acao?: boolean;
}

export interface ResumoRelatorio {
  periodo: { de: string; ate: string; dias: number };
  filtros: string;
  kpis: {
    eventos: number;
    eventosAnterior: number;
    variacaoEventos: number | null;
    alertasGraves: number;
    alertasAtendidos: number;
    motoristasAnalisados: number;
    veiculosAnalisados: number;
    turnos: number;
    horasDirigidas: number;
    fadigaMedia: number | null;
    economiaEstimada: number | null;
    economiaDisponivel: boolean;
  };
  serieFadiga: { dia: string; rotulo: string; fadiga: number | null }[];
  distribuicaoAlertas: { tipo: string; rotulo: string; eventos: number }[];
  resumoInteligente: { frases: string[]; origem: "ia" | "regras"; geradoEm: string };
}

export interface RelatorioGerado {
  id: string;
  tipo: string;
  formato: string;
  status: string;
  filtros: Record<string, string>;
  tamanho_bytes: number | null;
  erro: string | null;
  envio: string;
  envio_erro: string | null;
  enviado_em: string | null;
  destinatarios: string[];
  criado_em: string;
  concluido_em: string | null;
  agendamento_id: string | null;
  solicitado_por: string | null;
}

export interface Agendamento {
  id: string;
  tipo: string;
  formato: string;
  frequencia: "diaria" | "semanal" | "mensal";
  horario: string;
  diaSemana: number | null;
  diaMes: number | null;
  destinatarios: string[];
  filtros: Record<string, string>;
  ativo: boolean;
  proximaExecucao: string;
  ultimaExecucao: string | null;
}

export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  frotaTotal: number | null;
  uf: string | null;
  cidade: string | null;
  veiculosCadastrados: number;
}

export interface Uf {
  uf: string;
  nome: string;
  macroRegiao: string;
}

export interface MotoristaCadastro {
  id: string;
  codigo: string | null;
  nome: string;
  idade: number | null;
  anosExperiencia: number | null;
  categoriaCnh: string | null;
  cnhValidaAte: string | null;
  regiaoUf: string | null;
  status: string;
  cadastrado: boolean;
  ultimaLeituraEm: string | null;
}

export interface VeiculoCadastro {
  id: string;
  placa: string | null;
  tipo: string;
  modelo: string | null;
  anoFabricacao: number | null;
  capacidadePassageiros: number | null;
  ativo: boolean;
  dispositivoId: string | null;
  cameraCodigo: string | null;
  deviceId: string | null;
  cameraStatus: string | null;
  ultimoContatoEm: string | null;
  cameraDesde: string | null;
}

export interface DispositivoCadastro {
  id: string;
  deviceId: string;
  codigo: string | null;
  descricao: string | null;
  status: string;
  ultimoContatoEm: string | null;
  pendente: boolean;
  veiculoId: string | null;
  placa: string | null;
  veiculoTipo: string | null;
  vinculadoDesde: string | null;
  ultimoMotoristaCodigo: string | null;
  ultimoMotoristaNome: string | null;
}

export interface Vinculo {
  id: string;
  inicio: string;
  fim: string | null;
  motivo: string | null;
  veiculoId: string;
  placa: string | null;
  tipo: string;
}

export interface RotaCadastro {
  id: string;
  nome: string | null;
  origemCidade: string;
  origemUf: string;
  destinoCidade: string;
  destinoUf: string;
  brs: string[];
  ufsPercorridas: string[];
  distanciaKm: number | null;
  ativo: boolean;
  viagens: number;
}

export interface ViagemCadastro {
  id: string;
  status: string;
  partidaPrevista: string;
  chegadaPrevista: string | null;
  partidaReal: string | null;
  chegadaReal: string | null;
  valorViagem: number | null;
  rotaId: string;
  rota: string;
  veiculoId: string;
  placa: string | null;
  motoristaId: string | null;
  motoristaCodigo: string | null;
  motoristaNome: string | null;
  turnos: number;
}

export interface UsuarioDashboard {
  username: string;
  email: string;
  nome: string;
  papel: "admin" | "gestor" | "operador" | null;
  ativo: boolean;
  status: string;
  criadoEm: string | null;
}
