import {
  CalendarDays, ChevronRight, Clock, Fingerprint, History, House, LayoutGrid, ListChecks, Receipt, Settings, Store, UserRound, Users, Wallet,
  type LucideProps,
} from 'lucide-react';

const ICONS = {
  clock: Clock,
  history: History,
  receipt: Receipt,
  grid: LayoutGrid,
  user: UserRound,
  house: House,
  users: Users,
  list: ListChecks,
  wallet: Wallet,
  store: Store,
  calendar: CalendarDays,
  settings: Settings,
  fingerprint: Fingerprint,
  chevron: ChevronRight,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = ICONS[name];
  return <C size={20} strokeWidth={2} {...props} />;
}
