export const Cursorify = (info: any) =>
  Buffer.from(info.toString()).toString("base64");

export const Decursorify = (string: string) =>
  Buffer.from(string, "base64").toString();
