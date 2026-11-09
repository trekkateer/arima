create table public.games (
  id uuid primary key default gen_random_uuid(),
  g_player uuid references auth.users(id),
  s_player uuid references auth.users(id),
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'finished')),
  winner text check (winner in ('gold', 'silver')),
  end_reason text,                 -- goal, immobilization, elimination, timeout, resign
  curr_pos text not null,          -- your serialized board
  to_move text not null default 'gold' check (to_move in ('gold', 'silver')),
  ply int not null default 0,      -- plies 0 and 1 are the two setup moves
  base_ms int not null,
  increment_ms int not null default 0,
  gold_ms int not null,
  silver_ms int not null,
  turn_started_at timestamptz,     -- null until the game starts
  created_at timestamptz not null default now()
);

create table public.moves (
  game_id uuid not null references public.games(id) on delete cascade,
  ply int not null,
  side text not null check (side in ('gold', 'silver')),
  move text not null,              -- e.g. 'Ed2n Ed3n Rb2e Rc2n'
  position_after text not null,
  gold_ms int not null,            -- clocks after this move
  silver_ms int not null,
  created_at timestamptz not null default now(),
  primary key (game_id, ply)       -- rejects duplicate or out-of-order plies
);

alter table public.games enable row level security;
alter table public.moves enable row level security;

-- Anyone (players and spectators) can read. No insert/update/delete policies,
-- so clients cannot write these tables directly.
create policy "games readable" on public.games for select using (true);
create policy "moves readable" on public.moves for select using (true);

-- Let Realtime broadcast row changes on these tables.
alter publication supabase_realtime add table public.games, public.moves;