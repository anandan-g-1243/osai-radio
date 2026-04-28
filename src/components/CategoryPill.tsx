interface CategoryPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function CategoryPill({ label, active, onClick }: CategoryPillProps) {
  return (
    <button
      type="button"
      className={active ? 'pill pill-active' : 'pill'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}