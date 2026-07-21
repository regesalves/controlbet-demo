# Roadmap Mobile - Versão 1.1

## Objetivo

Definir a estratégia oficial para adaptação da área autenticada ao mobile na versão 1.1 do ControlBet.

Este documento serve como base de planejamento para a evolução da navegação e da estrutura do shell autenticado, preservando a experiência desktop já consolidada e preparando a interface para uso fluido em telas menores.

## Situação Atual

O estado atual da aplicação pode ser resumido da seguinte forma:

- As páginas públicas já possuem boa adaptação para mobile.
- A área de Configurações está adequada ao uso em dispositivos móveis.
- Cadastro e Relatórios necessitam apenas de pequenos ajustes de layout e comportamento.
- Dashboard, Bilhetes e Movimentações exigem redesign estrutural para mobile devido ao shell desktop atual.

## Diagnóstico Técnico

O principal problema da experiência mobile não é apenas CSS responsivo.

O ponto central está no acoplamento entre:

- navegação;
- shell;
- estado da interface;
- renderização das páginas.

Isso faz com que a adaptação para mobile exija uma reorganização arquitetural, e não somente ajustes visuais pontuais.

## Estratégia Arquitetural

A versão 1.1 deverá seguir os seguintes princípios:

- separar navegação da lógica de negócio;
- centralizar a configuração das rotas;
- desacoplar o shell autenticado;
- reutilizar os componentes existentes sempre que possível;
- evitar duplicação de lógica entre desktop e mobile.

O objetivo é criar uma base de interface mais previsível, escalável e fácil de manter durante a evolução da aplicação.

## Estratégia de Navegação

A arquitetura recomendada para mobile é a seguinte:

- Bottom Navigation no mobile;
- Drawer ou Bottom Sheet para itens secundários;
- Sidebar recolhível em tablets;
- Sidebar fixa apenas no desktop.

Essa abordagem preserva a hierarquia de navegação, reduz a complexidade visual em telas pequenas e mantém o acesso rápido aos fluxos principais.

## Ordem de Implementação

A prioridade sugerida para a versão 1.1 é:

1. Centralizar configuração da navegação.
2. Migrar a navegação para um modelo orientado por rotas.
3. Criar o novo shell mobile.
4. Adaptar Bilhetes.
5. Adaptar Movimentações.
6. Adaptar Dashboard.
7. Ajustar Relatórios.
8. Executar regressão completa em desktop.

## Critérios de Aceite

A adaptação mobile será considerada concluída quando:

- não existir overflow horizontal;
- toda a funcionalidade principal puder ser utilizada em 375px, 390px e 430px;
- a navegação mobile não depender da sidebar desktop;
- a experiência desktop permanecer inalterada.

## Observações

Este documento representa o planejamento da versão 1.1.

Nenhuma implementação faz parte da versão 1.0.0-beta.

Qualquer alteração deverá ocorrer somente após a coleta de feedback dos usuários da beta.

## Relatório Final

- Arquivo criado: `docs/mobile-roadmap-v1.1.md`
- Local de salvamento: pasta `docs/` na raiz do projeto
- Confirmação: nenhuma alteração de código foi realizada
