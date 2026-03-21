import { App, Container } from "~/src/types.ts";
import { broadcastToClients } from "~/src/websockets.ts";

export async function runDockerCommand(
  args: string[],
): Promise<{ success: boolean; output: string; error?: string }> {
  const command = new Deno.Command("docker", { args });
  const { code, stdout, stderr } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const error = new TextDecoder().decode(stderr);
  return { success: code === 0, output, error: error || undefined };
}

export async function isDockerRunning(): Promise<boolean> {
  const { success } = await runDockerCommand(["info", "--format", "ok"]);
  return success;
}

export async function getContainers(): Promise<
  { containers: Container[] } | { error: string }
> {
  const { success, output, error } = await runDockerCommand([
    "ps",
    "-a",
    "--format",
    "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.State}}|{{.Ports}}|{{.CreatedAt}}",
  ]);

  if (!success) {
    const msg = error?.includes("Cannot connect") ||
        error?.includes("Is the docker daemon running")
      ? "Docker is not running"
      : "Failed to reach Docker";
    console.error("Failed to get containers:", error || output);
    return { error: msg };
  }

  const containers = output.trim().split("\n").filter(Boolean).map((line) => {
    const [id, name, image, status, state, ports, created] = line.split("|");
    return { id, name, image, status, state, ports: ports || "-", created };
  });

  return { containers };
}

export async function runDockerInstall(app: App) {
  console.log(`Starting installation for: ${app.name}`);
  const total = app.install_steps.length;

  for (let i = 0; i < total; i++) {
    const step = app.install_steps[i];
    let cmd: string[] = [];
    let step_name = "Processing...";

    if (step.action === "pull_image") {
      cmd = ["docker", "pull", step.target];
      step_name = `Pulling ${step.target}`;
    } else if (step.action === "run_container") {
      cmd = [
        "docker",
        "run",
        "-d",
        "--name",
        app.id,
        "--restart",
        "unless-stopped",
        app.deployment.image + ":" + app.deployment.tag,
      ];
      step_name = "Starting container";
    }

    broadcastToClients(JSON.stringify({
      type: "installation_progress",
      app: app.id,
      step: i,
      total,
      step_name,
    }));

    if (cmd.length > 0) {
      const command = new Deno.Command(cmd[0], { args: cmd.slice(1) });
      const { success, stderr } = await command.output();
      if (!success) {
        console.error(`Step failed: ${new TextDecoder().decode(stderr)}`);
        broadcastToClients(JSON.stringify({
          type: "installation_error",
          app: app.id,
          step_name,
        }));
        return;
      }
    }
  }

  console.log(`Installation finished for: ${app.name}`);

  broadcastToClients(JSON.stringify({
    type: "installation_finished",
    app: app.id,
    name: app.name,
  }));
}
