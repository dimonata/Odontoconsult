# OdontoFlow

Plataforma SaaS responsiva para gestão de consultórios odontológicos. O sistema reúne cadastro e busca de pacientes, prontuário, arquivos privados, câmera, procedimentos, odontograma FDI, agenda clínica, confirmação de consultas e dashboard calculado a partir dos registros reais.

## Stack

- Next.js 16 (App Router), React 19 e TypeScript strict;
- Tailwind CSS 4, Lucide, Recharts, next-themes e Sonner;
- PostgreSQL 17 e Prisma ORM 7 com driver `pg`;
- Auth.js com Google OAuth, integração separada com Google Calendar e sessões persistidas no banco;
- assinaturas recorrentes com checkout hospedado e webhooks do Mercado Pago;
- S3 compatível privado (AWS S3, Cloudflare R2 ou Moto);
- Zod para validação compartilhada e Vitest para testes.

Node.js 22.18 ou superior é recomendado. A aplicação requer um servidor Node; não use exportação estática.

## Arquitetura

O projeto é um monólito modular. Server Components leem dados diretamente por serviços internos; mutações e integrações do navegador usam Route Handlers. Toda entrada externa é revalidada no servidor.

```text
app/                  páginas, layouts e Route Handlers
components/           componentes reutilizáveis de interface
features/             ações de autenticação e onboarding
generated/prisma/     client Prisma gerado
lib/                  auth context, banco, storage, erros e utilitários
prisma/               schema, migrations e seed
schemas/              contratos Zod
services/             consultas de domínio e DTOs
tests/                testes unitários e de isolamento
```

### Multi-tenant e autorização

`ClinicMember` associa usuários a consultórios e já comporta papéis `OWNER`, `DENTIST` e `RECEPTIONIST`. O contexto autenticado obtém o `clinicId` no servidor. Pacientes, procedimentos, agendamentos, tipos, mensagens, arquivos e auditoria repetem essa chave e todas as consultas clínicas filtram por ela. IDs recebidos por URL nunca são usados sem o filtro do consultório.

O frontend não envia nem escolhe `clinicId`. As rotas de API chamam `requireApiContext()` e os serviços recebem o contexto autenticado. A restrição composta `(clinicId, cpfNormalized)` impede CPF duplicado somente dentro do mesmo consultório.

### Dados e finanças

- Valores monetários são inteiros em centavos (`BIGINT`), nunca ponto flutuante.
- Datas de nascimento e de procedimentos usam `DATE`, evitando deslocamento de timezone.
- Agendamentos usam `TIMESTAMPTZ`; entrada e apresentação consideram o fuso configurado no consultório.
- CPF e telefone têm versões formatada e normalizada para busca.
- Procedimentos se ligam a dentes por `ProcedureTooth`, usando numeração FDI.
- O dashboard agrega procedimentos no servidor; não existem métricas mockadas em produção.

### Arquivos e retenção

O banco guarda somente metadados e chaves. Objetos são gravados em bucket privado com nomes aleatórios e criptografia server-side. Uploads passam pelo backend, têm limite configurável e o conteúdo real é identificado por magic bytes. A allowlist atual aceita JPG, PNG, WEBP e PDF.

Downloads passam por autorização de tenant e redirecionam para uma URL assinada válida por 60 segundos. Excluir um arquivo pela interface é uma exclusão lógica: ele some da ficha e gera `FILE_DELETED`, mas o objeto permanece até uma política formal de retenção determinar o descarte. Isso evita apagar prontuário irreversivelmente sem base legal.

## Pré-requisitos

- Node.js 22.18+ e npm;
- PostgreSQL 15+ (o Compose usa 17);
- bucket S3 privado;
- credenciais OAuth do Google.
- conta Meta/WhatsApp Business somente se os lembretes por WhatsApp forem habilitados.

## Instalação local

```bash
npm install
```

Copie `.env.example` para `.env` e preencha as variáveis. Nunca versione `.env`.

Para subir PostgreSQL e o S3 local (Moto):

```bash
docker compose up -d
```

Crie o bucket local, que é privado por padrão:

```bash
docker compose exec moto python -c "import boto3; boto3.client('s3', endpoint_url='http://localhost:5000', region_name='us-east-1', aws_access_key_id='test', aws_secret_access_key='test').create_bucket(Bucket='odonto-flow-private')"
```

Para essa configuração local:

```dotenv
STORAGE_REGION="us-east-1"
STORAGE_BUCKET="odonto-flow-private"
STORAGE_ACCESS_KEY_ID="test"
STORAGE_SECRET_ACCESS_KEY="test"
STORAGE_ENDPOINT="http://localhost:5000"
STORAGE_FORCE_PATH_STYLE="true"
```

As credenciais padrão do Compose são apenas para desenvolvimento.

## Banco de dados

Gerar o client e aplicar migrations em desenvolvimento:

```bash
npm run db:generate
npm run db:migrate
```

Em produção, aplique migrations versionadas sem prompts:

```bash
npm run db:deploy
```

O schema contém PKs, FKs restritivas, uniques compostos, índices de tenant/pesquisa/data e deleções lógicas para dados clínicos.

## Seed opcional

O seed cria 10 pacientes fictícios, 20 procedimentos distribuídos por datas e tipos, odontograma e três metadados de arquivos. Nenhum dado pessoal real é usado.

Para popular o consultório de uma conta Google que já concluiu o onboarding, defina o e-mail antes de rodar:

```dotenv
SEED_USER_EMAIL="seu-email-google@example.com"
```

```bash
npm run db:seed
```

Sem `SEED_USER_EMAIL`, um usuário técnico `dentista.demo@example.test` e um consultório de demonstração são criados. Os arquivos do seed são apenas metadados e, portanto, não possuem objetos para abrir no bucket.

## Login Google

1. Crie credenciais OAuth 2.0 do tipo Web no Google Cloud Console.
2. Adicione `http://localhost:3000` às origens JavaScript autorizadas.
3. Adicione `http://localhost:3000/api/auth/callback/google` aos URIs de redirecionamento.
4. Preencha `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` e um `AUTH_SECRET` aleatório forte.
5. Em produção, troque os dois endereços pelo domínio HTTPS real e defina `NEXT_PUBLIC_APP_URL`.

No primeiro login, Auth.js cria o usuário com nome, e-mail e foto. O sistema pede o nome do consultório e cria, em uma transação, a clínica, o vínculo de proprietário, preferências, tipos iniciais e auditoria. Logins seguintes entram direto no dashboard.

## Agenda e Google Calendar

A agenda possui visões de dia, semana e mês, valida sobreposição por dentista, registra remarcações/status no histórico e aparece também na ficha do paciente e no dashboard. O banco local é a fonte de verdade; falhas externas não descartam uma consulta salva.

A autorização do Calendar é deliberadamente separada do login. No mesmo cliente OAuth do Google, habilite a Calendar API e acrescente este URI de redirecionamento:

```text
http://localhost:3000/api/integrations/google-calendar/callback
```

Depois, entre em **Configurações → Google Calendar**, conceda o acesso e escolha o calendário. Os tokens ficam criptografados no banco. Defina `CALENDAR_TOKEN_ENCRYPTION_KEY` com um segredo aleatório de pelo menos 24 caracteres; se ela estiver vazia, o sistema usa `AUTH_SECRET` como fallback.

Somente primeiro nome, intervalo da consulta e um título genérico são enviados ao Google. CPF, telefone e observações internas não são sincronizados. Conflitos locais impedem a gravação; conflito informado pelo FreeBusy do Google também é exibido. Uma indisponibilidade temporária do Google não bloqueia a fonte local e pode ser repetida na tela da consulta.

## Confirmações e WhatsApp

O endpoint protegido `POST /api/jobs/appointment-reminders` procura consultas cujo prazo de confirmação venceu. Execute-o periodicamente, por exemplo a cada cinco minutos:

```bash
curl -X POST http://localhost:3000/api/jobs/appointment-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

O prazo padrão é 24 horas e pode ser alterado em **Configurações**. A chave idempotente por consulta/horário impede reenvios após sucesso; falhas permanecem disponíveis para nova tentativa.

O adaptador incluído usa a API oficial do WhatsApp Cloud com um template `pt_BR` contendo quatro variáveis no corpo — primeiro nome, consultório, data e hora — e dois botões de resposta rápida. Configure no template os botões na ordem **Confirmar** e **Cancelar**. A aplicação não envia CPF nem observações.

No painel da Meta, use como callback público HTTPS:

```text
https://seu-dominio.com/api/webhooks/messaging
```

Use em `WHATSAPP_WEBHOOK_VERIFY_TOKEN` o mesmo token cadastrado na Meta e configure `WHATSAPP_APP_SECRET` para validar `X-Hub-Signature-256`. O webhook correlaciona a resposta pelo ID da mensagem original, atualiza confirmação/cancelamento, entrega e histórico. `MESSAGING_WEBHOOK_SECRET` mantém disponível um contrato genérico protegido para outro provedor: `{ "providerMessageId": "...", "action": "CONFIRM" | "CANCEL" }`.

## Assinaturas e Mercado Pago

Google Calendar, confirmações automáticas e registro de serviços exigem uma assinatura autorizada do consultório. O plano é mensal e inclui um mês grátis. No registro de serviço, o formulário permanece disponível por completo; somente o clique em **Registrar serviço** abre o checkout, e o rascunho é restaurado no retorno.

Configure no `.env`:

```dotenv
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
MERCADO_PAGO_WEBHOOK_SECRET="..."
MERCADO_PAGO_SUBSCRIPTION_AMOUNT_CENTS="9900"
MERCADO_PAGO_CURRENCY="BRL"
MERCADO_PAGO_PLAN_ID=""
```

O valor é informado em centavos; `9900` representa R$ 99,00. Se `MERCADO_PAGO_PLAN_ID` ficar vazio, a aplicação cria o plano mensal pela API no primeiro checkout e persiste o ID. Para usar um plano criado previamente, informe seu ID nessa variável.

No painel do Mercado Pago, cadastre a URL pública HTTPS abaixo e habilite o evento **Vinculação de uma assinatura (subscription_preapproval)**:

```text
https://seu-dominio.com/api/webhooks/mercado-pago
```

A chave secreta do webhook deve ser copiada para `MERCADO_PAGO_WEBHOOK_SECRET`. A aplicação valida o HMAC e consulta novamente a assinatura na API antes de liberar recursos. Em desenvolvimento local, use um túnel HTTPS para que o Mercado Pago alcance o webhook.

## Variáveis de ambiente

| Variável                                              | Uso                                            |
| ----------------------------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`                                        | conexão PostgreSQL                             |
| `AUTH_SECRET`                                         | assinatura/criptografia da sessão Auth.js      |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`               | OAuth Google                                   |
| `AUTH_TRUST_HOST`                                     | confiança no host atrás de proxy               |
| `NEXT_PUBLIC_APP_URL`                                 | URL canônica da aplicação                      |
| `MERCADO_PAGO_ACCESS_TOKEN`                           | credencial privada da API do Mercado Pago      |
| `MERCADO_PAGO_WEBHOOK_SECRET`                         | valida notificações do Mercado Pago            |
| `MERCADO_PAGO_SUBSCRIPTION_AMOUNT_CENTS`              | preço mensal em centavos                       |
| `MERCADO_PAGO_CURRENCY`                               | moeda da assinatura, padrão `BRL`               |
| `MERCADO_PAGO_PLAN_ID`                                | plano preexistente opcional                     |
| `GOOGLE_CALENDAR_REDIRECT_URI`                        | callback OAuth separado do Calendar            |
| `CALENDAR_TOKEN_ENCRYPTION_KEY`                       | criptografia dos tokens do Calendar            |
| `STORAGE_REGION` / `STORAGE_BUCKET`                   | bucket privado                                 |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | credenciais do storage, somente no servidor    |
| `STORAGE_ENDPOINT`                                    | endpoint opcional para R2/Moto                 |
| `STORAGE_FORCE_PATH_STYLE`                            | necessário no Moto local                       |
| `STORAGE_MAX_FILE_SIZE_MB`                            | limite por arquivo, padrão 10 MB               |
| `CRON_SECRET`                                         | protege o job de confirmações                  |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`  | envio pela WhatsApp Cloud API                  |
| `WHATSAPP_CONFIRMATION_TEMPLATE`                      | nome do template aprovado                      |
| `WHATSAPP_APP_SECRET`                                 | valida a assinatura do webhook Meta            |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN`                       | desafio de cadastro do webhook                 |
| `WHATSAPP_GRAPH_API_VERSION`                          | versão da Graph API usada pelo adaptador       |
| `WHATSAPP_DEFAULT_COUNTRY_CODE`                       | DDI aplicado a telefones locais                |
| `MESSAGING_WEBHOOK_SECRET`                            | autentica o webhook genérico opcional          |
| `SEED_USER_EMAIL`                                     | usuário existente que receberá o seed opcional |

## Execução e qualidade

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
npm start
```

Os testes atuais cobrem CPF/normalização, schemas clínicos, dentes FDI, isolamento por consultório, cálculos financeiros, fuso da agenda, contrato de agendamento, assinatura/resposta do webhook e detecção real de arquivos. Para uma pipeline de produção, execute também testes de integração contra PostgreSQL, Google sandbox/test users e um bucket descartável.

## API principal

- `GET|POST /api/patients`
- `GET|PATCH /api/patients/:id`
- `GET /api/patients/search`
- `POST /api/procedures`
- `GET /api/patients/:id/procedures`
- `POST /api/patients/:id/files`
- `GET|DELETE /api/files/:id`
- `GET /api/dashboard`
- `GET|POST /api/appointments`
- `GET|PATCH /api/appointments/:id`
- `POST /api/appointments/:id/retry-sync`
- `GET /api/appointment-types`
- `GET|PATCH|DELETE /api/integrations/google-calendar`
- `GET /api/integrations/google-calendar/connect`
- `GET /api/integrations/google-calendar/callback`
- `POST /api/jobs/appointment-reminders`
- `POST /api/billing/checkout`, `POST /api/billing/sync`
- `POST /api/webhooks/mercado-pago`
- `GET|POST /api/webhooks/messaging`
- `PATCH /api/profile`, `POST /api/profile/photo`
- `PATCH /api/preferences`, `PATCH /api/clinic`

Todas as rotas clínicas exigem sessão e validam o tenant no servidor.

## Auditoria e LGPD

`AuditLog` registra usuário, consultório, ação, tipo de entidade, ID e timestamp para criação/alteração de paciente, upload/remoção de arquivo, procedimentos, agendamentos, lembretes, sincronizações, perfil e consultório. `AppointmentHistory` preserva horários e estados anteriores. Os logs não copiam CPF, observações clínicas, tokens ou conteúdo de arquivos.

A arquitetura suporta futura exportação, consentimentos, anonimização condicionada, política de retenção e múltiplos profissionais. Requisitos legais concretos — prazo de guarda, bases legais, atendimento a titulares e plano de incidentes — devem ser definidos com o encarregado e assessoria jurídica antes do uso com pacientes reais.

## Deploy

1. Provisione PostgreSQL com pool de conexões e bucket privado com criptografia e lifecycle controlado.
2. Configure todas as variáveis como secrets da plataforma.
3. Execute `npm ci`, `npm run db:deploy`, `npm run build` e `npm start`.
4. Use HTTPS, backups testados, monitoramento, rotação de secrets e logs sem dados clínicos.
5. Restrinja IAM do storage ao bucket/prefixo da aplicação e não habilite acesso público.
6. Agende o job de confirmações e monitore respostas não `2xx`, falhas de entrega e sincronizações pendentes.

O build gera um servidor Next.js Node completo e pode rodar em qualquer plataforma compatível. Migrations devem ser uma etapa única do pipeline, nunca executadas concorrentemente por todas as instâncias.
