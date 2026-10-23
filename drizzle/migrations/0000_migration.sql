create type public.app_role as enum ('admin','moderator','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id,role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id=auth.uid());
create or replace function public.admin_exists() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where role='admin') $$;
grant execute on function public.admin_exists() to anon, authenticated;
create or replace function public.handle_first_admin() returns trigger language plpgsql security definer set search_path=public as $$ begin if not exists(select 1 from public.user_roles where role='admin') then insert into public.user_roles(user_id,role) values(new.id,'admin'); end if; return new; end $$;
create trigger on_auth_user_created_admin after insert on auth.users for each row execute function public.handle_first_admin();

create table public.properties (
 id uuid primary key default gen_random_uuid(), slug text not null default '', title text not null, code text not null default '', type text not null default 'Casa', purpose text not null default 'Venda',
 price numeric not null default 0, condo numeric not null default 0, iptu numeric not null default 0, description text not null default '',
 state text not null default '', city text not null default '', neighborhood text not null default '', address text not null default '', number text not null default '', zip text not null default '', complement text not null default '',
 area numeric not null default 0, built_area numeric not null default 0, bedrooms int not null default 0, suites int not null default 0, bathrooms int not null default 0, parking int not null default 0,
 features text[] not null default '{}', published boolean not null default true, featured boolean not null default false, status text not null default 'Disponível', images text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select on public.properties to anon;
grant select, insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;
create policy "Public reads published" on public.properties for select to anon, authenticated using (published = true);
create policy "Admins read all" on public.properties for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins insert" on public.properties for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins update" on public.properties for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete" on public.properties for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
create trigger properties_touch before update on public.properties for each row execute function public.touch_updated_at();

insert into public.properties (slug,title,code,type,purpose,price,condo,iptu,description,state,city,neighborhood,address,number,zip,complement,area,built_area,bedrooms,suites,bathrooms,parking,features,published,featured,status,images,created_at) values
('casa-contemporanea-com-jardim','Casa contemporânea com jardim','IM-001','Casa','Venda',1850000,450,280,'Ambientes integrados, luz natural abundante, acabamentos atemporais e uma área externa perfeita para receber amigos e família.','DF','Brasília','Jardim Botânico','Condomínio Jardins','120','71680-000','Casa 12',420,285,4,3,5,3,'{Piscina,Churrasqueira,"Área gourmet",Jardim,"Condomínio fechado"}',true,true,'Disponível','{https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85,https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85}','2026-10-01'),
('apartamento-alto-padrao-na-asa-norte','Apartamento alto padrão na Asa Norte','IM-002','Apartamento','Venda',980000,980,190,'Apartamento elegante, varanda ampla e vista aberta, próximo a cafés, serviços e áreas verdes.','DF','Brasília','Asa Norte','SQN 212','Bloco B, 504','70864-020','',146,146,3,1,3,2,'{Varanda,Academia,Elevador,Portaria}',true,true,'Disponível','{https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85,https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85}','2026-09-28'),
('residencia-terrea-no-lago-sul','Residência térrea no Lago Sul','IM-003','Casa','Venda',2650000,0,420,'Arquitetura discreta, integração com o verde e ambientes generosos em uma região desejada de Brasília.','DF','Brasília','Lago Sul','SHIS QI 17','18','71645-170','',780,360,5,4,6,4,'{Piscina,Jardim,"Área gourmet"}',true,false,'Disponível','{https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85}','2026-09-20'),
('sala-comercial-pronta-para-uso','Sala comercial pronta para uso','IM-004','Comercial','Aluguel',4200,650,210,'Espaço comercial iluminado, pronto para receber seu negócio, com portaria e fácil acesso.','DF','Brasília','Setor Comercial Sul','Edifício Business Center','Sala 806','70313-900','',82,82,0,0,2,1,'{Elevador,Ar-condicionado,Portaria}',true,false,'Alugado','{https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=85}','2026-09-14'),
('terreno-plano-em-condominio','Terreno plano em condomínio','IM-005','Terreno','Venda',540000,720,160,'Lote plano em condomínio consolidado, com infraestrutura completa, segurança e potencial para projeto residencial.','GO','Novo Gama','Condomínio Veredas','Alameda das Acácias','Lote 08','72860-000','Quadra D',600,0,0,0,0,0,'{"Condomínio fechado",Jardim}',true,false,'Disponível','{https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85}','2026-09-08');