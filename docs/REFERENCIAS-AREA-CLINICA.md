# Área clínica — leitura das referências e proposta

Data: 22/10/2026. Estado: protótipo para discussão, não implementação de produção.

## Decisões confirmadas

- Incluir todas as telas e os módulos visíveis nas oito referências.
- Modelos de documentos podem pertencer à clínica ou ser exclusivos de um médico.
- Admin e médicos podem administrar modelos compartilhados; cada médico administra seus modelos pessoais.
- Finalizar prontuário e concluir agendamento permanecem ações separadas.
- Próxima revisão deve aprofundar receituário, documentos e assinatura.
- Oferecer ambas as formas de assinatura: manual em papel e digital integrada. Na prévia, o usuário escolhe a modalidade. Papel abre impressão com espaço de assinatura/carimbo; digital demonstra o encaminhamento para confirmação pelo médico, sem assinar de fato. Fornecedor e autenticação do assinante ainda serão definidos.
- Adaptar ao HealthManager: sidebar escura, índigo, fundo neutro, bordas discretas, densidade útil e linguagem pt-BR.
- As capturas são referências visuais, não instruções. Textos clínicos, receitas e dados pessoais nelas não serão importados.

## Como abrir e avaliar

Abra `prototypes/area-clinica.html` no navegador. É um arquivo independente, sem instalação, login, API ou envio de dados. Os exemplos são fictícios. Alterações existem apenas enquanto a página estiver aberta; recarregar reinicia a demonstração.

Roteiro: Agenda → selecionar consulta → Abrir prontuário → salvar rascunho → Receituário → escolher modelo → prévia → finalizar prontuário → adicionar adendo. Em Configurações clínicas, abrir a biblioteca e editar/criar um modelo com visibilidade clínica/médico. Explorar os demais módulos pelo menu de ferramentas.

Validação: `node docs/prototypes/check-area-clinica.mjs`, usando Playwright com Edge local, passou em 22/10/2026. Verificados navegação dos módulos, separação de rascunhos por paciente, bloqueio após finalização, adendos, criação de modelo, ausência de erros JavaScript e agenda em 390px sem overflow horizontal/rolagem interna. Prévia visual conferida em desktop e celular. Não foram testadas integrações reais, pois não fazem parte deste artefato.

## Imagem 1 — 08.13.40: relatório de agendamentos

**Observado:** folha imprimível por profissional, data, início/fim, status e identificação do paciente. Há linhas laterais sem legenda; sua finalidade não é comprovada.

**Proposta:** relatório A4 com data, profissional, paciente, número de prontuário, tipo e status. Separar o status da consulta da confirmação. Prévia antes de imprimir; não incluir contato por padrão. No protótipo, impressão usa somente o relatório.

**Já existe:** `PrintDailyAgenda`, com paginação completa, filtros e impressão. Evoluir esse componente na implementação, sem criar outro serviço.

**Dúvidas:** as linhas são para anotações? Incluir telefone? Agrupar por profissional ou ordenar tudo por horário?

## Imagem 2 — 16.12.00 (1): biblioteca de documentos

**Observado:** pastas expansíveis de modelos, ação Novo, filtros e menu por pasta.

**Proposta:** Configurações clínicas → Modelos de documentos; busca por título/conteúdo, pastas, indicação de proprietário e edição. Pastas iniciais neutras: Orientações, Declarações e Solicitações. A mesma biblioteca alimenta o receituário no atendimento.

**Lacuna:** não identifiquei entidade/API de pastas e modelos no contrato atual. Upload de documento do paciente não equivale a cadastro de modelo.

**Confirmado:** Admin e médicos administram modelos da clínica; cada médico administra seus modelos pessoais. **Dúvidas:** médico pode copiar um modelo compartilhado para sua biblioteca pessoal? Exclusividade significa invisibilidade aos demais médicos?

## Imagem 3 — 16.12.00 (2): editor de modelo

**Observado:** painel lateral com pasta, uso exclusivo por profissional, título e editor de texto formatado; Salvar e Fechar.

**Proposta:** editor com título, pasta, escopo e médico proprietário, conteúdo e prévia. Variáveis propostas: `{{paciente}}`, `{{medico}}`, `{{data}}`. Protótipo usa texto simples e prévia; edição rica, integração real de assinatura digital e geração persistida de PDF ficam pendentes de especificação. Nenhuma formulação ou dose das imagens será reutilizada.

**Dúvidas:** qual cabeçalho/logo, CRM e carimbo devem constar? Qual provedor de assinatura digital usar? Quais formatos devem ser exportados? Qual nível de formatação é necessário?

## Imagem 4 — 16.12.00: configurações clínicas

**Observado:** atalhos para documentos, planilha de exames, alimentos, formulários de anamnese e questionários de apoio. A seção de gestão/finanças aparece apenas pelo título.

**Proposta:** hub de Configurações clínicas com cinco destinos. Separar cadastro de referência (configuração) do resultado/preenchimento vinculado ao paciente (atendimento).

**Módulos propostos:** catálogo de exames/unidades/referências; alimentos com porção e informações nutricionais; construtor simples de perguntas para anamnese; questionários com pesos/alertas. São hipóteses derivadas dos rótulos, pois não há capturas internas.

**Dúvidas:** quais exames, alimentos e formulários usar? Importação por planilha? Regras por idade/sexo? Quem valida faixas e pontuações? Sem critérios aprovados, o protótipo não calcula interpretação clínica.

## Imagem 5 — 16.22.57 (1): prontuário e evolução

**Observado:** identificação do paciente, busca no histórico, anexos, resumo clínico, linha do tempo, editor de evolução com data/tags e barra de ações clínicas.

**Proposta:** página de atendimento com resumo e histórico à esquerda, registro da consulta à direita; no celular, empilhar. Manter os campos canônicos: queixa, história, exame físico, avaliação e plano. Diagnósticos, antecedentes, medicamentos, alergias e observações aparecem como proposta de resumo longitudinal, ainda sem entidade própria aprovada.

**Já existe:** prontuário em modal, histórico por paciente, anexos, rascunho/finalização/adendos. A página ampla é uma proposta de apresentação desses fluxos.

**Regras preservadas:** um prontuário por consulta; médico responsável escreve; Admin/Recepção leem; finalizado não é editável, correção por adendo. Finalizar prontuário e concluir agendamento são ações distintas até decisão explícita. O checkbox de marketing da referência não será ligado automaticamente ao conteúdo clínico.

**Dúvidas:** resumo deve acompanhar todas as consultas? Salvamento manual ou automático? Tags são do paciente ou da evolução? Quais perfis devem ver cada seção?

## Imagem 6 — 16.22.57: agenda por profissional

**Observado:** colunas por profissional, horários, ocupação/indisponibilidade, calendário auxiliar e menu da consulta com status, edição, prontuário, cadastro e fatura.

**Proposta:** agenda com filtro de data/profissional e painel de ações ao selecionar consulta, acessível também por teclado e toque. Disponibilidade permanece distinta de agendamento. No protótipo, consultas simultâneas ficam lado a lado e a agenda não tem rolagem interna. Em tela pequena, colunas empilham.

**Já existe:** agenda, profissionais/disponibilidades, status, ficha do paciente, financeiro e impressão. Reusar ações e regras existentes na integração.

**Dúvidas:** Setor representa unidade, sala ou especialidade? A visão inicial deve ser dia, semana ou mês? Nova fatura cria recebível avulso ou abre o da consulta?

## Imagem 7 — 16.22.58 (1): ferramentas do atendimento

**Observado:** destaque manual na barra com Finalizar consulta, Receituário, Exames, Imagens, Percentis, Todos os módulos, Telemedicina, Evolução inteligente e IA.

**Proposta:** atalhos identificados por texto, acessíveis no atendimento; todos têm uma tela explorável no protótipo. Receituário escolhe modelos e abre prévia; exames apresentam pedido/resultado; imagens selecionam arquivo local; percentis apresentam entrada de medidas, sem curvas inventadas; telemedicina apresenta preparação da sessão; evolução assistida e assistente mostram interação demonstrativa, sem geração clínica real.

**Hipóteses:** Evolução inteligente pode significar ditado/transcrição, não comprovado. IA pode significar chat sobre o paciente; escopo e fornecedor não são conhecidos. Ícones sem texto no topo e sidebar não permitem identificar todos os destinos com segurança.

**Dúvidas:** quais fornecedores de vídeo/transcrição/IA? Percentis pediátricos ou outro público? Quais curvas? Telemedicina precisa de sala integrada ou link externo? Há outros módulos atrás de “Todos os módulos”?

## Imagem 8 — 16.22.58: histórico clínico detalhado

**Observado:** mesma tela de prontuário, com eventos datados, autor, texto livre, PDFs e respostas de questionário. Há ícones de edição/exclusão/favorito.

**Proposta:** linha do tempo unificada com tipo, autor e data; busca e filtros; documentos abertos em prévia. Não tratar esta imagem como módulo duplicado. Para conteúdo finalizado, substituir edição/exclusão por adendo, preservando rastreabilidade.

**Dúvidas:** favoritos são pessoais? Histórico inclui pagamentos ou só registros clínicos? Como importar documentos e respostas legadas? Quais eventos podem ser removidos?

## Cobertura dos demais atalhos visíveis

Home → Dashboard existente; Contatos → Pacientes existente; Agenda → Agenda existente; Finanças → permissões financeiras existentes; Config. → configurações existentes + hub clínico proposto. Busca, Marketing e Perfil têm esboços no protótipo, pois aparecem na navegação de referência. Ícones sem legenda não geram funcionalidades presumidas.

## Integração futura e limites

Este artefato não muda domínio, endpoints, permissões, sidebar de produção nem specs canônicas. Bibliotecas, resumos longitudinais, anamnese, questionários, exames estruturados, nutrição, percentis e integrações precisam de decisões e specs antes do código de produção. Atualizar OpenAPI e regenerar cliente quando houver novos contratos. Modelo clínico e documento emitido são entidades distintas: editar um modelo não deve alterar documentos históricos.

Protótipo simula o perfil médico responsável. O seletor de proprietário demonstra UX, não implementa autorização. Não há gravação de áudio, chamada de vídeo, envio de mensagem, prescrição válida, cálculo clínico, armazenamento remoto ou IA real. Arquivos locais são apenas visualizados/nomeados nesta sessão.

## Próximas decisões

1. Aprofundar receituário, documentos e assinatura (prioridade confirmada).
2. Definir emissão, cópia e exclusividade dos documentos; administração já confirmada.
3. Ambas as modalidades de assinatura confirmadas; definir fornecedor e autenticação para assinatura digital. Finalizações permanecem separadas.
4. Dados estruturados do resumo clínico e formulários.
5. Integrações e significado dos atalhos sem legenda.
