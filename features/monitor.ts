export const start_monitor = async () => {
  const isLinux = Deno.build.os === "linux";
  const isMac = Deno.build.os === "darwin";

  async function getCPUUsage(): Promise<number | null> {
    if (isLinux) {
      const command = new Deno.Command("top", {
        args: ["-b", "-n", "2", "-d", "0.2"],
        stdout: "piped",
        stderr: "null",
      });
      const { stdout } = await command.output();
      const outStr = new TextDecoder().decode(stdout);
      const lines = outStr.split("\n").filter((l) => l.includes("%Cpu"));
      if (lines.length) {
        const match = lines[lines.length - 1].match(/(\d+\.\d+)\s*id/);
        if (match) {
          return 100 - parseFloat(match[1]);
        }
      }
    } else if (isMac) {
      const command = new Deno.Command("top", {
        args: ["-l", "2", "-n", "0"],
        stdout: "piped",
        stderr: "null",
      });
      const { stdout } = await command.output();
      const outStr = new TextDecoder().decode(stdout);
      const lines = outStr.split("\n").filter((l) => l.includes("CPU usage:"));
      if (lines.length) {
        const last = lines[lines.length - 1];
        const idleMatch = last.match(/([\d.]+)% idle/);
        if (idleMatch) {
          return 100 - parseFloat(idleMatch[1]);
        }
      }
    }
    return null;
  }

  async function getMemoryUsage() {
    if (isLinux) {
      const data = await Deno.readTextFile("/proc/meminfo");
      const total = +(/MemTotal:\s+(\d+)/.exec(data)?.[1] || 0) * 1024;
      const free = +(/MemAvailable:\s+(\d+)/.exec(data)?.[1] || 0) * 1024;
      const used = total - free;
      return { total, free, used };
    } else if (isMac) {
      const sysctlCommand = new Deno.Command("sysctl", {
        args: ["-n", "hw.memsize"],
        stdout: "piped",
        stderr: "null",
      });
      const { stdout: sysctlOutput } = await sysctlCommand.output();
      const total = parseInt(new TextDecoder().decode(sysctlOutput).trim(), 10);

      const command = new Deno.Command("vm_stat", {
        stdout: "piped",
        stderr: "null",
      });
      const { stdout } = await command.output();
      const outStr = new TextDecoder().decode(stdout);
      const pageSizeMatch = outStr.match(/page size of (\d+) bytes/);
      const pageSize = pageSizeMatch ? parseInt(pageSizeMatch[1]) : 4096;
      const getPages = (key: string) => {
        const m = new RegExp(key + ":(\\s+)(\\d+)\\.").exec(outStr);
        return m ? parseInt(m[2], 10) : 0;
      };
      const freePages = getPages("Pages free");
      const activePages = getPages("Pages active");
      const inactivePages = getPages("Pages inactive");
      const wiredPages = getPages("Pages wired down");
      const speculativePages = getPages("Pages speculative");
      const free = (freePages + speculativePages) * pageSize;
      const used = (activePages + inactivePages + wiredPages) * pageSize;
      return { total, free, used };
    }
    return null;
  }

  async function getGPUUsage(): Promise<
    | null
    | string
    | number
    | Array<
      {
        id: number;
        name: string;
        utilization: number;
        memory_used: number;
        memory_total: number;
        temperature: number | null;
      }
    >
  > {
    if (isLinux) {
      const nvidiaSmiPaths = [
        "nvidia-smi",
        "/usr/bin/nvidia-smi",
        "/usr/local/bin/nvidia-smi",
        "/opt/cuda/bin/nvidia-smi",
        "/usr/local/cuda/bin/nvidia-smi",
      ];

      for (const nvidiaSmiPath of nvidiaSmiPaths) {
        try {
          const command = new Deno.Command(nvidiaSmiPath, {
            args: [
              "--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu",
              "--format=csv,noheader,nounits",
            ],
            stdout: "piped",
            stderr: "piped",
          });
          const { stdout, success } = await command.output();

          if (success) {
            const output = new TextDecoder().decode(stdout).trim();
            if (output) {
              const lines = output.split("\n").filter((line) => line.trim());

              if (lines.length > 0) {
                const gpus = lines.map((line) => {
                  const parts = line.split(",").map((p) => p.trim());
                  if (parts.length >= 6) {
                    return {
                      id: parseInt(parts[0]) || 0,
                      name: parts[1] || "Unknown GPU",
                      utilization: parseFloat(parts[2]) || 0,
                      memory_used: parseFloat(parts[3]) || 0,
                      memory_total: parseFloat(parts[4]) || 0,
                      temperature: parts[5] && !isNaN(parseFloat(parts[5]))
                        ? parseFloat(parts[5])
                        : null,
                    };
                  }
                  return null;
                }).filter((gpu) => gpu !== null);

                if (gpus.length > 0) {
                  return gpus as Array<
                    {
                      id: number;
                      name: string;
                      utilization: number;
                      memory_used: number;
                      memory_total: number;
                      temperature: number | null;
                    }
                  >;
                }
              }
            }
          }
        } catch {
          continue;
        }
      }
    }

    // Fallback for Mac
    if (isMac) {
      try {
        const command = new Deno.Command("system_profiler", {
          args: ["SPDisplaysDataType"],
          stdout: "piped",
          stderr: "null",
        });
        const { stdout } = await command.output();
        const text = new TextDecoder().decode(stdout);
        const match = text.match(/Chipset Model: (.+)/);
        if (match) {
          return match[1];
        }
      } catch {
        null;
      }
    }

    return null;
  }

  async function getCPUInfo() {
    if (isLinux) {
      try {
        const cpuInfo = await Deno.readTextFile("/proc/cpuinfo");
        const cores = (cpuInfo.match(/^processor\s*:/gm) || []).length || 1;
        const modelMatch = cpuInfo.match(/model name\s*:\s*(.+)/);
        const model = modelMatch ? modelMatch[1].trim() : "Unknown";
        const arch = "x86_64";

        const freqMatch = cpuInfo.match(/cpu MHz\s*:\s*([\d.]+)/);
        const freq = freqMatch ? parseFloat(freqMatch[1]) : null;

        const cacheMatch = cpuInfo.match(/cache size\s*:\s*(\d+)\s*KB/);
        const cache = cacheMatch ? parseInt(cacheMatch[1], 10) : null;

        const vendorMatch = cpuInfo.match(/vendor_id\s*:\s*(.+)/);
        const vendor = vendorMatch ? vendorMatch[1].trim() : "Unknown";

        return { cores, model, arch, freq, cache, vendor };
      } catch {
        return {
          cores: 1,
          model: "Unknown",
          arch: "Unknown",
          freq: null,
          cache: null,
          vendor: "Unknown",
        };
      }
    } else if (isMac) {
      try {
        const coresCmd = new Deno.Command("sysctl", {
          args: ["-n", "hw.ncpu"],
          stdout: "piped",
          stderr: "null",
        });
        const coresOutput = await coresCmd.output();
        const cores =
          parseInt(new TextDecoder().decode(coresOutput.stdout).trim(), 10) ||
          1;

        const modelCmd = new Deno.Command("sysctl", {
          args: ["-n", "machdep.cpu.brand_string"],
          stdout: "piped",
          stderr: "null",
        });
        const modelOutput = await modelCmd.output();
        const model = new TextDecoder().decode(modelOutput.stdout).trim() ||
          "Unknown";

        const freqCmd = new Deno.Command("sysctl", {
          args: ["-n", "hw.cpufrequency"],
          stdout: "piped",
          stderr: "null",
        });
        const freqOutput = await freqCmd.output();
        const freqStr = new TextDecoder().decode(freqOutput.stdout).trim();
        const freq = freqStr && !isNaN(parseInt(freqStr, 10))
          ? parseInt(freqStr, 10) / 1000000
          : null;

        const cacheCmd = new Deno.Command("sysctl", {
          args: ["-n", "hw.l3cachesize"],
          stdout: "piped",
          stderr: "null",
        });
        const cacheOutput = await cacheCmd.output();
        const cacheStr = new TextDecoder().decode(cacheOutput.stdout).trim();
        const cache = cacheStr && !isNaN(parseInt(cacheStr, 10))
          ? parseInt(cacheStr, 10) / 1024 / 1024
          : null;

        return { cores, model, arch: "ARM64", freq, cache, vendor: "Apple" };
      } catch {
        return {
          cores: 1,
          model: "Unknown",
          arch: "Unknown",
          freq: null,
          cache: null,
          vendor: "Unknown",
        };
      }
    }
    return {
      cores: 1,
      model: "Unknown",
      arch: "Unknown",
      freq: null,
      cache: null,
      vendor: "Unknown",
    };
  }

  async function getTopProcesses(): Promise<
    Array<{ name: string; cpu: number; mem: number }> | null
  > {
    try {
      if (isLinux) {
        const command = new Deno.Command("ps", {
          args: ["-eo", "comm,pcpu,pmem", "--sort=-pcpu", "--no-headers"],
          stdout: "piped",
          stderr: "null",
        });
        const { stdout } = await command.output();
        const output = new TextDecoder().decode(stdout);
        const lines = output.split("\n").slice(0, 10);
        return lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            return {
              name: parts[0].substring(0, 30),
              cpu: parseFloat(parts[1]) || 0,
              mem: parseFloat(parts[2]) || 0,
            };
          }
          return null;
        }).filter((p) => p !== null) as Array<
          { name: string; cpu: number; mem: number }
        >;
      } else if (isMac) {
        const command = new Deno.Command("ps", {
          args: ["-eo", "comm,pcpu,pmem", "-r", "-m"],
          stdout: "piped",
          stderr: "null",
        });
        const { stdout } = await command.output();
        const output = new TextDecoder().decode(stdout);
        const lines = output.split("\n").slice(1, 11);
        return lines.map((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            return {
              name: parts[0].substring(0, 30),
              cpu: parseFloat(parts[1]) || 0,
              mem: parseFloat(parts[2]) || 0,
            };
          }
          return null;
        }).filter((p) => p !== null) as Array<
          { name: string; cpu: number; mem: number }
        >;
      }
    } catch {
      return null;
    }
    return null;
  }

  const [cpu, mem, gpu, cpuInfo, processes] = await Promise.all([
    getCPUUsage(),
    getMemoryUsage(),
    getGPUUsage(),
    getCPUInfo(),
    getTopProcesses(),
  ]);

  return {
    cpu_usage_percent: cpu,
    memory: mem,
    gpu: gpu,
    cpu_info: cpuInfo,
    processes: processes,
  };
};
