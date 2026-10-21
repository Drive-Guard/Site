/**
 * Textos das dicas (ícone "i") de cada indicador e gráfico. Ficam juntos para
 * manter a linguagem igual entre as telas e facilitar a revisão.
 */

export const DICAS = {
  // ---------------------------------------------------------------- comuns
  emRiscoAgora:
    "Motoristas dirigindo agora (leitura nos últimos 30 min) cuja última leitura está no estado sonolento: score de fadiga a partir de 70. Clique para ver quem são.",
  dirigindoAgora: "Motoristas com leitura da câmera nos últimos 30 minutos. Clique para ver a lista.",
  fadigaMediaAgora: "Média do score de fadiga (0 a 100) na última leitura de cada motorista que está dirigindo agora.",
  alertas24h:
    "Alertas emitidos na cabine pela câmera nas últimas 24 horas, comparados com as 24 horas anteriores. Inclui sonolência, bocejo, microssono, cabeça baixa, distração e rosto fora da câmera.",
  score:
    "Score de fadiga (0 a 100) calculado pelo modelo na cabine: abaixo de 40 alerta, de 40 a 70 fadiga, a partir de 70 sonolento (gera alerta), a partir de 90 crítico.",

  // ---------------------------------------------------------------- gerencial
  fadigaMediaPeriodo:
    "Média de todas as leituras do período escolhido no filtro, comparada com o período anterior de mesmo tamanho. Clique para ver os motoristas pela média de 30 dias.",
  horarioCritico:
    "Janela de 2 horas que concentrou mais alertas no período. Clique para abrir os relatórios filtrados por essa faixa do dia.",
  acidentesFrota:
    "Acidentes da própria frota (não os da PRF) no período e no anterior, e os quase-acidentes (ocorrências sem acidente, como saída de faixa). Clique para ver os motoristas envolvidos.",
  roi:
    "Estimativa anual: acidentes por sono da frota × eficácia do alerta × cobertura de câmeras, valorizados pelo custo médio do IPEA corrigido pelo IPCA. Conservador usa a fração de sono registrada pela PRF; realista usa a fração do histórico da própria frota.",
  atendidos:
    "Alertas graves (alta ou crítica) dos últimos 30 dias que tiveram uma ação da central registrada: pausa, contato, troca de motorista ou encerramento do turno.",
  evolucaoFadiga:
    "Score médio diário da frota no período do filtro. A linha tracejada é o limite de alerta (70). A variação compara com o período anterior de mesmo tamanho.",
  rotas:
    "Rotas ordenadas pela fadiga média no período, com o total de alertas e a tendência contra o período anterior. O número da PRF são os acidentes por sono nas BRs da rota nos últimos 12 meses. Clique para ver os motoristas da rota.",
  basePrf:
    "Dados abertos da Polícia Rodoviária Federal: referência nacional, não dados da frota. Os últimos 12 meses carregados, só veículos pesados (caminhão e ônibus) ou todos.",
  prfFaixa: "Acidentes com a causa “condutor dormindo” por faixa do dia. A madrugada concentra a maior parte.",
  prfCausas: "Causas mais registradas pela PRF; “condutor dormindo” fica destacada para comparar com as demais.",
  prfMapa: "Municípios com mais acidentes por sono. O tamanho do ponto é o número de casos; a cor, a gravidade (mortes por acidente).",
  insights:
    "Recomendações geradas para o período do filtro: pela IA (Gemini), a partir dos números da frota sem nomes ou placas, ou por regras automáticas quando a IA não está disponível. Códigos como DRV-1013 abrem o motorista.",

  // ---------------------------------------------------------------- monitoramento
  telaAoVivo:
    "Esta tela mostra o agora: cada quadro tem a própria janela de tempo (indicada no subtítulo). Região e tipo de veículo continuam valendo.",
  motoristasRisco: "Quem está sonolento agora (score a partir de 70), do maior para o menor score. Clique para abrir o motorista.",
  alertasRecentes:
    "Alertas emitidos na cabine na janela escolhida (6 h, 24 h ou 30 dias). Em “Responder”, registre o que a central fez, quantas vezes precisar: falar com o motorista, pedir pausa, trocar o motorista ou encerrar o turno contam como alerta atendido (o indicador da Visão Gerencial e dos relatórios). “Não consegui falar” fica registrado e o alerta segue aguardando; “vou acompanhar” tira do aguardando sem contar como atendido; “falso alarme” sai da conta, com o motivo. Dá para anotar uma observação, aplicar aos outros alertas abertos do motorista e desfazer em até 15 minutos. Graves aguardando ficam destacados.",
  tendenciaTurno:
    "Score médio da frota em cada hora do turno (1ª hora, 2ª hora...), nos últimos 7 dias. Mostra a partir de que hora ao volante a fadiga passa do limite.",
  heatmap:
    "Cada célula cruza o tempo de direção (linhas) com o dia (colunas). Em “% sonolento”: percentual das leituras naquele trecho classificadas como sonolento. Em “score médio”: a média do score.",
  fadigaTempo:
    "Score médio por faixa de horas ao volante nos últimos 30 dias. O tamanho do ponto é o número de alertas emitidos naquela faixa; a área sombreada é a zona crítica (score acima de 70).",

  // ---------------------------------------------------------------- motoristas
  tendencia:
    "Seta: a última leitura comparada com a média das 5 leituras anteriores. Laranja para cima = a fadiga está subindo (mais de 1 ponto acima); verde para baixo = está caindo. Sem seta = estável.",
  filtroOcorrencia: "Motoristas com acidente ou ocorrência registrada no período do filtro da Visão Gerencial.",
  scoreMotorista: "Score de fadiga da última leitura do motorista (0 a 100).",
  tempoDirigindo: "Horas desde o início do turno atual (ou do último turno, se já terminou).",
  alertasHoje: "Alertas emitidos hoje para este motorista, e os graves dos últimos 30 dias.",
  media30d: "Média do score do motorista nos últimos 30 dias, comparada com a média da frota, e a posição dele no ranking de risco.",
  curvaTurno: "Score do motorista ao longo do turno atual (ou do último). O tracejado é a média da frota no mesmo período.",
  insightsMotorista: "Regras sobre o estado atual e os últimos 30 dias: fadiga acima do limite, turno longo, sinais de microssono, reincidência e acidentes recentes.",
  leiturasAgora:
    "O que a câmera do motorista mandou nos últimos 15 minutos, leitura a leitura (uma por segundo no veículo), atualizando a cada 5 s. A linha cheia é o score de fadiga; a tracejada, a porcentagem do tempo com olhos fechados (PERCLOS). As linhas vermelhas verticais são os alertas emitidos na cabine.",
  acoesRapidas:
    "O que a central fez com o motorista, com as mesmas opções da resposta a um alerta. Se há um alerta aguardando (das últimas 2 h), a ação responde a ele: falar com ele, mandar parar e descansar, outro motorista assumir ou parar de dirigir hoje contam como alerta atendido. Treinamento e advertência ficam só no histórico do motorista. Dá para desfazer em até 15 minutos.",
  ocorrenciasMotorista: "Acidentes e ocorrências da própria frota registrados para este motorista, com o contexto do momento.",
  janelaTurnos:
    "“Agora” é a frota em tempo real. As outras opções mostram os turnos que começaram no intervalo escolhido, já encerrados ou não, com o pico e a média de fadiga de cada um.",
  picoFadiga: "O maior score de fadiga em uma hora de turno, no intervalo. É o que define a cor do risco nesta visão.",
  mediaPeriodo: "Score médio de todas as leituras dos turnos do intervalo.",
  horasPeriodo: "Soma das horas dos turnos que começaram no intervalo.",
  alertasPeriodo: "Alertas emitidos nos turnos do intervalo, e quantos foram de gravidade alta ou crítica.",
  turnosPeriodo: "Turnos que começaram no intervalo. Clique em um para ver a curva de fadiga dele.",

  // ---------------------------------------------------------------- relatórios
  relatorioAlertas: "Alertas no período e filtros escolhidos; atendidos = graves com ação da central registrada.",
  relatorioEconomia: "Custo evitado estimado (cenário conservador) proporcional aos dias do período.",
  resumoInteligente: "Resumo do período: da IA quando há uma análise recente para o mesmo período, ou calculado na hora a partir dos números.",
} as const;
