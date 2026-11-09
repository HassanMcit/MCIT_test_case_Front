type MessageHandler = (event: MessageEvent<string>) => void;
type ErrorHandler = (event: Event) => void;

/** Fetch-based SSE transport so bearer tokens stay out of request URLs. */
export class AuthenticatedEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readyState = AuthenticatedEventSource.CONNECTING;
  onmessage: MessageHandler | null = null;
  onerror: ErrorHandler | null = null;
  private readonly controller = new AbortController();

  constructor(url: string, token: string) {
    void this.connect(url, token);
  }

  close() {
    this.readyState = AuthenticatedEventSource.CLOSED;
    this.controller.abort();
  }

  private async connect(url: string, token: string) {
    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
        signal: this.controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("SSE stream unavailable");
      this.readyState = AuthenticatedEventSource.OPEN;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (this.readyState !== AuthenticatedEventSource.CLOSED) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        for (const frame of frames) this.dispatch(frame);
      }
      if (buffer) this.dispatch(buffer);
      if (this.readyState !== AuthenticatedEventSource.CLOSED) {
        this.readyState = AuthenticatedEventSource.CONNECTING;
        this.onerror?.(new Event("error"));
      }
    } catch {
      if (this.readyState !== AuthenticatedEventSource.CLOSED) {
        this.readyState = AuthenticatedEventSource.CONNECTING;
        this.onerror?.(new Event("error"));
      }
    }
  }

  private dispatch(frame: string) {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) this.onmessage?.({ data } as MessageEvent<string>);
  }
}
