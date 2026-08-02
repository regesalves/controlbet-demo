# 🎯 ControlBet

Aplicação web para gerenciamento de banca esportiva, desenvolvida em React como projeto pessoal de desenvolvimento e evolução prática.

<p align="center">
  <a href="https://controlbet-demo.vercel.app/">
    <img src="https://img.shields.io/badge/Acessar%20Demo-Vercel-black?style=for-the-badge&logo=vercel" alt="Acessar Demo">
  </a>
</p>

## 📖 Sobre o projeto

O **ControlBet** surgiu como um projeto pessoal para desenvolver uma solução de gerenciamento de banca esportiva e, ao mesmo tempo, colocar em prática conhecimentos relacionados ao desenvolvimento de aplicações web.

A aplicação permite cadastrar casas de apostas, registrar bilhetes e movimentações financeiras, acompanhar a evolução da banca e consultar indicadores e relatórios de desempenho.

Ao longo do desenvolvimento, o projeto passou por diferentes etapas e melhorias envolvendo interface, responsividade, persistência de dados, autenticação, regras de negócio, testes e publicação da aplicação.

O desenvolvimento também utilizou ferramentas de Inteligência Artificial como apoio durante o processo, principalmente na implementação, revisão de código, identificação de problemas e evolução das funcionalidades. O **OpenAI Codex** foi utilizado como uma das principais ferramentas de apoio técnico nas etapas mais recentes do projeto.

---

## 🌐 Demo

Uma versão pública está disponível para permitir que as principais funcionalidades sejam testadas diretamente pelo navegador.

### [Acessar ControlBet Demo](https://controlbet-demo.vercel.app/)

A Demo:

- não exige criação de conta;
- utiliza dados fictícios;
- permite cadastrar, editar e excluir informações;
- utiliza `localStorage` para persistência dos dados;
- funciona independentemente da infraestrutura da versão principal.

Os dados ficam armazenados apenas no navegador utilizado para acessar a aplicação.

---

## ✨ Funcionalidades

- 📊 Dashboard com indicadores da banca
- 🏦 Cadastro e gerenciamento de casas de apostas
- 🎟️ Cadastro e gerenciamento de bilhetes
- 💰 Registro de depósitos, saques e outras movimentações
- 📈 Acompanhamento da evolução da banca
- 📉 Cálculo de resultados e indicadores de desempenho
- 📋 Relatórios gerais e estatísticas
- 🔎 Filtros por casa e período
- 📱 Interface adaptada para desktop e dispositivos móveis
- 💾 Persistência dos dados

---

## 📷 Interface

### Landing Page

Tela de apresentação da versão pública do ControlBet.

<p align="center">
  <img src=".github/images/landing-page.png" alt="Landing Page" width="100%">
</p>

### Dashboard

Visão geral da banca com indicadores, casas cadastradas, evolução do saldo e resultados.

<p align="center">
  <img src=".github/images/dashboard.png" alt="Dashboard" width="100%">
</p>

### Bilhetes

Registro e acompanhamento das apostas realizadas.

<p align="center">
  <img src=".github/images/tickets.png" alt="Bilhetes" width="100%">
</p>

### Movimentações

Controle de depósitos, saques e histórico financeiro.

<p align="center">
  <img src=".github/images/movements.png" alt="Movimentações" width="100%">
</p>

### Relatórios

Visualização de resultados, indicadores e estatísticas do período selecionado.

<p align="center">
  <img src=".github/images/reports.png" alt="Relatórios" width="100%">
</p>

---

## 🛠️ Tecnologias utilizadas

<p>
  <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/CSS-663399?style=flat&logo=css&logoColor=white" alt="CSS">
  <img src="https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white" alt="Git">
  <img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white" alt="GitHub">
  <img src="https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white" alt="Vercel">
</p>

Principais tecnologias e ferramentas utilizadas no projeto:

- **React** para construção da interface
- **Vite** como ferramenta de desenvolvimento e build
- **JavaScript**
- **HTML e CSS**
- **React Router** para navegação
- **Git e GitHub** para controle de versão
- **Vercel** para publicação da aplicação
- **Supabase** na versão principal para autenticação e persistência dos dados
- **localStorage** na versão Demo para armazenamento local
- **OpenAI Codex** como ferramenta de apoio durante parte do desenvolvimento

---

## 🧩 Versões do projeto

O projeto atualmente possui duas versões com objetivos diferentes.

| Versão | Características |
| --- | --- |
| **ControlBet** | Versão principal e privada, com autenticação, persistência online dos dados e integração com Supabase. |
| **ControlBet Demo** | Versão pública deste repositório, sem autenticação e com persistência local para facilitar testes e apresentação do projeto. |

A separação permite manter o desenvolvimento da aplicação principal em um repositório privado enquanto uma versão funcional permanece disponível publicamente para demonstração.

---

## 💻 Executando localmente

### Pré-requisitos

É necessário ter o **Node.js** e o **Git** instalados.

Clone o repositório:

```bash
git clone https://github.com/regesalves/controlbet-demo.git
```

Acesse a pasta:

```bash
cd controlbet-demo
```

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

Depois, acesse o endereço exibido pelo Vite no terminal.

A versão Demo não exige configuração de Supabase ou criação de variáveis de ambiente para utilização das funcionalidades principais.

---

## 📚 Desenvolvimento do projeto

O ControlBet foi desenvolvido de forma incremental.

O projeto começou com a estrutura básica de gerenciamento da banca e foi recebendo novas funcionalidades e ajustes conforme os fluxos eram utilizados e testados.

Durante esse processo foram trabalhados pontos como:

- organização e evolução da interface;
- criação e validação de regras de negócio;
- responsividade;
- persistência e sincronização de dados;
- autenticação na versão principal;
- cálculos financeiros e indicadores;
- relatórios e visualização de dados;
- testes dos fluxos da aplicação;
- deploy e manutenção das versões publicadas.

A criação da versão Demo também fez parte dessa evolução. A camada de dados foi adaptada para permitir que a aplicação pudesse ser disponibilizada publicamente sem expor o ambiente ou os dados da versão principal.

---

## 🎯 Objetivo do projeto

O ControlBet é um projeto pessoal utilizado para desenvolver e aplicar conhecimentos relacionados à construção de aplicações web.

Além da parte técnica, o projeto também envolve decisões sobre organização da interface, experiência de uso, definição de funcionalidades, regras de negócio, testes e manutenção da aplicação ao longo de sua evolução.

---

## 👨‍💻 Autor

**Réges Alves**

Projeto desenvolvido como parte da minha evolução prática em desenvolvimento de sistemas e construção de projetos próprios.

GitHub: [regesalves](https://github.com/regesalves)