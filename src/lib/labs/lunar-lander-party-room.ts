import { Server, type Connection, type WSMessage } from "partyserver";
import {
  decodeLunarLanderPartyClientMessage,
  encodeLunarLanderPartyMessage,
  type LunarLanderPartyRole,
} from "./lunar-lander-party-protocol";
import { LunarLanderPartyRoomState } from "./lunar-lander-party-room-state";
import type { SerializedLunarLanderWorldState } from "./lunar-lander-world";

type LunarLanderConnectionState = {
  role: LunarLanderPartyRole;
};

type LunarLanderPartyEnv = Record<string, unknown>;
type DurableObjectStateLike = ConstructorParameters<typeof Server>[0] & {
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T = unknown>(key: string, value: T): Promise<void>;
  };
};

const STORAGE_KEY = "lunar-lander-party-world";
const SNAPSHOT_INTERVAL_MS = 100;
const PERSIST_INTERVAL_MS = 2_000;

function parseRole(request: Request): LunarLanderPartyRole {
  const role = new URL(request.url).searchParams.get("role");
  return role === "pilot" ? "pilot" : "spectator";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export class LunarLanderParty extends Server<LunarLanderPartyEnv> {
  static override options = { hibernate: false };

  private readonly durableState: DurableObjectStateLike;
  private room = new LunarLanderPartyRoomState();
  private snapshotInterval: ReturnType<typeof setInterval> | null = null;
  private lastPersistedAt = 0;

  constructor(ctx: DurableObjectStateLike, env: LunarLanderPartyEnv) {
    super(ctx, env);
    this.durableState = ctx;
  }

  override async onStart(): Promise<void> {
    const stored = await this.durableState.storage.get<SerializedLunarLanderWorldState>(STORAGE_KEY);
    this.room = new LunarLanderPartyRoomState({ serializedState: stored });
  }

  override onConnect(
    connection: Connection<LunarLanderConnectionState>,
    context: { request: Request },
  ): void {
    connection.setState({ role: parseRole(context.request) });
    connection.send(encodeLunarLanderPartyMessage(this.room.hello(this.name, connection.id)));
    connection.send(encodeLunarLanderPartyMessage(this.room.snapshot()));
    this.ensureSnapshotLoop();
  }

  override async onMessage(
    connection: Connection<LunarLanderConnectionState>,
    message: WSMessage,
  ): Promise<void> {
    const decoded = decodeLunarLanderPartyClientMessage(message);
    if (!decoded.ok) {
      connection.send(encodeLunarLanderPartyMessage({ type: "error", message: decoded.error }));
      return;
    }

    if (decoded.value.type === "join") {
      connection.setState({ role: decoded.value.role });
      connection.send(encodeLunarLanderPartyMessage(this.room.snapshot()));
      return;
    }

    if (decoded.value.type === "ping") {
      connection.send(
        encodeLunarLanderPartyMessage({
          type: "pong",
          nonce: decoded.value.nonce,
          serverTime: Date.now(),
        }),
      );
      return;
    }

    if (decoded.value.type === "spawn") {
      connection.send(encodeLunarLanderPartyMessage(this.room.spawn(decoded.value)));
      await this.persistWorld();
      this.broadcastSnapshot();
      return;
    }

    const controlled = this.room.input(decoded.value);
    if (!controlled) {
      connection.send(
        encodeLunarLanderPartyMessage({
          type: "error",
          message: "Unable to control that lander with the supplied token",
        }),
      );
      return;
    }

    connection.send(encodeLunarLanderPartyMessage(controlled));
    await this.persistWorld();
    this.broadcastSnapshot();
  }

  override onClose(): void {
    this.stopSnapshotLoopIfIdle();
  }

  override onError(_connection: Connection, error: unknown): void {
    console.error("LunarLanderParty connection error", error);
    this.stopSnapshotLoopIfIdle();
  }

  override onRequest(request: Request): Response {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/health")) {
      return jsonResponse({ ok: true, room: this.name, connections: this.connectionCount() });
    }
    if (request.method === "GET" && url.pathname.endsWith("/snapshot")) {
      return jsonResponse(this.room.snapshot());
    }
    return jsonResponse({ error: "not found" }, 404);
  }

  private ensureSnapshotLoop(): void {
    if (this.snapshotInterval) return;
    this.snapshotInterval = setInterval(() => {
      if (this.connectionCount() === 0) {
        this.stopSnapshotLoopIfIdle();
        return;
      }
      this.broadcastSnapshot();
      this.persistPeriodically();
    }, SNAPSHOT_INTERVAL_MS);
  }

  private stopSnapshotLoopIfIdle(): void {
    if (this.connectionCount() > 0 || !this.snapshotInterval) return;
    clearInterval(this.snapshotInterval);
    this.snapshotInterval = null;
  }

  private connectionCount(): number {
    return Array.from(this.getConnections()).length;
  }

  private broadcastSnapshot(): void {
    this.broadcast(encodeLunarLanderPartyMessage(this.room.snapshot()));
  }

  private persistPeriodically(): void {
    const now = Date.now();
    if (now - this.lastPersistedAt < PERSIST_INTERVAL_MS) return;
    this.lastPersistedAt = now;
    this.persistWorld().catch((error: unknown) => {
      console.error("LunarLanderParty persist failed", error);
    });
  }

  private async persistWorld(): Promise<void> {
    await this.durableState.storage.put(STORAGE_KEY, this.room.serializeWorld());
  }
}
