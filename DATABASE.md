# 🗄️ Configuração do Banco de Dados

## 🐳 PostgreSQL Local com Docker

### Iniciar o banco de dados

```bash
docker-compose up -d
```

### Verificar se está rodando

```bash
docker-compose ps
```

### Ver logs

```bash
docker-compose logs -f postgres
```

### Parar o banco de dados

```bash
docker-compose down
```

### Parar e LIMPAR todos os dados

```bash
docker-compose down -v
```

---

## 🔄 Migrations

### Gerar e aplicar migrations

```bash
npm run db:push
```

---

## 📊 Acessar o banco diretamente

### Via Docker

```bash
docker exec -it bardo_postgres psql -U postgres -d bardo
```

### Via cliente PostgreSQL (se instalado)

```bash
psql postgresql://postgres:bardo_dev_password@localhost:5432/bardo
```

---

## 🔧 Comandos úteis do PostgreSQL

Dentro do `psql`:

```sql
-- Listar todas as tabelas
\dt

-- Ver estrutura de uma tabela
\d nome_da_tabela

-- Listar todos os bancos
\l

-- Sair
\q
```

---

## 🌐 Usar Supabase na VPS (Produção)

Para produção, edite o `.env` e altere a `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@automacoes-supabase-n8n.rh8xvb.easypanel.host:5432/postgres
```

---

## 🛠️ Troubleshooting

### Erro: "porta 5432 já está em uso"

Você já tem um PostgreSQL rodando. Opções:

1. Pare o PostgreSQL local: `sudo service postgresql stop` (Linux) ou `brew services stop postgresql` (Mac)
2. Mude a porta no `docker-compose.yml`: `"5433:5432"` e no `.env`: `localhost:5433`

### Erro: "Cannot connect to database"

```bash
# Verifique se o container está rodando
docker-compose ps

# Reinicie o container
docker-compose restart postgres

# Veja os logs
docker-compose logs postgres
```








