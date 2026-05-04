import {
  createLunarLanderWorldStore,
  type LunarLanderSpawnResult,
  type LunarLanderWorldLander,
  type SerializedLunarLanderWorldState,
} from "./lunar-lander-world";
import type {
  LunarLanderPartyControlledMessage,
  LunarLanderPartyHelloMessage,
  LunarLanderPartyInputMessage,
  LunarLanderPartySnapshotMessage,
  LunarLanderPartySpawnMessage,
  LunarLanderPartySpawnedMessage,
} from "./lunar-lander-party-protocol";

type LunarLanderPartyRoomStateOptions = {
  now?: () => number;
  serializedState?: SerializedLunarLanderWorldState;
};

export class LunarLanderPartyRoomState {
  private readonly now: () => number;
  private readonly world: ReturnType<typeof createLunarLanderWorldStore>;
  private seq = 0;

  constructor({ now = () => Date.now(), serializedState }: LunarLanderPartyRoomStateOptions = {}) {
    this.now = now;
    this.world = createLunarLanderWorldStore({ now, serializedState });
  }

  hello(room: string, connectionId: string): LunarLanderPartyHelloMessage {
    return {
      type: "hello",
      room,
      connectionId,
      serverTime: this.now(),
    };
  }

  snapshot(): LunarLanderPartySnapshotMessage {
    this.seq += 1;
    return {
      type: "snapshot",
      seq: this.seq,
      snapshot: this.world.readWorldSnapshot(),
    };
  }

  spawn(message: LunarLanderPartySpawnMessage): LunarLanderPartySpawnedMessage {
    const result: LunarLanderSpawnResult = this.world.spawnLander(message.pilot, {
      blueprintId: message.blueprintId,
    });
    return {
      type: "spawned",
      lander: result.lander,
      controlToken: result.controlToken,
    };
  }

  input(message: LunarLanderPartyInputMessage): LunarLanderPartyControlledMessage | null {
    const lander: LunarLanderWorldLander | null = this.world.writeControl(
      message.landerId,
      message.token,
      message,
    );
    return lander ? { type: "controlled", lander } : null;
  }

  serializeWorld(): SerializedLunarLanderWorldState {
    return this.world.serializeWorld();
  }
}
