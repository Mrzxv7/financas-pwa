# Finanças PWA

Aplicativo financeiro pessoal mobile-first, reconstruído do zero em HTML, CSS e JavaScript.

## Executar

A PWA deve ser publicada em um endereço **HTTPS**. Para teste local no computador:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080/financas-pwa/`.

> Abrir `index.html` diretamente permite usar os recursos básicos em alguns navegadores, mas service worker, instalação PWA e leitura de PDF precisam de HTTP/HTTPS.

## Instalar no iPhone

1. Publique esta pasta em um host HTTPS.
2. Abra o endereço no Safari.
3. Toque em **Compartilhar**.
4. Escolha **Adicionar à Tela de Início**.
5. Ative **Abrir como Web App** (se exibido) e toque em **Adicionar**.

## Recursos

- Dashboard por mês com receitas, despesas, saldo, taxa de economia e orçamento.
- Tendência dos últimos 6 meses e gastos por categoria sem bibliotecas externas.
- Inclusão, edição, exclusão, busca e filtros de movimentações.
- Importação de PDF, CSV e TXT com prévia e detecção de duplicidade.
- PDF.js empacotado localmente: nenhuma CDN em tempo de execução.
- Depois da confirmação, a importação atualiza imediatamente Lista e Dashboard.
- Contas a pagar, ideias/metas e orçamento mensal.
- Backup e restauração JSON.
- Persistência local e funcionamento offline após o primeiro acesso.

## Privacidade e armazenamento

Os dados financeiros ficam no armazenamento local do navegador. Não existe envio para servidor. Limpar os dados do Safari/navegador pode apagar a base; exporte backups regularmente.

## Estrutura

- `index.html`: interface
- `styles.css`: design responsivo
- `app.js`: regras, armazenamento, importações e gráficos
- `manifest.webmanifest`: instalação PWA
- `sw.js`: cache offline
- `vendor/`: PDF.js local e licença
- `icons/`: ícones da PWA
