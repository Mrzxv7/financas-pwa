# Segurança da informação

## Arquitetura

```text
GitHub Pages (HTML/CSS/JS/PDF.js)
          │ HTTPS
          ▼
Supabase Auth ── token do usuário
          │
          ▼
PostgreSQL + RLS (user_id = auth.uid())
```

O GitHub Pages hospeda apenas o código estático. Os dados sincronizados ficam no PostgreSQL do Supabase; uma cópia de trabalho e a fila offline ficam no navegador do usuário.

## Credenciais

- **No frontend:** Project URL e publishable key. São identificadores públicos previstos para aplicações web.
- **Nunca no frontend:** `service_role`, secret key, senha do banco ou connection string administrativa.
- A publishable key não concede acesso irrestrito: cada operação usa também o token do usuário autenticado e passa pelas políticas RLS.

## Isolamento entre usuários

Todas as tabelas têm RLS habilitado. As políticas permitem selecionar, inserir, alterar e excluir somente linhas cujo `user_id` seja igual a `auth.uid()`. O aplicativo também envia `user_id`, mas a proteção efetiva está no banco, não na interface.

## Transporte, senha e sessão

- GitHub Pages e Supabase usam HTTPS.
- A senha é enviada diretamente ao Supabase Auth e não é gravada pelo app.
- O app guarda sessão/refresh token no armazenamento local para manter o login. Isso é comum em uma PWA estática, mas exige proteção do dispositivo.
- Recomenda-se senha exclusiva, confirmação de e-mail e, se habilitado no projeto, MFA.

## Dados locais e modo offline

O cache local contém dados financeiros para permitir abertura rápida e fila offline. Portanto:

- bloqueie o celular/PC com PIN ou biometria;
- não use a conta em dispositivo compartilhado;
- ao deixar de usar um dispositivo, saia da conta e limpe os dados do navegador;
- exporte backups e proteja os arquivos exportados.

O service worker guarda somente arquivos da aplicação do mesmo domínio. Requisições para Supabase/Auth são explicitamente excluídas do cache.

## Importação e auditoria

- O arquivo é lido localmente no navegador.
- PDF.js está empacotado no projeto; não há CDN ou OCR remoto.
- SHA-256 é calculado no dispositivo e usado para identificar reimportação.
- O banco armazena hash e metadados, não o PDF original.
- SHA-256 demonstra que dois conteúdos são iguais, mas não comprova autenticidade bancária nem impede fraude no arquivo de origem.

## Proteções de interface

- Dados exibidos são escapados para reduzir risco de XSS.
- Não há uso de `eval`.
- Exclusão exige confirmação.
- Regras automáticas são visíveis e cada movimentação registra a versão usada.

## Responsabilidades operacionais

1. Manter RLS habilitado e executar a migração fornecida.
2. Nunca substituir a publishable key por uma secret key.
3. Restringir administradores do projeto Supabase e do repositório GitHub.
4. Habilitar proteção de branch e revisão de alterações no GitHub.
5. Revisar periodicamente logs do Supabase e usuários autenticados.
6. Definir retenção e proteção dos backups exportados.

## Modelo de ameaça resumido

| Risco | Controle atual | Risco residual |
|---|---|---|
| Usuário acessar dados de outro | RLS por `auth.uid()` | Configuração incorreta de política |
| Chave pública exposta | Chave não administrativa + RLS | Abuso de endpoints públicos/limites |
| Dispositivo perdido | Bloqueio do dispositivo + logout | Cache/token local até limpeza/expiração |
| Reimportação | SHA-256 + unicidade + deduplicação | Arquivo alterado gera novo hash |
| Categoria incorreta | Prévia + regras visíveis/versionadas | Regra mal definida pelo usuário |
| XSS por descrição importada | Escape de HTML | Dependências ou futuras alterações inseguras |
| Interceptação de rede | HTTPS | Dispositivo/CA comprometidos |

## Antes de produção

- Ative confirmação de e-mail no Supabase Auth.
- Configure URLs permitidas/redirecionamento para o domínio do GitHub Pages.
- Revise as políticas no SQL Editor com duas contas de teste.
- Considere MFA para contas com dados sensíveis.
- Configure alertas, rate limits e rotina de backup do Supabase.
