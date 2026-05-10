export function copySsh(ip, user = "michael") {
  const cmd = `ssh ${user}@${ip}`;
  navigator.clipboard.writeText(cmd);
  return cmd;
}

export function downloadRdp(ip, user = "") {
  const lines = [
    `full address:s:${ip}`,
    `screen mode id:i:1`,
    `desktopwidth:i:1280`,
    `desktopheight:i:800`,
    `prompt for credentials:i:1`,
  ];
  if (user) lines.push(`username:s:${user}`);
  const blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "application/x-rdp" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ip}.rdp`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
