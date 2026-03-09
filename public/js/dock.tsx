import { useRouter } from "./router.tsx";
import { Icon } from "./components.tsx";

interface DockItemProps {
  page: string;
  iconName: string;
  label: string;
}

function DockItem({ page, iconName, label }: DockItemProps) {
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
      <Icon name={iconName} />
      <span>{label}</span>
    </div>
  );
}

export function Dock() {
  return (
    <div class="dock" id="dock">
      <DockItem page="monitor" iconName="line-chart" label="Monitor" />
      <DockItem page="cpu-details" iconName="cpu" label="CPU" />
      <DockItem
        page="memory-details"
        iconName="memory-stick"
        label="Memory"
      />
      <DockItem
        page="app-store"
        iconName="package"
        label="Apps"
      />
      <DockItem page="about" iconName="info" label="About" />
    </div>
  );
}
