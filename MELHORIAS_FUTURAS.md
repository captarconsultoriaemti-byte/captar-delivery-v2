# Ajustes e melhorias futuras

Lista de ideias/pendências para avaliar depois, sem data definida. Não implementar sem antes revisar com o Ricardo.

## Urgente

1. **Sons nos pedidos** — tocar um som ao chegar/mudar status de pedido, tanto para o cliente quanto para a empresa. Só se aplica a pedidos feitos pelo **link** (não vale para Venda Direta).
2. **Integrar a URL definitiva** do domínio já registrado no Registro.br (hoje o sistema roda em domínio/URL provisório).

## Avaliar / pesquisar depois

3. **Avaliação do pedido** — permitir que o cliente avalie o pedido (estrelas + comentário) depois que o status virar "entregue".
4. **Cancelamento de pedido** — botão de cancelar, tanto pelo cliente no Link quanto pela empresa no painel. Precisa pensar no fluxo (o que acontece com pagamento já registrado, reposição de estoque, notificação, etc.) e pesquisar como outros sistemas fazem antes de implementar.
5. **Chat durante o pedido no Link** — dúvida em aberto: será que compensa construir um chat próprio, ou o WhatsApp já resolve isso? Avaliar custo/benefício antes de decidir.
6. **Verificação por WhatsApp para histórico do cliente** — hoje o cliente que pede pelo Link não tem login nem consegue ver pedidos anteriores (cada pedido só é acessível pelo link único dele). Se um dia quisermos oferecer "ver meus pedidos" ou "pedir de novo", a ideia é exigir o WhatsApp do cliente + um código de verificação enviado por WhatsApp (sem senha pra lembrar) antes de mostrar o histórico — mais leve que criar conta com e-mail/senha, e resolve tanto identificação quanto segurança (impede que alguém tente ver o histórico de outra pessoa só sabendo o número). Não é urgente; só faz sentido se surgir uma necessidade real (ex: fidelidade, repetir pedido).
