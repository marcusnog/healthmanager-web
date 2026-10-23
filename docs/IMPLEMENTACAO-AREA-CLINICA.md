# Área clínica — implementação

## Escopo confirmado

Implementação derivada de `REFERENCIAS-AREA-CLINICA.md`. Assinatura digital permanece **simulada**, a pedido do usuário. **Percentis, telemedicina, transcrição e IA foram retirados** do escopo atual. Os atalhos genéricos de Marketing/Busca/Perfil do protótipo eram hipóteses sobre a navegação do outro sistema, não novos módulos clínicos: preserva-se a navegação real do HealthManager.

## Uso

1. Admin ou médico abre **Cadastro de receituários** na sidebar para modelos de documentos, ou **Config. clínicas** para os demais cadastros.
2. Escolhe documentos, exames, alimentos, anamnese ou questionários. Cria título, pasta, conteúdo e campos; modelos pessoais são exclusivos do médico autenticado. Admin e médicos gerenciam modelos compartilhados.
3. Campos podem ter tipo texto, número ou sim/não, unidade, obrigatoriedade, valor padrão e limites de entrada. Campos numéricos podem receber faixas de alerta; números e booleanos podem ter pesos. Esses critérios são definidos pela clínica, não vêm de uma base médica presumida.
4. Na agenda, seleciona a consulta e usa **Abrir prontuário**. O atalho também está na lista de consultas.
5. Abre a evolução para criar/salvar o rascunho. A partir dele, registra documentos, solicitações/resultados de exames, respostas de formulários, planejamento alimentar ou resumo clínico.
6. No documento, escolhe assinatura manual ou **Digital — simulação**. Depois de salvar, visualiza e imprime/salva PDF pelo navegador. O mock recebe identificação explícita, inclusive no papel.
7. Consulta histórico paginado, busca na página, resumo mais recente, evoluções e adendos. Anexa e baixa arquivos do paciente.
8. Correções geram novos registros vinculados ao anterior. Após finalizar o prontuário, novos registros ficam bloqueados; correções usam adendos. A conclusão do agendamento continua separada.

## Persistência e acesso

- Backend: `ClinicalCatalogItem` e `ClinicalEntry`, migração `ClinicalWorkspace`, filtros de clínica e exclusão lógica dos modelos.
- Novo screen grant `clinical-settings`: Admin e Doctor. Perfis com telas explicitamente selecionadas precisam receber essa tela no gerenciamento de usuários.
- Modelo pessoal pertence ao usuário médico; não é exibido a outros usuários, inclusive Admin. Quando um documento é emitido, sua cópia entra no histórico clínico e segue as permissões do prontuário.
- Entradas clínicas são imutáveis e guardam conteúdo, respostas, definição dos campos, médico/CRM, paciente e clínica. Alterar ou excluir modelos não altera o histórico.
- Médico lê/escreve apenas seus atendimentos. Admin/Recepção têm leitura; gravação é do médico responsável com prontuário em rascunho.
- Controle de concorrência dos modelos por revisão; registro clínico participa da concorrência com finalização. Identificador de requisição evita duplicação em retentativas.
- Nenhum dado clínico é enviado a serviços externos de IA, assinatura ou vídeo.

## Limites explícitos

- Editor de conteúdo em texto simples, com quebras de linha e variáveis. Não importa HTML nem oferece editor rico ou upload de logo no modelo.
- Pastas são agrupamentos nomeados nos cadastros; não há pastas vazias independentes.
- Cada solicitação/resultado/plano é um registro, podendo usar um cadastro e seus campos. Não há interoperabilidade com laboratórios, tabela nutricional externa ou prescrição eletrônica regulada.
- Pontuação é soma dos valores respondidos vezes seus pesos; sim = 1 e não = 0. Alertas são comparações com faixas cadastradas. Não há diagnóstico automático nem instrumentos clínicos pré-validados.
- Catálogo retorna até 500 itens com busca; histórico é paginado em 50 entradas. Busca do histórico é na página visível.
- Impressão usa a cópia persistida e os dados de identificação registrados. A assinatura mockada nunca equivale a assinatura digital real.

## Validação e execução

- Backend: testes em `ClinicalWorkspaceEndpointsTests` cobrem modelos pessoais, isolamento entre clínicas/médicos, concorrência, snapshots, idempotência, bloqueio após finalização, validação de campos e módulos excluídos.
- Frontend: testes dos módulos clínicos cobrem emissão, mock, impressão, acesso somente leitura, modelos pessoais e pontuação explícita.
- E2E: `tests/e2e-real/clinical-workspace.spec.ts` usa a API local com dados seed e percorre cadastro → agenda → documento. Execute com `npx playwright test --config playwright.real.config.ts tests/e2e-real/clinical-workspace.spec.ts`; no Windows com Edge instalado, defina `PLAYWRIGHT_CHANNEL=msedge`.
- O deploy do backend aplica a migração pelo mecanismo existente; o CI verifica o snapshot EF antes da publicação. Publicar o backend antes do frontend.

## Cadastro de receituários

Acesso próprio na sidebar, em Cadastros. Filtre pela pasta e use Novo receituário; a pasta selecionada vem preenchida. Escolha uma pasta existente ou digite um novo nome. Para mover um modelo, edite sua pasta. Os demais cadastros permanecem em Config. clínicas. O acesso reutiliza a permissão clinical-settings. Pastas são salvas com seus documentos, sem pastas vazias independentes.

O cadastro de receituários usa dois painéis: pastas e modelos à esquerda, receituário editável à direita. Clique no título para abrir, ou em Novo nesta pasta para criar. Alterar a seleção com edições pendentes pede confirmação. Em telas pequenas, os painéis ficam empilhados.

## Acesso ao prontuário

Na agenda, clique com o botão direito sobre a consulta para abrir as opções: mudar status, editar agendamento, abrir prontuário e consultar ficha cadastral. O clique normal continua disponível para editar a consulta e acessar o prontuário. Na aba Pacientes, use Prontuarios e selecione Abrir prontuário no atendimento existente. A escrita continua exclusiva do médico responsável; acesso pela tela de pacientes não libera alterações na agenda nem administração dos modelos.

## Área central do prontuário

Histórico, resumo, evoluções, documentos e arquivos ficam em subdivisões centrais. Abrir a evolução ou um novo documento mantém o histórico na mesma tela. Arquivos podem ser enviados e consultados na seção Arquivos do paciente. Os editores de modelos e de receitas oferecem cabeçalhos que inserem títulos na posição do cursor, preservando o texto. O formato continua sendo texto simples, com quebras de linha preservadas na impressão. O histórico segue paginado e restrito às permissões do profissional.

## Disposição confirmada do atendimento

No desktop, histórico completo acessível (resumo, arquivos, evoluções e documentos) fica à esquerda; seleção do tipo e digitação ficam à direita. Salvar atualiza o histórico sem sair da tela. Em telas pequenas os painéis ficam empilhados. Esta disposição substitui a organização anterior em uma coluna central.

As opções Receituário, Exames, Imagens e anexos e demais registros ficam na barra inferior do atendimento, separada da rolagem do histórico e do editor.

## Revisão antes da publicação

Trocar de tipo de registro ou fechar o atendimento com uma receita pendente pede confirmação, inclusive ao usar Esc. Durante a gravação, os campos e a troca de registro ficam bloqueados. Modelos continuam com controle de revisão e registros emitidos permanecem imutáveis.
