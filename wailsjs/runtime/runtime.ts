type EventCallback = (data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, ...data: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((cb) => {
        try {
          cb(data.length === 1 ? data[0] : data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event}:`, err);
        }
      });
    }
  }
}

export const eventBus = new EventBus();

export function EventsOn(eventName: string, callback: (data: unknown) => void): () => void {
  return eventBus.on(eventName, callback);
}

export function EventsEmit(eventName: string, ...data: unknown[]): void {
  eventBus.emit(eventName, ...data);
}

export function EventsOff(eventName: string): void {
  // Clear listeners for event
}

export function WindowShow(): void {}
export function WindowHide(): void {}
export function WindowUnminimise(): void {}
