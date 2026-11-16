# Retiro RP

Painel para a recria de 13 novilhas de corte em braquiária. Na primeira abertura, a demonstração mostra 13 fichas fictícias, com pesos, consumos, custos e área simulados. Clique em **Começar meus registros** para limpar a demonstração e cadastrar os dados da fazenda. Essa ação apaga o conjunto de exemplo salvo, inclusive as alterações feitas nele.

## Abrir no computador

Com Node.js 24 instalado, abra o terminal nesta pasta, execute `node server.js` e acesse [127.0.0.1:3001](http://127.0.0.1:3001/). O arquivo `data/registros.json` é criado no primeiro salvamento. O servidor local é acessível apenas neste computador.

No Windows em que o painel foi configurado, a tarefa **Retiro RP - servidor local** inicia o servidor ao entrar na conta e tenta reiniciá-lo se ele falhar. Para iniciá-lo manualmente, use **Executar** nessa tarefa no Agendador do Windows.

## Publicar no Render

1. Envie os arquivos do projeto a um repositório Git privado, sem incluir `data/` nem credenciais.
2. Na sua conta Render, abra **New → Blueprint** e conecte o repositório. O arquivo `render.yaml` configura o serviço e um disco persistente de 1 GB em `/var/data`. O serviço Starter e o disco são pagos. Confira o valor exibido pelo Render antes de criar.
3. Quando o serviço estiver ativo, abra a URL HTTPS exibida no Render. Use o usuário `fazenda` e o valor de `APP_PASSWORD` na aba **Environment**. O Render gera essa senha na criação. Compartilhe o acesso apenas com quem pode ler e editar os registros.
4. Faça um lançamento de teste, recarregue a página e confirme a persistência. Exclua o lançamento ou limpe a demonstração após o teste.

Use uma única instância do serviço. Os registros ficam em `/var/data/registros.json`. Mantenha cópias periódicas desse arquivo em local seguro. Para restaurar uma cópia, substitua o arquivo no disco em uma janela sem edições e recarregue a página. A rota `/health` é pública e fornece apenas o estado do serviço.

[Blueprints do Render](https://render.com/docs/blueprint-spec) · [Discos persistentes](https://render.com/docs/disks)

## Ler os indicadores

A aba **Gráficos e tabelas** reúne os indicadores, gráficos e tabelas do aplicativo. As seis exportações CSV são instantâneos dos registros, com o campo `demo` para identificar dados de exemplo.

No Power BI Desktop, importe os arquivos como Texto/CSV com delimitador ponto e vírgula, codificação UTF-8 e localidade Português (Brasil). Defina `id`, `tag` e referências como texto para preservar os brincos com zero à esquerda. Relacione `pesagens.animal` a `animais.id`, `animais.pasture` a `pastos.id` e `projecao.feed` a `suplementos.id`. Para atualizar o relatório externo, exporte novamente e substitua os CSVs usados pelo Power BI.

- **Lotação** calcula o peso vivo conhecido do pasto ÷ 450 kg ÷ hectares. O painel marca a lotação parcial quando há animais sem pesagem.
- **GMD** usa a primeira e a última pesagem de cada animal. Para o lote, divide a soma dos ganhos pela soma dos dias entre essas pesagens.
- **Consumo** converte g/cabeça/dia em kg/lote/dia. O custo do período registrado multiplica o consumo, o preço por kg, o número de cabeças e os dias corridos até hoje, contando início e fim.
- **Custos** acumulam suplementação registrada e despesas alimentares, operacionais e de aquisição até hoje. O custo por kg ganho usa o custo operacional com alimentação dividido pelo ganho acumulado medido. Como os custos são acumulados, lance os custos do mesmo período das pesagens para interpretar o indicador.
- **Comparação de suplementos** usa consumo, preço e GMD assumido por produto, aplicados ao lote atual pelo prazo da projeção. As quantidades de exemplo são entradas de simulação. Preencha as quantidades e o teor de proteína conforme o produto e o manejo real.
- **Venda** estima o peso futuro pelo peso médio atual mais GMD × dias. A receita usa o preço informado por kg vivo. O resultado deduz os custos acumulados, o suplemento futuro escolhido e outros custos futuros informados.

