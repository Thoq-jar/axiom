export interface AttachedDisk {
  deviceIdentifier: string;
  devicePath: string;
  displayName: string;
  size: number;
  model: string;
  diskType: "internal" | "external" | "virtual" | "unknown";
  mountPoint: string | null;
  isRemovable: boolean;
}

async function runDiskCommand(
  executable: string,
  args: string[],
): Promise<{ success: boolean; output: string }> {
  try {
    const command = new Deno.Command(executable, { args, stderr: "null" });
    const { code, stdout } = await command.output();
    return { success: code === 0, output: new TextDecoder().decode(stdout) };
  } catch {
    return { success: false, output: "" };
  }
}

function extractDiskUtilField(
  fieldLabel: string,
  diskInfoOutput: string,
): string {
  const pattern = new RegExp(`${fieldLabel}:\\s*(.+?)\\s*$`, "m");
  const match = diskInfoOutput.match(pattern);
  return match ? match[1].trim() : "";
}

async function detectDisksMacOS(): Promise<AttachedDisk[]> {
  const listResult = await runDiskCommand("diskutil", ["list"]);
  if (!listResult.success) return [];

  const physicalDiskIdentifiers: string[] = [];
  for (const line of listResult.output.split("\n")) {
    const physicalDiskMatch = line.match(
      /^\/dev\/(disk\d+)\s+\((internal|external|removable)[^)]*\)/,
    );
    if (physicalDiskMatch) {
      physicalDiskIdentifiers.push(physicalDiskMatch[1]);
    }
  }

  const detectedDisks: AttachedDisk[] = [];

  for (const diskIdentifier of physicalDiskIdentifiers) {
    const infoResult = await runDiskCommand("diskutil", [
      "info",
      diskIdentifier,
    ]);
    if (!infoResult.success) continue;

    const diskInfoOutput = infoResult.output;

    const deviceNode = extractDiskUtilField("Device Node", diskInfoOutput);
    const mediaName = extractDiskUtilField(
      "Device / Media Name",
      diskInfoOutput,
    );
    const sizeString = extractDiskUtilField("Disk Size", diskInfoOutput);
    const locationString = extractDiskUtilField(
      "Device Location",
      diskInfoOutput,
    );
    const removableString = extractDiskUtilField(
      "Removable Media",
      diskInfoOutput,
    );
    const mountPointString = extractDiskUtilField(
      "Mount Point",
      diskInfoOutput,
    );

    const byteSizeMatch = sizeString.match(/\((\d+)\s+Bytes\)/);
    const diskSizeInBytes = byteSizeMatch ? parseInt(byteSizeMatch[1]) : 0;

    const isRemovable = removableString !== "Fixed";
    const isInternalDisk = locationString.toLowerCase().includes("internal");

    let diskType: "internal" | "external" | "virtual" | "unknown" = "unknown";
    if (isInternalDisk) {
      diskType = "internal";
    } else if (isRemovable) {
      diskType = "external";
    }

    detectedDisks.push({
      deviceIdentifier: diskIdentifier,
      devicePath: deviceNode || `/dev/${diskIdentifier}`,
      displayName: mediaName || diskIdentifier,
      size: diskSizeInBytes,
      model: mediaName,
      diskType,
      mountPoint: mountPointString || null,
      isRemovable,
    });
  }

  return detectedDisks;
}

async function detectDisksLinux(): Promise<AttachedDisk[]> {
  const result = await runDiskCommand("lsblk", [
    "--json",
    "--bytes",
    "--output",
    "NAME,SIZE,TYPE,MOUNTPOINT,MODEL,RM,HOTPLUG,VENDOR",
  ]);

  if (!result.success || !result.output) return [];

  try {
    const parsedBlockDeviceData = JSON.parse(result.output) as {
      blockdevices: Array<{
        name: string;
        size: string;
        type: string;
        mountpoint: string | null;
        model: string | null;
        rm: string | boolean;
        hotplug: string | boolean;
        vendor: string | null;
      }>;
    };

    const detectedDisks: AttachedDisk[] = [];

    for (const blockDevice of parsedBlockDeviceData.blockdevices ?? []) {
      if (blockDevice.type !== "disk") continue;

      const isRemovable = blockDevice.rm === "1" ||
        blockDevice.rm === true ||
        blockDevice.hotplug === "1" ||
        blockDevice.hotplug === true;

      const diskModel = (
        (blockDevice.model ?? "") ||
        (blockDevice.vendor ?? "")
      ).trim();

      detectedDisks.push({
        deviceIdentifier: blockDevice.name,
        devicePath: `/dev/${blockDevice.name}`,
        displayName: diskModel || blockDevice.name,
        size: parseInt(String(blockDevice.size)) || 0,
        model: diskModel,
        diskType: isRemovable ? "external" : "internal",
        mountPoint: blockDevice.mountpoint ?? null,
        isRemovable,
      });
    }

    return detectedDisks;
  } catch {
    return [];
  }
}

export async function detectAttachedDisks(): Promise<AttachedDisk[]> {
  if (Deno.build.os === "darwin") {
    return await detectDisksMacOS();
  }
  if (Deno.build.os === "linux") {
    return await detectDisksLinux();
  }
  return [];
}
