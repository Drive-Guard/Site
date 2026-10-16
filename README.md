# Site — Dashboard DriveGuard

Dashboard de monitoramento de fadiga da frota (React + Vite + Tailwind + Recharts),
em `driveguard-codigo/`. É uma SPA estática: lê a API do
[Backend](https://github.com/Drive-Guard/Backend) e faz login no Amazon Cognito.

## Telas e papéis

| Aba | Papéis | O que mostra |
|---|---|---|
| Visão Gerencial | admin, gestor | KPIs do período, impacto estimado (ROI com fontes), evolução da fadiga, rotas com maior incidência, base comparativa da PRF (faixa horária, causas, mapa) e insights |
| Monitoramento | todos | Motoristas em risco agora, alertas recentes (reconhecer/resolver), tendência no turno, heatmap dos últimos 7 dias com calendário, fadiga × tempo de direção |
| Motoristas | todos | Lista ao vivo, curva do turno contra a média da frota, insights e ações rápidas (pausa, contato, ocorrência) |
| Relatórios | admin, gestor | Resumo do período com filtros, PDF/Excel/CSV, histórico e agendamento por e-mail |
| Cadastros | admin, gestor | Câmeras e veículos (associação e troca), motoristas, rotas, viagens, parâmetros do ROI, empresa |
| Usuários | admin | Usuários da empresa no Cognito |

Números da base nacional aparecem sempre com o selo **Fonte: PRF**. O alerta sonoro
acontece na cabine, no dispositivo; a dashboard registra a resposta da central.

## Rodar localmente

Com o Backend rodando em modo de desenvolvimento (`npm run db:local` e
`npm run dev:api` no repositório Backend):

```bash
cd driveguard-codigo
npm install
npm run dev        # http://localhost:8080, login de desenvolvimento (escolha o papel)
```

`public/config.json` aponta para `http://localhost:3001` com `"auth": "dev"`.
Em produção o `config.json` é gerado pelo Terraform (URL da API e IDs do Cognito)
e o mesmo build serve em qualquer ambiente.

## Publicar

```bash
npm run build                                   # dist/
../../Infra/scripts/publicar_site.ps1 -SemBuild # envia para o S3; a EC2 pega em até 1 minuto
```
