# DeliveryDK

Sistema de Delivery moderno desenvolvido com React, TypeScript, Supabase e Netlify.

## Tecnologias

- **Frontend**: React 19 + Vite + TypeScript (Strict)
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (Auth + PostgreSQL)
- **Hosting**: Netlify
- **State Management**: Zustand + TanStack Query v5
- **Forms**: React Hook Form + Zod
- **UI Components**: Lucide Icons + Sonner (Toasts)

## Funcionalidades Implementadas

- Sistema de autenticação (Login/Registro)
- Dashboard com sidebar fixa
- Layout responsivo (Mobile First)
- Row Level Security (RLS) no banco de dados
- Triggers automáticos para criação de perfil

## Links

- **Produção**: https://deliverydk.netlify.app
- **GitHub**: https://github.com/eumatheusr5/deliverydk
- **Supabase Dashboard**: https://supabase.com/dashboard/project/avjlyjhxadrignfucwsp

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Criar arquivo .env com as variáveis
VITE_SUPABASE_URL=https://avjlyjhxadrignfucwsp.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## Estrutura do Projeto

```
src/
├── components/
│   ├── auth/          # Componentes de autenticação
│   ├── layout/        # Layout (Sidebar, Header)
│   └── ui/            # Componentes reutilizáveis
├── hooks/             # Custom hooks
├── lib/               # Configurações (Supabase)
├── pages/             # Páginas da aplicação
├── stores/            # Estado global (Zustand)
└── types/             # Tipos TypeScript
```

## Banco de Dados

O schema do banco inclui:

- **profiles**: Informações do usuário (id, email, full_name, phone, role, avatar_url)
- **Enum user_role**: admin, manager, deliverer, customer
- **RLS**: Políticas de segurança para leitura/atualização do próprio perfil
- **Triggers**: Criação automática de perfil após registro

## Deploy

O deploy é feito automaticamente via Netlify CLI:

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

