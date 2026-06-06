@AGENTS.md
# Direção visual obrigatória

Este projeto não deve usar estética genérica de IA.

Evite completamente:
- Glassmorphism
- Gradientes decorativos
- Cards excessivamente arredondados
- Sombras em excesso
- Textos institucionais vagos
- Layouts com muitos blocos competindo
- Dashboards fake com métricas soltas
- Componentes grandes para pouca informação

Prefira:
- Interface SaaS B2B madura
- Fundo neutro
- Bordas sutis
- Radius moderado
- Tipografia sóbria
- Hierarquia clara
- Informação operacional real
- Menos efeitos visuais
- Mais densidade útil
- Microcopy objetiva

Antes de finalizar qualquer tela, pergunte:
1. Esta tela parece um template de IA?
2. Existe algum card decorativo?
3. Existe texto genérico?
4. A informação principal está clara em 3 segundos?
5. Um usuário real da clínica conseguiria operar essa tela sem explicação?

Se qualquer resposta for negativa, refatore antes de entregar.

# Regra de layout operacional

Em dashboards administrativos, nunca distribuir seções igualmente apenas para preencher espaço.

A tela deve ter prioridade visual clara:
1. Header compacto
2. Métricas principais
3. Área operacional principal
4. Área lateral de suporte
5. Informações secundárias

Botões não podem ficar soltos.
Títulos não podem ser duplicados.
Cards não podem ocupar espaço desproporcional ao conteúdo.
Se duas seções não têm a mesma importância, elas não devem ter a mesma largura.

Para dashboard de clínica:
- Agenda é prioridade
- Consultas e pendências vêm em seguida
- Pacientes recentes são apoio
- Financeiro é resumo, não centro da tela

# Regras obrigatórias de espaçamento

Toda tela administrativa deve ter respiro visual.

## Container principal
- O conteúdo nunca pode encostar na sidebar.
- Usar padding horizontal mínimo de 32px no desktop.
- Usar padding vertical mínimo de 24px.
- Usar max-width entre 1280px e 1440px quando fizer sentido.

## Espaçamento entre blocos
- Header para métricas: 24px
- Métricas para conteúdo principal: 24px
- Entre colunas principais: 24px
- Entre cards laterais: 16px
- Dentro de cards: 20px ou 24px

## Proibições
- Não colar cards uns nos outros.
- Não colar conteúdo na sidebar.
- Não usar botões grudados na borda.
- Não colocar filtros imediatamente abaixo do título sem respiro.
- Não usar padding menor que 16px em cards.
- Não usar layout com aparência de planilha grudada.

## Regra de revisão
Antes de finalizar qualquer tela, verificar:
- A tela respira?
- Os blocos têm separação clara?
- Existe padding consistente?
- Existe gap entre colunas?
- Os componentes parecem intencionais ou apenas encaixados?