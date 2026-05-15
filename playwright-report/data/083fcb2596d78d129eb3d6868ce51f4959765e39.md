# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crm-workspace.spec.ts >> CRM workspace >> allows logout and login as secretaria through the mocked auth endpoint
- Location: tests\e2e\crm-workspace.spec.ts:28:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Sessao bloqueada')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Sessao bloqueada')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: HM
        - generic [ref=e7]:
          - paragraph [ref=e8]: Clinica Aurora
          - paragraph [ref=e9]: CRM Medico
      - generic [ref=e10]:
        - generic [ref=e11]:
          - paragraph [ref=e12]: Hoje
          - paragraph [ref=e13]: 21 at.
          - paragraph [ref=e14]: consultas
        - generic [ref=e15]:
          - paragraph [ref=e16]: Confirm.
          - paragraph [ref=e17]: 16 conf.
          - paragraph [ref=e18]: pacientes
    - navigation [ref=e19]:
      - button "Dashboard Visao completa" [ref=e20] [cursor=pointer]:
        - img [ref=e21]
        - generic [ref=e26]:
          - generic [ref=e27]: Dashboard
          - generic [ref=e28]: Visao completa
      - button "Agenda Consultas e confirmacoes" [ref=e29] [cursor=pointer]:
        - img [ref=e30]
        - generic [ref=e33]:
          - generic [ref=e34]: Agenda
          - generic [ref=e35]: Consultas e confirmacoes
      - button "Pacientes Cadastro e documentos" [ref=e36] [cursor=pointer]:
        - img [ref=e37]
        - generic [ref=e41]:
          - generic [ref=e42]: Pacientes
          - generic [ref=e43]: Cadastro e documentos
      - button "Financeiro Recebiveis e caixa" [ref=e44] [cursor=pointer]:
        - img [ref=e45]
        - generic [ref=e48]:
          - generic [ref=e49]: Financeiro
          - generic [ref=e50]: Recebiveis e caixa
      - button "Medicos Equipe e agenda" [ref=e51] [cursor=pointer]:
        - img [ref=e52]
        - generic [ref=e55]:
          - generic [ref=e56]: Medicos
          - generic [ref=e57]: Equipe e agenda
      - button "Config Estrutura operacional" [ref=e58] [cursor=pointer]:
        - img [ref=e59]
        - generic [ref=e62]:
          - generic [ref=e63]: Config
          - generic [ref=e64]: Estrutura operacional
    - generic [ref=e65]:
      - generic [ref=e66]:
        - generic "Camila Rocha" [ref=e67]: CR
        - generic [ref=e68]:
          - paragraph [ref=e69]: Camila Rocha
          - paragraph [ref=e70]: Admin
      - button "Encerrar sessao" [active] [ref=e71] [cursor=pointer]
  - generic [ref=e72]:
    - banner [ref=e73]:
      - generic [ref=e74]:
        - button "Menu" [ref=e75] [cursor=pointer]:
          - img [ref=e76]
        - generic [ref=e78]:
          - paragraph [ref=e79]: Visao geral
          - heading "Painel operacional" [level=1] [ref=e80]
          - paragraph [ref=e81]: Panorama completo do tenant
      - generic [ref=e82]:
        - generic [ref=e83]:
          - generic [ref=e84]: Modulo
          - generic [ref=e85]: Operacao do dia
        - generic [ref=e86]:
          - generic [ref=e87]: Tenant
          - generic [ref=e88]: Clinica Aurora
        - generic [ref=e90]: quinta-feira, 7 de maio
    - main [ref=e91]:
      - generic [ref=e92]:
        - generic [ref=e93]:
          - generic [ref=e94]:
            - generic [ref=e95]:
              - generic [ref=e97]: Visao geral
              - generic [ref=e99]: Multi-tenant
              - generic [ref=e101]: pt-BR
            - heading "Operacao do dia" [level=1] [ref=e102]
            - heading "Visao do dia para secretaria e gestao da clinica." [level=2] [ref=e103]
            - paragraph [ref=e104]: 16 confirmadas, 1 canceladas e 5% de no-show estimado para o dia.
            - generic [ref=e105]:
              - paragraph [ref=e106]: Leitura operacional
              - paragraph [ref=e107]: A agenda segue com 21 atendimentos previstos e 81% de taxa de confirmacao, mantendo recepcao, caixa e equipe na mesma cadencia.
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e111]: Atendimento
              - strong [ref=e112]: 21 previstos
            - generic [ref=e113]:
              - generic [ref=e114]: Receita mensal
              - strong [ref=e115]: R$ 45.120,50
            - generic [ref=e116]:
              - generic [ref=e117]: Equipe ativa
              - strong [ref=e118]: 1 medico
        - generic [ref=e119]:
          - generic [ref=e120]:
            - generic [ref=e121]:
              - paragraph [ref=e122]: Consultas do dia
              - img [ref=e124]
            - paragraph [ref=e127]: "21"
            - paragraph [ref=e128]: 1 canceladas
          - generic [ref=e129]:
            - generic [ref=e130]:
              - paragraph [ref=e131]: Confirmadas
              - img [ref=e133]
            - paragraph [ref=e135]: "16"
            - paragraph [ref=e136]: 81% de confirmacao
          - generic [ref=e137]:
            - generic [ref=e138]:
              - paragraph [ref=e139]: Faturamento mensal
              - img [ref=e141]
            - paragraph [ref=e143]: R$ 45.120,50
            - paragraph [ref=e144]: receita acumulada
          - generic [ref=e145]:
            - generic [ref=e146]:
              - paragraph [ref=e147]: Taxa de confirmacao
              - img [ref=e149]
            - paragraph [ref=e152]: 81%
            - paragraph [ref=e153]: engajamento da agenda
        - generic [ref=e154]:
          - generic [ref=e155]:
            - generic [ref=e156]:
              - generic [ref=e157]:
                - paragraph [ref=e158]: Pacientes
                - heading "Cadastro, busca rapida e historico inicial" [level=3] [ref=e159]
                - paragraph [ref=e160]: Organize recepcao, convenio, observacoes clinicas e documentos sem tirar o foco da equipe da operacao do dia.
              - generic [ref=e161]:
                - paragraph [ref=e162]: Contexto
                - paragraph [ref=e163]: 1 paciente listado nesta visao.
                - button "Novo paciente" [ref=e164] [cursor=pointer]
            - generic [ref=e166]:
              - generic [ref=e167]:
                - text: Busca rapida
                - textbox "Busca rapida" [ref=e168]:
                  - /placeholder: Buscar por nome, CPF ou telefone
              - generic [ref=e169]:
                - button "Pagina anterior" [disabled] [ref=e170]
                - generic [ref=e171]: Pagina 1 de 1
                - button "Proxima pagina" [disabled] [ref=e172]
            - article [ref=e174]:
              - generic [ref=e175]:
                - generic [ref=e176]:
                  - heading "Marina Souza" [level=4] [ref=e177]
                  - generic [ref=e178]:
                    - generic [ref=e179]: CPF 12345678901
                    - generic [ref=e180]: (11) 98888-0000
                    - generic [ref=e181]: marina@email.com
                - generic [ref=e182]: ParticularPaciente novo
              - generic [ref=e184]:
                - button "Editar cadastro" [ref=e185] [cursor=pointer]
                - button "Documentos" [ref=e186] [cursor=pointer]
          - generic [ref=e187]:
            - generic [ref=e188]:
              - generic [ref=e189]:
                - paragraph [ref=e190]: Agenda inteligente
                - heading "Consultas do dia" [level=3] [ref=e191]
                - paragraph [ref=e192]: Navegue por data, agende encaixes e confirme retornos sem perder a leitura visual do ritmo da clinica.
              - generic [ref=e193]:
                - paragraph [ref=e194]: Leitura do dia
                - paragraph [ref=e195]: 1 consulta para a data selecionada.
                - button "Agendar consulta" [ref=e196] [cursor=pointer]
            - generic [ref=e198]:
              - generic [ref=e199]:
                - text: Data da agenda
                - textbox "Data da agenda" [ref=e200]: 2026-05-07
              - generic [ref=e201]:
                - button "Dia anterior" [ref=e202] [cursor=pointer]
                - button "Hoje" [disabled] [ref=e203]
                - button "Proximo dia" [ref=e204] [cursor=pointer]
            - article [ref=e206]:
              - generic [ref=e207]:
                - generic [ref=e208]:
                  - generic "Marina Souza" [ref=e209]: MS
                  - generic [ref=e210]:
                    - 'heading "Paciente: Marina Souza" [level=4] [ref=e211]'
                    - generic [ref=e212]:
                      - generic [ref=e213]: Dra. Luciana Costa
                      - generic [ref=e214]: Dermatologia
                      - generic [ref=e215]: Primeira consulta
                - generic [ref=e216]: Scheduled
              - generic [ref=e217]:
                - generic [ref=e218]:
                  - paragraph [ref=e219]: Horario
                  - paragraph [ref=e220]: 08:00
                  - paragraph [ref=e221]: R$ 250,00
                - generic [ref=e222]:
                  - paragraph [ref=e223]: Observacoes
                  - paragraph [ref=e224]: Paciente novo
              - generic [ref=e225]:
                - button "Confirmar consulta" [ref=e226] [cursor=pointer]
                - button "Cancelar consulta" [ref=e227] [cursor=pointer]
        - generic [ref=e228]:
          - generic [ref=e229]:
            - generic [ref=e230]:
              - generic [ref=e231]:
                - paragraph [ref=e232]: Financeiro
                - heading "Contas a receber" [level=3] [ref=e233]
                - paragraph [ref=e234]: Acompanhe o caixa diario com clareza visual, recebimento parcial e status de cada recebivel sem sair da tela operacional.
              - generic [ref=e235]:
                - paragraph [ref=e236]: Resumo
                - paragraph [ref=e237]: 1 registro listado com filtro Todos.
            - generic [ref=e239]:
              - button "Todos" [ref=e240] [cursor=pointer]
              - button "Pendente" [ref=e241] [cursor=pointer]
              - button "Parcial" [ref=e242] [cursor=pointer]
              - button "Pago" [ref=e243] [cursor=pointer]
            - article [ref=e245]:
              - generic [ref=e246]:
                - generic [ref=e247]:
                  - generic [ref=e248]: Partial
                  - generic [ref=e250]: Venc. 06/05/2026
                - button "Registrar pagamento" [ref=e251] [cursor=pointer]
              - generic [ref=e252]:
                - generic [ref=e253]:
                  - generic [ref=e254]: Original
                  - generic [ref=e255]: R$ 250,00
                - generic [ref=e256]:
                  - generic [ref=e257]: Recebido
                  - generic [ref=e258]: R$ 100,00
                - generic [ref=e259]:
                  - generic [ref=e260]: Em aberto
                  - generic [ref=e261]: R$ 150,00
              - generic [ref=e263]:
                - paragraph [ref=e264]: Progresso de recebimento
                - generic [ref=e265]: 40%
          - generic [ref=e268]:
            - generic [ref=e269]:
              - generic [ref=e270]:
                - paragraph [ref=e271]: Equipe medica
                - heading "Medicos do tenant" [level=3] [ref=e272]
                - paragraph [ref=e273]: Cadastre especialidades, CRM e disponibilidade para manter a agenda consistente com a operacao real da clinica.
              - generic [ref=e274]:
                - paragraph [ref=e275]: Leitura rapida
                - paragraph [ref=e276]: 1 medico nesta lista operacional.
                - button "Novo medico" [ref=e277] [cursor=pointer]
            - article [ref=e279]:
              - generic [ref=e280]:
                - generic [ref=e281]:
                  - generic "Dra. Luciana Costa" [ref=e282]: DL
                  - generic [ref=e283]:
                    - heading "Dra. Luciana Costa" [level=4] [ref=e284]
                    - generic [ref=e285]:
                      - generic [ref=e286]: Dermatologia
                      - generic [ref=e287]: CRM-SP-987654
                    - generic [ref=e288]:
                      - generic [ref=e289]: luciana@clinica.com
                      - generic [ref=e290]: "11997776655"
                - generic [ref=e291]:
                  - generic [ref=e292]: Ativo
                  - button "Editar medico" [ref=e293] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { mockCrmApi } from "./fixtures/api-mocks";
  3  | 
  4  | test.describe("CRM workspace", () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await mockCrmApi(page);
  7  |   });
  8  | 
  9  |   test("renders the operational dashboard with mocked API data", async ({
  10 |     page,
  11 |   }) => {
  12 |     await page.goto("/");
  13 | 
  14 |     await expect(
  15 |       page.getByRole("heading", {
  16 |         name: "Visao do dia para secretaria e gestao da clinica.",
  17 |       }),
  18 |     ).toBeVisible();
  19 |     await expect(
  20 |       page.getByRole("heading", { name: "Marina Souza", exact: true }),
  21 |     ).toBeVisible();
  22 |     await expect(page.getByText("R$ 45.120,50").first()).toBeVisible();
  23 |     await expect(page.getByText("81%", { exact: true })).toBeVisible();
  24 |     await expect(page.getByText("Paciente novo").first()).toBeVisible();
  25 |     await expect(page.getByText("R$ 150,00")).toBeVisible();
  26 |   });
  27 | 
  28 |   test("allows logout and login as secretaria through the mocked auth endpoint", async ({
  29 |     page,
  30 |   }) => {
  31 |     await page.goto("/");
  32 |     await expect(
  33 |       page.getByRole("heading", { name: "Marina Souza", exact: true }),
  34 |     ).toBeVisible();
  35 | 
  36 |     await page.getByRole("button", { name: "Encerrar sessao" }).click();
  37 | 
> 38 |     await expect(page.getByText("Sessao bloqueada")).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  39 |     await expect(
  40 |       page.getByRole("button", { name: "Entrar no painel" }),
  41 |     ).toBeVisible();
  42 | 
  43 |     await page.getByLabel("Email").fill("secretaria@clinicaaurora.com");
  44 |     await page.getByLabel("Senha").fill("12345678");
  45 |     await page.getByLabel("Perfil").selectOption("Secretary");
  46 |     await page.getByRole("button", { name: "Entrar no painel" }).click();
  47 | 
  48 |     await expect(page.getByText("secretaria")).toBeVisible();
  49 |     await expect(page.getByText("Secretary")).toBeVisible();
  50 |     await expect(page.getByText("Clinica Aurora")).toBeVisible();
  51 |   });
  52 | });
  53 | 
```