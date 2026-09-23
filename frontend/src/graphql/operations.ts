import { gql } from "@apollo/client";

/* ═══════════════════ Fragmentos ═══════════════════ */

/**
 * Vista condensada para la grilla del catálogo.
 *
 * NO pide laboratorio, indicaciones ni descripción: la lista no los muestra y
 * traerlos sería over-fetching. Los campos extra se piden solo en la ficha.
 */
export const MEDICATION_CARD = gql`
	fragment MedicationCard on Medication {
		id
		name
		presentation
		price
		stock
		requiresPrescription
		category {
			id
			name
		}
	}
`;

export const ORDER_VIEW = gql`
	fragment OrderView on Order {
		id
		status
		total
		itemCount
		pendingPrescriptions
		placedAt
		projectedAt
		items {
			medicationId
			name
			presentation
			quantity
			unitPrice
			lineTotal
		}
	}
`;

/* ═══════════════════ Catálogo ═══════════════════ */

export const SEARCH_MEDICATIONS = gql`
	query SearchMedications($filter: MedicationFilter, $limit: Int, $offset: Int) {
		medications(filter: $filter, limit: $limit, offset: $offset) {
			totalCount
			hasMore
			items {
				...MedicationCard
			}
		}
	}
	${MEDICATION_CARD}
`;

/** Ficha técnica: aquí sí se piden todos los campos clínicos. */
export const MEDICATION_DETAIL = gql`
	query MedicationDetail($id: UUID!) {
		medication(id: $id) {
			id
			sku
			name
			activeIngredient
			dosage
			presentation
			price
			stock
			requiresPrescription
			description
			category {
				id
				name
			}
			laboratory {
				id
				name
			}
		}
	}
`;

export const CATEGORIES = gql`
	query Categories {
		categories {
			id
			name
		}
	}
`;

/* ═══════════════════ Identidad ═══════════════════ */

export const LOGIN = gql`
	mutation Login($input: LoginInput!) {
		login(input: $input) {
			token
			patient {
				id
				email
				fullName
			}
			errors {
				field
				message
				code
			}
		}
	}
`;

export const REGISTER = gql`
	mutation RegisterPatient($input: RegisterPatientInput!) {
		registerPatient(input: $input) {
			token
			patient {
				id
				email
				fullName
			}
			errors {
				field
				message
				code
			}
		}
	}
`;

export const ME = gql`
	query Me {
		me {
			id
			email
			fullName
		}
	}
`;

/* ═══════════════════ Pedidos ═══════════════════ */

export const PLACE_ORDER = gql`
	mutation PlaceOrder($input: PlaceOrderInput!) {
		placeOrder(input: $input) {
			orderId
			status
			total
			order {
				...OrderView
			}
			errors {
				field
				message
				code
			}
		}
	}
	${ORDER_VIEW}
`;

export const MY_ORDERS = gql`
	query MyOrders($limit: Int, $offset: Int) {
		myOrders(limit: $limit, offset: $offset) {
			totalCount
			hasMore
			items {
				...OrderView
			}
		}
	}
	${ORDER_VIEW}
`;

export const ORDER = gql`
	query Order($id: UUID!) {
		order(id: $id) {
			...OrderView
		}
	}
	${ORDER_VIEW}
`;

export const VALIDATE_PRESCRIPTION = gql`
	mutation ValidatePrescription($orderId: UUID!) {
		validatePrescription(orderId: $orderId) {
			status
			order {
				...OrderView
			}
			errors {
				field
				message
				code
			}
		}
	}
	${ORDER_VIEW}
`;

export const DISPATCH_ORDER = gql`
	mutation DispatchOrder($orderId: UUID!) {
		dispatchOrder(orderId: $orderId) {
			status
			order {
				...OrderView
			}
			errors {
				field
				message
				code
			}
		}
	}
	${ORDER_VIEW}
`;

export const CANCEL_ORDER = gql`
	mutation CancelOrder($orderId: UUID!) {
		cancelOrder(orderId: $orderId) {
			status
			order {
				...OrderView
			}
			errors {
				field
				message
				code
			}
		}
	}
	${ORDER_VIEW}
`;

/**
 * Cierra el círculo de la consistencia eventual: la mutación devuelve el
 * estado del modelo de escritura de inmediato, y esta suscripción entrega la
 * proyección cuando termina de reconstruirse.
 */
export const ORDER_STATUS_CHANGED = gql`
	subscription OrderStatusChanged($orderId: UUID!) {
		orderStatusChanged(orderId: $orderId) {
			...OrderView
		}
	}
	${ORDER_VIEW}
`;
