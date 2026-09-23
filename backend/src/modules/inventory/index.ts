/**
 * Módulo interno: no expone superficie GraphQL propia.
 * Lo consume `ordering` a través de este puerto.
 */
export { reserveStock, releaseStock } from "./infra/InventoryRepository.js";
export type { StockReservation, ReservationFailure } from "./domain/StockReservation.js";
