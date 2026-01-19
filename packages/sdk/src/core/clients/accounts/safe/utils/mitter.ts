import mitt, { type Emitter, type Handler } from "mitt";

type Events = Record<string, unknown>;

export class MittEmitter {
    private emitter: Emitter<Events>;

    constructor() {
        this.emitter = mitt();
    }

    on(event: string, handler: Handler) {
        this.emitter.on(event, handler);
    }

    off(event: string, handler: Handler) {
        this.emitter.off(event, handler);
    }

    emit(event: string, value?: unknown) {
        this.emitter.emit(event, value);
    }
}
