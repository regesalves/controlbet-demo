# ControlBet Development Tools

Ferramentas locais para gerar e remover dados realistas de teste.

## Proteções

- O componente só é importado quando `import.meta.env.DEV` é verdadeiro.
- A interface também exige `localhost`, `127.0.0.1` ou `::1`.
- As operações exigem um usuário real autenticado no Supabase para respeitar as políticas RLS.
- Registros de teste usam IDs entre `8400000000000000` e `8899999999999999`.
- A limpeza remove somente registros do usuário atual dentro dessa faixa e nunca exclui o usuário.

## Módulos

- `dataGenerator.js`: geradores puros e reutilizáveis.
- `devDatabase.js`: persistência em lotes e limpeza segura.
- `DevelopmentTools.jsx`: painel local e controle das operações.
- `development-tools.css`: estilos isolados do painel.

O botão **Popular banco completo** e a ação **Resetar ambiente** usam a seed fixa `controlbet-dev`. Eles recriam as mesmas 7 casas, 200 bilhetes e 42 movimentações, com IDs e valores determinísticos, distribuídos pelos últimos 90 dias.

O botão **Gerar cenário aleatório** cria uma seed exclusiva a cada execução para substituir a base atual por um conjunto diferente de dados realistas.
