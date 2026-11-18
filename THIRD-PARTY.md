# Componentes de terceiros

## PDF.js

- Uso: extração e renderização local de PDFs.
- Distribuição: arquivos em `vendor/pdf.mjs` e `vendor/pdf.worker.mjs`.
- Licença: consulte `vendor/PDFJS-LICENSE.txt`.

## Tesseract.js 5.1.1

- Uso: fallback de OCR no navegador para PDFs compostos por imagem.
- Carregamento: `https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js`.
- Dados de idioma: português, resolvido pelo Tesseract.js em `tessdata.projectnaptha.com`.
- Licença do projeto: Apache-2.0.
- O motor e o idioma são baixados; as páginas financeiras não são enviadas a um serviço de OCR.
