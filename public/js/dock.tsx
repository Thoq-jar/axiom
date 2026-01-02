import { useRouter } from "./router.tsx";

interface DockItemProps {
  page: string;
  icon: string;
  label: string;
}

function DockItem({ page, icon, label }: DockItemProps) {
  const { currentPage, navigate } = useRouter();
  const isActive = currentPage === page;

  const handleClick = () => {
    navigate(page);
  };

  return (
    <div
      class={`dock-item${isActive ? " active" : ""}`}
      data-page={page}
      onClick={handleClick}
    >
      <i class={icon}></i>
      <span>{label}</span>
    </div>
  );
}

export function Dock() {
  return (
    <div class="dock" id="dock">
      <DockItem page="monitor" icon="fa-solid fa-chart-line" label="Monitor" />
      <DockItem page="cpu-details" icon="fa-solid fa-microchip" label="CPU" />
      <DockItem
        page="memory-details"
        icon="fa-solid fa-memory"
        label="Memory"
      />
      <DockItem page="about" icon="fa-solid fa-info-circle" label="About" />
    </div>
  );
}
