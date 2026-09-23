import type { DomainEvent } from "./DomainEvent.js";

type Handler = (event: DomainEvent) => Promise<void> | void;

/**
 * Bus de eventos en proceso. Es el puente entre el modelo de escritura y el
 * de lectura.
 *
 * `publish` se llama SIEMPRE después del commit y NO se espera: ahí nace la
 * consistencia eventual. Un fallo del proyector no puede deshacer un comando
 * que ya se confirmó, así que los errores se registran y se siguen.
 *
 * En un sistema distribuido esto sería una cola (SQS, Kafka) leyendo la tabla
 * `domain_events`. El contrato de los handlers no cambiaría.
 */
class EventBus {
	private readonly handlers = new Map<string, Handler[]>();

	on(eventType: string, handler: Handler): void {
		const list = this.handlers.get(eventType) ?? [];
		list.push(handler);
		this.handlers.set(eventType, list);
	}

	publish(events: DomainEvent[]): void {
		for (const event of events) {
			for (const handler of this.handlers.get(event.eventType) ?? []) {
				void Promise.resolve()
					.then(() => handler(event))
					.catch((err) => {
						console.error(
							`[events] handler de ${event.eventType} falló para ${event.aggregateId}:`,
							err,
						);
					});
			}
		}
	}
}

export const eventBus = new EventBus();
